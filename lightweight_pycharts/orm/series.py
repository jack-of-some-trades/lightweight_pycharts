""" Series Datatypes and Custom Pandas Series DataFrame accessor """

from __future__ import annotations
from enum import IntEnum, auto
from typing import Optional, TypeAlias
from dataclasses import asdict, dataclass
from math import floor
from json import dumps
import logging
import pandas as pd

from .types import TF, Color, Time


logger = logging.getLogger("lightweight-pycharts")
# pylint: disable=line-too-long
# pylint: disable=invalid-name


@pd.api.extensions.register_dataframe_accessor("lwc_df")
class Series_DF:
    "Pandas DataFrame Extention to Typecheck for Lightweight_PyCharts"

    def __init__(self, pandas_df: pd.DataFrame):
        if pandas_df.size == 0:
            self.type = SeriesType.WhitespaceData
            self.tf = TF(1, "E")
            logger.warning("DataFrame given had no Data.")
            return

        rename_dict = self._validate_names(pandas_df)
        if len(rename_dict) > 0:
            pandas_df.rename(columns=rename_dict, inplace=True)

        pandas_df["time"] = pd.to_datetime(pandas_df["time"])

        self.type = self._determine_type(pandas_df)
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
        "Checks the column names and returns the most strict applicable series type"
        col_names = set(df.columns)
        if len(col_names.intersection(SeriesType.OHLC_Data.params)) == 4:
            remainder = col_names.difference(SeriesType.OHLC_Data.params, "time")

            if len(remainder.intersection(SeriesType.Candlestick.params)) > 0:
                return SeriesType.Candlestick
            elif len(remainder.intersection(SeriesType.Bar.params)) > 0:
                return SeriesType.Bar
            else:
                return SeriesType.OHLC_Data

        if len(col_names.intersection({"close"})) == 1:
            # DataFrame was given 'close' but lacks Open, high, & low. rename to value and treat as singlevalue
            # remainder of library should ignore the Open, high, & low columns
            df.rename(columns={"close": "value"}, inplace=True)

        if len(col_names.intersection(SeriesType.SingleValueData.params)) == 1:
            remainder = col_names.difference(SeriesType.SingleValueData.params, "time")

            if len(remainder.intersection(SeriesType.Baseline.params)) > 0:
                return SeriesType.Baseline
            elif len(remainder.intersection(SeriesType.Area.params)) > 0:
                return SeriesType.Area
            # Histogram Check Un-neccessary since dataset will match line type
            elif len(remainder.intersection(SeriesType.Line.params)) > 0:
                return SeriesType.Line
            else:
                return SeriesType.SingleValueData

        # if nothing else returned then only whitespace remains
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
        # The datetime will be truncated down to just the date leaving bars to print over each other.
        # May look Janky, but int conversion and back is the fastest method + still works with -Epoch #s
        self._df["time"] = self._df["time"].astype("int64") / 10**9

        # Not useing .to_json() since it leaves NaNs. NaNs need to be dropped on a per row basis
        json_df = dumps(
            [
                {k: v for k, v in m.items() if pd.notnull(v)}
                for m in self._df.to_dict(orient="records")
            ]
        )

        # Convert Time back so that We can still use Timezone functionality
        self._df["time"] = (self._df["time"] * 10**9).astype("datetime64[ns]")
        return json_df

    @property
    def is_ohlc(self) -> bool:
        "Checks if DataFrame is OHLC-Value Derived"
        return "close" in set(self._df.columns)

    @property
    def is_svalue(self) -> bool:
        "Checks if DataFrame is Single-Value Derived"
        return "value" in set(self._df.columns)

    @property
    def curr_bar_time(self) -> pd.Timestamp:
        return self._df["time"].iloc[-1]

    @property
    def next_bar_time(self) -> pd.Timestamp:
        return self.curr_bar_time + self.pd_tf

    def update_from_tick(
        self, data: AnyBasicData, accumulate: bool = False
    ) -> AnyBasicData:
        """
        Updates the DF from a given tick. Accumulate volume if desired, overwrite by default.
        Returns a Basic DataPoint than can be used to update the screen.
        """
        return data

    def update(self, data: AnyBasicData):
        "Update the DF from a given new bar. Data Assumed as next in sequence"
        data_dict = asdict(  # Drop Nones
            data, dict_factory=lambda x: {k: v for (k, v) in x if v is not None}
        )
        self._df = pd.concat([self._df, pd.DataFrame([data_dict])], ignore_index=True)

    def convert(self) -> None:
        """
        Converts the Value Column name to Close and vise-versa depending on which is present
        Does Nothing if both value and close are present
        """
        col_names = set(self._df.columns)
        if len(col_names.intersection(("value", "close"))) == 1:
            self._df.rename(columns={"value": "close", "close": "value"}, inplace=True)

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


# region --------------------------------------- Series Data Types --------------------------------------- #


@dataclass(slots=True)
class WhitespaceData:
    """
    Represents a whitespace data item, which is a data point without a value.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/WhitespaceData
    """

    time: Time

    def __post_init__(self):
        self.time = pd.Timestamp(self.time)  # Ensure Consistent Format.

    # custom_values: Optional[Dict[str, Any]] = None #Removed for now since The Default Arg is messing with initilization


@dataclass(slots=True)
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


@dataclass(slots=True)
class BarData(OhlcData):
    """
    Structure describing a single item of data for bar series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/BarData
    """

    color: Optional[str] = None


@dataclass(slots=True)
class CandlestickData(OhlcData):
    """
    Structure describing a single item of data for candlestick series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/CandlestickData
    """

    color: Optional[str] = None
    wickColor: Optional[str] = None
    borderColor: Optional[str] = None


@dataclass(slots=True)
class SingleValueData(WhitespaceData):
    """
    Represents a data point of a single-value series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/SingleValueData
    """

    value: Optional[float] = None
    volume: Optional[float] = None  # Added by this library


@dataclass(slots=True)
class HistogramData(SingleValueData):
    """
    Structure describing a single item of data for histogram series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HistogramData
    """

    color: Optional[Color] = None


@dataclass(slots=True)
class LineData(SingleValueData):
    """
    Structure describing a single item of data for line series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LineData
    """

    color: Optional[Color] = None


@dataclass(slots=True)
class AreaData(SingleValueData):
    """
    Structure describing a single item of data for area series.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AreaData
    """

    lineColor: Optional[Color] = None
    topColor: Optional[Color] = None
    bottomColor: Optional[Color] = None


@dataclass(slots=True)
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


# endregion
