"Function definitions that return formatted Javascript scripts as literal strings"

from enum import Enum
from .orm import Container_Layouts


class JS_CMD(Enum):
    JS_CODE = 1
    SHOW = 2
    HIDE = 3
    NEW_CONTAINER = 4
    NEW_FRAME = 5
    SET_LAYOUT = 6
    NEW_PANE = 7


def new_container(_id: str) -> str:
    return f"var {_id} = wrapper.add_container('{_id}')"


def new_frame(frame_id: str, container_id: str) -> str:
    return f"var {frame_id} = {container_id}.add_frame('{frame_id}')"


def new_pane(pane_id: str, frame_id: str) -> str:
    return f"var {pane_id} = {frame_id}.add_pane('{pane_id}')"


def set_layout(container_id: str, layout: Container_Layouts) -> str:
    return f"{container_id}.set_layout({layout})"
