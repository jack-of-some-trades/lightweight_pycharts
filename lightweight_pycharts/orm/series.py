""" Series Datatypes and Custom Pandas Series DataFrame accessor """

from __future__ import annotations
import logging
from datetime import time as dt_time
from math import ceil, floor, inf
from inspect import signature
from enum import IntEnum, auto
from typing import Literal, Optional, Self, TypeAlias, Dict, Any
from dataclasses import asdict, dataclass, field

import pandas as pd
import pandas_market_calendars as mcal

from .types import TF, Time, JS_Color, PriceFormat, BaseValuePrice, LineWidth, j_func
from .enum import LineStyle, PriceLineSource, LastPriceAnimationMode, LineType


logger = logging.getLogger("lightweight-pycharts")

EXCHANGE_NAMES = dict([(val.lower(), val) for val in mcal.get_calendar_names()])

ALT_EXCHANGE_NAMES = {
    "xnas": "NASDAQ",
    "forex": "24/5",
    "alpaca": "24/7",
    "polygon": "24/7",
    "polygon.io": "24/7",
    "coinbase": "24/7",
    "kraken": "24/7",
    "crypto": "24/7",
}


# pylint: disable=line-too-long
# pylint: disable=invalid-name
# region ------------------------------ DataFrame Update Function ------------------------------ #


def update_dataframe(
    df: pd.DataFrame,
    data: AnySeriesData | dict[str, Any],
    v_map: Optional[ArgMap | dict[str, str]] = None,
) -> pd.DataFrame:
    """
    Convenience Function to Update a Pandas DataFrame from a given piece of data w/ optional rename

    Unfortunately, no, The dataframe cannot be efficiently updated in place since a reference
    is passed. The new DataFrame can only be returned to update the reference in the higher scope.
    """
    if isinstance(data, AnySeriesData):
        data_dict = data.as_dict
    else:
        data_dict = data.copy()

    time = data_dict.pop("time")  # Must have a 'time':pd.Timestamp pair

    if v_map is not None:
        map_dict = v_map.as_dict if isinstance(v_map, ArgMap) else v_map.copy()

        # Rename and drop old keys
        for key in set(map_dict.keys()).intersection(data_dict.keys()):
            data_dict[map_dict[key]] = data_dict.pop(key)

    # Drop anything not in the columns of the Dict
    for key in set(data_dict.keys()).difference(df.columns):
        del data_dict[key]

    if df.index[-1] == time:
        # Update Last Entry
        for key, value in data_dict.items():
            df.loc[time, key] = value
        return df
    else:
        # Add New Entry
        return pd.concat([df, pd.DataFrame([data_dict], index=[time])])


# endregion

# region -------------------------------- Pandas Series Objects -------------------------------- #

# TODO: Integrate a method of tracking what is displayed and use that to limit the amount displayed.
# Currently, All data is sent to the screen. This may be thousands of data-points that may never be
# viewed. To limit the load on the Multi-processor fwd_queue an 'infinite history' system is needed
# i.e. : https://tradingview.github.io/lightweight-charts/tutorials/demos/infinite-history
#
# I imagine this code will originate w/ a JS Window API callback in the rtn_queue. From there,
# The Main_Series of the respective frame will handle the call; Updating a 'bars-back' variable in
# the Frame's Main Series[_DF/Ind]. This update will then propagate down through the indicator stack
# so each indicator can inform their respective series_common elements to display a certain range.


