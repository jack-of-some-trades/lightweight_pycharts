""" Classes and Functions that handle the interface between Python and Javascript """

import os
import logging
import inspect
import multiprocessing as mp
from multiprocessing.synchronize import Event as mp_EventClass
from dataclasses import dataclass
from typing import Callable, Optional
from enum import Enum
from abc import ABC

import webview

file_dir = os.path.dirname(os.path.abspath(__file__))
logger = logging.getLogger("lightweight-pycharts")

##### --------------------------------- Javascript API Class --------------------------------- #####


class js_api:
    """
    Base javascript Callback API.
    Every function in this class maps to a function in the py_api class in py_api.ts
    """

    def __init__(self) -> None:
        # Pass in a temporary Object that we will overwrite later.
        self.rtn_queue = mp.Queue(maxsize=1)

    def callback(self, msg: str) -> None:
        logger.debug("Recieved Message from JS: %s", msg)
        self.rtn_queue.put(msg)


##### --------------------------------- Helper Classes --------------------------------- #####


class JS_CMD(Enum):
    JS = "js_cmd"
    SHOW = "show"


@dataclass
class MpHooks:
    "All required Multiprocessor Hooks required for a javascript interface"
    fwd_queue: mp.Queue = mp.Queue()
    rtn_queue: mp.Queue = mp.Queue()
    start_event: mp_EventClass = mp.Event()
    loaded_event: mp_EventClass = mp.Event()
    stop_event: mp_EventClass = mp.Event()


##### To be implemented? Maybe put in util?
@dataclass
class WindowOptions:
    "All available window options"
    title: str = ""
    origin_x: int = 100
    origin_y: int = 100


##### --------------------------------- Python Gui Classes --------------------------------- #####


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
        runscript: Callable[[str], None] = lambda cmd: None,
    ) -> None:
        self.runscript = runscript
        self.fwd_queue = hooks.fwd_queue
        self.rtn_queue = hooks.rtn_queue
        self.start_event = hooks.start_event
        self.loaded_event = hooks.loaded_event
        self.stop_event = hooks.stop_event


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
        **window_kwargs,
    ) -> None:

        # assign default js_api if it was not provided
        if api is None:
            api = js_api()
        api.rtn_queue = mp_hooks.rtn_queue
        self.api = api

        pyweb_window = webview.create_window(
            title=title,
            url=file_dir + "/frontend/index.html",
            js_api=self.api,
            **window_kwargs,
        )

        pyweb_window.events.loaded += lambda: self._assign_callbacks(
            mp_hooks.loaded_event
        )
        pyweb_window.events.loaded += self._manage_queue

        # Pass the Hooks along, runscript for pywebview is the evaluate_js() function
        super().__init__(mp_hooks, runscript=pyweb_window.evaluate_js)

        # Wait until main process signals to start
        self.start_event.wait()
        webview.start(debug=debug)

        # Webview window Closed.
        self.stop_event.set()

    def _assign_callbacks(self, loaded_event: mp_EventClass):
        member_functions = inspect.getmembers(self.api, predicate=inspect.ismethod)
        for name, _ in member_functions:
            # for each non-dunder method in the api, define the callback api in the javascript window
            if not (name.startswith("__") or name.endswith("__")):
                self.runscript(f"window.api.{name} = pywebview.api.{name}")

        # Signal JS Commands can be run on this webview
        loaded_event.set()

    def _manage_queue(self):
        logger.debug("Entered Manage_Queue")
        while 1:
            # infinate loop to recieve any command that gets put in the queue
            cmd, args = self.fwd_queue.get()
            logger.debug("PyWv Recieved cmd: %s, args: %s", str(cmd), str(args))

            if JS_CMD.JS == cmd and isinstance(args, str):
                self.runscript(args)


class QWebView:  # (View):
    """Class to create and manage a Pyside QWebView widget"""

    def __init__(self) -> None:
        raise NotImplementedError
