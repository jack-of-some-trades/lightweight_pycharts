""" 
Lightweight-pycharts is a locally executed Web-App constructed from Python and Typescript.
The Web-App is Launched via PyWebView and builds heavily on TradingView's Lightweight Charts API.

The Primary Goal is to offer a means to Display and Manipulate timeseries data from any source,
static or dynamic, without restriction.

https://github.com/jack-of-some-trades/lightweight_pycharts

TradingView Lightweight Charts™
Copyright (с) 2023 TradingView, Inc. https://www.tradingview.com/
"""

import logging

from .util import LazyModule

from .orm import *
from .orm.series_data import (
    AnyBasicData,
    WhitespaceData,
    SingleValueData,
    OhlcData,
    LineData,
    AreaData,
    HistogramData,
    BaselineData,
    BarData,
    CandlestickData,
    RoundedCandleData,
    AnyBasicSeriesType,
)

from .window import Window, Container, Frame, ChartingFrame
from .indicator import Indicator, IndicatorOptions
from . import indicators

__all__ = (
    "Window",
    "Container",
    "Frame",
    "ChartingFrame",
    #
    # Types
    "TF",
    "Color",
    "JS_Color",
    "Symbol",
    "Indicator",
    "IndicatorOptions",
    #
    # Data DataClasses
    "AnyBasicData",
    "WhitespaceData",
    "SingleValueData",
    "OhlcData",
    "LineData",
    "AreaData",
    "HistogramData",
    "BaselineData",
    "BarData",
    "CandlestickData",
    "RoundedCandleData",
    # Enums
    "Layouts",
    "SeriesType",
    "AnyBasicSeriesType",
    #
    # SubModules,
    "LazyModule",
    "indicators",
)

_LOG_LVL = logging.WARNING
# _LOG_LVL = logging.INFO
# _LOG_LVL = logging.DEBUG

logger = logging.getLogger("lightweight-pycharts")
handler = logging.StreamHandler(None)
formatter = logging.Formatter(
    "[pycharts] - [.\\%(filename)s Line: %(lineno)d] - %(levelname)s: %(message)s"
)
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(_LOG_LVL)
