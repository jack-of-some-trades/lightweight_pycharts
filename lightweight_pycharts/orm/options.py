from typing import Optional, Union
from dataclasses import dataclass, field

from .types import Color, VertAlign, HorzAlign
from .enum import (
    LineStyle,
    PriceScaleMode,
    TrackingModeExitMode,
    ColorType,
    CrosshairMode,
)

# pylint: disable=line-too-long
# pylint: disable=invalid-name


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


# region --------------------------------------- Main Options Interfaces (Dataclasses) --------------------------------------- #


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


# endregion
