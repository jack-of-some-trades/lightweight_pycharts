""" Series Datatypes and Custom Pandas Series DataFrame accessor """

from __future__ import annotations
import logging
from json import dumps
from math import floor, inf
from inspect import signature
from enum import IntEnum, auto
from typing import Optional, Self, TypeAlias, Dict, Any
from dataclasses import asdict, dataclass, field

import pandas as pd
import pandas_market_calendars as mcal

from .types import TF, Color, Time


logger = logging.getLogger("lightweight-pycharts")
# pylint: disable=line-too-long
# pylint: disable=invalid-name


@pd.api.extensions.register_dataframe_accessor("lwc_df")
class Series_DF:
    "Pandas DataFrame Extention to Typecheck for Lightweight_PyCharts"

    def __init__(self, pandas_df: pd.DataFrame, display_type: SeriesType):
        if pandas_df.size == 0:
            self.data_type = SeriesType.WhitespaceData
            self.disp_type = SeriesType.WhitespaceData
            self.tf = TF(1, "E")
            logger.warning("DataFrame given had no Data.")
            return

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
        self._data_type = self._determine_type(pandas_df)

        self.disp_type = display_type
        # Set ambiguous Data types to a default display series type
        if self.disp_type == SeriesType.SingleValueData:
            self.disp_type = SeriesType.Line
        elif self.disp_type == SeriesType.OHLC_Data:
            self.disp_type = SeriesType.Candlestick

        self.tf, self.pd_tf = self._determine_tf(pandas_df)
        self._df: pd.DataFrame = pandas_df

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
        Series_DF._col_name_check(
            column_names, rename_map, ["value", "v", "val", "data", "price"]
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
    def _determine_type(df: pd.DataFrame) -> SeriesType:
        "Checks the column names and returns the data type"
        column_names = set(df.columns)
        if "close" in column_names:
            return SeriesType.OHLC_Data
        elif "value" in column_names:
            return SeriesType.SingleValueData
        else:
            return SeriesType.WhitespaceData

    @staticmethod
    def _determine_tf(df: pd.DataFrame) -> tuple[TF, pd.Timedelta]:
        interval: pd.Timedelta = df["time"].diff().min()

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

    def json(self) -> str:
        "Convert to JSON suitable for plotting in a Javascript Lightweight Chart"
        # Time must be in Unix format to work with Lightweight Charts. If in String format,
        # The datetime will be truncated down to just the date leaving bars to print on top of each other.
        # May look Janky, but int conversion and back is the fastest method + still works with neg Epoch #s
        tmp_df = self._df.copy()
        tmp_df["time"] = tmp_df["time"].astype("int64") / 10**9

        # Rename if required to display data the.
        if SeriesType.SValue_Derived(self._data_type) != SeriesType.SValue_Derived(
            self.disp_type
        ):
            tmp_df.rename(columns={"close": "value", "value": "close"}, inplace=True)

        # Drop All Columns that LWC doesn't use (Why we made a copy of the data.)
        visual_columns = set(signature(self.disp_type.cls).parameters.keys())
        if "volume" in visual_columns:  # Volume handled as a separate series.
            visual_columns.remove("volume")
        col_to_drop = set(tmp_df.columns).difference(visual_columns)
        tmp_df.drop(columns=col_to_drop, inplace=True)  # type: ignore : False Alarm Err? Arg *can* be a set().

        # Not useing .to_json() since it leaves NaNs. NaNs need to be dropped on a per item basis
        json_df = dumps(
            [
                {k: v for k, v in m.items() if pd.notnull(v)}
                for m in tmp_df.to_dict(orient="records")
            ]
        )

        return json_df

    @property
    def curr_bar_time(self) -> pd.Timestamp:
        return self._df["time"].iloc[-1]

    @property
    def next_bar_time(self) -> pd.Timestamp:
        return self.curr_bar_time + self.pd_tf

    @property
    def last_bar(self) -> AnyBasicData:
        if self._data_type == SeriesType.SingleValueData:
            return SingleValueData.from_dict(self._df.iloc[-1].to_dict())
        elif self._data_type == SeriesType.OHLC_Data:
            return OhlcData.from_dict(self._df.iloc[-1].to_dict())
        else:
            return WhitespaceData.from_dict(self._df.iloc[-1].to_dict())

    # Next line Silences a False-Positive Flag. Dunno why it thinks last_data's vars aren't initialized
    # @pylint: disable=attribute-defined-outside-init
    def update_from_tick(
        self, data: AnyBasicData, accumulate: bool = False
    ) -> AnyBasicData:
        """
        Updates the DF from a given tick with the assumption a new bar should not be created.
        Accumulate volume if desired, overwrite by default.
        Returns a Basic DataPoint than can be used to update the screen.
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
        last_data.time = self.curr_bar_time

        # Somehow this is the easist way to update the last row in the DF??
        last_ind = self._df.index[-1]
        data_dict = last_data.as_dict
        for k, v in data_dict.items():
            if k in self._df.columns:
                self._df.loc[last_ind, k] = v

        return self._get_render_data_fmt(data_dict)

    # @pylint: enable=attribute-defined-outside-init

    def update(self, data: AnyBasicData) -> AnyBasicData:
        "Update the DF from a given new bar. Data Assumed as next in sequence"
        data_dict = data.as_dict
        # Convert Data to proper format (if needed) then append.
        match self._data_type, data:
            case SeriesType.OHLC_Data, SingleValueData():
                # Ensure both open an close are defined when storeing OHLC data from a single data point
                data_dict["open"] = data_dict["value"]
                data_dict["high"] = data_dict["value"]
                data_dict["low"] = data_dict["value"]
                data_dict["close"] = data_dict["value"]
            case SeriesType.SingleValueData, OhlcData():
                data_dict["value"] = data_dict["close"]

        self._df = pd.concat([self._df, pd.DataFrame([data_dict])], ignore_index=True)

        return self._get_render_data_fmt(data_dict)

    def _get_render_data_fmt(self, data_dict) -> AnyBasicData:
        "Takes a Dict of Data and returns an object that is used to update the screen"
        match (
            self._data_type,
            SeriesType.SValue_Derived(self.disp_type),
            SeriesType.OHLC_Derived(self.disp_type),
        ):
            case SeriesType.OHLC_Data, False, True:
                return OhlcData.from_dict(data_dict)
            case SeriesType.OHLC_Data, True, False:
                if "value" not in data_dict:
                    data_dict["value"] = data_dict["close"]
                return SingleValueData.from_dict(data_dict)
            case SeriesType.SingleValueData, False, True:
                if "close" not in data_dict:
                    data_dict["close"] = data_dict["value"]
                return OhlcData.from_dict(data_dict)
            case SeriesType.SingleValueData, True, False:
                return SingleValueData.from_dict(data_dict)
            case _:
                return WhitespaceData.from_dict(data_dict)

    def extend(self) -> AnyBasicData:
        "Extends a series with one datapoint of whitespace. Predominately useful for padding Series."
        rtn_data = WhitespaceData(self.next_bar_time)
        self._df = pd.concat(
            [self._df, pd.DataFrame([{"time": rtn_data.time}])], ignore_index=True
        )
        return rtn_data

    def whitespace_df(self) -> pd.DataFrame:
        "Returns a Dataframe with 500 extrapolation Whitespace Datapoints"
        whitespace = pd.date_range(
            start=self._df["time"].iloc[-1] + self.pd_tf, periods=500, freq=self.pd_tf
        )
        return pd.DataFrame({"time": whitespace})


class WhiteSpace_DF:
    """
    Pandas DataFrame Wrapper to Generate Whitespace for Lightweight PyCharts

    Whitespace ahead of a series is useful to be able to extend drawings into that space.
    Without the whitespace, nothing can be drawn in that area. Ideally this whitespace
    is already set to the times market data is expected. If it's not, likely because it was just
    blindly extended at the chart timeframe, then there will be potentially large gaps between bars.
    The only way to fix this is to generate an entirely new whitespace that overwrites the old.
    While that works, it's jittery when re-setting and overall inefficient.
    """

    def __init__(self, tf: TF, calendar: mcal.MarketCalendar, ext: bool):
        pass


# region --------------------------------------- Series Data Types --------------------------------------- #


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
    # are ignored and deleted and thus inaccessible beyond python.

    def __post_init__(self):  # Ensure Consistent Time Format (UTC, TZ Aware).
        self.time = pd.Timestamp(self.time)
        try:
            self.time = self.time.tz_convert("UTC")
        except TypeError:
            self.time = self.time.tz_localize("UTC")

    @property
    def as_dict(self) -> dict:
        return asdict(  # Drop Nones
            self, dict_factory=lambda x: {k: v for (k, v) in x if v is not None}
        )

    @classmethod
    def from_dict(cls, obj: dict) -> Self:
        "Create an instance from a dict ignoring extraneous params"
        return cls(**{k: v for k, v in obj.items() if k in signature(cls).parameters})


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

    color: Optional[Color] = None


@dataclass
class LineData(SingleValueData):
    """
    Structure describing a single item of data for line series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LineData
    """

    color: Optional[Color] = None


@dataclass
class AreaData(SingleValueData):
    """
    Structure describing a single item of data for area series.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AreaData
    """

    lineColor: Optional[Color] = None
    topColor: Optional[Color] = None
    bottomColor: Optional[Color] = None


@dataclass
class BaselineData(SingleValueData):
    """
    Structure describing a single item of data for baseline series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/BaselineData
    """

    topLineColor: Optional[Color] = None
    topFillColor1: Optional[Color] = None
    topFillColor2: Optional[Color] = None
    bottomLineColor: Optional[Color] = None
    bottomFillColor1: Optional[Color] = None
    bottomFillColor2: Optional[Color] = None


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

    # HLC_AREA = auto()
    Rounded_Candle = auto()

    @staticmethod
    def OHLC_Derived(s_type: SeriesType | AnySeriesData) -> bool:
        "Returns True if the given SeriesType or Data Class is derived from OHLC Data"
        if isinstance(s_type, AnySeriesData):
            return isinstance(
                s_type,
                (OhlcData, BarData, CandlestickData),
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

    @property
    def params(self) -> set[str]:
        """
        Returns a set of the unique properties of that type. Properties of a Types' parent are omitted
        e.g. SeriesType.Bar = {'color'} because properties of OHLC_Data and WhitespaceData are omited.
        """
        match self:
            case SeriesType.Bar:
                return {"color"}
            case SeriesType.Candlestick:  # Candlestick is an extention of Bar
                return {"wickcolor", "bordercolor"}
            case SeriesType.Rounded_Candle:
                return {"wickcolor"}
            case SeriesType.Area:
                return {"linecolor", "topcolor", "bottomcolor"}
            case SeriesType.Baseline:
                return {
                    "toplinecolor",
                    "topfillcolor1",
                    "topfillcolor2",
                    "bottomlinecolor",
                    "bottomfillcolor1",
                    "bottomfillcolor2",
                }
            case SeriesType.Line:
                return {"color"}
            case SeriesType.Histogram:
                return {"color"}
            case SeriesType.SingleValueData:
                return {"value"}
            case SeriesType.OHLC_Data:
                return {"open", "high", "low", "close"}
            case SeriesType.WhitespaceData:
                return {"time"}

    @property
    def cls(self) -> type:
        "Returns the DataClass this Type corresponds too"
        match self:
            case SeriesType.Bar:
                return BarData
            case SeriesType.Candlestick:
                return CandlestickData
            case SeriesType.Rounded_Candle:
                return CandlestickData
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
            case SeriesType.WhitespaceData:
                return WhitespaceData


# endregion
