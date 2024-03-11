""" Python Classes that handle the various GUI Widgets """

import logging
import multiprocessing as mp

from .js_api import PyWv, MpHooks, JS_CMD

logger = logging.getLogger("lightweight-pycharts")


class window:
    """Window Object that handles the Javascript Webview Object
    This window creates and handels a Javascript implementation of:
        - Application Frame     *TBI
        - Window Tabs           *TBI
        - Toolbar               *TBI
        - Search Bar            *TBI
        - Interval Switcher     *TBI
        - Watchlist, etc.       *TBI

    Window contains a 'Frame' object for every tab.
    """

    def __init__(self, **kwargs) -> None:
        if "debug" in kwargs.keys() and kwargs["debug"]:
            logger.setLevel(logging.DEBUG)

        # create and then unpack the hooks directly into class variables
        mp_hooks = MpHooks()
        self._fwd_queue = mp_hooks.fwd_queue
        self._rtn_queue = mp_hooks.rtn_queue
        self._start_event = mp_hooks.start_event
        self._end_event = mp_hooks.stop_event
        self._loaded_event = mp_hooks.loaded_event

        kwargs["mp_hooks"] = mp_hooks  # Pass the hooks along to PyWv
        self._view_process = mp.Process(target=PyWv, kwargs=kwargs, daemon=True)
        self._view_process.start()

        self._start_event.set()
        self._loaded_event.wait()

        self._fwd_queue.put((JS_CMD.JS, "api.callback(`weeeeeeeee`)"))
        rsp = self._rtn_queue.get()
        logger.info("Recieved Message from PyWv API %s", rsp)


class frame:
    """Frame Objects primarily hold information about multi-chart layouts.
    They also handle chart syncing(?) of: #Should they?
        - Crosshairs    *TBI
        - Symbols       *TBI
        - Timeframe     *TBI
        - Interval      *TBI
        - Date Range    *TBI
    """

    def __init__(self) -> None:
        pass


class chart:
    """Chart object which holds:
    - Symbol and interval information
    - Chart Data
    - Panes
    """

    def __init__(self) -> None:
        pass


class pane:
    """An individual charting window, can contain seriesCommon objects and indicators"""

    def __init__(self) -> None:
        pass
