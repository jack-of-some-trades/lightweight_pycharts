""" Python Classes that handle the various GUI Widgets """

import asyncio
import logging
from time import sleep
import threading as th
import multiprocessing as mp
from dataclasses import asdict
from typing import Optional, Any

import pandas as pd

from . import orm
from . import util
from .js_api import PyWv, MpHooks
from .js_cmd import JS_CMD, PY_CMD

logger = logging.getLogger("lightweight-pycharts")


class Events:
    "A Super Object that is a Collection of Emitters"

    def __init__(self):
        self.tf_change = util.Emitter[util.TimeFrame_Protocol]()
        self.layout_change = util.Emitter[util.Layout_Protocol]()


class Window:
    """Window is an object that handles the Javascript Webview Object
    This window creates and handels a Javascript implementation of:
        - Application Frame     *TBI
        - Window Tabs           *TBI
        - Toolbar               *TBI
        - Search Bar            *TBI
        - Interval Switcher     *TBI
        - Watchlist, etc.       *TBI

    Window contains a 'Container' object for every tab. ... To be implented
    """

    def __init__(
        self,
        *,
        daemon: bool = False,
        use_async: bool = True,
        options: Optional[orm.options.PyWebViewOptions] = None,
        **kwargs,
    ) -> None:
        # -------- Setup and start the Pywebview subprocess  -------- #
        if options is not None:
            # PyWebviewOptions Given, overwrite anything in kwargs.
            kwargs = asdict(options)

        if "debug" in kwargs.keys() and kwargs["debug"]:
            logger.setLevel(logging.DEBUG)

        # create and then unpack the hooks directly into class variables
        mp_hooks = MpHooks()
        self._fwd_queue = mp_hooks.fwd_queue
        self._rtn_queue = mp_hooks.rtn_queue
        self._start_event = mp_hooks.start_event
        self._stop_event = mp_hooks.stop_event
        self._js_loaded_event = mp_hooks.js_loaded_event

        kwargs["mp_hooks"] = mp_hooks  # Pass the hooks along to PyWv
        self._view_process = mp.Process(target=PyWv, kwargs=kwargs, daemon=daemon)
        self._view_process.start()

        # Wait for PyWebview to load before continuing
        # js_loaded_event set in PyWv._assign_callbacks()
        if not self._js_loaded_event.wait(timeout=10):
            raise TimeoutError(
                "Failed to load PyWebView in a reasonable amount of time."
            )

        # Begin Listening for any responses from PyWV Process
        if use_async:
            self._queue_manager = asyncio.create_task(self._manage_queue())
        else:
            self._queue_manager = th.Thread(
                target=self._manage_thread_queue, daemon=daemon
            )
            self._queue_manager.start()

        # -------- Create Subobjects  -------- #
        self.events = Events()
        self.js_id = "wrapper"
        self._container_ids = util.ID_List("c")
        self.containers: list[Container] = []
        self.new_tab()

    # region ------------------------ Private Window Methods  ------------------------ #

    def _execute_cmd(self, cmd: PY_CMD, *args):
        match cmd, *args:
            case PY_CMD.PY_EXEC, str(), *_:
                logger.debug("Recieved Message from View: %s", args[0])
            case PY_CMD.TF_CHANGE, orm.TF(), *_:
                logger.debug("Recieved Timeframe Change Request from View: %s", args[0])
                self.events.tf_change(args[0])
            case PY_CMD.ADD_CONTAINER, *_:
                self.new_tab()
            case PY_CMD.REMOVE_CONTAINER, str(), *_:
                self.del_tab(args[0])
            case PY_CMD.REORDER_CONTAINERS, int(), int(), *_:
                self._container_ids.insert(args[1], self._container_ids.pop(args[0]))
                self.containers.insert(args[1], self.containers.pop(args[0]))

    def _manage_thread_queue(self):
        logger.debug("Entered Threaded Queue Manager")
        while not self._stop_event.is_set():
            if self._rtn_queue.empty():
                sleep(0.05)
            else:
                msg = self._rtn_queue.get()
                if isinstance(msg, tuple):
                    cmd, *rsp = msg
                else:
                    cmd = msg
                    rsp = tuple()
                self._execute_cmd(cmd, *rsp)
        logger.debug("Exited Threaded Queue Manager")

    async def _manage_queue(self):
        logger.debug("Entered Async Queue Manager")
        while not self._stop_event.is_set():
            if self._rtn_queue.empty():
                await asyncio.sleep(0.05)
            else:
                msg = self._rtn_queue.get()
                if isinstance(msg, tuple):
                    cmd, *rsp = msg
                else:
                    cmd = msg
                    rsp = tuple()
                self._execute_cmd(cmd, *rsp)
                # logger.debug("Window Recieved Command: %s: %s", cmd, rsp)
        logger.debug("Exited Async Queue Manager")

    def await_thread_close(self):
        "Await thread closure if using threading. Useful if Daemon = True"
        if isinstance(self._queue_manager, th.Thread):
            self._queue_manager.join()

    async def await_close(self):
        "Await closure if using asyncio. Useful if Daemon = True"
        if isinstance(self._queue_manager, asyncio.Task):
            await self._queue_manager

    def _queue_test(self):
        self._fwd_queue.put(
            (
                JS_CMD.JS_CODE,
                "api.callback(`weeeeeeeee`)",
                "api.callback(`weeeeeeeeeeeeeeeee`)",
            )
        )

    # endregion

    # region ------------------------ Public Window Methods  ------------------------ #

    def show(self):
        "Show the PyWebView Window"
        self._fwd_queue.put(JS_CMD.SHOW)

    def hide(self):
        "Hide the PyWebView Window"
        self._fwd_queue.put(JS_CMD.HIDE)

    def Maximize(self):
        "Hide the PyWebView Window"
        self._fwd_queue.put(JS_CMD.MAXIMIZE)

    def Minimize(self):
        "Hide the PyWebView Window"
        self._fwd_queue.put(JS_CMD.MINIMIZE)

    def Restore(self):
        "Hide the PyWebView Window"
        self._fwd_queue.put(JS_CMD.RESTORE)

    def Close(self):
        "Hide the PyWebView Window"
        self._fwd_queue.put(JS_CMD.CLOSE)

    def new_tab(self) -> "Container":
        """
        Add a new Tab to the Window interface
        :returns: A Container obj that represents the Tab's Contents
        """
        new_id = self._container_ids.generate()
        new_container = Container(new_id, self._fwd_queue)
        self.containers.append(new_container)
        return new_container

    def del_tab(self, container_id: str) -> None:
        """
        Deletes a Tab. Argument Passed should be the JS_ID of the container
        """
        for container in self.containers:
            if container.js_id == container_id:
                self._container_ids.remove(container_id)
                self.containers.remove(container)
                self._fwd_queue.put((JS_CMD.REMOVE_CONTAINER, container_id))
                self._fwd_queue.put((JS_CMD.REMOVE_REFERENCE, *container.all_ids()))

    def get_container(self, _id: int | str) -> Optional["Container"]:
        "Return the container that either matchs the given js_id string, or the integer tab number"
        if isinstance(_id, int):
            if _id >= 0 and _id < len(self.containers):
                return self.containers[_id]
        else:
            for container in self.containers:
                if _id == container.js_id:
                    return container

    # endregion


