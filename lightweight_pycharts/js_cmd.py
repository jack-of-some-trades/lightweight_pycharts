"Function definitions that return formatted Javascript scripts as literal strings"

from math import floor
from enum import IntEnum, auto
from typing import Callable, Any
from json import JSONEncoder, dumps
from dataclasses import is_dataclass, asdict

from pandas import DataFrame, Timestamp, notnull

from lightweight_pycharts.orm.options import PriceScaleOptions

from .orm import types
from .orm.types import Color, j_func
from .orm.enum import layouts
from .orm.series import (
    AnySeriesData,
    AnySeriesOptions,
    SingleValueData,
    WhitespaceData,
    SeriesType,
)


# @pylint: disable=invalid-name, line-too-long
class ORM_JSONEncoder(JSONEncoder):
    "Enhanced JSON Encoder that encodes various pycharts/pandas objects in JSON"

    def default(self, o):  # Order most Common to least commonly dumped
        if isinstance(o, Timestamp):
            return floor(o.timestamp())
        if is_dataclass(o):
            return asdict(  # Drop Nones
                o, dict_factory=lambda x: {k: v for (k, v) in x if v is not None}
            )
        if isinstance(o, DataFrame):
            return [  # Drop NaNs & Nones (.to_json() leaves NaNs & Nones)
                {k: v for k, v in m.items() if notnull(v)}
                for m in o.to_dict(orient="records")
            ]
        if isinstance(o, Color):
            return repr(o)
        if isinstance(o, bool):
            return "true" if o else "false"
        if isinstance(o, j_func):
            print("j_func call")
            return str(o)
        return super().default(o)


def dump(obj: Any) -> str:
    "Enchanced JSON.dumps() to serialize all ORM Objects"
    return dumps(obj, cls=ORM_JSONEncoder, separators=(",", ":"))


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
    ADD_INDICATOR = auto()


class JS_CMD(IntEnum):
    "Enumeration of the various commands that Python can send to Javascript"
    # Window Commands
    JS_CODE = auto()
    ADD_CONTAINER = auto()
    REMOVE_CONTAINER = auto()
    REMOVE_REFERENCE = auto()
    UPDATE_TF_OPTS = auto()
    UPDATE_SERIES_FAVS = auto()
    UPDATE_LAYOUT_FAVS = auto()
    SET_SYMBOL_ITEMS = auto()
    SET_SYMBOL_SEARCH_OPTS = auto()

    # Container Commands
    SET_LAYOUT = auto()
    ADD_FRAME = auto()

    # Frame Commands
    ADD_PANE = auto()
    SET_WHITESPACE_DATA = auto()
    CLEAR_WHITESPACE_DATA = auto()
    UPDATE_WHITESPACE_DATA = auto()
    SET_FRAME_SYMBOL = auto()
    SET_FRAME_TIMEFRAME = auto()
    SET_FRAME_SERIES_TYPE = auto()

    # Pane Commands
    ADD_PRIMITIVE = auto()
    REMOVE_PRIMITIVE = auto()
    ADD_INDICATOR = auto()
    REMOVE_INDICATOR = auto()
    ADD_IND_PRIMITIVE = auto()
    REMOVE_IND_PRIMITIVE = auto()

    # Indicator Commands
    ADD_SERIES = auto()
    REMOVE_SERIES = auto()
    SET_SERIES_DATA = auto()
    CLEAR_SERIES_DATA = auto()
    UPDATE_SERIES_DATA = auto()
    CHANGE_SERIES_TYPE = auto()
    UPDATE_SERIES_OPTS = auto()
    UPDATE_PRICE_SCALE_OPTS = auto()

    # PyWebView Commands
    SHOW = auto()
    HIDE = auto()
    CLOSE = auto()
    RESTORE = auto()
    MAXIMIZE = auto()
    MINIMIZE = auto()


# @pylint: disable=missing-function-docstring
# region ------------------------ Window ------------------------ #


def js_code(*scripts: str) -> str:
    cmd = ""
    for script in scripts:
        cmd += script + ";"
    return cmd


def add_container(_id: str) -> str:
    return f"var {_id} = wrapper.add_container('{_id}')"


def remove_container(_id: str) -> str:
    return f"var {_id} = wrapper.remove_container('{_id}');"


# ** Crucial Step ** Without this there would be a massive memory leak
# Where all the old frames/panes/series objects would never get garbage collected
# in the javascript window due to the global reference to them
def remove_reference(*_ids: str) -> str:
    cmd = ""
    for _id in _ids:
        cmd += f"{_id} = undefined;"
    return cmd


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


