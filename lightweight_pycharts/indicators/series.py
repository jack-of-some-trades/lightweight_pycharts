"""Series Indicator that recieves raw Timeseries Data and filters it"""

from logging import getLogger
from dataclasses import dataclass
from typing import (
    Optional,
    Any,
    get_args,
)

import pandas as pd
from numpy import nan

from lightweight_pycharts.charting_frame import ChartingFrame
from lightweight_pycharts.orm.types import Color, PriceFormat

from lightweight_pycharts import series_common as sc
from lightweight_pycharts.indicator import (
    Indicator,
    IndicatorOptions,
    output_property,
    default_output_property,
    param,
)
from lightweight_pycharts.orm import Symbol, TF
from lightweight_pycharts.orm.series import (
    AnyBasicSeriesType,
    HistogramData,
    HistogramStyleOptions,
    Series_DF,
    SeriesOptionsCommon,
    SeriesType,
    AnyBasicData,
    ArgMap,
    Whitespace_DF,
    SingleValueData,
)

logger = getLogger("lightweight-pycharts")


@dataclass(slots=True)
class BarState:
    """
    Dataclass object that holds various information about the current bar.
    """

    index: int = -1
    time: pd.Timestamp = pd.Timestamp(0)
    timestamp: pd.Timestamp = pd.Timestamp(0)
    time_close: pd.Timestamp = pd.Timestamp(0)
    time_length: pd.Timedelta = pd.Timedelta(0)

    open: float = nan
    high: float = nan
    low: float = nan
    close: float = nan
    value: float = nan
    volume: float = nan
    ticks: float = nan

    is_ext: bool = False
    is_new: bool = False
    is_ohlc: bool = False
    is_single_value: bool = False


G1 = "Display Series"
G2 = "Volume Series"
I1 = "a"


# pylint: disable=arguments-differ
@dataclass
class SeriesIndicatorOptions(IndicatorOptions):
    "Indicator Options for a Series"
    series_type: SeriesType = param(
        SeriesType.Rounded_Candle,
        "Series Type",
        G1,
        options=[t for t in SeriesType if t not in get_args(AnyBasicSeriesType)],
    )

    up_color: Color = param(Color.from_hex("#26a69a"), "Color - Up ", G1, I1)
    down_color: Color = param(Color.from_hex("#ef5350"), "Down ", G1, I1)

    vol_price_axis: str = param("vol", "Price Axis", G2, autosend=False)
    vol_scale_invert: bool = param(False, "Invert", G2, I1)
    vol_scale_margin: int = param(75, "Scale Margin", G2, I1, min=0, max=100)
    vol_opacity: int = param(
        50,
        "Opacity",
        G2,
        min=0,
        max=100,
        step=5,
        slider=True,
    )