class Container:

    def __init__(self, js_id: str, fwd_queue: mp.Queue) -> None:
        self._fwd_queue = fwd_queue
        self.js_id = js_id
        self.layout_type = orm.layouts.SINGLE
        self.frame_ids = util.ID_List(f"{js_id}_f")
        self.frames: list[Frame] = []

        self._fwd_queue.put((JS_CMD.ADD_CONTAINER, self.js_id))
        self.set_layout(self.layout_type)

    def set_layout(self, layout: orm.layouts):
        self._fwd_queue.put((JS_CMD.SET_LAYOUT, self.js_id, layout))
        self.layout_type = layout

        # If there arent enough Frames to support the layout then generate them
        frame_diff = len(self.frame_ids) - self.layout_type.num_frames
        if frame_diff < 0:
            for _ in range(-frame_diff):
                self._add_frame_()

    def _add_frame_(self):
        # Only Add a frame if the layout can support it
        if len(self.frames) < self.layout_type.num_frames:
            new_id = self.frame_ids.generate()
            self.frames.append(Frame(new_id, self))

    def all_ids(self) -> list[str]:
        "Return a List of all Ids of this object and sub-objects"
        _ids = [self.js_id]
        for frame in self.frames:
            _ids += frame.all_ids()
        return _ids


class Frame:
    """Frame Objects primarily hold information about multi-chart layouts.
    They also handle chart syncing(?) of: #Should they?
        - Crosshairs    *TBI
        - Symbols       *TBI
        - Timeframe     *TBI
        - Interval      *TBI
        - Date Range    *TBI
    """

    def __init__(self, js_id: str, parent: Container) -> None:
        self._fwd_queue = parent._fwd_queue
        self.parent = parent
        self.js_id = js_id
        self.pane_ids = util.ID_List(f"{js_id}_p")
        self.panes: list[Pane] = []

        self._fwd_queue.put((JS_CMD.ADD_FRAME, js_id, self.parent.js_id))

        # Add main pane
        new_id = self.pane_ids.affix("main")
        self.panes.append(Pane(new_id, self))

    def _add_pane(self):
        new_id = self.pane_ids.generate()
        self.panes.append(Pane(new_id, self))

    def all_ids(self) -> list[str]:
        "Return a List of all Ids of this object and sub-objects"
        _ids = [self.js_id]
        for pane in self.panes:
            _ids += pane.all_ids()
        return _ids


class Pane:
    """An individual charting window, can contain seriesCommon objects and indicators"""

    def __init__(self, js_id: str, parent: Frame) -> None:
        self._fwd_queue = parent._fwd_queue
        self.parent = parent
        self.js_id = js_id
        self.sources = []

        self._fwd_queue.put((JS_CMD.ADD_PANE, js_id, self.parent.js_id))

    def set_data(self, data: pd.DataFrame | list[dict[str, Any]]):
        "Sets the main source of data for this Pane"
        if not isinstance(data, pd.DataFrame):
            data = pd.DataFrame(data)

        self._fwd_queue.put((JS_CMD.SET_DATA, self.js_id, data))

    def add_source(self, data: pd.DataFrame | list[dict[str, Any]]):
        """Creates a new source of data for the Pane. Sources are analogous to Ticker Data or indicators"""

    def all_ids(self) -> list[str]:
        "Return a List of all Ids of this object and sub-objects"
        return [self.js_id]


class Source:
    """A Source Object. Sources contain various Series Elements"""