@pd.api.extensions.register_dataframe_accessor("lwc_df")
class Series_DF:
    "Pandas DataFrame Extention to Typecheck for Lightweight_PyCharts"

    def __init__(
        self,
        pandas_df: pd.DataFrame | Series_DF,
        exchange: Optional[str] = None,
    ):
        if isinstance(pandas_df, Series_DF):
            self._init_from_series_df_(pandas_df)
            return

        if pandas_df.size == 0:
            self._data_type = SeriesType.WhitespaceData
            self._tf = TF(1, "E")
            logger.warning("DataFrame has no Data.")
            return

        # Determine Appropriate Calendar & Market Hours
        if exchange is not None:
            exchange = exchange.lower()
            if exchange in EXCHANGE_NAMES:
                self.calendar = mcal.get_calendar(EXCHANGE_NAMES[exchange])
            elif exchange in ALT_EXCHANGE_NAMES:
                self.calendar = mcal.get_calendar(ALT_EXCHANGE_NAMES[exchange])
            else:
                logger.warning("Exchange '%s' doesn't match any calendars.", exchange)
                self.calendar = mcal.get_calendar("24/7")
        else:
            self.calendar = mcal.get_calendar("24/7")

        # Ensure Consistent Column Naming Convention
        rename_dict = self._validate_names(pandas_df)
        if len(rename_dict) > 0:
            pandas_df.rename(columns=rename_dict, inplace=True)

        # Ensure Consistant Time format (Pd.Timestamp, UTC, TZ Aware)
        pandas_df["time"] = pd.to_datetime(pandas_df["time"])
        try:
            pandas_df["time"] = pandas_df["time"].dt.tz_convert("UTC")
        except TypeError:
            pandas_df["time"] = pandas_df["time"].dt.tz_localize("UTC")

        # Data Type is used to simplify updateing. Should be considered a constant
        self._data_type: AnyBasicSeriesType = SeriesType.data_type(pandas_df)

        self._tf, self._pd_tf = self._determine_tf(pandas_df)
        self.df = pandas_df.set_index("time")  # Set Time as index after TF check

        # True if 'Time' is only days, or has an opening time
        if self._pd_tf >= pd.Timedelta(days=1):
            self.only_days = (
                self.curr_bar_open_time == self.curr_bar_open_time.normalize()
            )
        else:
            self.only_days = False
        self._ext = False

    def _init_from_series_df_(self, base_df: Series_DF):
        "Copy the attributes (TF, Calendar) and time column of the given Series_DF into a new object"
        self.df = pd.DataFrame({"time": base_df.df["time"]})
        self._tf = base_df.timeframe
        self._ext = base_df.ext
        self._pd_tf = base_df.timedelta
        self.calendar = base_df.calendar
        self.only_days = base_df.only_days
        self._data_type = base_df.data_type

    @property
    def columns(self) -> set[str]:
        "Column Names within the Dataframe"
        return set(self.df.columns)

    @property
    def ext(self) -> bool:
        "True if data given has Extended Trading Hours Data"
        return self._ext

    @property
    def timeframe(self) -> TF:
        "Timeframe of the series data returned as a TF Object"
        return self._tf

    @property
    def timedelta(self) -> pd.Timedelta:
        "Timeframe of the series data returned as a pandas Timedelta"
        return self._pd_tf

    @property
    def data_type(self) -> AnyBasicSeriesType:
        "The underlying type of series data"
        return self._data_type

    @property
    def curr_bar_open_time(self) -> pd.Timestamp:
        "Open Time of the Current Bar"
        return self.df.index[-1]

    @property
    def curr_bar_close_time(self) -> pd.Timestamp:
        "Closing Time of the current Bar"
        return self.curr_bar_open_time + self._pd_tf

    @property
    def next_bar_time(self) -> pd.Timestamp:
        "Open Time of the next Bar"  # TODO: Update this with calendar information.
        return self.curr_bar_open_time + self._pd_tf

    @property
    def last_bar(self) -> AnyBasicData:
        "The current bar (last entry in the dataframe) returned as AnyBasicType"
        data_dict = self.df.iloc[-1].to_dict()
        data_dict["time"] = self.df.index[-1]
        return self._to_dataclass_instance_(data_dict)

    @staticmethod
    def _validate_names(df: pd.DataFrame) -> dict[str, str]:
        """
        Standardize common column names.

        Additional datafields,
        (e.g. wickColor, lineColor, topFillColor1), must be entered verbatum to be used.
        """
        rename_map = {}
        df.columns = list(map(str.lower, df.columns))
        column_names = set(df.columns)
        try:
            Series_DF._col_name_check(
                column_names, rename_map, ["time", "t", "dt", "date", "datetime"], True
            )
        except AttributeError:
            # It wouldn't be unreasonable to have Time as the Index, Reset index and try again.
            df.reset_index(inplace=True)
            df.columns = list(map(str.lower, df.columns))
            column_names = set(df.columns)
            Series_DF._col_name_check(
                column_names, rename_map, ["time", "t", "dt", "date", "datetime"], True
            )

        Series_DF._col_name_check(column_names, rename_map, ["open", "o", "first"])
        Series_DF._col_name_check(column_names, rename_map, ["close", "c", "last"])
        Series_DF._col_name_check(column_names, rename_map, ["high", "h", "max"])
        Series_DF._col_name_check(column_names, rename_map, ["low", "l", "min"])
        Series_DF._col_name_check(column_names, rename_map, ["volume", "v", "vol"])
        Series_DF._col_name_check(column_names, rename_map, ["tick", "count"])
        Series_DF._col_name_check(
            column_names, rename_map, ["value", "val", "data", "price"]
        )

        return rename_map

    @staticmethod
    def _col_name_check(
        column_names: set[str],
        rename_map: dict[str, str],
        expected_names: list[str],
        required: bool = False,
    ):
        """
        Checks if the first name in 'expected_names' is present in column_names,
        if it isn't then either an error is thrown or the rename map is updated
        """
        name_intersect = list(column_names.intersection(expected_names))
        if required and len(name_intersect) == 0:
            raise AttributeError(
                f'Given data must have a "{" | ".join(expected_names)}" column'
            )
        elif len(name_intersect) > 1:
            raise AttributeError(
                f'Given data can have only one "{" | ".join(expected_names)}" type of column'
            )
        elif len(name_intersect) == 1 and name_intersect[0] != expected_names[0]:
            # Remap if necessary
            rename_map[name_intersect[0]] = expected_names[0]

    @staticmethod
    def _determine_tf(df: pd.DataFrame) -> tuple[TF, pd.Timedelta]:
        interval: pd.Timedelta = df["time"].diff().min()  # type: ignore (pandas false alarm)

        # Ensure Interval Non-Zero
        if interval == pd.Timedelta(0):
            counts = df["time"].diff().value_counts()
            interval = pd.Timedelta(counts.idxmax())
            logger.warning(
                """Given Data has a Duplicate Timestamp. 
                    Here are The different intervals present in the data: \n %s
                    \nAssuming Data Interval is %s. 
                    """,
                counts,
                interval,
            )

        errmsg = f"Interval [{interval}] invalid. Series Data must be a simple interval. (An integer multiple of a single period [D|h|m|s])"

        comp = interval.components
        if (comp.days + comp.hours + comp.minutes + comp.seconds) == 0:
            raise ValueError(
                "Series Data cannot be Tick Data, it must be aggrigated to atleast 1 Second intervals first."
            )
        if comp.days > 0:
            if comp.hours + comp.minutes + comp.seconds > 0:
                raise ValueError(errmsg)
            if comp.days < 7:
                return TF(comp.days, "D"), interval
            if comp.days < 28:
                logger.warning("Attempting to Classify Weekly Interval, %s", interval)
                return TF(floor(comp.days / 7), "W"), interval
            if comp.days < 365:
                logger.warning("Attempting to Classify Monthly Interval, %s", interval)
                return TF(floor(comp.days / 28), "M"), interval
            else:
                logger.warning("Attempting to Classify Yearly Interval, %s", interval)
                return TF(floor(comp.days / 365), "Y"), interval
        elif comp.hours > 0:
            if comp.minutes + comp.seconds > 0:
                raise ValueError(errmsg)
            return TF(comp.hours, "h"), interval
        elif comp.minutes > 0:
            if comp.seconds > 0:
                raise ValueError(errmsg)
            return TF(comp.minutes, "m"), interval
        elif comp.seconds > 0:
            return TF(comp.seconds, "s"), interval

        return TF(1, "E"), interval

    def _to_dataclass_instance_(self, data_dict: dict) -> AnyBasicData:
        "Returns a Dataclass instance of the given data that matches the datatype of the Series_DF"
        if self.data_type == SeriesType.OHLC_Data:
            return OhlcData.from_dict(data_dict)
        elif self.data_type == SeriesType.SingleValueData:
            return SingleValueData.from_dict(data_dict)
        else:
            return WhitespaceData.from_dict(data_dict)

    def populate_ext_col(
        self,
        mkt_open: Optional[pd.Timestamp],
        mkt_close: Optional[pd.Timestamp],
        premkt_open: Optional[pd.Timestamp] = None,
        postmkt_close: Optional[pd.Timestamp] = None,
    ) -> None:
        "Checks the sample times of the data set and determines if each datapoint is RTH, ETH or neither"
        raise NotImplementedError

    # Next line Silences a False-Positive Flag. Dunno why it thinks last_data's vars aren't initialized
    # @pylint: disable=attribute-defined-outside-init
    def update_from_tick(
        self, data: AnyBasicData, accumulate: bool = False
    ) -> AnyBasicData:
        """
        Updates the OHLC / Single Value DataFrame from the given bar. The Bar is assumed to be
        a tick update with the assumption a new bar should not be created.

        Volume is overwritten by default. Set Accumulate(Volume) = True if desired,
        Returns Basic Data that is of the same data type (OHLC / Single Value) as the data set.
        """
        if not isinstance(data, (SingleValueData, OhlcData)):
            return data  # Nothing to update
        last_data = self.last_bar

        # Update price
        match last_data, data:
            case SingleValueData(), SingleValueData():
                last_data.value = data.value
            case OhlcData(), SingleValueData():
                last_data.high = max(
                    (last_data.high if last_data.high is not None else -inf),
                    (data.value if data.value is not None else -inf),
                )
                last_data.low = min(
                    (last_data.low if last_data.low is not None else inf),
                    (data.value if data.value is not None else inf),
                )
                last_data.close = data.value
                data.value = last_data.close
            case OhlcData(), OhlcData():
                last_data.high = max(
                    (last_data.high if last_data.high is not None else -inf),
                    (data.high if data.high is not None else -inf),
                )
                last_data.low = min(
                    (last_data.low if last_data.low is not None else inf),
                    (data.low if data.low is not None else inf),
                )
                last_data.close = data.close
            # Last Two are VERY unlikely Scenarios
            case SingleValueData(), OhlcData():
                last_data.value = data.close
            case WhitespaceData(), _:
                last_data = data
                if accumulate:  # Needed as setup for volume accumulation
                    data.volume = 0

        # update volume
        if last_data.volume is not None and data.volume is not None:
            if accumulate:
                last_data.volume += data.volume
            else:
                last_data.volume = data.volume

        # Ensure time is constant, If not a new bar will be created on screen
        last_data.time = self.curr_bar_open_time
        update_dataframe(self.df, last_data)

        # The next line ensures the return dataclass matches the type stored by the Dataframe.
        return self._to_dataclass_instance_(last_data.as_dict)

    def update(self, data: AnyBasicData) -> AnyBasicData:
        "Update the OHLC / Single Value DataFrame from a new bar. Data Assumed as next in sequence"
        data_dict = data.as_dict
        # Convert Data to proper format (if needed) then append. Unused values are popped so
        # Additional, unused, columns are not added to the dataframe
        match self._data_type, data:
            case SeriesType.OHLC_Data, SingleValueData():
                # Ensure all ohlc are defined when storeing OHLC data from a single data point
                data_dict["open"] = data_dict["value"]
                data_dict["high"] = data_dict["value"]
                data_dict["low"] = data_dict["value"]
                data_dict["close"] = data_dict.pop("value")

            case SeriesType.SingleValueData, OhlcData():
                if "open" in data_dict:
                    data_dict.pop("open")
                if "high" in data_dict:
                    data_dict.pop("high")
                if "low" in data_dict:
                    data_dict.pop("low")
                data_dict["value"] = data_dict.pop("close")

        datacls_inst = self._to_dataclass_instance_(data_dict)

        time = data_dict.pop("time")
        self.df = pd.concat([self.df, pd.DataFrame([data_dict], index=[time])])

        return datacls_inst


