""" 
Lightweight-pycharts is an ORM implementation of TradingView's Lightweight Charts API.
This Module Spawns a new process and 

https://github.com/jack-of-some-trades/lightweight-pycharts
"""

import logging
from .orm import *
from .window import Window

__all__ = ("Window", "orm")

_LOG_LVL = logging.WARNING
# _LOG_LVL = logging.INFO
# _LOG_LVL = logging.DEBUG

logger = logging.getLogger("lightweight-pycharts")
handler = logging.StreamHandler()
formatter = logging.Formatter("[pycharts] - %(levelname)s: %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(_LOG_LVL)
