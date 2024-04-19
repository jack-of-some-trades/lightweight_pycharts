""" Object Relational Mapping for all of the various types defined within the Lightweight Charts API.
    All Hail Our Overlord, ChatGPT.
"""

import logging
from dataclasses import dataclass, field, asdict
from typing import TypeAlias, Optional, Literal, Union, Any
from enum import Enum, IntEnum, StrEnum

import pandas as pd

logger = logging.getLogger("lightweight-pycharts")


# pylint: disable=line-too-long
# pylint: disable=invalid-name
# region --------------------------------------- Literals / Type Aliases --------------------------------------- #

HorzAlign: TypeAlias = Literal["left", "center", "right"]
VertAlign: TypeAlias = Literal["bottom", "top", "center"]
PriceFormatType: TypeAlias = Literal["price", "volume", "percent"]
DataChangedScope: TypeAlias = Literal["full", "update"]
BaseValueType: TypeAlias = Literal["price"]
LineWidth: TypeAlias = Literal[1, 2, 3, 4]

Coordinate: TypeAlias = int
UTCTimestamp: TypeAlias = int

Period: TypeAlias = Literal["s", "m", "h", "D", "W", "M", "Y"]


@dataclass
class BusinessDay:
    """
    Represents a time as a day/month/year.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/BusinessDay

    Example:
    ```
    day = BusinessDay(year=2019, month=6, day=1)  # June 1, 2019
    ```
    """

    year: int
    month: int
    day: int


Time: TypeAlias = Union[UTCTimestamp, BusinessDay, str]


# endregion

# region --------------------------------------- API Enums --------------------------------------- #


class SeriesType(StrEnum):
    """
    Represents the type of options for each series type.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api#seriestype
    The Value of these Enums is used when setting the data in Javascript. See JS Pane.set_data()
    """

    Bar = "Bar"
    Candlestick = "Candlestick"
    Area = "Area"
    Baseline = "Baseline"
    Line = "Line"
    Histogram = "Histogram"
    OHLC_Data = "OHLC"
    SingleValueData = "SingleValueData"
    WhitespaceData = "WhitespaceData"
    LineorHist = "LineorHistogram"  # Datatypes are indestinguishable

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
            case SeriesType.LineorHist:
                return {"color"}
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


class ColorType(StrEnum):
    """
    Represents a type of color.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/ColorType
    """

    Solid = "solid"
    VerticalGradient = "gradient"


class CrosshairMode(IntEnum):
    """
    Represents the crosshair mode.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/CrosshairMode
    Tutorial: https://tradingview.github.io/lightweight-charts/tutorials/customization/crosshair#crosshair-mode
    """

    Normal = 0
    Magnet = 1
    Hidden = 2


class LastPriceAnimationMode(IntEnum):
    """
    Represents the type of the last price animation for series such as area or line.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/LastPriceAnimationMode
    """

    Disabled = 0
    Continuous = 1
    OnDataUpdate = 2


class LineStyle(IntEnum):
    """
    Represents the possible line styles.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/LineStyle
    """

    Solid = 0
    Dotted = 1
    Dashed = 2
    LargeDashed = 3
    SparseDotted = 4


class LineType(IntEnum):
    """
    Represents the possible line types.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/LineType
    """

    Simple = 0
    WithSteps = 1
    Curved = 2


class MismatchDirection(IntEnum):
    """
    Search direction if no data found at provided index
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/MismatchDirection
    """

    NearestLeft = -1
    None_ = 0  # 'None' is a reserved keyword in Python, so use 'None_' instead
    NearestRight = 1


class PriceLineSource(IntEnum):
    """
    Represents the source of data to be used for the horizontal price line.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/PriceLineSource
    """

    LastBar = 0
    LastVisible = 1


class PriceScaleMode(IntEnum):
    """
    Represents the price scale mode.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/enums/PriceScaleMode
    """

    Normal = 0
    Logarithmic = 1
    Percentage = 2
    IndexedTo100 = 3


class TickMarkType(IntEnum):
    """
    Represents the type of a tick mark on the time axis.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/enums/TickMarkType
    """

    Year = 0
    Month = 1
    DayOfMonth = 2
    Time = 3
    TimeWithSeconds = 4


class TrackingModeExitMode(IntEnum):
    """
    Determine how to exit the tracking mode.

    By default, mobile users will long press to deactivate the scroll and have the ability to check values and dates.
    Another press is required to activate the scroll, be able to move left/right, zoom, etc.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/enums/TrackingModeExitMode
    """

    OnTouchEnd = 0
    OnNextTap = 1


class SeriesMarkerPosition(StrEnum):
    """
    Represents the position of a series marker relative to a bar.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api#seriesmarkerposition
    """

    Above = "aboveBar"
    Below = "belowBar"
    In = "inBar"


class SeriesMarkerShape(StrEnum):
    """
    Represents the shape of a series marker.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api#seriesmarkershape
    """

    Circle = "circle"
    Square = "square"
    Arrow_Up = "arrowUp"
    Arrow_Down = "arrowDown"


# endregion

# region --------------------------------------- Misc Dataclass / Interfaces --------------------------------------- #