class Whitespace_DF:
    """
    Pandas DataFrame Wrapper to Generate Whitespace for Lightweight PyCharts

    Whitespace ahead of a series is useful to be able to extend drawings into that space.
    Without the whitespace, nothing can be drawn in that area.

    This class uses Pandas_Market_Calendars to intelligently extrapolate whitespace it the exchange
    of the symbol is known. In the event that the symbol is not known, a simple 24/7 schedule is used.

    Ideally the whitespace is generated from the appropriate calendar so that the whitespace does not
    need to be continually re-calculated everytime a datapoint recieved would otherwise leave a gap on the chart.
    """

    def __init__(self, base_data: Series_DF):
        self.ext = base_data.ext
        self.pd_tf = base_data._pd_tf
        self.calendar = base_data.calendar
        self.only_days = base_data.only_days
        self.simple_override = self.calendar.name == "24/7"

        if self.simple_override:  # 24/7 Market. Don't bother with calendars.
            self.df = self._simple_whitespace_df(base_data.curr_bar_open_time)
            return

        mkt_times = self.calendar.regular_market_times
        if (
            base_data.ext
            and "pre" in self.calendar.market_times
            and "post" in self.calendar.market_times
        ):
            self.mkt_start = "pre"
            self.mkt_end = "post"
        else:
            self.mkt_start = "market_open"
            self.mkt_end = "market_close"

        # Calculate Length of a day from RTH / ETH
        mkt_open = self._unpack_mcal_time_(*mkt_times[self.mkt_start][-1])
        mkt_close = self._unpack_mcal_time_(*mkt_times[self.mkt_end][-1])

        # Determine a rough end date given the # of bars per day
        bars_per_day = ceil((mkt_close - mkt_open) / self.pd_tf)

        # Get a smudge factor to artificially push out the end_date to ensure we make
        # enough, but not too many, extra bars. (This accounts for weekends + Holidays)
        if self.pd_tf >= pd.Timedelta(hours=4):
            smudge_factor = 8 / 5  # = 1.6
        elif self.pd_tf >= pd.Timedelta(minutes=30):
            smudge_factor = 1.4
        else:
            smudge_factor = 1.2

        start_date: pd.Timestamp = base_data.df.index[-1]
        end_date = start_date + pd.Timedelta(
            days=ceil(500 * smudge_factor / bars_per_day)
        )

        # Create Datetime Index from the calendar given the known start_date and projected end_date
        dt_index = mcal.date_range(
            self.calendar.schedule(
                start_date=start_date,
                end_date=end_date,
                market_times=[self.mkt_start, self.mkt_end],
            ),
            frequency=base_data.timeframe.toString,
            closed="left",  # Stupid. Just Absolutely Stupid. This whole function...
            force_close=False,  # It's 4 Methods wearing a trench-coat that says "C̷l̷a̷s̷s̷  *Function*"
        )

        if self.only_days:  # False alarm Type Error? Its a DT_Index, not an Index[int]?
            dt_index = dt_index.normalize()  # type: ignore

        start_index = dt_index.get_indexer_for([start_date])[0]
        if start_index == -1:
            # Most likely cause of this error is that start_date was not a valid bar-time for the day
            # i.e. a 5Min bar that starts at 8:32 instead of 8:30, or a start time outside of RTH & ETH
            # Alternatively, the calendar starts at a stupid time like XX:01 or something...
            # (*eye-roll*, yup. that's possible...)
            logger.error(
                "mcal.date_range() couldn't calculate start_date!. start_date = %s, dt_index[0] = %s",
                start_date,
                dt_index[0],
            )
            self.simple_override = True
            self.df = self._simple_whitespace_df(base_data.curr_bar_open_time)
            return

        # mcal.date_range returns all bar times for all days requested.
        # Trim off the overlapping start, and trim total length down to a consistent 500 bars
        self.df = pd.DataFrame({"time": dt_index[start_index : 501 + start_index]})

        if len(dt_index) < 500 + start_index:
            # Log an Error, No need to raise an exception though, failure isn't THAT critical.
            logger.error(
                "Whitespace Dataframe under-estimated end-date!. len_df = %s",
                len(self.df),
            )

    @staticmethod
    def _unpack_mcal_time_(
        _: Optional[str | pd.Timestamp], _time: dt_time, days: Optional[int] = None
    ) -> pd.Timedelta:
        # 1st argument is Effective Date. If None then it was the first time established.
        if days is None:
            days = 0
        return pd.Timedelta(days=days, hours=_time.hour, minutes=_time.minute)

    def _simple_extend(self) -> AnyBasicData:
        "Extend the dataframe by the current timestep without checking against a calendar"
        next_bar_time: pd.Timestamp = self.df["time"].iloc[-1] + self.pd_tf
        if self.only_days:
            next_bar_time = next_bar_time.normalize()

        rtn_data = WhitespaceData(next_bar_time)
        self.df = pd.concat(
            [self.df, pd.DataFrame([{"time": rtn_data.time}])], ignore_index=True
        )
        return rtn_data

    def _simple_whitespace_df(self, start_time: pd.Timestamp) -> pd.DataFrame:
        "Create a 500 datapoint whitespace extention without referencing a calendar"
        whitespace = pd.date_range(start=start_time, periods=501, freq=self.pd_tf)
        return pd.DataFrame({"time": whitespace})

    def next_timestamp(self, curr_time: pd.Timestamp) -> pd.Timestamp:
        "Returns the timestamp immidately after the timestamp given as an input"
        if self.simple_override:  # Don't Bother with index look-up if 24/7 market
            return curr_time + self.pd_tf

        if self.only_days:
            curr_time = curr_time.normalize()

        try:
            curr_index = pd.Index(self.df["time"]).get_loc(curr_time)
        except KeyError as e:
            raise KeyError(f"Whitespace_DF did not contain {curr_time}.") from e

        if isinstance(curr_index, int):
            return self.df["time"].iloc[curr_index + 1]
        else:
            raise KeyError(f"Whitespace DF contains multiple indexs of {curr_time}?")

    def extend(self) -> AnyBasicData:
        "Extends the dataframe with one datapoint of whitespace. This whitespace datapoint is a valid trading time."
        if self.simple_override:  # Don't Bother with calendar if 24/7 market
            return self._simple_extend()

        # TODO : Optimize this function... by optimizing pandas_market_calendars... :(
        # The calendar function calls far above and a way the most inefficient code in all of
        # the backend calculations that are done. Sadly it's also the library that probably
        # slows down start-up the most. It just does everything I need it to do tho.

        curr_bar_time: pd.Timestamp = self.df["time"].iloc[-1]
        next_bar_time = curr_bar_time + self.pd_tf

        day_offset = pd.Timedelta(days=5)
        schedule = self.calendar.schedule(
            curr_bar_time - day_offset,
            curr_bar_time + day_offset,
            market_times=[self.mkt_start, self.mkt_end],
        )

        if self.calendar.open_at_time(schedule, next_bar_time):
            # Ticking forward by the chart's timeframe kept us in trading hours. Use that.
            rtn_data = WhitespaceData(next_bar_time)
        else:
            # Next timestep is outside of trading hours, grab next open
            todays_ind = schedule.index.get_indexer_for(
                [curr_bar_time.normalize().tz_localize(None)]
            )[0]
            if todays_ind == -1:
                raise ValueError("Today not found... How does this happen????")

            next_trade_day = schedule.iloc[todays_ind + 1]
            rtn_data = WhitespaceData(next_trade_day[self.mkt_start])

        if self.only_days:
            rtn_data.time = rtn_data.time.normalize()  # type: ignore (time guaranteed to be a Timestamp)

        # Append new datapoint and return
        self.df = pd.concat(
            [self.df, pd.DataFrame([{"time": rtn_data.time}])], ignore_index=True
        )
        return rtn_data


