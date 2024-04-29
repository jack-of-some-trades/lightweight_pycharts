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
from .events import Events
from .js_api import PyWv, MpHooks
from .js_cmd import JS_CMD, PY_CMD
from .containers import Container

logger = logging.getLogger("lightweight-pycharts")


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
        logger.debug("Recieved Command: %s, Args:%s", cmd, args)
        match cmd, *args:
            case PY_CMD.ADD_CONTAINER, *_:
                self.new_tab()
            case PY_CMD.REMOVE_CONTAINER, str(), *_:
                self.del_tab(args[0])
            case PY_CMD.REORDER_CONTAINERS, int(), int(), *_:
                self._container_ids.insert(args[1], self._container_ids.pop(args[0]))
                self.containers.insert(args[1], self.containers.pop(args[0]))
            case PY_CMD.TIMEFRAME_CHANGE, str(), str(), orm.TF(), *_:
                if (container := self.get_container(args[0])) is None:
                    logger.warning(
                        "Failed Timeframe Switch, Couldn't find Conatiner ID %s",
                        args[0],
                    )
                    return
                if (frame := container.get_frame(args[1])) is None:
                    logger.warning(
                        "Failed Timeframe Switch, Could not find Frame ID '%s'", args[0]
                    )
                    return
                logger.debug(
                    "Received TF Change Request: %s, Frame: %s", args[2], frame.js_id
                )
                self.events.tf_change(
                    timeframe=args[2], container=container, frame=frame
                )
            case PY_CMD.LAYOUT_CHANGE, str(), orm.enum.layouts(), *_:
                container = self.get_container(args[0])
                if container is None:
                    logger.warning(
                        "Failed layout change, Couldn't find Container '%s'", args[0]
                    )
                    return
                self.events.layout_change(layout=args[1], container=container)
                container.set_layout(args[1])
            case PY_CMD.PY_EXEC, str(), *_:
                logger.debug("Recieved Message from View: %s", args[0])

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
                return

    def get_container(self, _id: int | str) -> Optional[Container]:
        "Return the container that either matchs the given js_id string, or the integer tab number"
        if isinstance(_id, str):
            for container in self.containers:
                if _id == container.js_id:
                    return container
        else:
            if _id >= 0 and _id < len(self.containers):
                return self.containers[_id]

    # endregion