# Note, this object cannot be a dataclass otherwise json.dumps()
# will dump this out as a dict. For functionality we need to call repr() on dumps()
class Color:
    """
    RBGa Color Class. To instatiate use Color.from_rgb() or Color.from_hex()
    Original Object: https://www.w3schools.com/cssref/func_rgba.php
    """

    def __init__(self, r: int, b: int, g: int, a: float):
        self._r = r
        self._b = b
        self._g = g
        self._a = a

    @classmethod
    def from_rgb(cls, r: int, b: int, g: int, a: float = 1):
        "Instantiate a new Color Instance from RGB Values"
        new_inst = cls(0, 0, 0, 0)
        # Pass variables after construction to Value Check them w/ setter funcs
        new_inst.r = r
        new_inst.g = g
        new_inst.b = b
        new_inst.a = a
        return new_inst

    @classmethod
    def from_hex(cls, hex_value: str):
        "Instantiate a new Color Instance from a hex string of 3, 4, 6, or 8 chars."
        hex_value = hex_value.lstrip("#")
        if len(hex_value) == 6 or len(hex_value) == 8:
            # Hex String of 6 or 8 Chars
            r, g, b = [int(hex_value[i : i + 2], 16) for i in (0, 2, 4)]
            alpha = 1 if (len(hex_value) != 8) else int(hex_value[6:8], 16) / 255

        elif len(hex_value) == 3 or len(hex_value) == 4:
            # Hex String of 3 or 4 Chars
            r, g, b = [
                ((int(char, 16) << 4) + (int(char, 16))) for char in hex_value[0:3]
            ]
            alpha = (
                1
                if (len(hex_value) != 4)
                else ((int(hex_value[3], 16) << 4) + int(hex_value[3], 16)) / 255
            )
        else:
            raise ValueError(f"Hex Color of length {len(hex_value)} is not valid.")
        return cls(r, g, b, alpha)

    # @classmethod
    # def from_jdict(cls, j_dict: dict):
    #     "Instantiate a new Color Instance from a Loaded JSON Dict"
    #     raise NotImplementedError

    # region // -------------- Color Getters & Setters -------------- //
    @property
    def r(self):
        return self._r

    @r.setter
    def r(self, r: int):
        if r > 255:
            raise ValueError(f"Arg: {r = } is not valid. Max Value is 255.")
        if r < 0:
            raise ValueError(f"Arg: {r = } is not valid. Min Value is 0.")
        self._r = r

    @property
    def g(self):
        return self._g

    @g.setter
    def g(self, g: int):
        if g > 255:
            raise ValueError(f"Arg: {g = } is not valid. Max Value is 255.")
        if g < 0:
            raise ValueError(f"Arg: {g = } is not valid. Min Value is 0.")
        self._g = g

    @property
    def b(self):
        return self._b

    @b.setter
    def b(self, b: int):
        if b > 255:
            raise ValueError(f"Arg: {b = } is not valid. Max Value is 255.")
        if b < 0:
            raise ValueError(f"Arg: {b = } is not valid. Min Value is 0.")
        self._b = b

    @property
    def a(self):
        return self._a

    @a.setter
    def a(self, a: float):
        if a > 1:
            raise ValueError(f"Arg: {a = } is not valid. Max Value is 1.")
        if a < 0:
            raise ValueError(f"Arg: {a = } is not valid. Min Value is 0.")
        self._a = a

    # endregion

    def __repr__(self):
        "Javascript RGBA Representation of Class Params."
        return f"rgba({self._r},{self._g},{self._b},{self._a})"


@dataclass
class TF:
    "Dataclass Representation of a Timeframe"
    _mult: int
    _period: Period

    def __init__(self, mult: int, period: Period):
        self.validate(mult, period)
        self._period = period
        self._mult = mult

    def __str__(self) -> str:
        return self.toString

    # region ---- TF Setters and Getters ----

    @property
    def mult(self):
        return self._mult

    @mult.setter
    def amount(self, value: int):
        self.validate(value, self._period)
        self._mult = value

    @property
    def period(self) -> str:
        return self._period

    @period.setter
    def period(self, value: Period):
        self.validate(self._mult, value)
        self._period = value

    @property
    def toString(self) -> str:
        return f"{self._mult}{self._period}"

    @staticmethod
    def validate(amount: int, unit: Period):
        if amount <= 0:
            raise ValueError("Amount must be a positive integer value.")

        match unit:
            case "s" | "m":
                if amount > 59:
                    raise ValueError("Seconds & Minutes multiplier must be in [1, 59].")
            case "h":
                if amount > 23:
                    raise ValueError("Hour multiplier must be in [1, 23].")
            case "D":
                if amount > 6:
                    raise ValueError("Hour multiplier must be in [1, 6].")
            case "W":
                if amount > 3:
                    raise ValueError("Hour multiplier must be in [1, 3].")
            case "M":
                if amount not in (1, 2, 3, 6):
                    raise ValueError("Month units must be (1, 2, 3, 6)")
            case "Y":
                return
            case _:
                raise ValueError(f"'{unit}' Not a valid timeframe period.")

    @property
    def unix_len(self) -> int:
        """
        The length, in seconds, that the timeframe represents.

        1 Month = 30.44 Days, 1 Year = 365.24 Days (Unix Standard Conversions)
        """
        match self._period:
            case "s":
                return self._mult
            case "m":
                return self._mult * 60
            case "h":
                return self._mult * 3600
            case "D":
                return self._mult * 86400
            case "W":
                return self._mult * 604800
            case "M":
                return self._mult * 2629743
            case "Y":
                return self._mult * 31556926
            case _:
                return -1

    # endregion


