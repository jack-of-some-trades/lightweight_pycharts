""" Python Classes that handle the various GUI Widgets """

import logging
import multiprocessing as mp
from tokenize import Single
from typing import Optional, Any

import pandas as pd

from . import util
from .orm import layouts, Symbol, TF
from .orm.series import (
    AnyBasicData,
    Series_DF,
    SeriesType,
    SingleValueData,
    WhitespaceData,
)
from .js_cmd import JS_CMD

logger = logging.getLogger("lightweight-pycharts")
# Membership test is a false-positive error
# pylint disable="unsupported-membership-test"


class Container:
    "A Container Class instance manages the all sub frames and the layout that contains them."

    def __init__(self, js_id: str, fwd_queue: mp.Queue) -> None:
        self._fwd_queue = fwd_queue
        self.js_id = js_id
        self.layout_type = layouts.SINGLE
        self.frame_ids = util.ID_List(f"{js_id}_f")
        self.frames: list[Frame] = []

        self._fwd_queue.put((JS_CMD.ADD_CONTAINER, self.js_id))
        self.set_layout(self.layout_type)

    def __del__(self):
        logger.debug("Deleteing Container: %s", self.js_id)

    def _add_frame_(self):
        # Only Add a frame if the layout can support it
        if len(self.frames) < self.layout_type.num_frames:
            new_id = self.frame_ids.generate()
            self.frames.append(Frame(new_id, self.js_id, self._fwd_queue))

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

    def __init__(self, js_id: str, parent_id: str, queue: mp.Queue) -> None:
        self.js_id = js_id
        self._fwd_queue = queue
        self.socket_open = False
        self.symbol: Optional[Symbol] = None
        self.main_data: Optional[Series_DF] = None
        self.whitespace_data: Optional[Series_DF] = None
        self.series_type = SeriesType.Candlestick

        self._fwd_queue.put((JS_CMD.ADD_FRAME, js_id, parent_id))

        # Add main pane
        self.panes: list[Pane] = []
        self.pane_ids = util.ID_List(f"{js_id}_p")
        new_id = self.pane_ids.affix("main")
        self.panes.append(Pane(new_id, self.js_id, self._fwd_queue))

    def __del__(self):
        logger.debug("Deleteing Frame: %s", self.js_id)

    def _add_pane(self):
        new_id = self.pane_ids.generate()
        self.panes.append(Pane(new_id, self.js_id, self._fwd_queue))

    def all_ids(self) -> list[str]:
        "Return a List of all Ids of this object and sub-objects"
        _ids = [self.js_id]
        for pane in self.panes:
            _ids += pane.all_ids()
        return _ids

    def change_series_type(self, series_type: SeriesType):
        "Change the Series Type of the main dataset"
        # Massage Input
        if series_type == SeriesType.WhitespaceData:
            return
        if series_type == SeriesType.OHLC_Data:
            series_type = SeriesType.Candlestick
        if series_type == SeriesType.SingleValueData:
            series_type = SeriesType.Line
        if self.series_type == series_type or self.main_data is None:
            return

        # Check that The Current Data Supports the Change
        if SeriesType.OHLC_Derived(series_type):
            if not self.main_data.is_ohlc:
                self.main_data.convert()
                if not self.main_data.is_ohlc:
                    logger.warning(
                        "Series Change Failed, Main_Data had no 'close' or 'value'"
                    )
                    return
        else:  # SeriesType.SValue_Derived(series_type):
            if not self.main_data.is_svalue:
                self.main_data.convert()
                if not self.main_data.is_svalue:
                    logger.warning(
                        "Series Change Failed, Main_Data had no 'close' or 'value'"
                    )
                    return

        # Set.
        self.series_type = series_type
        self._fwd_queue.put(
            (JS_CMD.SET_SERIES_TYPE, self.js_id, self.series_type, self.main_data)
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
        self.main_data = Series_DF(data)

        # Clear and Return on bad data.
        if self.main_data.tf == TF(1, "E"):
            self.clear_data()
            return
        if self.main_data.type == SeriesType.WhitespaceData:
            self.clear_data(timeframe=self.main_data.tf)
            return

        self._fwd_queue.put((JS_CMD.SET_DATA, self.js_id, self.main_data))
        self._fwd_queue.put((JS_CMD.SET_TIMEFRAME, self.js_id, self.main_data.tf))

        self.whitespace_data = Series_DF(self.main_data.whitespace_df())
        self._fwd_queue.put(
            (JS_CMD.SET_WHITESPACE_DATA, self.js_id, self.whitespace_data)
        )

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
        # Will Always convert 'data.time' to a compatable pd.Timestamp.
        if self.main_data is None or data.time < self.main_data.curr_bar_time:  # type: ignore
            return

        update_whitespace = data.time > self.main_data.next_bar_time  # type: ignore

        if data.time < self.main_data.next_bar_time:  # type: ignore
            display_data = self.main_data.update_from_tick(data, accumulate=accumulate)
        else:
            self.main_data.update(data)
            display_data = data

        if self.whitespace_data is not None:
            if update_whitespace:
                # New Data Jumped more than expected, Replace Whitespace Data So
                # There are no unnecessary gaps.
                self.whitespace_data = Series_DF(self.main_data.whitespace_df())
                self._fwd_queue.put(
                    (JS_CMD.SET_WHITESPACE_DATA, self.js_id, self.whitespace_data)
                )
            else:
                # Lengthen Whitespace Data to keep 500bar Buffer
                next_piece = self.whitespace_data.extend()
                self._fwd_queue.put(
                    (JS_CMD.UPDATE_WHITESPACE_DATA, self.js_id, next_piece)
                )

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
            # TODO: Close Socket...? but how...
            pass
        if symbol is not None:
            self.symbol = symbol
            self._fwd_queue.put((JS_CMD.SET_SYMBOL, self.js_id, symbol))
        if timeframe is not None:
            self._fwd_queue.put((JS_CMD.SET_TIMEFRAME, self.js_id, timeframe))


class Pane:
    """An individual charting window, can contain seriesCommon objects and indicators"""

    def __init__(self, js_id: str, parent_id: str, queue: mp.Queue) -> None:
        self._fwd_queue = queue
        self.js_id = js_id
        self.sources = []

        self._fwd_queue.put((JS_CMD.ADD_PANE, js_id, parent_id))

    def add_source(self, data: pd.DataFrame | list[dict[str, Any]]):
        """Creates a new source of data for the Pane."""

    def all_ids(self) -> list[str]:
        "Return a List of all Ids of this object and sub-objects"
        return [self.js_id]


class Source:
    """A Source Object. Sources contain various Series Elements"""
