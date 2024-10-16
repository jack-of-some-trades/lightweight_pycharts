""" Charting Frame Subclass. Supplies the necessary functions to update and manipulate a chart """

from __future__ import annotations
import logging
from typing import Optional

import pandas as pd

from . import util
from . import indicators
from . import window as win
from . import indicator as ind
from .js_cmd import JS_CMD

from .orm.series import AnyBasicData, SingleValueData

logger = logging.getLogger("lightweight-pycharts")


class ChartingFrame(win.Frame):
    """
    Frame Objects primarily hold information about the timeseries that is being displayed. They
    retain a copy of data that is used across all sub-panes as well as the references to said panes.

    ** ATM this class translates to a Chart_Frame in the Frontend. At some point in the future this
    will become a Chart_Frame that inherits from an Abstract Frame class. That implementation will
    match the current Frontend implementation and allow for 'Frame' to be an abstract re-sizeable
    viewport in the window. Broker integration, Bid/Ask Tables, Stock Screeners... Sky's the limit.
    """

    Frame_Type = win.FrameTypes.CHART

    def __init__(self, parent: win.Container, _js_id: Optional[str] = None) -> None:
        super().__init__(parent, _js_id)

        # Indicators & Panes append themselves to these ID_Dicts.
        # See Indicator DocString for reasoning.
        self.panes = util.ID_Dict[Pane](f"{self._js_id}_p")
        self.indicators = util.ID_Dict[ind.Indicator]("i")

        # Add main pane and Series, neither should ever be deleted
        self.add_pane(Pane.__special_id__)
        indicators.Series(self, js_id=indicators.Series.__special_id__)

    def __del__(self):
        for indicator in self.indicators.copy().values():
            indicator.delete()
        logger.debug("Deleteing Frame: %s", self._js_id)

    # region ------------- Dunder Control Functions ------------- #

    def __set_whitespace__(self, data: pd.DataFrame, p_data: SingleValueData):
        self._fwd_queue.put((JS_CMD.SET_WHITESPACE_DATA, self._js_id, data, p_data))

    def __clear_whitespace__(self):
        self._fwd_queue.put((JS_CMD.CLEAR_WHITESPACE_DATA, self._js_id))

    def __update_whitespace__(self, data: AnyBasicData, p_data: SingleValueData):
        self._fwd_queue.put((JS_CMD.UPDATE_WHITESPACE_DATA, self._js_id, data, p_data))

    # endregion

    def add_pane(self, js_id: Optional[str] = None) -> Pane:
        "Add a Pane to the Current Frame"
        return Pane(self, js_id)  # Pane Appends itself to Frame.panes

    def all_ids(self) -> list[str]:
        "Return a List of all Ids of this object and sub-objects"
        return [self._js_id] + self.all_pane_ids()

    def all_pane_ids(self) -> list[str]:
        "Return a List of all Panes Ids of this object"
        return list(self.panes.keys())

    @property
    def main_pane(self) -> Pane:
        "Main Display Pane of the Frame"
        return self.panes[self.panes.prefix + Pane.__special_id__]

    @property
    def main_series(self) -> indicators.Series:
        "Series Indicator that contain's the Frame's main symbol data"
        main_series = self.indicators[
            self.indicators.prefix + indicators.Series.__special_id__
        ]
        if isinstance(main_series, indicators.Series):
            return main_series
        raise AttributeError(f"Cannot find Main Series for Frame {self._js_id}")

    # region ------------- Indicator Functions ------------- #

    def get_indicators_of_type[T: ind.Indicator](self, _type: type[T]) -> dict[str, T]:
        "Returns a Dictionary of Indicators applied to this Frame that are of the Given Type"
        rtn_dict = {}
        for _key, _ind in self.indicators.items():
            if isinstance(_ind, _type):
                rtn_dict[_key] = _ind
        return rtn_dict

    def remove_indicator(self, _id: str | int):
        "Remove and Delete an Indicator"
        try:
            self.indicators[_id].delete()
        except (KeyError, IndexError):
            logger.warning(
                "Could not delete Indicator '%s'. It does not exist on frame '%s'",
                _id,
                self._js_id,
            )

    # endregion


class Pane:
    """
    An individual charting window, can contain Primitives?

    Not sure there is much else this class needs to do so it may become OBE.
    """

    __special_id__ = "main"  # Must match Pane.ts Special ID
    # To be used to identify which pane should be plot the Main-Series of the Frame...

    def __init__(self, parent: ChartingFrame, js_id: Optional[str] = None) -> None:
        if js_id is None:
            self._js_id = parent.panes.generate_id(self)
        else:
            self._js_id = parent.panes.affix_id(js_id, self)

        self._window = parent._window
        self._fwd_queue = parent._fwd_queue
        self.__main_pane__ = self._js_id == Pane.__special_id__

        self._fwd_queue.put((JS_CMD.ADD_PANE, parent._js_id, self._js_id))

    @property
    def js_id(self) -> str:
        "Immutable Copy of the Object's Javascript_ID"
        return self._js_id

    def add_primitive(self):
        """TBD?"""
        raise NotImplementedError