@dataclass
class SolidColor:
    """
    Represents a solid color.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/SolidColor
    """

    type: Literal[ColorType.Solid]
    color: Optional[Color] = None


@dataclass
class VerticalGradientColor:
    """
    Represents a vertical gradient of two colors.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/VerticalGradientColor
    """

    type: Literal[ColorType.VerticalGradient]
    topColor: Optional[Color] = None
    bottomColor: Optional[Color] = None


@dataclass
class BaseValuePrice:
    """
    Represents a type of priced base value of baseline series type.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/BaseValuePrice
    """

    price: float
    type: BaseValueType = "price"


@dataclass
class PriceFormat:  # Actually PriceFormatBuiltIn. True PriceFormat is Union [PriceFormatBuiltIn | PriceFormatCustom]
    """
    Represents series value formatting options.
    The precision and minMove properties allow wide customization of formatting.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceFormatBuiltIn

    Docs Reference the Built-in Values only, PriceFormatCustom is not implemented here
    """

    type: PriceFormatType = "price"
    precision: int = 2
    minMove: float = 0.01


# @dataclass
# class PriceFormatCustom:
#     """
#     Represents series value formatting options.
#     Removed to keep JS Functions in JS Files. May enable later on though
#     Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceFormatCustom
#     """

#     type = Literal["custom"]
#     minMove: float = 0.01
#     formatter: PriceFormatterFn


@dataclass
class TimeRange:
    """
    Represents a Time range `from` one value `to` another.
    """

    from_: Time
    to_: Time


@dataclass
class BarsInfo(TimeRange):
    """
    Represents a range of bars and the number of bars outside the range.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/BarsInfo
    """

    barsBefore: int
    barsAfter: int


@dataclass
class Point:
    """
    Represents a point on the chart.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/Point
    """

    x: float
    y: float


@dataclass
class TouchMouseEventData:
    """
    The TouchMouseEventData class represents events that occur due to the user interacting with a
    pointing device (such as a mouse).
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TouchMouseEventData
    """

    clientX: Coordinate
    clientY: Coordinate
    pageX: Coordinate
    pageY: Coordinate
    screenX: Coordinate
    screenY: Coordinate
    localX: Coordinate
    localY: Coordinate
    ctrlKey: bool
    altKey: bool
    shiftKey: bool
    metaKey: bool


@dataclass
class MouseEventParams:
    """
    Represents a mouse event.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/MouseEventParams
    """

    time: Optional[Time] = None
    logical: Optional[int] = None
    point: Optional[Point] = None
    series_data = {}  # todo: Update to the Series Data Objects
    hovered_series: Optional[str] = None  # todo: Implement
    hovered_object_id: Optional[str] = None  # todo: Implement
    source_event: Optional[TouchMouseEventData] = None


@dataclass
class TickMark:
    """
    Tick mark for the horizontal scale.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TickMark
    """

    index: int
    time: Time
    weight: float
    original_time: Time


@dataclass
class TimeMark:
    """
    Represents a tick mark on the horizontal (time) scale.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TimeMark
    """

    need_align_coordinate: bool
    coord: int
    label: str
    weight: float


@dataclass
class TimeScalePoint:
    """
    Represents a point on the time scale.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TimeScalePoint
    """

    time: Time
    timeWeight: float
    originalTime: Time


@dataclass
class SeriesMarker:
    """
    Represents a series marker.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/SeriesMarker
    """

    time: Time
    shape: SeriesMarkerShape
    position: SeriesMarkerPosition
    id: Optional[str] = None
    size: Optional[int] = 1
    color: Optional[Color] = None
    text: Optional[str] = None


# endregion

# region --------------------------------------- Pandas Series Data Types --------------------------------------- #


