""" Classes and functions that handle implementation of chart indicators """

from logging import getLogger
from dataclasses import dataclass
from abc import ABC, abstractmethod
from typing import Optional, Any

import pandas as pd

from . import window as win
from . import series_common as sc
from .util import ID_List, ID_Dict
from .js_cmd import JS_CMD
from .orm import Symbol, TF
from .orm.series import (
    Series_DF,
    SeriesType,
    AnyBasicData,
    Whitespace_DF,
    SingleValueData,
)

logger = getLogger("lightweight-pycharts")


@dataclass
class BarState:
    """
    Dataclass object that holds various information about the current bar. This object
    is given as an optional positional argument to the indicator update_data function.
    """

    timestamp: pd.Timestamp
    time_close: pd.Timestamp
    time_length: pd.Timedelta

    index: int = 0
    is_ext: bool = False
    is_new: bool = False
    is_realtime: bool = False


class Indicator(ABC):
    """
    Indicator Abstract Base Class.

    Indicators take a frame as an argument. Using this reference they append themselves to the
    Indicators Dictionary. While a child object appending itself to their parent's dict
    obfuscates the how that dict is populated, it is by far the simplest solution.
    """

    # The first alternative would be requesting a _js_id from the Frame, letting the user create the
    # object. The problem is that there is no indication that the user *must* get an ID from the
    # frame. They could have simply supplied their own string and run into bugs later.

    # The second alternative would be to have the user supply the Indicator subclass and all the
    # required arguments only for the Frame to then construct and return the indicator. This isn't
    # ideal since you lose all type checking during object creation, and the owner of the object
    # isn't the one actually creating the object.

    def __init__(
        self,
        parent: "win.Frame | Indicator",
        js_id: Optional[str] = None,
        display_pane_id: Optional[str] = None,
    ) -> None:
        super().__init__()

        if isinstance(parent, win.Frame):
            self._parent_frame = parent
        else:
            self._parent_frame = parent._parent_frame

        if display_pane_id is None:
            display_pane_id = self._parent_frame.main_pane._js_id

        if js_id is None:
            self._js_id = self._parent_frame.indicators.generate_id(self)
        else:
            self._js_id = self._parent_frame.indicators.affix_id(js_id, self)

        # Must preform this check after id generation so parent.main_series is guaranteed valid.
        # (Specifically for when parent.main_series is trying to find a reference to itself)
        if isinstance(parent, win.Frame):
            self._parent_indicator = parent.main_series
        else:
            self._parent_indicator = parent

        # Tuple of Ids to make addressing through Queue easier: order = (pane, indicator)
        self._ids = display_pane_id, self._js_id
        self._fwd_queue = self._parent_frame._fwd_queue
        self._events = self._parent_frame._window.events

        self.__observers__: list[Indicator] = []
        self.__observables__: list[Indicator] = []

        self._series_ = ID_Dict[sc.SeriesCommon]("s")
        self._primitives_ = ID_List("p")
        # TODO: Make into an ID_Dict once Primitive Baseclass is made.

        self._fwd_queue.put((JS_CMD.ADD_INDICATOR, *self._ids, self.__class__.__name__))

    def __del__(self):
        logger.debug("Deleteing %s: %s", self.__class__.__name__, self._js_id)

    @property
    def js_id(self) -> str:
        "Immutable Copy of the Object's Javascript_ID"
        return self._js_id

    def delete(self):
        "Remove the indicator and all of it's instance objects"
        for _, series in self._series_.items():
            series.delete()
        # for primitive in self._primitives_.copy():
        #     primitive.delete()
        self._parent_frame.indicators.pop(self._js_id)
        self._fwd_queue.put((JS_CMD.REMOVE_INDICATOR, *self._ids))

    @abstractmethod
    def set_data(
        self,
        data: Optional[Series_DF],
        *_,
        **kwargs,
    ):
        """
        Set the base data of the indicator. This is called when the base dataset of the indicator
        becomes available or changes due to a timeframe / symbol change.

        The typical set_data() function should take a single positional argument:
        data:Optional[Series_DF]. This is the main dataset stored by a Indicator Objects.

        Series_DF objects hold a pandas dataframe of either OHLCV or SingleValue Data.
        They also contains other useful identification parameters such as data_type, Timeframe,
        and potentially the relevant financial calendar (Market Hours and Holidays).

        This function should calculate what it needs to across the entire dataset and prepare
        its instance variables for iterable calculation when prompted with calls to update_data().

        Any additional arguments required by the indicator should be taken as optional
        Key Word arguments with a default value of 'None'.
        """

    @abstractmethod
    def update_data(
        self,
        data: Optional[AnyBasicData],
        bar_state: Optional[BarState],
        *_,
        **kwargs,
    ):
        """
        Update the indicator given a single realtime or new bar update. This is only called once
        set_data has been called on this Indicator at least once.

        The Data recieved from a Series(Indicator) instance will be AnyBasicData, and a bar_state.
        The BasicData's time will always be the opening time of the bar. This is crucial information
        since this time must be passed to any series object
        the lightweight charts API to update/draw new bars appropriately)
        """

    @abstractmethod
    def clear_data(self):
        "Clear Data from the indicator, resetting it the post __init__ state"

    def apply_options(self):
        "Applies the given set of indicator options"

    def retrieve(self):
        "Fetch Data from this indicator"

    def hoist(self):
        "Hoist Data From another indicator into this one."

    def subscribe(self, indicator: "Indicator"):
        "Subscribe an indicator to data updates. May not be Implemented"

    def unsubscribe(self, indicator: "Indicator"):
        "Unsubscribe an indicator from data updates. May not be Implemented"
        try:
            self.__observables__.remove(indicator)
        except ValueError:
            pass


