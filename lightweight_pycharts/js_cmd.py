"Function definitions that return formatted Javascript scripts as literal strings"

from enum import IntEnum, auto
from pandas import DataFrame

from .util import dump
from .orm import types
from .orm.enum import layouts, SeriesType
from .orm.series import Series_DF

# from .util import dump
# @pylint: disable=invalid-name


class PY_CMD(IntEnum):
    "Enumeration of the various commands that javascript can send to python"
    PY_EXEC = auto()
    ADD_CONTAINER = auto()
    REMOVE_CONTAINER = auto()
    REORDER_CONTAINERS = auto()
    # ADD_PANE = auto()
    # REMOVE_PANE = auto()

    SYMBOL_SEARCH = auto()
    SYMBOL_SELECT = auto()

    DATA_REQUEST = auto()
    # RANGE_CHANGE = auto() # Maybe?
    SERIES_CHANGE = auto()
    LAYOUT_CHANGE = auto()
    INDICATOR_ADD = auto()


class JS_CMD(IntEnum):
    "Enumeration of the various commands that Python can send to Javascript"
    JS_CODE = auto()
    REMOVE_REFERENCE = auto()

    ADD_CONTAINER = auto()
    REMOVE_CONTAINER = auto()
    SET_LAYOUT = auto()

    ADD_FRAME = auto()
    SET_DATA = auto()
    SET_SYMBOL = auto()
    SET_TIMEFRAME = auto()
    SET_SERIES_TYPE = auto()

    ADD_PANE = auto()

    UPDATE_TF_OPTS = auto()
    UPDATE_SERIES_FAVS = auto()
    UPDATE_LAYOUT_FAVS = auto()
    SET_SYMBOL_ITEMS = auto()
    SET_SYMBOL_SEARCH_OPTS = auto()

    SHOW = auto()
    HIDE = auto()
    CLOSE = auto()
    RESTORE = auto()
    MAXIMIZE = auto()
    MINIMIZE = auto()


# @pylint: disable=missing-function-docstring
def add_container(_id: str) -> str:
    return f"var {_id} = wrapper.add_container('{_id}')"


def remove_container(_id: str) -> str:
    return f"var {_id} = wrapper.remove_container('{_id}');"


# ** Crucial Step ** Without this there would be a masssive memory leak
# Where all the old frames/panes/series objects would never get garbage collected
# due to the global reference to them
def remove_reference(*_ids: str) -> str:
    cmd = ""
    for _id in _ids:
        cmd += f"{_id} = undefined;"
    return cmd


def add_frame(frame_id: str, container_id: str) -> str:
    return f"var {frame_id} = {container_id}.add_frame('{frame_id}')"


def add_pane(pane_id: str, frame_id: str) -> str:
    return f"var {pane_id} = {frame_id}.add_pane('{pane_id}')"


def set_layout(container_id: str, layout: layouts) -> str:
    return f"{container_id}.set_layout({layout})"


def set_data(frame_id: str, data: Series_DF) -> str:
    return f"{frame_id}.set_data({data.json})"


def set_series_type(frame_id: str, series: SeriesType, data: Series_DF) -> str:
    return f"{frame_id}.set_series_type({series},{data.json})"


def set_symbol(frame_id: str, symbol: types.Symbol) -> str:
    return f"{frame_id}.set_symbol({dump(symbol)})"


def set_timeframe(frame_id: str, timeframe: types.TF) -> str:
    return f"{frame_id}.set_timeframe('{timeframe.toString}')"


def set_window_layouts(favs: dict) -> str:
    return f"window.layout_selector.update_settings({dump(favs)})"


def set_window_series_types(favs: dict) -> str:
    return f"window.series_selector.update_settings({dump(favs)})"


def set_window_timeframes(opts: dict) -> str:
    return f"window.timeframe_selector.update_settings({dump(opts)})"


def update_symbol_search(symbols: list[types.Symbol]) -> str:
    return f"overlay_manager.populate_symbol_list({dump(symbols)})"


def update_symbol_search_bubbles(category: str, opts: list[str]) -> str:
    return f"overlay_manager.populate_bubbles('{category}', {dump(opts)})"