@pd.api.extensions.register_dataframe_accessor("lwc_df")
class Series_DF:
    "Pandas DataFrame Extention to Typecheck for Lightweight_PyCharts"

    def __init__(self, pandas_df: pd.DataFrame):
        rename_dict = self._validate_names(pandas_df)
        if len(rename_dict) > 0:
            pandas_df.rename(columns=rename_dict, inplace=True)

        self.type = self._determine_type(pandas_df)
        self._df = pandas_df

    @staticmethod
    def _validate_names(obj: pd.DataFrame) -> dict[str, str]:
        """
        Standardize common column names.

        Additional datafields,
        (e.g. wickColor, lineColor, topFillColor1), must be entered verbatum to be used.
        """
        rename_map = {}
        obj.columns = list(map(str.lower, obj.columns))
        column_names = set(obj.columns)
        Series_DF._col_name_check(
            column_names, rename_map, ["time", "t", "dt", "date", "datetime"], True
        )
        Series_DF._col_name_check(column_names, rename_map, ["open", "o", "first"])
        Series_DF._col_name_check(column_names, rename_map, ["close", "c", "last"])
        Series_DF._col_name_check(column_names, rename_map, ["high", "h", "max"])
        Series_DF._col_name_check(column_names, rename_map, ["low", "l", "min"])
        Series_DF._col_name_check(
            column_names, rename_map, ["value", "v", "val", "data"]
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
            raise AttributeError(f"Must have a '{expected_names[0]}' column")
        elif len(name_intersect) > 1:
            raise AttributeError(
                f"Can have only one '{expected_names[0]}' type of column"
            )
        elif len(name_intersect) == 1 and name_intersect[0] != expected_names[0]:
            # Remap if necessary
            rename_map[name_intersect[0]] = expected_names[0]

    @staticmethod
    def _determine_type(obj: pd.DataFrame) -> SeriesType:
        "Checks the column names and returns the most strict applicable series type"
        col_names = set(obj.columns)
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
            obj.rename(columns={"close": "value"}, inplace=True)

        if len(col_names.intersection(SeriesType.SingleValueData.params)) == 1:
            remainder = col_names.difference(SeriesType.SingleValueData.params, "time")

            if len(remainder.intersection(SeriesType.LineorHist.params)) > 0:
                return SeriesType.LineorHist
            elif len(remainder.intersection(SeriesType.Area.params)) > 0:
                return SeriesType.Area
            elif len(remainder.intersection(SeriesType.Baseline.params)) > 0:
                return SeriesType.Baseline
            else:
                return SeriesType.SingleValueData

        else:
            # if nothing else returned then only whitespace remains
            return SeriesType.WhitespaceData

    @property
    def json(self) -> str:
        "Convert to JSON suitable for plotting in a Javascript Lightweight Chart"
        return self._df.to_json(orient="records")


# endregion

# region --------------------------------------- Series Data Types --------------------------------------- #


@dataclass
class WhitespaceData:
    """
    Represents a whitespace data item, which is a data point without a value.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/WhitespaceData
    """

    time: Time
    # custom_values: Optional[Dict[str, Any]] = None #Removed for now since The Default Arg is messing with initilization


@dataclass
class OhlcData(WhitespaceData):
    """
    Represents a bar with a time, open, high, low, and close prices.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/OhlcData
    """

    open: float
    high: float
    low: float
    close: float


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

    value: float


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


# endregion

# region --------------------------------------- Series Style Options --------------------------------------- #


@dataclass
class SeriesOptionsCommon:
    """
    Represents options common for all types of series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon
    """

    title: str = ""
    visible: bool = True
    lastValueVisible: bool = True
    priceScaleId: Optional[str] = None

    priceLineVisible: bool = True
    priceLineWidth: LineWidth = 1
    priceLineColor: Optional[Color] = None
    priceLineStyle: LineStyle = LineStyle.Dashed
    priceLineSource: PriceLineSource = PriceLineSource.LastBar
    priceFormat: PriceFormat = field(default_factory=PriceFormat)

    # BaseLine is for 'IndexTo' and Percent Modes
    baseLineVisible: bool = True
    baseLineWidth: LineWidth = 1
    baseLineStyle: LineStyle = LineStyle.Solid
    baseLineColor: Color = field(default_factory=lambda: Color.from_hex("#B2B5BE"))
    # autoscaleInfoProvider: removed to keep JS Funcitons in JS files. May Enable this later though.


@dataclass
class BarStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for a bar series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/BarStyleOptions
    """

    thinBars: bool = True
    openVisible: bool = True
    upColor: Color = field(default_factory=lambda: Color.from_hex("#26a69a"))
    downColor: Color = field(default_factory=lambda: Color.from_hex("#ef5350"))


@dataclass
class CandlestickStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for a candlestick series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/CandlestickStyleOptions
    """

    upColor: Color = field(default_factory=lambda: Color.from_hex("#26a69a"))
    downColor: Color = field(default_factory=lambda: Color.from_hex("#ef5350"))

    borderVisible: bool = True
    borderColor: Color = field(default_factory=lambda: Color.from_hex("#378658"))
    borderUpColor: Color = field(default_factory=lambda: Color.from_hex("#26a69a"))
    borderDownColor: Color = field(default_factory=lambda: Color.from_hex("#ef5350"))

    wickVisible: bool = True
    wickColor: Color = field(default_factory=lambda: Color.from_hex("#737375"))
    wickUpColor: Color = field(default_factory=lambda: Color.from_hex("#26a69a"))
    wickDownColor: Color = field(default_factory=lambda: Color.from_hex("#ef5350"))


@dataclass
class LineStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for a line series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LineStyleOptions
    """

    lineVisible: bool = True
    lineWidth: int = 3
    lineType: LineType = LineType.Simple
    lineStyle: LineStyle = LineStyle.Solid
    color: Color = field(default_factory=lambda: Color.from_hex("#2196f3"))

    pointMarkersVisible: bool = False
    pointMarkersRadius: Optional[int] = None

    crosshairMarkerVisible: bool = True
    crosshairMarkerRadius: int = 4
    crosshairMarkerBorderWidth: int = 2
    crosshairMarkerBorderColor: Optional[Color] = None
    crosshairMarkerBackgroundColor: Optional[Color] = None
    lastPriceAnimation: LastPriceAnimationMode = LastPriceAnimationMode.Disabled


@dataclass
class HistogramStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for a histogram series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HistogramStyleOptions
    """

    base: float = 0
    color: Color = field(default_factory=lambda: Color.from_hex("#26a69a"))


@dataclass
class AreaStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for an area series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AreaStyleOptions
    """

    lineColor: Color = field(default_factory=lambda: Color.from_hex("#33D778"))
    lineStyle: LineStyle = LineStyle.Solid
    lineType: LineType = LineType.Simple
    lineWidth: LineWidth = 3
    lineVisible: bool = True

    topColor: Color = field(default_factory=lambda: Color.from_rgb(46, 220, 135, 0.4))
    bottomColor: Color = field(default_factory=lambda: Color.from_rgb(40, 221, 100, 0))

    crosshairMarkerVisible: bool = True
    crosshairMarkerRadius: int = 4
    crosshairMarkerBorderColor: Optional[Color] = None
    crosshairMarkerBackgroundColor: Optional[Color] = None
    crosshairMarkerBorderWidth: int = 2

    invertFilledArea: bool = False
    pointMarkersVisible: bool = False
    pointMarkersRadius: Optional[int] = None
    lastPriceAnimation: LastPriceAnimationMode = LastPriceAnimationMode.Disabled


@dataclass
class BaselineStyleOptions(SeriesOptionsCommon):
    """
    Represents style options for a baseline series.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/BaselineStyleOptions
    """

    baseValue: BaseValuePrice = field(default_factory=lambda: BaseValuePrice(price=0))
    lineVisible: bool = True
    lineWidth: LineWidth = 3
    lineType: LineType = LineType.Simple
    lineStyle: LineStyle = LineStyle.Solid

    topLineColor: Color = field(default_factory=lambda: Color.from_rgb(38, 166, 154, 1))
    topFillColor1: Color = field(
        default_factory=lambda: Color.from_rgb(38, 166, 154, 0.28)
    )
    topFillColor2: Color = field(
        default_factory=lambda: Color.from_rgb(38, 166, 154, 0.05)
    )

    bottomLineColor: Color = field(
        default_factory=lambda: Color.from_rgb(239, 83, 80, 1)
    )
    bottomFillColor1: Color = field(
        default_factory=lambda: Color.from_rgb(239, 83, 80, 0.05)
    )
    bottomFillColor2: Color = field(
        default_factory=lambda: Color.from_rgb(239, 83, 80, 0.28)
    )

    pointMarkersVisible: bool = False
    pointMarkersRadius: Optional[int] = None
    crosshairMarkerVisible: bool = True
    crosshairMarkerRadius: int = 4
    crosshairMarkerBorderColor: str = ""
    crosshairMarkerBackgroundColor: str = ""
    crosshairMarkerBorderWidth: int = 2
    lastPriceAnimation: LastPriceAnimationMode = LastPriceAnimationMode.Disabled


# endregion

# region --------------------------------------- Layout Options Support Classes --------------------------------------- #


@dataclass
class PriceRange:
    """
    Represents a price range.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceRange
    """

    minValue: float
    maxValue: float


@dataclass
class PriceScaleMargins:
    """
    Defines margins of the price scale.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceScaleMargins
    """

    top: float = 0.2
    bottom: float = 0.1


@dataclass
class PriceLineOptions:
    """
    Represents a price line options.
    """

    title: str = ""
    id: Optional[str] = None
    price: float = 0
    color: Optional[Color] = None

    lineWidth: int = 1
    lineVisible: bool = True
    lineStyle: LineStyle = LineStyle.Solid

    axisLabelVisible: bool = True
    axisLabelColor: Optional[Color] = None
    axisLabelTextColor: Optional[Color] = None


@dataclass
class OverlayPriceScaleOptions:
    """
    Structure that describes overlay price scale options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceScaleOptions
    """

    invertScale: bool = False
    ticksVisible: bool = False

    minimumWidth: int = 0
    mode: PriceScaleMode = PriceScaleMode.Normal
    scaleMargins: PriceScaleMargins = field(default_factory=PriceScaleMargins)

    borderVisible: bool = True
    borderColor: Color = field(default_factory=lambda: Color.from_hex("#2B2B43"))

    alignLabels: bool = True
    entireTextOnly: bool = False
    textColor: Optional[Color] = None


@dataclass
class PriceScaleOptions(OverlayPriceScaleOptions):
    """
    Structure that describes visible price scale options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceScaleOptions
    """

    visible: bool = True
    autoScale: bool = True


@dataclass
class AutoScaleMargins:
    """
    Represents the margin used when updating a price scale.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AutoScaleMargins
    """

    below: float
    above: float


@dataclass
class AutoscaleInfo:
    """
    Represents information used to update a price scale.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AutoscaleInfo
    """

    priceRange: PriceRange
    margins: Optional[AutoScaleMargins] = None


@dataclass
class AxisDoubleClickOptions:
    """
    Represents options for how the time and price axes react to mouse double click.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AxisDoubleClickOptions
    """

    time: bool = True
    price: bool = True


@dataclass
class AxisPressedMouseMoveOptions:
    """
    Represents options for how the time and price axes react to mouse movements.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AxisPressedMouseMoveOptions
    """

    time: bool = True
    price: bool = True


@dataclass
class KineticScrollOptions:
    """
    Represents options for enabling or disabling kinetic scrolling with mouse and touch gestures.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/KineticScrollOptions
    """

    touch: bool = True
    mouse: bool = False


@dataclass
class Background:
    """
    Represents background color options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LayoutOptions#background
    """

    type: ColorType
    color: Color


@dataclass
class GridLineOptions:
    """
    Grid line options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/GridLineOptions
    """

    visible: bool = True
    style: LineStyle = LineStyle.Solid
    color: Color = field(default_factory=lambda: Color.from_hex("#D6DCDE"))


@dataclass
class GridOptions:
    """
    Structure describing grid options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/GridOptions
    """

    vertLines: GridLineOptions = field(default_factory=GridLineOptions)
    horzLines: GridLineOptions = field(default_factory=GridLineOptions)


@dataclass
class HandleScaleOptions:
    """
    Represents options for how the chart is scaled by the mouse and touch gestures.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HandleScrollOptions
    """

    mouseWheel: bool = True
    pinch: bool = True
    axisPressedMouseMove: Union[AxisPressedMouseMoveOptions, bool] = True
    axisDoubleClickReset: Union[AxisDoubleClickOptions, bool] = True


@dataclass
class HandleScrollOptions:
    """
    Represents options for how the chart is scrolled by the mouse and touch gestures.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HandleScrollOptions
    """

    mouse_wheel: bool = True
    pressed_mouse_move: bool = True
    horz_touch_drag: bool = True
    vert_touch_drag: bool = True


@dataclass
class TrackingModeOptions:
    """
    Represents options for the tracking mode's behavior.

    Mobile users will not have the ability to see the values/dates like they do on desktop.
    To see it, they should enter the tracking mode. The tracking mode will deactivate the scrolling
    and make it possible to check values and dates.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TrackingModeOptions
    """

    exitMode: TrackingModeExitMode = TrackingModeExitMode.OnNextTap


@dataclass
class CrosshairLineOptions:
    """
    Structure describing a crosshair line (vertical or horizontal).
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/CrosshairLineOptions
    """

    visible: bool = True
    width: int = 1
    color: Color = field(default_factory=lambda: Color.from_hex("#758696"))
    style: LineStyle = LineStyle.LargeDashed

    labelVisible: bool = True
    labelBackgroundColor: Color = field(
        default_factory=lambda: Color.from_hex("#4c525e")
    )


@dataclass
class CrosshairOptions:
    """
    Structure describing crosshair options.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/interfaces/CrosshairOptions
    """

    mode: CrosshairMode = CrosshairMode.Normal
    vertLine: CrosshairLineOptions = field(default_factory=CrosshairLineOptions)
    horzLine: CrosshairLineOptions = field(default_factory=CrosshairLineOptions)


@dataclass
class LocalizationOptionsBase:
    """
    Represents basic localization options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LocalizationOptionsBase
    """

    locale: str = "navigator.language"
    # price_formatter: Optional[Callable[[float], str]] = None      #May implement in the Future.
    # percentage_formatter: Optional[Callable[[float], str]] = None


# endregion

# region --------------------------------------- Layout Options --------------------------------------- #


@dataclass
class HorzScaleOptions:
    """
    Options for the time scale; the horizontal scale at the bottom of the chart that displays the time of data.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HorzScaleOptions
    """

    visible: bool = True
    timeVisible: bool = False
    fixLeftEdge: bool = False
    fixRightEdge: bool = False

    barSpacing: int = 6
    rightOffset: int = 0
    minBarSpacing: float = 0.5
    minimumHeight: int = 0
    shiftVisibleRangeOnNewBar: bool = True
    lockVisibleTimeRangeOnResize: bool = False
    allowShiftVisibleRangeOnWhitespaceReplacement: bool = False

    uniformDistribution: bool = False
    rightBarStaysOnScroll: bool = False

    allowBoldLabels: bool = True
    secondsVisible: bool = True
    borderVisible: bool = True
    borderColor: Color = field(default_factory=lambda: Color.from_hex("#2B2B43"))

    ticksVisible: bool = False
    tickMarkMaxCharacterLength: Optional[int] = None


@dataclass
class LayoutOptions:
    """
    Represents layout options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LayoutOptions
    """

    background: Background = field(
        default_factory=lambda: Background(
            type=ColorType.Solid,
            color=Color.from_hex("#FFFFFF"),
        )
    )
    textColor: Color = field(default_factory=lambda: Color.from_hex("#191919"))
    fontSize: int = 12
    fontFamily: str = (
        "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif"
    )


# endregion

# region --------------------------------------- Lightweight Charts ORM Mappings --------------------------------------- #


# pylint: disable=invalid-name
# Disabled Naming Check since Variable Names written to directly match JS Objects


@dataclass
class WatermarkOptions:
    """
    ORM of Lightweight Charts API 'WatermarkOptions'
    Default Values Match Original API's Default Values.
    Original Object: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/WatermarkOptions
    Tutorial: https://tradingview.github.io/lightweight-charts/tutorials/how_to/watermark
    """

    color: Color = field(default_factory=lambda: Color.from_rgb(0, 0, 0, 0))
    visible: bool = False
    text: str = ""
    fontSize: int = 48
    fontStyle: str = ""
    fontFamily: str = (
        "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif"
    )
    horzAlign: HorzAlign = "center"
    vertAlign: VertAlign = "center"


@dataclass
class ChartOptionsBase:
    """
    Represents common chart options
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ChartOptionsBase
    """

    width: int = 0
    height: int = 0
    autoSize: bool = False
    watermark: WatermarkOptions = field(default_factory=WatermarkOptions)
    layout: LayoutOptions = field(default_factory=LayoutOptions)
    leftPriceScale: PriceScaleOptions = field(
        default_factory=lambda: PriceScaleOptions(visible=False)
    )
    rightPriceScale: PriceScaleOptions = field(default_factory=PriceScaleOptions)
    overlayPriceScales: OverlayPriceScaleOptions = field(
        default_factory=OverlayPriceScaleOptions
    )
    timeScale: HorzScaleOptions = field(default_factory=HorzScaleOptions)
    crosshair: CrosshairOptions = field(default_factory=CrosshairOptions)
    grid: GridOptions = field(default_factory=GridOptions)
    handleScroll: Union[HandleScrollOptions, bool] = field(
        default_factory=HandleScrollOptions
    )
    handleScale: Union[HandleScaleOptions, bool] = field(
        default_factory=HandleScaleOptions
    )
    kineticScroll: KineticScrollOptions = field(default_factory=KineticScrollOptions)
    trackingMode: TrackingModeOptions = field(default_factory=TrackingModeOptions)
    localization: LocalizationOptionsBase = field(
        default_factory=LocalizationOptionsBase
    )


@dataclass
class PyWebViewOptions:
    """
    All** available 'PyWebview' Create_Window Options

    ** At Somepoint in the future this may be expanded to include server options
    and window.start() Options.
    """

    title: str = ""
    x: int = 100
    y: int = 100
    width: int = 800
    height: int = 600
    resizable: bool = True
    fullscreen: bool = False
    min_size: tuple[int, int] = (400, 250)
    hidden: bool = False
    on_top: bool = False
    confirm_close: bool = False
    background_color: str = "#FFFFFF"
    transparent: bool = False
    text_select: bool = False
    zoomable: bool = False
    draggable: bool = False
    vibrancy: bool = False
    debug: bool = False
    # server
    # server_args
    # localization

    def asdict(self) -> dict[str, Any]:
        return asdict(self)


# endregion

# region --------------------------------------- Lightweight PyCharts Specific ORM Mappings --------------------------------------- #
# All things (Other than Color) that are defined by this library that aren't part of the original lightweight charts API

# The Value of the Following Enums aren't used, the name itself used.
# The name is passed over to Javascript which then
# accesses the globally scoped Typescript Enum of the same name.


class Container_Layouts(Enum):
    "1:1 Mapping of util.ts Container_Layouts Enum"
    SINGLE = 0
    DOUBLE_VERT = 1
    DOUBLE_HORIZ = 2
    TRIPLE_VERT = 3
    TRIPLE_VERT_LEFT = 4
    TRIPLE_VERT_RIGHT = 5
    TRIPLE_HORIZ = 6
    TRIPLE_HORIZ_TOP = 7
    TRIPLE_HORIZ_BOTTOM = 8
    QUAD_HORIZ = 9
    QUAD_VERT = 10
    QUAD_LEFT = 11
    QUAD_RIGHT = 12
    QUAD_TOP = 13
    QUAD_BOTTOM = 14

    @property
    def num_frames(self) -> int:
        "Function that returns the number of Frames this layout contains"
        if self.name.startswith("SINGLE"):
            return 1
        elif self.name.startswith("DOUBLE"):
            return 2
        elif self.name.startswith("TRIPLE"):
            return 3
        elif self.name.startswith("QUAD"):
            return 4
        else:
            return 0


class ColorLiteral(Enum):
    "An Enumeration of all the colors given in the Lightweight Charts API. Return Object is an orm.Color"
    khaki = Color.from_hex("#f0e68c")
    azure = Color.from_hex("#f0ffff")
    aliceblue = Color.from_hex("#f0f8ff")
    ghostwhite = Color.from_hex("#f8f8ff")
    gold = Color.from_hex("#ffd700")
    goldenrod = Color.from_hex("#daa520")
    gainsboro = Color.from_hex("#dcdcdc")
    gray = Color.from_hex("#808080")
    green = Color.from_hex("#008000")
    honeydew = Color.from_hex("#f0fff0")
    floralwhite = Color.from_hex("#fffaf0")
    lightblue = Color.from_hex("#add8e6")
    lightcoral = Color.from_hex("#f08080")
    lemonchiffon = Color.from_hex("#fffacd")
    hotpink = Color.from_hex("#ff69b4")
    lightyellow = Color.from_hex("#ffffe0")
    greenyellow = Color.from_hex("#adff2f")
    lightgoldenrodyellow = Color.from_hex("#fafad2")
    limegreen = Color.from_hex("#32cd32")
    linen = Color.from_hex("#faf0e6")
    lightcyan = Color.from_hex("#e0ffff")
    magenta = Color.from_hex("#f0f")
    maroon = Color.from_hex("#800000")
    olive = Color.from_hex("#808000")
    orange = Color.from_hex("#ffa500")
    oldlace = Color.from_hex("#fdf5e6")
    mediumblue = Color.from_hex("#0000cd")
    transparent = Color.from_hex("#0000")
    lime = Color.from_hex("#0f0")
    lightpink = Color.from_hex("#ffb6c1")
    mistyrose = Color.from_hex("#ffe4e1")
    moccasin = Color.from_hex("#ffe4b5")
    midnightblue = Color.from_hex("#191970")
    orchid = Color.from_hex("#da70d6")
    mediumorchid = Color.from_hex("#ba55d3")
    mediumturquoise = Color.from_hex("#48d1cc")
    orangered = Color.from_hex("#ff4500")
    royalblue = Color.from_hex("#4169e1")
    powderblue = Color.from_hex("#b0e0e6")
    red = Color.from_hex("#f00")
    coral = Color.from_hex("#ff7f50")
    turquoise = Color.from_hex("#40e0d0")
    white = Color.from_hex("#fff")
    whitesmoke = Color.from_hex("#f5f5f5")
    wheat = Color.from_hex("#f5deb3")
    teal = Color.from_hex("#008080")
    steelblue = Color.from_hex("#4682b4")
    bisque = Color.from_hex("#ffe4c4")
    aquamarine = Color.from_hex("#7fffd4")
    aqua = Color.from_hex("#0ff")
    sienna = Color.from_hex("#a0522d")
    silver = Color.from_hex("#c0c0c0")
    springgreen = Color.from_hex("#00ff7f")
    antiquewhite = Color.from_hex("#faebd7")
    burlywood = Color.from_hex("#deb887")
    brown = Color.from_hex("#a52a2a")
    beige = Color.from_hex("#f5f5dc")
    chocolate = Color.from_hex("#d2691e")
    chartreuse = Color.from_hex("#7fff00")
    cornflowerblue = Color.from_hex("#6495ed")
    cornsilk = Color.from_hex("#fff8dc")
    crimson = Color.from_hex("#dc143c")
    cadetblue = Color.from_hex("#5f9ea0")
    tomato = Color.from_hex("#ff6347")
    fuchsia = Color.from_hex("#f0f")
    blue = Color.from_hex("#00f")
    salmon = Color.from_hex("#fa8072")
    blanchedalmond = Color.from_hex("#ffebcd")
    slateblue = Color.from_hex("#6a5acd")
    slategray = Color.from_hex("#708090")
    thistle = Color.from_hex("#d8bfd8")
    tan = Color.from_hex("#d2b48c")
    cyan = Color.from_hex("#0ff")
    darkblue = Color.from_hex("#00008b")
    darkcyan = Color.from_hex("#008b8b")
    darkgoldenrod = Color.from_hex("#b8860b")
    darkgray = Color.from_hex("#a9a9a9")
    blueviolet = Color.from_hex("#8a2be2")
    black = Color.from_hex("#000")
    darkmagenta = Color.from_hex("#8b008b")
    darkslateblue = Color.from_hex("#483d8b")
    darkkhaki = Color.from_hex("#bdb76b")
    darkorchid = Color.from_hex("#9932cc")
    darkorange = Color.from_hex("#ff8c00")
    darkgreen = Color.from_hex("#006400")
    darkred = Color.from_hex("#8b0000")
    dodgerblue = Color.from_hex("#1e90ff")
    darkslategray = Color.from_hex("#2f4f4f")
    dimgray = Color.from_hex("#696969")
    deepskyblue = Color.from_hex("#00bfff")
    firebrick = Color.from_hex("#b22222")
    forestgreen = Color.from_hex("#228b22")
    indigo = Color.from_hex("#4b0082")
    ivory = Color.from_hex("#fffff0")
    lavenderblush = Color.from_hex("#fff0f5")
    feldspar = Color.from_hex("#d19275")
    indianred = Color.from_hex("#cd5c5c")
    lightgreen = Color.from_hex("#90ee90")
    lightgrey = Color.from_hex("#d3d3d3")
    lightskyblue = Color.from_hex("#87cefa")
    lightslategray = Color.from_hex("#789")
    lightslateblue = Color.from_hex("#8470ff")
    snow = Color.from_hex("#fffafa")
    lightseagreen = Color.from_hex("#20b2aa")
    lightsalmon = Color.from_hex("#ffa07a")
    darksalmon = Color.from_hex("#e9967a")
    darkviolet = Color.from_hex("#9400d3")
    mediumpurple = Color.from_hex("#9370d8")
    mediumaquamarine = Color.from_hex("#66cdaa")
    skyblue = Color.from_hex("#87ceeb")
    lavender = Color.from_hex("#e6e6fa")
    lightsteelblue = Color.from_hex("#b0c4de")
    mediumvioletred = Color.from_hex("#c71585")
    mintcream = Color.from_hex("#f5fffa")
    navajowhite = Color.from_hex("#ffdead")
    navy = Color.from_hex("#000080")
    olivedrab = Color.from_hex("#6b8e23")
    palevioletred = Color.from_hex("#d87093")
    violetred = Color.from_hex("#d02090")
    yellow = Color.from_hex("#ff0")
    yellowgreen = Color.from_hex("#9acd32")
    lawngreen = Color.from_hex("#7cfc00")
    pink = Color.from_hex("#ffc0cb")
    paleturquoise = Color.from_hex("#afeeee")
    palegoldenrod = Color.from_hex("#eee8aa")
    darkolivegreen = Color.from_hex("#556b2f")
    darkseagreen = Color.from_hex("#8fbc8f")
    darkturquoise = Color.from_hex("#00ced1")
    peachpuff = Color.from_hex("#ffdab9")
    deeppink = Color.from_hex("#ff1493")
    violet = Color.from_hex("#ee82ee")
    palegreen = Color.from_hex("#98fb98")
    mediumseagreen = Color.from_hex("#3cb371")
    peru = Color.from_hex("#cd853f")
    saddlebrown = Color.from_hex("#8b4513")
    sandybrown = Color.from_hex("#f4a460")
    rosybrown = Color.from_hex("#bc8f8f")
    purple = Color.from_hex("#800080")
    seagreen = Color.from_hex("#2e8b57")
    seashell = Color.from_hex("#fff5ee")
    papayawhip = Color.from_hex("#ffefd5")
    mediumslateblue = Color.from_hex("#7b68ee")
    plum = Color.from_hex("#dda0dd")
    mediumspringgreen = Color.from_hex("#00fa9a")


# endregion
