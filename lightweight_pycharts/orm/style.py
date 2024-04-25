""" Series Styling Options """

from typing import Optional
from dataclasses import dataclass, field

from .types import Color, PriceFormat, BaseValuePrice, LineWidth
from .enum import LineStyle, PriceLineSource, LastPriceAnimationMode, LineType

# pylint: disable=line-too-long
# pylint: disable=invalid-name


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