# endregion


# region --------------------------------- Series Name Mappers --------------------------------- #


@dataclass
class ArgMap:
    """
    Renaming map to specify how the columns of a DataFrame should map to a Displayable Series.
    This object can cover value mapping for Line, Histogram, and Bar series

    If needed, new names can be dynamically added for custom series behavior. Note: This would
    require a custom series primitive to be made within the TypeScript portion of this module.
    """

    value: Optional[str] = None
    close: Optional[str] = None
    open: Optional[str] = None
    high: Optional[str] = None
    low: Optional[str] = None
    color: Optional[str] = None
    custom_values: Optional[str] = None

    def __post_init__(self):
        # Ensure cross display compatability between single value and OHLC series
        if self.value is None and self.close is not None:
            self.value = self.close
        elif self.close is None and self.value is not None:
            self.close = self.value

    @property
    def as_dict(self) -> Dict[str, str]:
        "Object as a dictionary with Nones and equivalent kv pairs (e.g. 'value' == 'value') dropped"
        return asdict(
            self,
            dict_factory=lambda x: {k: v for (k, v) in x if v is not None and k != v},
        )


class CandleValueMap(ArgMap):
    "Value Map Extention for Candlestick and Rounded Candlestick Series"
    wickColor: Optional[str] = None
    borderColor: Optional[str] = None


