""" 
Lightweight-pycharts is an implementation of TradingView's Lightweight Charts API.

https://github.com/jack-of-some-trades/lightweight-pycharts
"""

import logging
from .window import window

__all__ = ("window",)

# _LOG_LVL = logging.WARNING
# _LOG_LVL = logging.INFO
_LOG_LVL = logging.DEBUG

logger = logging.getLogger("lightweight-pycharts")
handler = logging.StreamHandler()
formatter = logging.Formatter("[pycharts] - %(levelname)s: %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(_LOG_LVL)
