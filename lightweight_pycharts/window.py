""" Python Classes that handle the various GUI Widgets """

import asyncio
import logging
from typing import Optional
import multiprocessing as mp

from .js_api import PyWv, MpHooks
from .js_cmd import JS_CMD
from .util import ID_List

import lightweight_pycharts.orm as orm

logger = logging.getLogger("lightweight-pycharts-main")


class Window:
    """Window is an object that handles the Javascript Webview Object
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
        **kwargs,
    ) -> None:
        # -------- Setup and start the Pywebview subprocess  -------- #
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

        # Wait for PyWebview to load before continuing
        # Loaded_event set in PyWv._assign_callbacks()
        if not self._loaded_event.wait(timeout=10):
            raise TimeoutError(
                "Failed to load PyWebView in a reasonable amount of time."
            )

        # Begin Listening for any responses from PyWV Process
        self._queue_manager = asyncio.create_task(self._manage_queue())

        # -------- Create Subobjects  -------- #
        self.js_id = "wrapper"
        self.container_ids = ID_List("c")
        self.containers: list[Container] = []
        self.new_tab()

        if blocking:
            asyncio.gather(self._queue_manager)

    async def _manage_queue(self):
        logger.info("Entered Queue Manager")
        while not self._stop_event.is_set():
            if self._rtn_queue.empty():
                await asyncio.sleep(0.05)
            else:
                rsp = self._rtn_queue.get()
                logger.info("Recieved Message from View: %s", rsp)

    def queue_test(self):
        self._fwd_queue.put((JS_CMD.JS_CODE, "api.callback(`weeeeeeeee`)"))

    def show(self):
        "Show the PyWebView Window"
        self._fwd_queue.put(JS_CMD.SHOW)

    def hide(self):
        "Hide the PyWebView Window"
        self._fwd_queue.put(JS_CMD.HIDE)

    def new_tab(self) -> "Container":
        """
        Add a new Tab to the Window interface
        :returns: A Container obj that represents the Tab's Contents
        """
        new_id = self.container_ids.generate()
        new_container = Container(new_id, self._fwd_queue)
        self.containers.append(new_container)
        return new_container


class Container:

    def __init__(self, js_id: str, fwd_queue: mp.Queue) -> None:
        self._fwd_queue = fwd_queue
        self.js_id = js_id
        self.layout_type = orm.Container_Layouts.DOUBLE_VERT
        self.frame_ids = ID_List(f"{js_id}_f")
        self.frames: list[Frame] = []

        self._fwd_queue.put((JS_CMD.NEW_CONTAINER, self.js_id))
        self.set_layout(self.layout_type)

    def set_layout(self, layout: orm.Container_Layouts):
        self._fwd_queue.put((JS_CMD.SET_LAYOUT, self.js_id, layout))
        self.layout_type = layout

        # If there arent enough Frames to support the layout then generate them
        frame_diff = len(self.frame_ids) - self.layout_type.num_frames
        if frame_diff < 0:
            for _ in range(-frame_diff):
                self._add_frame()

    def _add_frame(self):
        new_id = self.frame_ids.generate()
        self.frames.append(Frame(new_id, self))


class Frame:
    """Frame Objects primarily hold information about multi-chart layouts.
    They also handle chart syncing(?) of: #Should they?
        - Crosshairs    *TBI
        - Symbols       *TBI
        - Timeframe     *TBI
        - Interval      *TBI
        - Date Range    *TBI
    """

    def __init__(self, js_id: str, parent: Container) -> None:
        self._fwd_queue = parent._fwd_queue
        self.parent = parent
        self.js_id = js_id
        self.pane_ids = ID_List(f"{js_id}_p")
        self.panes: list[Pane] = []

        self._fwd_queue.put((JS_CMD.NEW_FRAME, js_id, self.parent.js_id))

        # Add main pane
        new_id = self.pane_ids.affix("main")
        self.panes.append(Pane(new_id, self))

    def _add_pane(self):
        new_id = self.pane_ids.generate()
        self.panes.append(Pane(new_id, self))


class Pane:
    """An individual charting window, can contain seriesCommon objects and indicators"""

    def __init__(self, js_id: str, parent: Frame) -> None:
        self._fwd_queue = parent._fwd_queue
        self.parent = parent
        self.js_id = js_id

        self._fwd_queue.put((JS_CMD.NEW_PANE, js_id, self.parent.js_id))
