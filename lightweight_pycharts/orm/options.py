"""Dataclass representations of various Lightweight-Charts scale and chart interfaces"""

from dataclasses import dataclass
from typing import Optional, Union

from .types import JS_Color, VertAlign, HorzAlign
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

    minValue: Optional[float] = None
    maxValue: Optional[float] = None


@dataclass
class PriceScaleMargins:
    """
    Defines margins of the price scale.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceScaleMargins
    """

    top: Optional[float] = None
    bottom: Optional[float] = None


@dataclass
class OverlayPriceScaleOptions:
    """
    Structure that describes overlay price scale options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceScaleOptions
    """

    invertScale: Optional[bool] = None
    ticksVisible: Optional[bool] = None

    minimumWidth: Optional[int] = None
    mode: Optional[PriceScaleMode] = None
    scaleMargins: Optional[PriceScaleMargins] = None

    borderVisible: Optional[bool] = None
    borderColor: Optional[JS_Color] = None

    alignLabels: Optional[bool] = None
    entireTextOnly: Optional[bool] = None
    textColor: Optional[JS_Color] = None


@dataclass
class PriceScaleOptions(OverlayPriceScaleOptions):
    """
    Structure that describes visible price scale options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceScaleOptions
    """

    visible: Optional[bool] = None
    autoScale: Optional[bool] = None


@dataclass
class AutoScaleMargins:
    """
    Represents the margin used when updating a price scale.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AutoScaleMargins
    """

    below: Optional[float] = None
    above: Optional[float] = None


@dataclass
class AutoscaleInfo:
    """
    Represents information used to update a price scale.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AutoscaleInfo
    """

    priceRange: Optional[PriceRange] = None
    margins: Optional[AutoScaleMargins] = None


@dataclass
class AxisDoubleClickOptions:
    """
    Represents options for how the time and price axes react to mouse double click.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AxisDoubleClickOptions
    """

    time: Optional[bool] = None
    price: Optional[bool] = None


@dataclass
class AxisPressedMouseMoveOptions:
    """
    Represents options for how the time and price axes react to mouse movements.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AxisPressedMouseMoveOptions
    """

    time: Optional[bool] = None
    price: Optional[bool] = None


@dataclass
class KineticScrollOptions:
    """
    Represents options for enabling or disabling kinetic scrolling with mouse and touch gestures.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/KineticScrollOptions
    """

    touch: Optional[bool] = None
    mouse: Optional[bool] = None


@dataclass
class Background:
    """
    Represents background color options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LayoutOptions#background
    """

    type: Optional[ColorType] = None
    color: Optional[JS_Color] = None


@dataclass
class GridLineOptions:
    """
    Grid line options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/GridLineOptions
    """

    visible: Optional[bool] = None
    style: Optional[LineStyle] = None
    color: Optional[JS_Color] = None


@dataclass
class GridOptions:
    """
    Structure describing grid options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/GridOptions
    """

    vertLines: Optional[GridLineOptions] = None
    horzLines: Optional[GridLineOptions] = None


@dataclass
class HandleScaleOptions:
    """
    Represents options for how the chart is scaled by the mouse and touch gestures.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HandleScrollOptions
    """

    mouseWheel: Optional[bool] = None
    pinch: Optional[bool] = None
    axisPressedMouseMove: Optional[Union[AxisPressedMouseMoveOptions, bool]] = None
    axisDoubleClickReset: Optional[Union[AxisDoubleClickOptions, bool]] = None


@dataclass
class HandleScrollOptions:
    """
    Represents options for how the chart is scrolled by the mouse and touch gestures.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HandleScrollOptions
    """

    mouse_wheel: Optional[bool] = None
    pressed_mouse_move: Optional[bool] = None
    horz_touch_drag: Optional[bool] = None
    vert_touch_drag: Optional[bool] = None