class AreaValueMap(ArgMap):
    "Value Map Extention for an Area Series"
    lineColor: Optional[str] = None  # TODO: Remove once Line and Area are unified
    topColor: Optional[str] = None
    bottomColor: Optional[str] = None


class BaselineValueMap(ArgMap):
    "Value Map Extention for a Baseline Series"
    topLineColor: Optional[str] = None
    topFillColor1: Optional[str] = None
    topFillColor2: Optional[str] = None
    bottomLineColor: Optional[str] = None
    bottomFillColor1: Optional[str] = None
    bottomFillColor2: Optional[str] = None


# endregion

# region ---------------------------------- Series Data Types ---------------------------------- #


@dataclass
class WhitespaceData:
    """
    Represents a whitespace data item, which is a data point without a value.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/WhitespaceData
    """

    time: Time
    custom_values: Optional[Dict[str, Any]] = field(default=None, kw_only=True)
    # Anything placed in the custom_values dict can be retrieved by a TS/JS LWC Plugin.
    # Any other values given to a JavaScript Lightweight_Charts series through setData()
    # are ignored and deleted and thus are inaccessible beyond python.

    def __post_init__(self):  # Ensure Consistent Time Format (UTC, TZ Aware).
        self.time = pd.Timestamp(self.time)
        try:
            self.time = self.time.tz_convert("UTC")
        except TypeError:
            self.time = self.time.tz_localize("UTC")

    @property
    def as_dict(self) -> dict:
        "The Object in dictionary form with 'Nones' Dropped."
        return asdict(  # Drop Nones
            self, dict_factory=lambda x: {k: v for (k, v) in x if v is not None}
        )

    @classmethod
    def from_dict(cls, obj: dict) -> Self:
        "Create an instance from a dict ignoring extraneous params"
        params = signature(cls).parameters
        return cls(**{k: v for k, v in obj.items() if k in params})