# endregion

# region ------------------------ Container & Frame ------------------------ #


def set_layout(container_id: str, layout: layouts) -> str:
    return f"{container_id}.set_layout({layout})"


def add_frame(frame_id: str, container_id: str) -> str:
    return f"var {frame_id} = {container_id}.add_frame('{frame_id}')"


def add_pane(pane_id: str, frame_id: str) -> str:
    return f"var {pane_id} = {frame_id}.add_pane('{pane_id}')"


def set_frame_series_type(frame_id: str, series: SeriesType) -> str:
    return f"{frame_id}.set_series_type({series})"


def set_frame_symbol(frame_id: str, symbol: types.Symbol) -> str:
    return f"{frame_id}.set_symbol({dump(symbol)})"


def set_frame_timeframe(frame_id: str, timeframe: types.TF) -> str:
    return f"{frame_id}.set_timeframe('{timeframe.toString}')"


def set_whitespace_data(frame_id: str, data: DataFrame, p_data: SingleValueData) -> str:
    return f"{frame_id}.set_whitespace_data({data.to_json(orient="records",date_unit='s')}, {dump(p_data)})"


def clear_whitespace_data(frame_id: str) -> str:
    return f"{frame_id}.set_whitespace_data([])"


def update_whitespace_data(
    frame_id: str, data: WhitespaceData, p_data: SingleValueData
) -> str:
    return f"{frame_id}.update_whitespace_data({dump(data)}, {dump(p_data)})"


# endregion

# region ------------------------ Pane ------------------------ #


def add_indicator(pane_id: str, indicator_id: str, indicator_type: str) -> str:
    return f"{pane_id}.add_indicator('{indicator_id}','{indicator_type}')"


def remove_indicator(pane_id: str, indicator_id: str) -> str:
    return f"{pane_id}.remove_indicator('{indicator_id}')"


def add_primitive(
    pane_id: str, primitive_id: str, primitive_type: str, args: dict[str, Any]
) -> str:
    return f"{pane_id}.add_primitive('{primitive_id}','{primitive_type}', {dump(args)})"


def remove_primitive(pane_id: str, primitive_id: str) -> str:
    return f"{pane_id}.remove_primitive('{primitive_id}')"


# Retreives an indicator object from a pane to manipulate
def indicator_preamble(pane_id: str, indicator_id: str) -> str:
    return f"""
        let indicator = {pane_id}.indicators.get('{indicator_id}');
        """


# region ------------------------ Indicator Series ------------------------ #
# all functions should take Pane_id, Indicator_Id, and Series_id in that order.


def add_series(
    pane_id: str, indicator_id: str, series_id: str, series_type: SeriesType
) -> str:
    return (
        indicator_preamble(pane_id, indicator_id)
        + f"indicator.add_series('{series_id}', {series_type});"
    )


def remove_series(pane_id: str, indicator_id: str, series_id: str) -> str:
    return (
        indicator_preamble(pane_id, indicator_id)
        + f"indicator.remove_series('{series_id}');"
    )


def set_series_data(
    pane_id: str, indicator_id: str, series_id: str, data: DataFrame
) -> str:
    return (
        indicator_preamble(pane_id, indicator_id)
        + f"indicator.set_series_data('{series_id}', {dump(data)});"
    )


def clear_series_data(pane_id: str, indicator_id: str, series_id: str) -> str:
    return (
        indicator_preamble(pane_id, indicator_id)
        + f"indicator.set_series_data('{series_id}', []);"
    )


def update_series_data(
    pane_id: str, indicator_id: str, series_id: str, data: AnySeriesData
) -> str:
    return (
        indicator_preamble(pane_id, indicator_id)
        + f"indicator.update_series_data('{series_id}', {dump(data)});"
    )


def change_series_type(
    pane_id: str,
    indicator_id: str,
    series_id: str,
    series_type: SeriesType,
    data: DataFrame,
) -> str:
    return (
        indicator_preamble(pane_id, indicator_id)
        + f"indicator.change_series_type('{series_id}', {series_type}, {dump(data)});"
    )


