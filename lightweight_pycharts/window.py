""" Python Classes that handle the various GUI Widgets """

from __future__ import annotations
import logging
import asyncio
import multiprocessing as mp
from functools import partial
from dataclasses import asdict
from typing import Literal, Optional, Any

import pandas as pd

from . import orm
from . import util
from .orm import layouts, Symbol, TF
from .events import Events, Emitter, Socket_Switch_Protocol
from .js_api import PyWv, MpHooks
from .js_cmd import JS_CMD, PY_CMD
from .orm.series import (
    AnyBasicData,
    Series_DF,
    SeriesType,
)

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
        self._queue_manager = asyncio.create_task(self._manage_queue())

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
            case PY_CMD.SERIES_CHANGE, str(), str(), orm.series.SeriesType():
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
        data: Optional[pd.DataFrame],
        *_,
        frame: Frame,
        symbol: orm.Symbol,
        timeframe: orm.TF,
        socket_switch: Emitter[Socket_Switch_Protocol],  # Set by Partial Func
    ):
        # Close the socket if there was a symbol change
        if frame.socket_open and frame.symbol != symbol:
            socket_switch(state="close", symbol=frame.symbol, frame=frame)

        if data is not None:
            # Set Data *before* frame.update_data can be called
            frame.set_data(data, symbol)
            if not frame.socket_open:
                socket_switch(state="open", symbol=symbol, frame=frame)
        else:
            if frame.socket_open:
                # Closes the socket if an invalid timeframe was selected.
                socket_switch(state="close", symbol=frame.symbol, frame=frame)
            # Clear Data *after* Socket close so socket close get passed the old symbol
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

    def new_tab(self) -> Container:
        """
        Add a new Tab to the Window interface
        :returns: A Container obj that represents the Tab's Contents
        """
        new_id = self._container_ids.generate()
        new_container = Container(new_id, self._fwd_queue, self)
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

    def set_series_favs(self, favs: list[orm.series.SeriesType]):
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


class Container:
    "A Container Class instance manages the all sub frames and the layout that contains them."

    def __init__(self, js_id: str, fwd_queue: mp.Queue, window: Window) -> None:
        self._fwd_queue = fwd_queue
        self._window = window
        self.js_id = js_id
        self.layout_type = layouts.SINGLE
        self.frame_ids = util.ID_List(f"{js_id}_f")
        self.frames: list[Frame] = []

        self._fwd_queue.put((JS_CMD.ADD_CONTAINER, self.js_id))
        self.set_layout(self.layout_type)  # Adds First Frame

    def __del__(self):
        logger.debug("Deleteing Container: %s", self.js_id)

    def _add_frame_(self):
        # Only Add a frame if the layout can support it
        if len(self.frames) < self.layout_type.num_frames:
            new_id = self.frame_ids.generate()
            self.frames.append(Frame(new_id, self.js_id, self._fwd_queue, self._window))

    def set_layout(self, layout: layouts):
        "Set the layout of the Container creating Frames as needed"
        self._fwd_queue.put((JS_CMD.SET_LAYOUT, self.js_id, layout))
        self.layout_type = layout

        # If there arent enough Frames to support the layout then generate them
        frame_diff = len(self.frame_ids) - self.layout_type.num_frames
        if frame_diff < 0:
            for _ in range(-frame_diff):
                self._add_frame_()

    def get_frame(self, _id: int | str) -> Optional["Frame"]:
        "Return the container that either matchs the given js_id string, or the integer tab number"
        if isinstance(_id, str):
            for frame in self.frames:
                if _id == frame.js_id:
                    return frame
        else:
            if _id >= 0 and _id < len(self.frames):
                return self.frames[_id]

    def all_ids(self) -> list[str]:
        "Return a List of all Ids of this object and sub-objects"
        _ids = [self.js_id]
        for frame in self.frames:
            _ids += frame.all_ids()
        return _ids