@dataclass
class OhlcData(WhitespaceData):
    """
    Represents a bar with a time, open, high, low, and close prices.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/OhlcData
    """

    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: Optional[float] = None  # Added by this library


@dataclass
class BarData(OhlcData):
    """
    Structure describing a single item of data for bar series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/BarData
    """

    color: Optional[str] = None


@dataclass
class CandlestickData(OhlcData):
    """
    Structure describing a single item of data for candlestick series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/CandlestickData
    """

    color: Optional[str] = None
    wickColor: Optional[str] = None
    borderColor: Optional[str] = None


@dataclass
class RoundedCandleData(OhlcData):
    """
    Structure describing a single item of data for rounded candlestick series.
    """

    color: Optional[str] = None
    wickColor: Optional[str] = None


@dataclass
class SingleValueData(WhitespaceData):
    """
    Represents a data point of a single-value series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/SingleValueData
    """

    value: Optional[float] = None
    volume: Optional[float] = None  # Added by this library


@dataclass
class HistogramData(SingleValueData):
    """
    Structure describing a single item of data for histogram series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HistogramData
    """

    color: Optional[JS_Color] = None


@dataclass
class LineData(SingleValueData):
    """
    Structure describing a single item of data for line series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LineData
    """

    color: Optional[JS_Color] = None


@dataclass
class AreaData(SingleValueData):
    """
    Structure describing a single item of data for area series.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AreaData
    """

    lineColor: Optional[JS_Color] = None
    topColor: Optional[JS_Color] = None
    bottomColor: Optional[JS_Color] = None