@dataclass
class TrackingModeOptions:
    """
    Represents options for the tracking mode's behavior.

    Mobile users will not have the ability to see the values/dates like they do on desktop.
    To see it, they should enter the tracking mode. The tracking mode will deactivate the scrolling
    and make it possible to check values and dates.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TrackingModeOptions
    """

    exitMode: Optional[TrackingModeExitMode] = None


@dataclass
class CrosshairLineOptions:
    """
    Structure describing a crosshair line (vertical or horizontal).
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/CrosshairLineOptions
    """

    visible: Optional[bool] = None
    width: Optional[int] = None
    color: Optional[JS_Color] = None
    style: Optional[LineStyle] = None

    labelVisible: Optional[bool] = None
    labelBackgroundColor: Optional[JS_Color] = None


@dataclass
class CrosshairOptions:
    """
    Structure describing crosshair options.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/interfaces/CrosshairOptions
    """

    mode: Optional[CrosshairMode] = None
    vertLine: Optional[CrosshairLineOptions] = None
    horzLine: Optional[CrosshairLineOptions] = None


@dataclass
class LocalizationOptionsBase:
    """
    Represents basic localization options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LocalizationOptionsBase
    """

    locale: Optional[str] = None
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

    visible: Optional[bool] = None
    timeVisible: Optional[bool] = None
    fixLeftEdge: Optional[bool] = None
    fixRightEdge: Optional[bool] = None

    barSpacing: Optional[int] = None
    rightOffset: Optional[int] = None
    minBarSpacing: Optional[float] = None
    minimumHeight: Optional[int] = None
    shiftVisibleRangeOnNewBar: Optional[bool] = None
    lockVisibleTimeRangeOnResize: Optional[bool] = None
    allowShiftVisibleRangeOnWhitespaceReplacement: Optional[bool] = None

    uniformDistribution: Optional[bool] = None
    rightBarStaysOnScroll: Optional[bool] = None

    allowBoldLabels: Optional[bool] = None
    secondsVisible: Optional[bool] = None
    borderVisible: Optional[bool] = None
    borderColor: Optional[JS_Color] = None

    ticksVisible: Optional[bool] = None
    tickMarkMaxCharacterLength: Optional[int] = None


@dataclass
class LayoutOptions:
    """
    Represents layout options.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LayoutOptions
    """

    background: Optional[Background] = None
    textColor: Optional[JS_Color] = None
    fontSize: Optional[int] = None
    fontFamily: Optional[str] = None


@dataclass
class WatermarkOptions:
    """
    ORM of Lightweight Charts API 'WatermarkOptions'
    Default Values Match Original API's Default Values.
    Original Object: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/WatermarkOptions
    Tutorial: https://tradingview.github.io/lightweight-charts/tutorials/how_to/watermark
    """

    color: Optional[JS_Color] = None
    visible: Optional[bool] = None
    text: Optional[str] = None
    fontSize: Optional[int] = None
    fontStyle: Optional[str] = None
    fontFamily: Optional[str] = None
    horzAlign: Optional[HorzAlign] = None
    vertAlign: Optional[VertAlign] = None


@dataclass
class ChartOptionsBase:
    """
    Represents common chart options
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ChartOptionsBase
    """

    width: Optional[int] = None
    height: Optional[int] = None
    autoSize: Optional[bool] = None
    watermark: Optional[WatermarkOptions] = None
    layout: Optional[LayoutOptions] = None
    leftPriceScale: Optional[PriceScaleOptions] = None
    rightPriceScale: Optional[PriceScaleOptions] = None
    overlayPriceScales: Optional[OverlayPriceScaleOptions] = None
    timeScale: Optional[HorzScaleOptions] = None
    crosshair: Optional[CrosshairOptions] = None
    grid: Optional[GridOptions] = None
    handleScroll: Optional[Union[HandleScrollOptions, bool]] = None
    handleScale: Optional[Union[HandleScaleOptions, bool]] = None
    kineticScroll: Optional[KineticScrollOptions] = None
    trackingMode: Optional[TrackingModeOptions] = None
    localization: Optional[LocalizationOptionsBase] = None


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
