""" Classes and Functions that handle the interface between Python and Javascript """

import logging
from os.path import dirname, abspath
from inspect import getmembers, ismethod
import multiprocessing as mp
from multiprocessing.synchronize import Event as mp_EventClass
from dataclasses import dataclass
from typing import Callable, Optional, Protocol
from enum import Enum
from abc import ABC, abstractmethod

import webview
from webview.errors import JavascriptException

import lightweight_pycharts.orm as orm
from lightweight_pycharts.js_cmd import JS_CMD
import lightweight_pycharts.js_cmd as cmds

file_dir = dirname(abspath(__file__))
logger = logging.getLogger("lightweight-pycharts-view")

##### --------------------------------- Javascript API Class --------------------------------- #####


class js_api:
    """
    Base javascript Callback API.
    Every function in this class maps to a function in the py_api class in py_api.ts
    """

    def __init__(self) -> None:
        # Pass in a temporary Object that we will overwrite later.
        # This is really just used to silence linter errors
        self.rtn_queue = mp.Queue(maxsize=1)

    def callback(self, msg: str) -> None:
        "Generic Callback that passes serialized data as a string"
        logger.debug("Recieved Message from JS: %s", msg)
        self.rtn_queue.put(msg)


##### --------------------------------- Helper Classes --------------------------------- #####


@dataclass
class MpHooks:
    "All required Multiprocessor Hooks required for a javascript interface"
    fwd_queue: mp.Queue = mp.Queue()
    rtn_queue: mp.Queue = mp.Queue()
    start_event: mp_EventClass = mp.Event()
    loaded_event: mp_EventClass = mp.Event()
    stop_event: mp_EventClass = mp.Event()


##### --------------------------------- Python Gui Classes --------------------------------- #####


class script_protocol(Protocol):
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
        loaded_event:   Multiprocessing Event that is set by "__view_mp__" to indicate javascript window has been loaded
                        and javascript commands can be sent via View.runscript() Method
        stop_event:     Multiprocessing Event that is set by either __main_mp__ or __view_mp__ to signal application shutdown

        runs_script():   Callable function that takes a string representation of javascript that will be evaluated in the window
    """

    def __init__(
        self,
        hooks: MpHooks,
        run_script: script_protocol,
    ) -> None:
        self.run_script = run_script
        self.fwd_queue = hooks.fwd_queue
        self.rtn_queue = hooks.rtn_queue
        self.start_event = hooks.start_event
        self.loaded_event = hooks.loaded_event
        self.stop_event = hooks.stop_event

    @abstractmethod
    def show(self): ...

    @abstractmethod
    def hide(self): ...

    @abstractmethod
    def _assign_callbacks(self): ...

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
                self._execute_cmd_type_check(cmd, *args)
            except IndexError:
                logger.error("incorrect number of args given for command: %s", cmd)
            except TypeError:
                logger.error(
                    "incorrect Type of args given for command: %s: %s",
                    cmd,
                    [type(arg) for arg in args],
                )

    def _execute_cmd(self, js_cmd: JS_CMD, *args):
        "Execute commands with no Type Checking"
        raise NotImplementedError

    def _execute_cmd_type_check(self, js_cmd: JS_CMD, *args):
        "Execute commands with Type Checking"
        match js_cmd:
            case JS_CMD.JS_CODE:  # Execute a script verbatum
                for arg in args:
                    if isinstance(arg, str):
                        self.run_script(arg)
            case JS_CMD.SHOW:  # Show the Window
                self.show()
            case JS_CMD.HIDE:  # Hide the Window
                self.hide()
            case JS_CMD.NEW_CONTAINER:
                self._type_check(args, (str,))
                self.run_script(cmds.new_container(args[0]))
            case JS_CMD.NEW_FRAME:
                self._type_check(args, (str, str))
                self.run_script(cmds.new_frame(args[0], args[1]))
            case JS_CMD.NEW_PANE:
                self._type_check(args, (str, str))
                self.run_script(cmds.new_pane(args[0], args[1]))
            case JS_CMD.SET_LAYOUT:
                self._type_check(args, (str, orm.Container_Layouts))
                self.run_script(cmds.set_layout(args[0], args[1]))
            case _:
                logger.warning("Unknown Command: %s", js_cmd)

    @staticmethod
    def _type_check(args: tuple, expected_type: tuple):
        """Run-time Type Checking for items put through the queue."""
        for _i, exp_type in enumerate(expected_type):
            if not isinstance(args[_i], exp_type):
                raise TypeError


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

        self.pyweb_window = webview.create_window(
            title=title,
            url=file_dir + "/frontend/index.html",
            js_api=self.api,
            **kwargs,
        )
        # Tell webview to execute api func assignment and enter main loop once loaded
        self.pyweb_window.events.loaded += self._assign_callbacks
        self.pyweb_window.events.loaded += self._manage_queue

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
                self.run_script(f"window.api.{name} = pywebview.api.{name}")

        # Signal inital setup is complete and JS Commands can be run on this webview
        self.loaded_event.set()

    def show(self):
        self.pyweb_window.show()

    def hide(self):
        self.pyweb_window.hide()


class QWebView:  # (View):
    """Class to create and manage a Pyside QWebView widget"""

    def __init__(self) -> None:
        raise NotImplementedError
