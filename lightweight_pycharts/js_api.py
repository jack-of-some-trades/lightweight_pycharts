""" Classes and Functions that handle the interface between Python and Javascript """

import logging
from os.path import dirname, abspath
from inspect import getmembers, ismethod
import multiprocessing as mp
from multiprocessing.synchronize import Event as mp_EventClass
from dataclasses import dataclass, field
from typing import Callable, Optional, Protocol
from abc import ABC, abstractmethod

import webview
import pandas as pd
from webview.errors import JavascriptException

from . import orm
from . import js_cmd as cmds
from .js_cmd import JS_CMD, PY_CMD

file_dir = dirname(abspath(__file__))
logger = logging.getLogger("lightweight-pycharts")

# @pylint: disable=consider-iterating-dictionary missing-function-docstring invalid-name

##### --------------------------------- Javascript API Class --------------------------------- #####


class js_api:
    """
    Base javascript Callback API.
    Every function in this class maps to a function in the py_api class in py_api.ts
    * private, protected, sunder, and dunder methods are *not* placed in the Javascript window
    """

    def __init__(self) -> None:
        # Pass in a temporary Object that we will overwrite later.
        # This is really just used to silence linter errors
        self.rtn_queue = mp.Queue(maxsize=1)
        self.view_window: View

    def __set_view_window__(self, view_window: "View"):
        # For some reason this assignment can't be done in the constructor.
        # If you try that then py_webview never loads? The assignment can only be
        # done after the py_webivew window has loaded
        self.view_window = view_window

    def loaded(self) -> None:
        "Called on start-up. Indicates that all javascript assets, not just the JS api, have loaded"
        self.view_window.show()  # api.loaded_check() in py_api.ts is what calls this

    def close(self) -> None:
        self.view_window.close()

    def maximize(self) -> None:
        self.view_window.maximize()

    def minimize(self) -> None:
        self.view_window.minimize()

    def restore(self) -> None:
        self.view_window.restore()

    def add_container(self) -> None:
        self.rtn_queue.put(PY_CMD.ADD_CONTAINER)

    def remove_container(self, _id: str) -> None:
        self.rtn_queue.put((PY_CMD.REMOVE_CONTAINER, _id))

    def reorder_containers(self, _from: int, _to: int) -> None:
        self.rtn_queue.put((PY_CMD.REORDER_CONTAINERS, _from, _to))

    def callback(self, msg: str) -> None:
        "Generic Callback that passes serialized data as a string"
        logger.debug("Recieved Message from JS: %s", msg)
        self.rtn_queue.put((PY_CMD.PY_EXEC, msg))

    def timeframe_switch(self, mult: int, period: orm.types.Period):
        "Signals UI requested a Timeframe Swtich"
        try:
            timeframe = orm.TF(mult, period)
            self.rtn_queue.put((PY_CMD.TF_CHANGE, timeframe))
        except ValueError as e:
            logger.warning(e)


##### --------------------------------- Helper Classes --------------------------------- #####


@dataclass
class MpHooks:
    "All required Multiprocessor Hooks required for a javascript interface"
    fwd_queue: mp.Queue = field(default_factory=mp.Queue)
    rtn_queue: mp.Queue = field(default_factory=mp.Queue)
    start_event: mp_EventClass = field(default_factory=mp.Event)
    js_loaded_event: mp_EventClass = field(default_factory=mp.Event)
    stop_event: mp_EventClass = field(default_factory=mp.Event)


##### --------------------------------- Python Gui Classes --------------------------------- #####


class _scriptProtocol(Protocol):
    def __call__(self, cmd: str, promise: Optional[Callable] = None) -> None: ...


