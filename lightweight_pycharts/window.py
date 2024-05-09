""" Python Classes that handle the various GUI Widgets """

import logging
import asyncio
from re import L
import threading as th
import multiprocessing as mp
from time import sleep
from functools import partial
from dataclasses import asdict
from typing import Literal, Optional

from pandas import DataFrame

from . import orm
from . import util
from .events import Events, Emitter, Socket_Switch_Protocol
from .js_api import PyWv, MpHooks
from .js_cmd import JS_CMD, PY_CMD
from .containers import Container, Frame

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
        self.events.symbol_search.response = partial(
            self._symbol_search_rsp, fwd_queue=self._fwd_queue
        )
        self.events.data_request.response = partial(
            self._data_request_rsp, socket_switch=self.events.socket_switch
        )

        self.js_id = "wrapper"
        self._container_ids = util.ID_List("c")
        self.containers: list[Container] = []
        self.new_tab()

    # region ------------------------ Private Window Methods  ------------------------ #

    def _execute_cmd(self, cmd: PY_CMD, *args):
        logger.debug("PY_CMD: %s: %s", PY_CMD(cmd).name, str(args))
        match cmd, *args:
            case PY_CMD.SYMBOL_SEARCH, str(), bool(), list(), list(), list():
                self.events.symbol_search(
                    ticker=args[0],
                    confirmed=args[1],
                    types=args[2],
                    brokers=args[3],
                    exchanges=args[4],
                )
            case PY_CMD.DATA_REQUEST, str(), str(), orm.Symbol(), orm.TF():
                if (container := self.get_container(args[0])) is None:
                    logger.warning(
                        "Failed Timeframe Switch, Couldn't find Conatiner ID %s",
                        args[0],
                    )
                    return
                if (frame := container.get_frame(args[1])) is None:
                    logger.warning(
                        "Failed Timeframe Switch, Could not find Frame ID '%s'", args[1]
                    )
                    return
                kwargs = {"frame": frame, "symbol": args[2], "timeframe": args[3]}
                self.events.data_request(symbol=args[2], tf=args[3], rsp_kwargs=kwargs)
            case PY_CMD.LAYOUT_CHANGE, str(), orm.enum.layouts():
                if (container := self.get_container(args[0])) is None:
                    logger.warning("Couldn't find Container '%s'", args[0])
                    return
                container.set_layout(args[1])
            case PY_CMD.SERIES_CHANGE, str(), str(), orm.enum.SeriesType():
                if (container := self.get_container(args[0])) is None:
                    logger.warning(
                        "Failed Series Type Change, Couldn't find Conatiner ID %s",
                        args[0],
                    )
                    return
                if (frame := container.get_frame(args[1])) is None:
                    logger.warning(
                        "Failed Series Type Change, Couldn't find Frame ID %s",
                        args[1],
                    )
                    return
                frame.change_series_type(args[2])
            case PY_CMD.ADD_CONTAINER, *_:
                self.new_tab()
            case PY_CMD.REMOVE_CONTAINER, str():
                self.del_tab(args[0])
            case PY_CMD.REORDER_CONTAINERS, int(), int():
                self._container_ids.insert(args[1], self._container_ids.pop(args[0]))
                self.containers.insert(args[1], self.containers.pop(args[0]))
            case PY_CMD.PY_EXEC, str():
                logger.info("Recieved Message from View: %s", args[0])

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

    # region ------------------------ Private Event Response Methods  ------------------------ #

    @staticmethod
    def _symbol_search_rsp(items: list[orm.types.Symbol], *_, fwd_queue: mp.Queue):
        fwd_queue.put((JS_CMD.SET_SYMBOL_ITEMS, items))

    @staticmethod
    def _data_request_rsp(
        data: Optional[DataFrame],
        *_,
        frame: Frame,
        symbol: orm.Symbol,
        timeframe: orm.TF,
        socket_switch: Emitter[Socket_Switch_Protocol],  # Set by Partial Func
    ):
        # Close the socket if there was a symbol change
        if frame.socket_open and frame.symbol != symbol:
            socket_switch("close", frame.symbol, frame)
            frame.socket_open = False

        if data is not None:
            # Need to set frame.main_data before frame.update_data is called
            frame.set_data(data, symbol)
            if not frame.socket_open:
                socket_switch("open", symbol, frame)
                frame.socket_open = True
        else:
            if (
                frame.socket_open
            ):  # Closes the socket if an invalid timeframe was selected.
                socket_switch("close", frame.symbol, frame)
                frame.socket_open = False
            # Clear Data after Socket close so socket close get passed the old symbol
            frame.clear_data(timeframe, symbol)

    # endregion

    # region ------------------------ Public Window Methods  ------------------------ #

    def show(self):
        "Show the PyWebView Window"
        self._fwd_queue.put(JS_CMD.SHOW)

    def hide(self):
        "Hide the PyWebView Window"
        self._fwd_queue.put(JS_CMD.HIDE)

    def maximize(self):
        "Hide the PyWebView Window"
        self._fwd_queue.put(JS_CMD.MAXIMIZE)

    def minimize(self):
        "Hide the PyWebView Window"
        self._fwd_queue.put(JS_CMD.MINIMIZE)

    def restore(self):
        "Hide the PyWebView Window"
        self._fwd_queue.put(JS_CMD.RESTORE)

    def close(self):
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

                for frame in container.frames:
                    if frame.socket_open:
                        self.events.socket_switch("close", frame.symbol, frame)
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

    def set_search_filters(
        self, category: Literal["type", "broker", "exchange"], items: list[str]
    ):
        """Set the search filters available when searching for a Symbol.
        'type'==Security Types, 'broker'==Data Brokers, 'exchange' == Security's Exchange
        """
        self._fwd_queue.put((JS_CMD.SET_SYMBOL_SEARCH_OPTS, category, items))

    def set_layout_favs(self, favs: list[orm.layouts]):
        "Set the layout types shown on the window's TopBar"
        self._fwd_queue.put((JS_CMD.UPDATE_LAYOUT_FAVS, {"favorites": favs}))

    def set_series_favs(self, favs: list[orm.enum.SeriesType]):
        "Set the Series types shown on the window's TopBar"
        self._fwd_queue.put((JS_CMD.UPDATE_SERIES_FAVS, {"favorites": favs}))

    def set_timeframes(self, favs: list[orm.TF], opts: Optional[list[orm.TF]] = None):
        "Set the Timeframes shown on the window's TopBar and in the dropdown menu"
        menu_opts = {}
        if opts is not None:
            for fav in favs:
                if fav not in opts:
                    opts.append(fav)

            for option in opts:
                if option.period in menu_opts.keys():
                    menu_opts[option.period] += [option.mult]
                else:
                    menu_opts[option.period] = [option.mult]
        else:
            menu_opts = {
                "s": [1, 2, 5, 15, 30],
                "m": [1, 2, 5, 15, 30],
                "h": [1, 2, 4],
                "D": [1],
                "W": [1],
            }
        json_dict = {
            "menu_listings": menu_opts,
            "favorites": [tf.toString for tf in favs],
        }
        self._fwd_queue.put((JS_CMD.UPDATE_TF_OPTS, json_dict))

    # endregion
