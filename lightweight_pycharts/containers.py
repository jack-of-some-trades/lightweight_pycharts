""" Python Classes that handle the various GUI Widgets """

import logging
import multiprocessing as mp
from typing import Optional, Any

import pandas as pd

from . import orm
from . import util
from .js_cmd import JS_CMD

logger = logging.getLogger("lightweight-pycharts")


class Container:

    def __init__(self, js_id: str, fwd_queue: mp.Queue) -> None:
        self._fwd_queue = fwd_queue
        self.js_id = js_id
        self.layout_type = orm.layouts.SINGLE
        self.frame_ids = util.ID_List(f"{js_id}_f")
        self.frames: list[Frame] = []

        self._fwd_queue.put((JS_CMD.ADD_CONTAINER, self.js_id))
        self.set_layout(self.layout_type)

    def set_layout(self, layout: orm.layouts):
        self._fwd_queue.put((JS_CMD.SET_LAYOUT, self.js_id, layout))
        self.layout_type = layout

        # If there arent enough Frames to support the layout then generate them
        frame_diff = len(self.frame_ids) - self.layout_type.num_frames
        if frame_diff < 0:
            for _ in range(-frame_diff):
                self._add_frame_()

    def get_frame(self, _id: int | str) -> Optional["Frame"]:
        "Return the container that either matchs the given js_id string, or the integer tab number"
        if isinstance(_id, str):
            for frame in self.frames:
                if _id == frame.js_id:
                    return frame
        else:
            if _id >= 0 and _id < len(self.frames):
                return self.frames[_id]

    def _add_frame_(self):
        # Only Add a frame if the layout can support it
        if len(self.frames) < self.layout_type.num_frames:
            new_id = self.frame_ids.generate()
            self.frames.append(Frame(new_id, self))

    def all_ids(self) -> list[str]:
        "Return a List of all Ids of this object and sub-objects"
        _ids = [self.js_id]
        for frame in self.frames:
            _ids += frame.all_ids()
        return _ids


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
        self.pane_ids = util.ID_List(f"{js_id}_p")
        self.panes: list[Pane] = []

        self._fwd_queue.put((JS_CMD.ADD_FRAME, js_id, self.parent.js_id))

        # Add main pane
        new_id = self.pane_ids.affix("main")
        self.panes.append(Pane(new_id, self))

    def _add_pane(self):
        new_id = self.pane_ids.generate()
        self.panes.append(Pane(new_id, self))

    def all_ids(self) -> list[str]:
        "Return a List of all Ids of this object and sub-objects"
        _ids = [self.js_id]
        for pane in self.panes:
            _ids += pane.all_ids()
        return _ids


class Pane:
    """An individual charting window, can contain seriesCommon objects and indicators"""

    def __init__(self, js_id: str, parent: Frame) -> None:
        self._fwd_queue = parent._fwd_queue
        self.parent = parent
        self.js_id = js_id
        self.sources = []

        self._fwd_queue.put((JS_CMD.ADD_PANE, js_id, self.parent.js_id))

    def set_data(self, data: pd.DataFrame | list[dict[str, Any]]):
        "Sets the main source of data for this Pane"
        if not isinstance(data, pd.DataFrame):
            data = pd.DataFrame(data)

        self._fwd_queue.put((JS_CMD.SET_DATA, self.js_id, data))

    def add_source(self, data: pd.DataFrame | list[dict[str, Any]]):
        """Creates a new source of data for the Pane. Sources are analogous to Ticker Data or indicators"""

    def all_ids(self) -> list[str]:
        "Return a List of all Ids of this object and sub-objects"
        return [self.js_id]


class Source:
    """A Source Object. Sources contain various Series Elements"""