class Series(Indicator):
    """
    Draws a Series Object onto the Screen. Expands SeriesCommon behavior by filtering & Aggregating
    data, Creating a Whitespace Expansion Series, & Allowing the ability to change the series type.

    Other Indicators should subscribe to this object's bar updates as a filtered form of data.
    """

    __special_id__ = "XyzZy"
    __options__ = SeriesIndicatorOptions

    def __init__(
        self,
        parent: ChartingFrame,
        opts: Optional[SeriesIndicatorOptions] = None,
        *,
        js_id: Optional[str] = None,
        display_name: str = "",
    ) -> None:
        if js_id == self.__special_id__:
            super().__init__(parent, js_id=js_id, display_name="Main-Series")
        else:
            super().__init__(parent, js_id=js_id, display_name=display_name)

        # Dunder to allow specific permissions to the main source of a data for a Frame.
        # Because _ids can't be duplicated and this _id is reserved on frame creation,
        # the user can never accidentally set the _js_id to be __special_id__.
        self.__frame_primary_src__ = (
            self._js_id == self.parent_frame.indicators.prefix + Series.__special_id__
        )

        if opts is None:
            opts = SeriesIndicatorOptions()

        if self.__frame_primary_src__:
            self.parent_frame.__set_displayed_series_type__(opts.series_type)

        self.opts = opts
        self.socket_open = False
        self.symbol = Symbol("LWPC")
        self._bar_state: Optional[BarState] = None

        # Cached colors w/ the appropriate opacity
        self.vol_up_color = Color.from_color(opts.up_color, a=opts.vol_opacity / 100)
        self.vol_down_color = Color.from_color(
            opts.down_color, a=opts.vol_opacity / 100
        )

        self.main_data: Optional[Series_DF] = None
        self.whitespace_data: Optional[Whitespace_DF] = None

        self.display_series = sc.SeriesCommon(
            self, opts.series_type, name="Display-Series"
        )
        self.vol_series = sc.SeriesCommon(
            self,
            SeriesType.Histogram,
            name="Vol-Series",
            arg_map=ArgMap(value="volume", color="vol_color"),
        )
        self.update_options(opts)
        self.init_menu(opts)

    def update_options(self, opts: SeriesIndicatorOptions):
        if opts.series_type != self.opts.series_type:
            self.change_series_type(opts.series_type)

        if (
            opts.up_color != self.opts.up_color
            or opts.down_color != self.opts.down_color
            or opts.vol_opacity != self.opts.vol_opacity
        ):
            self.vol_up_color = Color.from_color(
                opts.up_color, a=opts.vol_opacity / 100
            )
            self.vol_down_color = Color.from_color(
                opts.down_color, a=opts.vol_opacity / 100
            )
            self._set_vol_series()

        self.vol_series.apply_options(
            SeriesOptionsCommon(
                priceScaleId=opts.vol_price_axis, priceFormat=PriceFormat("volume")
            )
        )
        if opts.vol_scale_invert:
            self.vol_series.apply_scale_options(
                {
                    "scaleMargins": {"top": 0, "bottom": opts.vol_scale_margin / 100},
                    "invertScale": True,
                }
            )

        else:
            self.vol_series.apply_scale_options(
                {
                    "scaleMargins": {"top": opts.vol_scale_margin / 100, "bottom": 0},
                    "invertScale": False,
                }
            )

        self.opts = opts

    # region ------------------ Sub-Routines ------------------

    def _init_bar_state(self):
        if self.main_data is None:
            return

        df = self.main_data.df
        col_names = self.main_data.df.columns

        self._bar_state = BarState(
            index=len(self.main_data.df) - 1,
            time=self.main_data.curr_bar_open_time,
            timestamp=self.main_data.curr_bar_open_time,
            time_close=self.main_data.curr_bar_close_time,
            time_length=self.main_data.timedelta,
            open=(df.iloc[-1]["open"] if "open" in col_names else nan),
            high=(df.iloc[-1]["high"] if "high" in col_names else nan),
            low=(df.iloc[-1]["low"] if "low" in col_names else nan),
            close=(df.iloc[-1]["close"] if "close" in col_names else nan),
            value=(df.iloc[-1]["value"] if "value" in col_names else nan),
            volume=(df.iloc[-1]["volume"] if "volume" in col_names else nan),
            ticks=(df.iloc[-1]["ticks"] if "ticks" in col_names else nan),
            # is_ext=self.main_data.ext, # TODO: Implement time check
            is_new=True,
            is_single_value="value" in col_names,
            is_ohlc="close" in col_names,
        )

    def _update_bar_state(self, current_timestamp: pd.Timestamp, is_new: bool):
        if self.main_data is None or self._bar_state is None:
            return

        df = self.main_data.df
        col_names = self.main_data.df.columns

        self._bar_state.index = len(self.main_data.df) - 1
        self._bar_state.time = self.main_data.curr_bar_open_time
        self._bar_state.timestamp = current_timestamp
        self._bar_state.time_close = self.main_data.curr_bar_close_time
        self._bar_state.time_length = self.main_data.timedelta
        self._bar_state.open = df.iloc[-1]["open"] if "open" in col_names else nan
        self._bar_state.high = df.iloc[-1]["high"] if "high" in col_names else nan
        self._bar_state.low = df.iloc[-1]["low"] if "low" in col_names else nan
        self._bar_state.close = df.iloc[-1]["close"] if "close" in col_names else nan
        self._bar_state.value = df.iloc[-1]["value"] if "value" in col_names else nan
        self._bar_state.volume = df.iloc[-1]["volume"] if "volume" in col_names else nan
        self._bar_state.ticks = df.iloc[-1]["ticks"] if "ticks" in col_names else nan
        # self._bar_state.is_ext=self.main_data.ext, TODO: Implement Time check
        self._bar_state.is_new = is_new
        # self._bar_state.is_single_value ## Constant
        # self._bar_state.is_ohlc ## Constant

    def _set_vol_series(self):
        if self.main_data is not None and "volume" in self.main_data.columns:
            if set(["open", "close"]).issubset(self.main_data.columns):
                # Generate a Color Series for the Volume Histogram if we can
                vol_color = self.main_data.df["close"] >= self.main_data.df["open"]
                self.main_data.df["vol_color"] = vol_color.replace(
                    {True: self.vol_up_color, False: self.vol_down_color}
                )
            elif "vol_color" in self.main_data.columns:
                self.main_data.df.drop("vol_color", inplace=True)

            # Color Doesn't Need to exist to update the Series
            self.vol_series.set_data(self.main_data)

    def _update_vol_series(self):
        if self._bar_state is None:
            return

        if self._bar_state.close is nan or self._bar_state.open is nan:
            color = None
        elif self._bar_state.close > self._bar_state.open:
            color = self.vol_up_color
        else:
            color = self.vol_down_color

        self.vol_series.update_data(
            HistogramData(self._bar_state.time, self._bar_state.volume, color=color)
        )

    # endregion

    def delete(self):
        super().delete()
        if self.socket_open:
            self.events.socket_switch(state="close", symbol=self.symbol, series=self)

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
        else:
            self.symbol = Symbol("LWPC")

        if self.__frame_primary_src__:
            self.parent_frame.__set_displayed_symbol__(self.symbol)

        # ---------------- Initialize Series DataFrame ----------------
        if not isinstance(data, pd.DataFrame):
            data = pd.DataFrame(data)
        self.main_data = Series_DF(data, self.symbol.exchange)

        # ---------------- Clear & Return on Bad Data ----------------
        if self.main_data.timeframe == TF(1, "E"):
            self.clear_data()
            return
        if self.main_data.data_type == SeriesType.WhitespaceData:
            self.clear_data(timeframe=self.main_data.timeframe)
            return

        # ---------------- Update Displayed Series Objects with Data ----------------
        self._init_bar_state()
        self.display_series.set_data(self.main_data)
        self._set_vol_series()

        # ---------------- Set the frame's Whitespace Series if needed ----------------
        if self.__frame_primary_src__:
            self.whitespace_data = Whitespace_DF(self.main_data)
            self.parent_frame.__set_whitespace__(
                self.whitespace_data.df,
                SingleValueData(self.main_data.curr_bar_open_time, 0),
            )

        if self.__frame_primary_src__:
            # Only do this once everything else has completed and not Error'd.
            self.parent_frame.__set_displayed_timeframe__(self.main_data.timeframe)

        # ---------------- Inform all Indicators that New Data is Available ----------------
        self._watcher.set = True
        self._notify_observers_set()

    def update_data(self, data_update: AnyBasicData, *_, accumulate=False, **__):
        """
        Updates the prexisting Frame's Primary Dataframe. The data point's time should
        be equal to or greater than the last data point otherwise this will have no effect.

        Can Accept WhitespaceData, SingleValueData, and OhlcData.
        Function will auto detect if this is a tick or bar update.
        When Accumulate is set to True, tick updates will accumulate volume,
        otherwise the last volume will be overwritten.
        """
        # Ignoring 4 Operator Errors, it's a false alarm since WhitespaceData.__post_init__()
        # Will Always convert 'data.time' to a compatible pd.Timestamp.
        if (
            self.main_data is None
            or data_update.time < self.main_data.curr_bar_open_time  # type: ignore
        ):
            return

        # ------------------ Determine if Data Should be Aggregated or Appended ------------------
        new_bar = False
        if data_update.time < self.main_data.next_bar_time:  # type: ignore
            # Update the last bar (Aggregate)
            display_data = self.main_data.update_from_tick(
                data_update, accumulate=accumulate
            )
        else:
            # Create new Bar (Append)
            if data_update.time != self.main_data.next_bar_time:
                # Update given is a new bar, but not the expected time
                # Ensure it fits the data's time interval e.g. 12:00:0071 -> 12:00:00
                time_delta = data_update.time - self.main_data.next_bar_time  # type: ignore
                data_update.time -= time_delta % self.main_data.timedelta  # type: ignore

            curr_bar_time = self.main_data.curr_bar_open_time
            display_data = self.main_data.update(data_update)
            new_bar = True

            # --------------------- Manage Whitespace Series ---------------------
            if self.__frame_primary_src__ and self.whitespace_data is not None:
                if data_update.time != (
                    expected_time := self.whitespace_data.next_timestamp(curr_bar_time)
                ):
                    # New Data Jumped more than expected, Replace Whitespace Data So
                    # There are no unnecessary gaps.
                    logger.info(
                        "Whitespace_DF Predicted incorrectly. Expected_time: %s, Recieved_time: %s",
                        expected_time,
                        data_update.time,
                    )
                    self.whitespace_data = Whitespace_DF(self.main_data)
                    self.parent_frame.__set_whitespace__(
                        self.whitespace_data.df,
                        SingleValueData(self.main_data.curr_bar_open_time, 0),
                    )
                else:
                    # Lengthen Whitespace Data to keep 500bar Buffer
                    self.parent_frame.__update_whitespace__(
                        self.whitespace_data.extend(),
                        SingleValueData(self.main_data.curr_bar_open_time, 0),
                    )

        # ---------------------- Update Displayed Series and BarState Object ----------------------
        self._update_bar_state(pd.Timestamp(data_update.time), new_bar)
        self.display_series.update_data(display_data)
        self._update_vol_series()

        # --------------------- Propogate the Data Update to other Indicators ---------------------
        self._watcher.reset_updated_state()
        self._watcher.updated = True
        self._notify_observers_update()

    def clear_data(
        self, timeframe: Optional[TF] = None, symbol: Optional[Symbol] = None, **_
    ):
        """
        Clears the data in memory and on the screen and, if not none,
        updates the desired timeframe and symbol for the Frame
        """
        self.main_data = None
        self._bar_state = None

        if self.__frame_primary_src__:
            self.whitespace_data = None
            self.parent_frame.__clear_whitespace__()

        if self.socket_open:
            # Ensure Socket is Closed
            self.events.socket_switch(state="close", symbol=self.symbol, series=self)

        if symbol is not None:
            self.symbol = symbol
            if self.__frame_primary_src__:
                self.parent_frame.__set_displayed_symbol__(symbol)

        if timeframe is not None and self.__frame_primary_src__:
            self.parent_frame.__set_displayed_timeframe__(timeframe)

        super().clear_data()

        # Notify Observers
        self._notify_observers_clear()

    def change_series_type(self, series_type: SeriesType, update_ui_menu=False):
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
        self.display_series.change_series_type(series_type, self.main_data)

        # Update window display if necessary
        if self.__frame_primary_src__:
            self.parent_frame.__set_displayed_series_type__(self.opts.series_type)

        # This function can be called by the window controls. If it is, update the menu since
        # that isn't where this change originated from and thus is out of date
        if update_ui_menu:
            self.update_menu(self.opts)

    def bar_time(self, index: int) -> pd.Timestamp:
        """
        Get the timestamp at a given bar index. Negative indices are valid and will start
        at the last bar time.

        The returned timestamp will always be bound to the limits of the underlying dataset
        e.g. [FirstBarTime, LastBarTime]. If no underlying data exists 1970-01-01[UTC] is returned.

        The index may be up to 500 bars into the future, though this is only guaranteed to be the
        desired timestamp if this Series Indicator is the Main Series Data for it's parent Frame.
        Depending on the data received, Future Timestamps may not always remain valid.
        """
        if self.main_data is None:
            logger.warning("Requested Bar-Time prior setting series data!")
            return pd.Timestamp(0)

        if self.whitespace_data is not None:
            # Find index given main dataset and Whitespace Projection
            total_len = len(self.main_data.df) + len(self.whitespace_data.df)
            if index > total_len - 1:
                logger.warning("Requested Bar-Time beyond 500 Bars in the Future.")
                return self.whitespace_data.df.index[-1]
            elif index < -(len(self.main_data.df) - 1):
                logger.warning("Requested Bar-Time prior to start of the dataset.")
                return self.main_data.df.index[0]
            else:
                if index < len(self.main_data.df):
                    return self.main_data.df.index[index]
                else:
                    # Whitespace df grows as data is added hence funky iloc index.
                    return self.whitespace_data.df["time"].iloc[
                        (index - len(self.main_data.df)) - 500
                    ]
        else:
            # Series has no Whitespace projection
            if index > len(self.main_data.df) - 1:
                logger.warning("Requested Bar-Time beyond the dataset.")
                return self.main_data.df.index[-1]
            elif index < -(len(self.main_data.df) - 1):
                logger.warning("Requested Bar-Time prior to start of the dataset.")
                return self.main_data.df.index[0]
            else:
                return self.main_data.df.index[index]

    # region ------------------------ Output Properties ------------------------

    @output_property
    def last_bar_index(self) -> int:
        "Last Bar Index of the dataset. Returns -1 if there is no valid data"
        return -1 if self._bar_state is None else self._bar_state.index

    @output_property
    def last_bar_time(self) -> pd.Timestamp:
        "Open Time of the Last Bar. Returns 1970-01-01 if there is no valid data"
        return pd.Timestamp(0) if self._bar_state is None else self._bar_state.time

    @output_property
    def bar_state(self) -> BarState:
        "BarState Object that represents the most recent data update. This is an Update-Only Output"
        if self._bar_state is not None:
            return self._bar_state
        return BarState()

    @output_property
    def dataframe(self) -> pd.DataFrame:
        "A reference to the full series dataframe"
        if self.main_data is not None:
            return self.main_data.df
        return pd.DataFrame({})

    @default_output_property
    def close(self) -> pd.Series:
        "A Series' Bar closing value"
        if self.main_data is not None and "close" in self.main_data.df.columns:
            return self.main_data.df["close"]
        return pd.Series({})

    @output_property
    def open(self) -> pd.Series:
        "A Series' Bar open value"
        if self.main_data is not None and "open" in self.main_data.df.columns:
            return self.main_data.df["open"]
        return pd.Series({})

    @output_property
    def high(self) -> pd.Series:
        "A Series' Bar high value"
        if self.main_data is not None and "high" in self.main_data.df.columns:
            return self.main_data.df["high"]
        return pd.Series({})

    @output_property
    def low(self) -> pd.Series:
        "A Series' Bar low value"
        if self.main_data is not None and "low" in self.main_data.df.columns:
            return self.main_data.df["low"]
        return pd.Series({})

    @output_property
    def volume(self) -> pd.Series:
        "A Series' Bar low value"
        if self.main_data is not None and "volume" in self.main_data.df.columns:
            return self.main_data.df["volume"]
        return pd.Series({})

    # endregion


# endregion