@dataclass
class BaselineData(SingleValueData):
    """
    Structure describing a single item of data for baseline series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/BaselineData
    """

    topLineColor: Optional[JS_Color] = None
    topFillColor1: Optional[JS_Color] = None
    topFillColor2: Optional[JS_Color] = None
    bottomLineColor: Optional[JS_Color] = None
    bottomFillColor1: Optional[JS_Color] = None
    bottomFillColor2: Optional[JS_Color] = None


AnyBasicData: TypeAlias = WhitespaceData | SingleValueData | OhlcData

AnySeriesData: TypeAlias = (
    WhitespaceData
    | SingleValueData
    | OhlcData
    | LineData
    | AreaData
    | HistogramData
    | BaselineData
    | BarData
    | CandlestickData
    | RoundedCandleData
)


class SeriesType(IntEnum):
    """
    Represents the type of options for each series type.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api#seriestype

    This Enum is ultimately a Super set of of the Series Types described in the above documentation.
    In actuality this matches the Series_Type enum in util.ts
    """

    WhitespaceData = 0

    SingleValueData = auto()
    Line = auto()
    Area = auto()
    Baseline = auto()
    Histogram = auto()

    OHLC_Data = auto()
    Bar = auto()
    Candlestick = auto()

    Rounded_Candle = auto()

    @staticmethod
    def OHLC_Derived(s_type: SeriesType | AnySeriesData) -> bool:
        "Returns True if the given SeriesType or Data Class is derived from OHLC Data"
        if isinstance(s_type, AnySeriesData):
            return isinstance(
                s_type,
                (OhlcData, BarData, CandlestickData, RoundedCandleData),
            )
        else:
            return s_type in (
                SeriesType.OHLC_Data,
                SeriesType.Bar,
                SeriesType.Candlestick,
                SeriesType.Rounded_Candle,
            )

    @staticmethod
    def SValue_Derived(s_type: SeriesType | AnySeriesData) -> bool:
        "Returns True if the given SeriesType or Data Class is derived from Single-Value Data"
        if isinstance(s_type, AnySeriesData):
            return isinstance(
                s_type,
                (
                    SingleValueData,
                    LineData,
                    AreaData,
                    HistogramData,
                    BaselineData,
                ),
            )
        else:
            return s_type in (
                SeriesType.SingleValueData,
                SeriesType.Line,
                SeriesType.Area,
                SeriesType.Baseline,
                SeriesType.Histogram,
            )

    @staticmethod
    def data_type(df: pd.DataFrame) -> AnyBasicSeriesType:
        "Checks the column names of a DataFrame and return the data type"
        column_names = set(df.columns)
        if "close" in column_names:
            return SeriesType.OHLC_Data
        elif "value" in column_names:
            return SeriesType.SingleValueData
        else:  # Only a time Column Exists
            return SeriesType.WhitespaceData

    @property
    def cls(self) -> type:
        "Returns the DataClass this Type corresponds too"
        match self:
            case SeriesType.Bar:
                return BarData
            case SeriesType.Candlestick:
                return CandlestickData
            case SeriesType.Rounded_Candle:
                return RoundedCandleData
            case SeriesType.Area:
                return AreaData
            case SeriesType.Baseline:
                return BaselineData
            case SeriesType.Line:
                return LineData
            case SeriesType.Histogram:
                return HistogramData
            case SeriesType.SingleValueData:
                return SingleValueData
            case SeriesType.OHLC_Data:
                return OhlcData
            case _:  # Whitespace and Custom
                return WhitespaceData

    @property
    def params(self) -> set:
        "A set of the Parameters that compose this Series Type"
        return set(signature(self.cls).parameters.keys())


AnyBasicSeriesType = Literal[
    SeriesType.WhitespaceData,
    SeriesType.SingleValueData,
    SeriesType.OHLC_Data
]


# endregion


@dataclass
class SeriesOptionsCommon:
    """
    Represents options common for all types of series. All options may be Optional,
    but the Lightweight Charts API does assign default values to each. See the Docs for default values
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon
    """

    title: Optional[str] = None
    visible: Optional[bool] = None
    lastValueVisible: Optional[bool] = None
    priceScaleId: Optional[str] = None

    priceLineVisible: Optional[bool] = None
    priceLineWidth: Optional[LineWidth] = None
    priceLineColor: Optional[JS_Color] = None
    priceLineStyle: Optional[LineStyle] = None
    priceLineSource: Optional[PriceLineSource] = None
    priceFormat: Optional[PriceFormat] = None

    # BaseLine is for 'IndexTo' and Percent Modes
    baseLineVisible: Optional[bool] = None
    baseLineWidth: Optional[LineWidth] = None
    baseLineStyle: Optional[LineStyle] = None
    baseLineColor: Optional[JS_Color] = None
    autoscaleInfoProvider: Optional[j_func] = None


