""" Classes and functions that handle implementation of chart indicators """

from abc import ABC
from logging import getLogger
from dataclasses import dataclass
from typing import Optional, Any, TYPE_CHECKING

import pandas as pd


from . import series_common as sc
from .util import ID_List, ID_Dict
from .js_cmd import JS_CMD
from .orm import Symbol, TF
from .orm.series import AnySeriesData, Series_DF, SeriesType, AnyBasicData

if TYPE_CHECKING:
    from .window import Frame

logger = getLogger("lightweight-pycharts")


class Indicator(ABC):
    """
    Indicator Abstract Base Class.

    Indicators take a frame as an argument. Using this reference they append themselves to the
    Indicators Dict of said Frame. While a child object appending itself to their parent's dict
    obfuscates the how that dict is populated, it id by far the simplest solution.
    """

    # The first alternative would be requesting a JS_ID from the Frame, letting the user create the
    # object. The problem is that there is no indication that the user *must* get an ID from the
    # frame. They could have simply supplied their own string and run into bugs issue later.

    # The second alternative would be to have the user supply the Indicator subclass and all the
    # required arguments only for the Frame to then construct and return the indicator. This isn't
    # ideal since you lose all type checking during object creation.

    def __init__(
        self,
        parent: "Frame",
        js_id: Optional[str] = None,
        display_pane_id: Optional[str] = None,
    ) -> None:
        super().__init__()

        if display_pane_id is None:
            display_pane_id = parent.main_pane.js_id  # Should be the main pane
        if js_id is None:
            self.js_id = parent.indicators.generate(self)
        else:
            self.js_id = parent.indicators.affix(js_id, self)

        self._ids = display_pane_id, self.js_id
        # Tuple of Ids to make addressing easier through Queue: order = (pane, indicator)

        self._parent = parent
        self._events = parent._window.events
        self._fwd_queue = parent._fwd_queue

        self.sockets: list[Symbol] = []
        self._series_ = ID_Dict[sc.SeriesCommon]("s")
        self._primitives_ = ID_List("p")
        # TODO: Make into an ID_Dict once Primitive Baseclass is made.

        self._fwd_queue.put((JS_CMD.ADD_INDICATOR, *self._ids, self.__class__.__name__))

    def remove_self(self):
        "Remove the indicator and all of it's instance objects"

    def move_pane(self):
        "Move the indicator to a new pane within the current frame."

    def set_data(
        self,
        data: pd.DataFrame | list[dict[str, Any]],
        symbol: Optional[Symbol] = None,
        **kwargs
    ):
        "Set the base data of the indicator"

    def update_data(self, data: AnySeriesData):
        "Update the indicator given a single realtime or barclose update"

    def clear_data(self):
        "Clear Data from the indicator, resetting it the post __init__ state"

    def retrieve(self):
        "Fetch Data from this indicator"

    def hoist(self):
        "Hoist Data From another indicator into this one."

    def subscribe(self):
        "subscribe to data updates"


@dataclass
class SeriesIndicatorOptions:
    "Indicator Options for a Series"
    series_type: SeriesType = SeriesType.Candlestick
    create_whitespace: bool = False


class Series(Indicator):
    """
    Draws a Series Object onto the Screen. Expends on SeriesCommon behavior by filtering / massaging
    data, Creating a Whitespace Expansion Series, & Allowing the ability to change the series type.

    Other Indicators should attach to this object's bar updates as a filtered form of data.
    """

    __special_id__ = "XyzZy"

    def __init__(
        self,
        parent: "Frame",
        js_id: Optional[str] = None,
        options: SeriesIndicatorOptions = SeriesIndicatorOptions(),
    ) -> None:
        super().__init__(parent, js_id)

        # Dunder to allow specific permissions to the main source of a data for a Frame.
        # Because reasons, the user can never accidentally set the js_id to be __special_id__.
        self.__frame_primary_src__ = js_id == Series.__special_id__

        self.options = options
        self.socket_open = False
        self.symbol: Optional[Symbol] = None
        self.main_data: Optional[Series_DF] = None
        self.whitespace_data: Optional[Series_DF] = None
        self.series_type: SeriesType = options.series_type

        self.main_series = sc.CandlestickSeries(self)

    def set_data(
        self,
        data: pd.DataFrame | list[dict[str, Any]],
        symbol: Optional[Symbol] = None,
        **kwargs
    ):
        "Sets the main source of data for this Frame"
        # Update the Symbol Regardless if data is good or not
        if symbol is not None:
            self.symbol = symbol
            if self.__frame_primary_src__:
                self._fwd_queue.put(
                    (JS_CMD.SET_FRAME_SYMBOL, self._parent.js_id, symbol)
                )

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

        # Only make Whitespace Series if this is the primary dataset
        if self.__frame_primary_src__:
            self.whitespace_data = Series_DF(
                self.main_data.whitespace_df(), SeriesType.WhitespaceData
            )
            self._fwd_queue.put(
                (JS_CMD.SET_WHITESPACE_DATA, self._parent.js_id, self.whitespace_data)
            )

        self.main_series.set_data(self.main_data)

        if self.__frame_primary_src__:
            # Only do this once everything else has completed and not Error'd.
            self._fwd_queue.put(
                (JS_CMD.SET_FRAME_TIMEFRAME, self._parent.js_id, self.main_data.tf)
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

            # Manage Whitespace Series
            if self.__frame_primary_src__:
                if update_whitespace:
                    # New Data Jumped more than expected, Replace Whitespace Data So
                    # There are no unnecessary gaps.
                    self.whitespace_data = Series_DF(
                        self.main_data.whitespace_df(), SeriesType.WhitespaceData
                    )
                    self._fwd_queue.put(
                        (
                            JS_CMD.SET_WHITESPACE_DATA,
                            self._parent.js_id,
                            self.whitespace_data,
                        )
                    )
                elif self.whitespace_data is not None:
                    # Lengthen Whitespace Data to keep 500bar Buffer
                    next_piece = self.whitespace_data.extend()
                    self._fwd_queue.put(
                        (JS_CMD.UPDATE_WHITESPACE_DATA, self._parent.js_id, next_piece)
                    )

        # Whitespace Data must be manipulated before Main Series to prevent jumpy display?
        self.main_series.update_data(display_data)
        # TODO?: Send out new_bar emitter here

    def clear_data(
        self, timeframe: Optional[TF] = None, symbol: Optional[Symbol] = None
    ):
        """Clears the data in memory and on the screen and, if not none,
        updates the desired timeframe and symbol for the Frame"""
        self.main_data = None
        self.main_series.clear_data()

        if self.__frame_primary_src__:
            self.whitespace_data = None
            self._fwd_queue.put((JS_CMD.CLEAR_WHITESPACE_DATA, self._parent.js_id))

        if self.socket_open:
            # Ensure Socket is Closed
            self._events.socket_switch(
                state="close", symbol=self.symbol, indicator=self
            )

        if symbol is not None:
            self.symbol = symbol
            if self.__frame_primary_src__:
                self._fwd_queue.put(
                    (JS_CMD.SET_FRAME_SYMBOL, self._parent.js_id, symbol)
                )

        if timeframe is not None and self.__frame_primary_src__:
            self._fwd_queue.put(
                (JS_CMD.SET_FRAME_TIMEFRAME, self._parent.js_id, timeframe)
            )

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
        self.main_series.change_series_type(series_type, self.main_data)

        # Update window display if necessary
        if self.__frame_primary_src__:
            self._fwd_queue.put(
                (
                    JS_CMD.SET_FRAME_SERIES_TYPE,
                    self._parent.js_id,
                    self.series_type,
                )
            )
