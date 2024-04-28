"Function definitions that return formatted Javascript scripts as literal strings"

from enum import IntEnum, auto
from pandas import DataFrame

from .orm.enum import layouts

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

    TF_CHANGE = auto()
    # RANGE_CHANGE = auto() # Maybe?
    SERIES_CHANGE = auto()
    LAYOUT_CHANGE = auto()
    INDICATOR_ADD = auto()


class JS_CMD(IntEnum):
    "Enumeration of the various commands that Python can send to Javascript"
    JS_CODE = auto()
    ADD_CONTAINER = auto()
    REMOVE_CONTAINER = auto()
    REMOVE_REFERENCE = auto()

    ADD_FRAME = auto()
    SET_LAYOUT = auto()

    ADD_PANE = auto()
    SET_DATA = auto()

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


def set_data(frame_id: str, data: DataFrame):
    # Assumes data is DataFrame.lwc_data Accessor Extention of a normal Dataframe.
    return f"{frame_id}.set_data('{data.type.value}',{data.json})"