# region --------------------------------------- Single Value Series Objects --------------------------------------- #


@dataclass
class LineStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for a line series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LineStyleOptions
    """

    color: Optional[JS_Color] = None
    lineVisible: Optional[bool] = None
    lineWidth: Optional[int] = None
    lineType: Optional[LineType] = None
    lineStyle: Optional[LineStyle] = None

    pointMarkersRadius: Optional[int] = None
    pointMarkersVisible: Optional[bool] = None

    crosshairMarkerVisible: Optional[bool] = None
    crosshairMarkerRadius: Optional[int] = None
    crosshairMarkerBorderWidth: Optional[int] = None
    crosshairMarkerBorderColor: Optional[JS_Color] = None
    crosshairMarkerBackgroundColor: Optional[JS_Color] = None
    lastPriceAnimation: Optional[LastPriceAnimationMode] = None


@dataclass
class HistogramStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for a histogram series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HistogramStyleOptions
    """

    base: Optional[float] = None
    color: Optional[JS_Color] = None


@dataclass
class AreaStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for an area series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AreaStyleOptions
    """

    lineColor: Optional[JS_Color] = None
    lineStyle: Optional[LineStyle] = None
    lineType: Optional[LineType] = None
    lineWidth: Optional[LineWidth] = None
    lineVisible: Optional[bool] = None

    topColor: Optional[JS_Color] = None
    bottomColor: Optional[JS_Color] = None

    crosshairMarkerVisible: Optional[bool] = None
    crosshairMarkerRadius: Optional[int] = None
    crosshairMarkerBorderColor: Optional[JS_Color] = None
    crosshairMarkerBackgroundColor: Optional[JS_Color] = None
    crosshairMarkerBorderWidth: Optional[int] = None

    invertFilledArea: Optional[bool] = None
    pointMarkersVisible: Optional[bool] = None
    pointMarkersRadius: Optional[int] = None
    lastPriceAnimation: Optional[LastPriceAnimationMode] = None


@dataclass
class BaselineStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for a baseline series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/BaselineStyleOptions
    """

    baseValue: Optional[BaseValuePrice] = None
    lineVisible: Optional[bool] = None
    lineWidth: Optional[LineWidth] = None
    lineType: Optional[LineType] = None
    lineStyle: Optional[LineStyle] = None

    topLineColor: Optional[JS_Color] = None
    topFillColor1: Optional[JS_Color] = None
    topFillColor2: Optional[JS_Color] = None

    bottomLineColor: Optional[JS_Color] = None
    bottomFillColor1: Optional[JS_Color] = None
    bottomFillColor2: Optional[JS_Color] = None

    pointMarkersVisible: Optional[bool] = None
    pointMarkersRadius: Optional[int] = None
    crosshairMarkerVisible: Optional[bool] = None
    crosshairMarkerRadius: Optional[int] = None
    crosshairMarkerBorderColor: Optional[str] = None
    crosshairMarkerBackgroundColor: Optional[str] = None
    crosshairMarkerBorderWidth: Optional[int] = None
    lastPriceAnimation: Optional[LastPriceAnimationMode] = None


# endregion

# region --------------------------------------- OHLC Value Series Objects --------------------------------------- #


@dataclass
class BarStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for a bar series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/BarStyleOptions
    """

    thinBars: Optional[bool] = None
    openVisible: Optional[bool] = None
    upColor: Optional[JS_Color] = None
    downColor: Optional[JS_Color] = None


@dataclass
class CandlestickStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for a candlestick series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/CandlestickStyleOptions
    """

    upColor: Optional[JS_Color] = None
    downColor: Optional[JS_Color] = None

    borderVisible: Optional[bool] = None
    borderColor: Optional[JS_Color] = None
    borderUpColor: Optional[JS_Color] = None
    borderDownColor: Optional[JS_Color] = None

    wickVisible: Optional[bool] = None
    wickColor: Optional[JS_Color] = None
    wickUpColor: Optional[JS_Color] = None
    wickDownColor: Optional[JS_Color] = None


@dataclass
class RoundedCandleStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for a rounded candlestick series.
    """

    upColor: Optional[JS_Color] = None
    downColor: Optional[JS_Color] = None

    wickVisible: Optional[bool] = None
    wickColor: Optional[JS_Color] = None
    wickUpColor: Optional[JS_Color] = None
    wickDownColor: Optional[JS_Color] = None


# endregion

AnySeriesOptions: TypeAlias = (
    SeriesOptionsCommon
    | LineStyleOptions
    | HistogramStyleOptions
    | AreaStyleOptions
    | BaselineStyleOptions
    | BarStyleOptions
    | CandlestickStyleOptions
    | RoundedCandleStyleOptions
)
