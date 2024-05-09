""" 
Lightweight-pycharts is an ORM implementation of TradingView's Lightweight Charts API.
This Module Spawns a new process and 

https://github.com/jack-of-some-trades/lightweight-pycharts
"""

import logging

import lightweight_pycharts.orm.enum as enum
import lightweight_pycharts.orm.types as types
import lightweight_pycharts.orm.style as style
import lightweight_pycharts.orm.series as series
import lightweight_pycharts.orm.options as options

# Without the following line Pylance shows the above lines as errors?
from . import orm
from .window import Window
from .containers import Container, Frame, Pane
from .orm.types import TF, Color, Symbol
from .orm.enum import layouts, ColorLiteral, SeriesType

__all__ = (
    "Window",
    "Container",
    "Frame",
    "Pane",
    # SubModules
    "types",
    "enum",
    "series",
    "style",
    "options",
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
)

_LOG_LVL = logging.WARNING
# _LOG_LVL = logging.INFO
# _LOG_LVL = logging.DEBUG

logger = logging.getLogger("lightweight-pycharts")
handler = logging.StreamHandler()
formatter = logging.Formatter(
    "[pycharts] - [.\\%(filename)s Line: %(lineno)d] - %(levelname)s: %(message)s"
)
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(_LOG_LVL)
