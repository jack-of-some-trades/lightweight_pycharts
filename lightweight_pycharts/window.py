""" Python Classes that handle the various GUI Widgets """

import asyncio
import logging
from typing import Optional
import multiprocessing as mp

from .js_api import PyWv, MpHooks, JS_CMD

import lightweight_pycharts.orm as orm

logger = logging.getLogger("lightweight-pycharts")


class Window:
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

    def __init__(
        self,
        options: Optional[orm.PyWebViewOptions] = None,
        blocking: bool = False,
        **kwargs
    ) -> None:
        if options is not None:
            # PyWebviewOptions Given, overwrite anything in kwargs.
            kwargs = options.asdict()

        if "debug" in kwargs.keys() and kwargs["debug"]:
            logger.setLevel(logging.DEBUG)

        # Setting default since window has quite a few things populated by default
        if "min_size" not in kwargs.keys():
            kwargs["min_size"] = (400, 250)

        # create and then unpack the hooks directly into class variables
        mp_hooks = MpHooks()
        self._fwd_queue = mp_hooks.fwd_queue
        self._rtn_queue = mp_hooks.rtn_queue
        self._start_event = mp_hooks.start_event
        self._stop_event = mp_hooks.stop_event
        self._loaded_event = mp_hooks.loaded_event

        kwargs["mp_hooks"] = mp_hooks  # Pass the hooks along to PyWv
        self._view_process = mp.Process(target=PyWv, kwargs=kwargs, daemon=True)
        self._view_process.start()

        # Wait for PyWebview to load before releasing from constructor
        # Loaded_event set in PyWv._assign_callbacks()
        self._loaded_event.wait()

        if blocking:
            self.queue_manager = asyncio.run(self._manage_queue())
        else:
            self.queue_manager = asyncio.create_task(self._manage_queue())

    async def _manage_queue(self):
        logger.info("Entered Queue Manager")
        while not self._stop_event.is_set():
            if not self._rtn_queue.empty():
                rsp = self._rtn_queue.get()
                logger.info("Recieved Message from PyWv API %s", rsp)

            await asyncio.sleep(0.05)

    def Example_function(self):
        self._fwd_queue.put((JS_CMD.JS, "api.callback(`weeeeeeeee`)"))
        self._fwd_queue.put("")

    def show(self):
        self._fwd_queue.put(JS_CMD.SHOW)

    def hide(self):
        self._fwd_queue.put(JS_CMD.HIDE)


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