class View(ABC):
    """
    Abstract Class interface.
    Extentions of this class create and manage the javascript <-> GUI Library Connection.
    Instantiations of this class are intended to be done using mp.process() so that they
    are managed via a dedicated processor to help imporve performance.

    Attributes:
        fwd_queue:      Multiprocessing Queue That transfers data from "__main_mp__" to "__view_mp__"
        rtn_queue:      Multiprocessing Queue That transfers data from "__view_mp__" to "__main_mp__"
        start_event:    Multiprocessing Event that is set by "__main_mp__" to syncronize all windows being loaded
        js_loaded_event:   Multiprocessing Event that is set by "__view_mp__" to indicate javascript window has been loaded
                        and javascript commands can be sent via View.runscript() Method
        stop_event:     Multiprocessing Event that is set by either __main_mp__ or __view_mp__ to signal application shutdown

        runs_script():   Callable function that takes a string representation of javascript that will be evaluated in the window
    """

    def __init__(
        self,
        hooks: MpHooks,
        run_script: _scriptProtocol,
    ) -> None:
        self.run_script = run_script
        self.fwd_queue = hooks.fwd_queue
        self.rtn_queue = hooks.rtn_queue
        self.start_event = hooks.start_event
        self.js_loaded_event = hooks.js_loaded_event
        self.stop_event = hooks.stop_event

    @abstractmethod
    def show(self): ...
    @abstractmethod
    def hide(self): ...
    @abstractmethod
    def close(self): ...
    @abstractmethod
    def minimize(self): ...
    @abstractmethod
    def maximize(self): ...
    @abstractmethod
    def restore(self): ...
    @abstractmethod
    def assign_callback(self, func_name: str): ...

    def _manage_queue(self):
        "Infinite loop to manage Process Queue since it is launched in an isolated process"
        while not self.stop_event.is_set():
            # get() doesn't need a timeout. the waiting will get interupted by the os
            # to go manage the thread that the webview is running in.
            # Bit wasteful. Would be nice to have pywebview run in an asyncio Thread
            msg = self.fwd_queue.get()
            if isinstance(msg, tuple):
                cmd, *args = msg
                logger.debug(
                    "Recieved cmd %s: %s",
                    JS_CMD(cmd).name,
                    str(args),
                )
            elif isinstance(msg, JS_CMD):
                cmd = msg
                args = tuple()
            else:
                logger.warning("Ignoring Invalid Message: %s", msg)
                continue

            try:
                self._execute_cmd(cmd, *args)
            except IndexError:
                logger.error("incorrect number of args given for command: %s", cmd)
            except TypeError as e:
                logger.error(e)

    def _execute_cmd(self, js_cmd: JS_CMD, *args):
        "Execute command with Argument Pattern Matching"
        cmd = ""
        match js_cmd, *args:
            # case JS_CMD.JS_CODE, Callable(), *scripts:
            # Unfortunately this doesn't work since Callables are not pickleable
            # and thus cannot make it through the process queue
            case JS_CMD.JS_CODE, *scripts:
                for script in scripts:
                    cmd += (script + ";") if isinstance(script, str) else ""
            case JS_CMD.ADD_CONTAINER, str(), *_:
                cmd = cmds.add_container(args[0])
            case JS_CMD.REMOVE_CONTAINER, str(), *_:
                cmd = cmds.remove_container(args[0])
            case JS_CMD.REMOVE_REFERENCE, str(), *_:
                cmd = cmds.remove_reference(*args)
            case JS_CMD.ADD_FRAME, str(), str(), *_:
                cmd = cmds.add_frame(args[0], args[1])
            case JS_CMD.ADD_PANE, str(), str(), *_:
                cmd = cmds.add_pane(args[0], args[1])
            case JS_CMD.SET_LAYOUT, str(), orm.layouts(), *_:
                cmd = cmds.set_layout(args[0], args[1])
            case JS_CMD.SET_DATA, str(), pd.DataFrame(), *_:
                cmd = cmds.set_data(args[0], args[1].lwc_df)
            case JS_CMD.SHOW, *_:
                self.show()
            case JS_CMD.HIDE, *_:
                self.hide()
            case JS_CMD.CLOSE, *_:
                self.close()
            case JS_CMD.MAXIMIZE, *_:
                self.maximize()
            case JS_CMD.MINIMIZE, *_:
                self.minimize()
            case JS_CMD.RESTORE, *_:
                self.restore()
            case _:
                raise TypeError(
                    f"""incorrect Type of args given for command:
                    {cmd}: Given {[type(arg) for arg in args]}"""
                )
        self.run_script(cmd)


