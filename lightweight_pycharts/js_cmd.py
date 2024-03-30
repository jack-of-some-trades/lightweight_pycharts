"Function definitions that return formatted Javascript scripts as literal strings"

from enum import Enum
from .orm import dump, Container_Layouts
from pandas import DataFrame


class JS_CMD(Enum):
    "Enumeration of the various preformatted JS_Commands"
    JS_CODE = 1
    SHOW = 2
    HIDE = 3
    NEW_CONTAINER = 4
    NEW_FRAME = 5
    NEW_PANE = 6
    SET_LAYOUT = 7
    SET_DATA = 8


def new_container(_id: str) -> str:
    return f"var {_id} = wrapper.add_container('{_id}')"


def new_frame(frame_id: str, container_id: str) -> str:
    return f"var {frame_id} = {container_id}.add_frame('{frame_id}')"


def new_pane(pane_id: str, frame_id: str) -> str:
    return f"var {pane_id} = {frame_id}.add_pane('{pane_id}')"


def set_layout(container_id: str, layout: Container_Layouts) -> str:
    return f"{container_id}.set_layout({layout})"


def set_data(frame_id: str, data: DataFrame):
    # Assumes data is DataFrame.lwc_data Accessor Extention of a normal Dataframe.
    return f"{frame_id}.set_data('{data.type.value}',{data.json})"