def update_series_opts(
    pane_id: str, indicator_id: str, series_id: str, opts: AnySeriesOptions
) -> str:
    rtn_str = (
        indicator_preamble(pane_id, indicator_id)
        + f"indicator.update_series_opts('{series_id}', {dump(opts)});"
    )

    if opts.autoscaleInfoProvider is not None:
        # Strip the quotations from around the autoscale function
        func_str = str(opts.autoscaleInfoProvider)
        strt = rtn_str.find(func_str)
        end = strt + len(func_str)
        rtn_str = rtn_str[: strt - 1] + func_str + rtn_str[end + 1 :]

    return rtn_str


def update_scale_opts(
    pane_id: str, indicator_id: str, series_id: str, opts: PriceScaleOptions
):
    return (
        indicator_preamble(pane_id, indicator_id)
        + f"indicator.update_scale_opts('{series_id}', {dump(opts)});"
    )


# endregion

# region ------------------------ Indicator Primitives ------------------------ #


def add_ind_primitive(
    pane_id: str,
    indicator_id: str,
    primitive_id: str,
    primitive_type: str,
    args: dict[str, Any],
) -> str:
    return (
        indicator_preamble(pane_id, indicator_id)
        + f"indicator.add_primitive('{primitive_id}','{primitive_type}', {dump(args)})"
    )


def remove_ind_primitive(
    pane_id: str,
    indicator_id: str,
    primitive_id: str,
) -> str:
    return (
        indicator_preamble(pane_id, indicator_id)
        + f"indicator.remove_primitive('{primitive_id}')"
    )


# endregion

# endregion


def return_blank() -> str:
    "Return a blank string, The Queue Manager will interpret this to mean a PyWv command was given."
    return ""


CMD_ROLODEX: dict[JS_CMD, Callable[..., str]] = {
    # ---- Window Commands ----
    JS_CMD.JS_CODE: js_code,
    JS_CMD.ADD_CONTAINER: add_container,
    JS_CMD.REMOVE_CONTAINER: remove_container,
    JS_CMD.REMOVE_REFERENCE: remove_reference,
    JS_CMD.UPDATE_TF_OPTS: set_window_timeframes,
    JS_CMD.UPDATE_SERIES_FAVS: set_window_series_types,
    JS_CMD.UPDATE_LAYOUT_FAVS: set_window_layouts,
    JS_CMD.SET_SYMBOL_ITEMS: update_symbol_search,
    JS_CMD.SET_SYMBOL_SEARCH_OPTS: update_symbol_search_bubbles,
    # ---- Container Commands ----
    JS_CMD.SET_LAYOUT: set_layout,
    JS_CMD.ADD_FRAME: add_frame,
    # ---- Frame Commands ----
    JS_CMD.ADD_PANE: add_pane,
    JS_CMD.SET_WHITESPACE_DATA: set_whitespace_data,
    JS_CMD.CLEAR_WHITESPACE_DATA: clear_whitespace_data,
    JS_CMD.UPDATE_WHITESPACE_DATA: update_whitespace_data,
    JS_CMD.SET_FRAME_SYMBOL: set_frame_symbol,
    JS_CMD.SET_FRAME_TIMEFRAME: set_frame_timeframe,
    JS_CMD.SET_FRAME_SERIES_TYPE: set_frame_series_type,
    # ---- Pane Commands ----
    JS_CMD.ADD_INDICATOR: add_indicator,
    JS_CMD.REMOVE_INDICATOR: remove_indicator,
    JS_CMD.ADD_PRIMITIVE: add_primitive,
    JS_CMD.REMOVE_PRIMITIVE: remove_primitive,
    # ---- Indicator Commands ----
    JS_CMD.ADD_SERIES: add_series,
    JS_CMD.REMOVE_SERIES: remove_series,
    JS_CMD.SET_SERIES_DATA: set_series_data,
    JS_CMD.CLEAR_SERIES_DATA: clear_series_data,
    JS_CMD.UPDATE_SERIES_DATA: update_series_data,
    JS_CMD.CHANGE_SERIES_TYPE: change_series_type,
    JS_CMD.UPDATE_SERIES_OPTS: update_series_opts,
    JS_CMD.UPDATE_PRICE_SCALE_OPTS: update_scale_opts,
    JS_CMD.ADD_IND_PRIMITIVE: add_ind_primitive,
    JS_CMD.REMOVE_IND_PRIMITIVE: remove_ind_primitive,
    # ---- PyWebView Commands ----
    JS_CMD.SHOW: return_blank,
    JS_CMD.HIDE: return_blank,
    JS_CMD.CLOSE: return_blank,
    JS_CMD.RESTORE: return_blank,
    JS_CMD.MAXIMIZE: return_blank,
    JS_CMD.MINIMIZE: return_blank,
}