class Frame:
    """
    Frame Objects primarily hold information about the timeseries that is being displayed. They
    retain a copy of data that is used across all sub-panes as well as the references to said panes.
    """

    AUTO_DISP_VOLUME: bool = True

    def __init__(
        self, js_id: str, parent_id: str, fwd_queue: mp.Queue, window: Window
    ) -> None:
        self.js_id = js_id
        self._fwd_queue = fwd_queue
        self._window = window
        self.panes: list[Pane] = []
        self.pane_ids = util.ID_List(f"{js_id}_p")

        self.socket_open = False
        self.symbol: Optional[Symbol] = None
        self.main_data: Optional[Series_DF] = None
        self.whitespace_data: Optional[Series_DF] = None
        self.series_type: SeriesType = SeriesType.Candlestick

        self._fwd_queue.put((JS_CMD.ADD_FRAME, js_id, parent_id))

        # Add main pane
        new_id = self.pane_ids.affix("main")
        self.main_pane = Pane(new_id, self.js_id, self._fwd_queue, self._window)

    def __del__(self):
        logger.debug("Deleteing Frame: %s", self.js_id)

    def _add_pane_(self):
        new_id = self.pane_ids.generate()
        self.panes.append(Pane(new_id, self.js_id, self._fwd_queue, self._window))

    def all_ids(self) -> list[str]:
        "Return a List of all Ids of this object and sub-objects"
        _ids = [self.js_id]
        for pane in self.panes:
            _ids += pane.all_ids()
        return _ids

    def change_series_type(self, series_type: SeriesType):
        "Change the Series Type of the main dataset"
        # Check and Massage Input
        if series_type == SeriesType.WhitespaceData:
            return
        if series_type == SeriesType.OHLC_Data:
            series_type = SeriesType.Candlestick
        if series_type == SeriesType.SingleValueData:
            series_type = SeriesType.Line
        if self.main_data is None or self.series_type == series_type:
            return

        # Set. No Data renaming needed, that is handeled when converting to json
        self.series_type = series_type
        self.main_data.disp_type = series_type
        self._fwd_queue.put(
            (JS_CMD.SET_SERIES_TYPE, self.js_id, series_type, self.main_data)
        )

    def set_data(
        self,
        data: pd.DataFrame | list[dict[str, Any]],
        symbol: Optional[Symbol] = None,
    ):
        "Sets the main source of data for this Frame"
        # Update the Symbol Regardless if data is good or not
        if symbol is not None:
            self.symbol = symbol
            self._fwd_queue.put((JS_CMD.SET_SYMBOL, self.js_id, symbol))

        if not isinstance(data, pd.DataFrame):
            data = pd.DataFrame(data)
        self.main_data = Series_DF(data, self.series_type)
        self.main_data.disp_type = self.series_type

        # Clear and Return on bad data.
        if self.main_data.tf == TF(1, "E"):
            self.clear_data()
            return
        if self.main_data.disp_type == SeriesType.WhitespaceData:
            self.clear_data(timeframe=self.main_data.tf)
            return

        self.whitespace_data = Series_DF(
            self.main_data.whitespace_df(), SeriesType.WhitespaceData
        )

        self._fwd_queue.put(
            (JS_CMD.SET_DATA, self.js_id, self.main_data, self.whitespace_data)
        )
        self._fwd_queue.put((JS_CMD.SET_TIMEFRAME, self.js_id, self.main_data.tf))

    def update_data(self, data: AnyBasicData, accumulate=False):
        """
        Updates the prexisting Frame's Primary Dataframe.
        The data point's time must be equal to or greater than the last data point.

        Can Accept WhitespaceData, SingleValueData, and OhlcData.
        Function will auto detect if this is a tick or bar update.
        When Accumulate is set to True, tick updates will accumulate volume,
        otherwise the last volume will be overwritten.
        """
        # Ignoring Operator issue, it's a false alarm since WhitespaceData.__post_init__()
        # Will Always convert 'data.time' to a compatible pd.Timestamp.
        if self.main_data is None or data.time < self.main_data.curr_bar_time:  # type: ignore
            return

        if data.time < self.main_data.next_bar_time:  # type: ignore
            display_data = self.main_data.update_from_tick(data, accumulate=accumulate)
        else:
            if data.time != self.main_data.next_bar_time:
                # Update given is not the expected time. Ensure it fits the data's time interval
                time_delta = data.time - self.main_data.next_bar_time  # type: ignore
                data.time -= time_delta % self.main_data.pd_tf

            update_whitespace = data.time > self.main_data.next_bar_time  # type: ignore

            display_data = self.main_data.update(data)

            if self.whitespace_data is not None:
                if update_whitespace:
                    # New Data Jumped more than expected, Replace Whitespace Data So
                    # There are no unnecessary gaps.
                    self.whitespace_data = Series_DF(
                        self.main_data.whitespace_df(), SeriesType.WhitespaceData
                    )
                    self._fwd_queue.put(
                        (JS_CMD.SET_WHITESPACE_DATA, self.js_id, self.whitespace_data)
                    )
                else:
                    # Lengthen Whitespace Data to keep 500bar Buffer
                    next_piece = self.whitespace_data.extend()
                    self._fwd_queue.put(
                        (JS_CMD.UPDATE_WHITESPACE_DATA, self.js_id, next_piece)
                    )
            # TODO?: Send out new_bar emitter here

        # Whitespace Data must be manipulated before Main Series for proper display.
        self._fwd_queue.put((JS_CMD.UPDATE_DATA, self.js_id, display_data))

    # The Timeframe and Symbol are inputs to prevent the symbol search from getting locked-up.
    # e.g. If the current symbol doesn't exist and no data exists at the current timeframe,
    # then the frame would be in a locked state if it only ever updated when setting valid data.
    def clear_data(
        self, timeframe: Optional[TF] = None, symbol: Optional[Symbol] = None
    ):
        """Clears the data in memory and on the screen and, if not none,
        updates the desired timeframe and symbol for the Frame"""
        self.main_data = None
        self.whitespace_data = None
        self._fwd_queue.put((JS_CMD.CLEAR_DATA, self.js_id))
        self._fwd_queue.put((JS_CMD.CLEAR_WHITESPACE_DATA, self.js_id))
        if self.socket_open:
            # Ensure Socket is Closed
            self._window.events.socket_switch(
                state="close", symbol=self.symbol, frame=self
            )

        if symbol is not None:
            self.symbol = symbol
            self._fwd_queue.put((JS_CMD.SET_SYMBOL, self.js_id, symbol))
        if timeframe is not None:
            self._fwd_queue.put((JS_CMD.SET_TIMEFRAME, self.js_id, timeframe))


class Pane:
    """An individual charting window, can contain seriesCommon objects and indicators"""

    def __init__(
        self, js_id: str, parent_id: str, fwd_queue: mp.Queue, window: Window
    ) -> None:
        self._fwd_queue = fwd_queue
        self._window = window
        self.js_id = js_id
        self.main_series = None

        self._fwd_queue.put((JS_CMD.ADD_PANE, js_id, parent_id))

    def all_ids(self) -> list[str]:
        "Return a List of all Ids of this object and sub-objects"
        return [self.js_id]
