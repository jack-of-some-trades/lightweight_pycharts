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

from lightweight_pycharts import orm
from lightweight_pycharts import indicators

from .window import Window, Container, Frame
from .charting_frame import ChartingFrame
from .orm.types import TF, Color, Symbol
from .orm.enum import layouts, ColorLiteral
from .orm.series import SeriesType

__all__ = (
    "Window",
    "Container",
    "Frame",
    "ChartingFrame",
    #
    # Types
    "TF",
    "Color",
    "Symbol",
    #
    # Enums
    "ColorLiteral",
    "layouts",
    "SeriesType",
    #
    # SubModules,
    "orm",
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