class PyWv(View):
    """
    Class to create and manage a pywebview window

    Args:
        Param: mp_hooks
            A Dataclass struct of all the necessary multiprocessor hooks.
        Param: api
            Optional instance of js_api, can be an extended subclass. If it is extended
            Any additional class methods will behave as javascript api callbacks
        param: **kwargs
            key-word args that are passed directly to the pywebview window.
            See https://pywebview.flowrl.com/guide/api.html for docs on available kwargs.
    """

    def __init__(
        self,
        mp_hooks: MpHooks,
        title: str = "",
        debug: bool = False,
        api: Optional[js_api] = None,
        **kwargs,
    ) -> None:
        # Pass Hooks and run_script to super
        super().__init__(mp_hooks, run_script=self._handle_eval_js)

        if debug:
            logger.setLevel(logging.DEBUG)
            # webview.settings["OPEN_DEVTOOLS_IN_DEBUG"] = False

        # assign default js_api if it was not provided
        if api is None:
            api = js_api()
        api.rtn_queue = self.rtn_queue
        self.api = api

        # hide by default since seeing window elements poping in is ugly.
        # Typescript calls API Show function when all elements are loaded.
        if "hidden" not in kwargs.keys():
            kwargs["hidden"] = True
        # Setting default since window has quite a few things populated by default
        if "min_size" not in kwargs.keys():
            kwargs["min_size"] = (400, 250)
        if "width" not in kwargs.keys():
            kwargs["width"] = 1600
        if "height" not in kwargs.keys():
            kwargs["height"] = 800
        if "frameless" not in kwargs.keys():
            kwargs["frameless"] = False
        kwargs["easy_drag"] = False  # REALLY Don't want this behavior

        self.frameless = kwargs["frameless"]
        if self.frameless:
            webview.DRAG_REGION_SELECTOR = ".drag-region"
            # Need to do this otherwise a Framed window is draggable
            # and no, you can't just add this class after the window is made..

        self.pyweb_window = webview.create_window(
            title=title,
            url=file_dir + "/frontend/index.html",
            js_api=self.api,
            **kwargs,
        )

        # Tell webview to execute api func assignment and enter main loop once loaded
        # Order of these function calls matter
        self.pyweb_window.events.loaded += lambda: api.__set_view_window__(self)
        self.pyweb_window.events.loaded += self._assign_callbacks
        self.pyweb_window.events.loaded += self._manage_queue
        self.pyweb_window.events.maximized += self._on_maximized
        self.pyweb_window.events.restored += self._on_restore

        # Wait until main process signals to start
        webview.start(debug=debug)
        self.stop_event.set()

    def _handle_eval_js(self, cmd: str, promise: Optional[Callable] = None):
        "evaluate_js() and catch errors"
        try:
            # runscript for pywebview is the evaluate_js() function
            self.pyweb_window.evaluate_js(cmd, callback=promise)
        except JavascriptException as e:
            logger.error(
                "JS Exception: %s\n\t\t\t\tscript: %s", e.args[0]["message"], cmd
            )

    def _assign_callbacks(self):
        "Read all the functions that exist in the api and expose non-dunder methods to javascript"
        member_functions = getmembers(self.api, predicate=ismethod)
        for name, _ in member_functions:
            # filter out dunder methods
            if not (name.startswith("__") or name.endswith("__")):
                self.assign_callback(name)

        # Signal to both python and javascript listeners that inital setup is complete
        self.js_loaded_event.set()
        self.run_script("window.api._loaded_check()")
        if self.frameless:
            self.run_script("window.titlebar.create_window_btns()")

    def assign_callback(self, func_name: str):
        self.run_script(f"window.api.{func_name} = pywebview.api.{func_name}")

    def close(self):
        self.pyweb_window.destroy()

    def maximize(self):
        if self.pyweb_window.maximized:
            self.restore()
        else:
            self.pyweb_window.maximize()

    def minimize(self):
        self.pyweb_window.minimize()

    def restore(self):
        self.pyweb_window.restore()

    def show(self):
        self.pyweb_window.show()

    def hide(self):
        self.pyweb_window.hide()

    def _on_maximized(self):
        # For Some reason maximized doesn't auto update?
        self.pyweb_window.maximized = True
        # self.run_script("") #Should make this update the icon...

    def _on_restore(self):
        self.pyweb_window.maximized = False
        # self.run_script("") #Should make this update the icon...


class QWebView:  # (View):
    """Class to create and manage a Pyside QWebView widget"""

    def __init__(self) -> None:
        # In theory, Even though most things you could want are already fleshed out
        # in the PYWebView version, You could expand the View Class to work with QWebView.
        # This would allow someone to place the window into the GUI and have a Custom Side/Bottom
        # Bar that's implemented in Pyside/Pyqt to display a table/custom menu.. idk. options
        raise NotImplementedError