@dataclass
class SeriesIndicatorOptions:
    "Indicator Options for a Series"
    series_type: SeriesType = SeriesType.Candlestick


class Series(Indicator):
    """
    Draws a Series Object onto the Screen. Expands SeriesCommon behavior by filtering & Aggregating
    data, Creating a Whitespace Expansion Series, & Allowing the ability to change the series type.

    Other Indicators should subscribe to this object's bar updates as a filtered form of data.
    """

    __special_id__ = "XyzZy"

    def __init__(
        self,
        parent: win.Frame,
        js_id: Optional[str] = None,
        options: SeriesIndicatorOptions = SeriesIndicatorOptions(),
    ) -> None:
        super().__init__(parent, js_id)

        # Dunder to allow specific permissions to the main source of a data for a Frame.
        # Because reasons, the user can never accidentally set the _js_id to be __special_id__.
        self.__frame_primary_src__ = (
            self._js_id == self._parent_frame.indicators.prefix + Series.__special_id__
        )

        self.opts = options
        self.socket_open = False
        self.symbol = Symbol("LWPC")
        self.main_data: Optional[Series_DF] = None
        self.whitespace_data: Optional[Whitespace_DF] = None

        self.main_series = sc.SeriesCommon(self, self.opts.series_type)

    def delete(self):
        super().delete()
        if self.socket_open:
            self._events.socket_switch(state="close", symbol=self.symbol, series=self)

    def set_data(
        self,
        data: pd.DataFrame | list[dict[str, Any]],
        *_,
        symbol: Optional[Symbol] = None,
        **__,
    ):
        "Sets the main source of data for this Frame"
        # Update the Symbol Regardless if data is good or not
        if symbol is not None:
            self.symbol = symbol
            if self.__frame_primary_src__:
                self._parent_frame.__set_displayed_symbol__(self.symbol)
        else:
            self.symbol = Symbol("LWPC")

        if self.__frame_primary_src__:
            self._parent_frame.__set_displayed_symbol__(self.symbol)

        # Initilize Data
        if not isinstance(data, pd.DataFrame):
            data = pd.DataFrame(data)
        self.main_data = Series_DF(data, self.symbol.exchange)

        # Clear and Return on bad data.
        if self.main_data.timeframe == TF(1, "E"):
            self.clear_data()
            return
        if self.main_data.data_type == SeriesType.WhitespaceData:
            self.clear_data(timeframe=self.main_data.timeframe)
            return

        # Only make Whitespace Series if this is the primary dataset
        if self.__frame_primary_src__:
            self.whitespace_data = Whitespace_DF(self.main_data)
            self._parent_frame.__set_whitespace__(self.whitespace_data.df)

        self.main_series.set_data(self.main_data)

        if self.__frame_primary_src__:
            # Only do this once everything else has completed and not Error'd.
            self._parent_frame.__set_displayed_timeframe__(self.main_data.timeframe)

        # Notify Observers
        for ind in self.__observers__:
            ind.set_data(self.main_data)

    def update_data(self, data: AnyBasicData, *_, accumulate=False, **__):
        """
        Updates the prexisting Frame's Primary Dataframe. The data point's time should
        be equal to or greater than the last data point otherwise this will have no effect.

        Can Accept WhitespaceData, SingleValueData, and OhlcData.
        Function will auto detect if this is a tick or bar update.
        When Accumulate is set to True, tick updates will accumulate volume,
        otherwise the last volume will be overwritten.
        """
        # Ignoring Operator issue, it's a false alarm since WhitespaceData.__post_init__()
        # Will Always convert 'data.time' to a compatible pd.Timestamp.
        if self.main_data is None or data.time < self.main_data.curr_bar_open_time:  # type: ignore
            return

        if data.time < self.main_data.next_bar_time:  # type: ignore
            # Update the last bar
            display_data = self.main_data.update_from_tick(data, accumulate=accumulate)
        else:
            # Create new Bar
            if data.time != self.main_data.next_bar_time:
                # Update given is a new bar, but not the expected time
                # Ensure it fits the data's time interval
                time_delta = data.time - self.main_data.next_bar_time  # type: ignore
                data.time -= time_delta % self.main_data.timedelta

            curr_bar_time = self.main_data.curr_bar_open_time
            display_data = self.main_data.update(data)

            # Manage Whitespace Series
            if self.__frame_primary_src__ and self.whitespace_data is not None:
                if data.time != (
                    expected_time := self.whitespace_data.next_timestamp(curr_bar_time)
                ):
                    # New Data Jumped more than expected, Replace Whitespace Data So
                    # There are no unnecessary gaps.
                    logger.info(
                        "Whitespace_DF Predicted incorrectly. Expected_time: %s, Recieved_time: %s",
                        expected_time,
                        data.time,
                    )
                    self.whitespace_data = Whitespace_DF(self.main_data)
                    self._parent_frame.__set_whitespace__(self.whitespace_data.df)
                else:
                    # Lengthen Whitespace Data to keep 500bar Buffer
                    self._parent_frame.__update_whitespace__(
                        self.whitespace_data.extend()
                    )

        self.main_series.update_data(display_data)

        # Notify Observers
        for ind in self.__observers__:
            ind.update_data(display_data, None)

    def clear_data(
        self, timeframe: Optional[TF] = None, symbol: Optional[Symbol] = None, **_
    ):
        """Clears the data in memory and on the screen and, if not none,
        updates the desired timeframe and symbol for the Frame"""
        self.main_data = None
        self.main_series.clear_data()

        if self.__frame_primary_src__:
            self.whitespace_data = None
            self._parent_frame.__clear_whitespace__()

        if self.socket_open:
            # Ensure Socket is Closed
            self._events.socket_switch(state="close", symbol=self.symbol, series=self)

        if symbol is not None:
            self.symbol = symbol
            if self.__frame_primary_src__:
                self._parent_frame.__set_displayed_symbol__(symbol)

        if timeframe is not None and self.__frame_primary_src__:
            self._parent_frame.__set_displayed_timeframe__(timeframe)

        # TODO: Clear Observers' Visuals?

    def change_series_type(self, series_type: SeriesType):
        "Change the Series Type of the main dataset"
        # Check Input
        if series_type == SeriesType.WhitespaceData:
            return
        if series_type == SeriesType.OHLC_Data:
            series_type = SeriesType.Candlestick
        if series_type == SeriesType.SingleValueData:
            series_type = SeriesType.Line
        if self.main_data is None or self.opts.series_type == series_type:
            return

        # Set. No Data renaming needed, that is handeled when converting to json
        self.opts.series_type = series_type
        self.main_series.change_series_type(series_type, self.main_data)

        # Update window display if necessary
        if self.__frame_primary_src__:
            self._parent_frame.__set_displayed_series_type__(self.opts.series_type)

    def subscribe(self, indicator: "Indicator"):
        "subscribe an indicator to data updates"
        self.__observers__.append(indicator)

        # Update observer immediately if we can.
        if self.main_data is not None:
            indicator.set_data(self.main_data)


class SMA(Indicator):
    "Simple Moving Average Indicator"

    def __init__(
        self,
        parent: win.Frame | Indicator,
        period: int,
        js_id: Optional[str] = None,
    ):
        super().__init__(parent, js_id)

        self.period = period
        self.hist_data: list[AnyBasicData] = []
        self.line_series = sc.LineSeries(self)

        self._parent_indicator.subscribe(self)

    def set_data(self, data: Series_DF, *_, **__):
        self.line_series.set_data(
            Series_DF(
                pd.DataFrame(
                    {
                        "time": data.df["time"],
                        "value": data.df["close"].rolling(window=self.period).mean(),
                    }
                )
            )
        )

        # df_tail_data = data._df.tail(self.period)

        # for _series in df_tail_data.it

    def update_data(self, data: AnyBasicData, *_, **kwargs):
        update_val = SingleValueData(
            data.time,
        )

        self.line_series.update_data(update_val)

    def clear_data(self): ...
