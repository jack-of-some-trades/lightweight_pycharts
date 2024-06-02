""" Classes and functions that handle implementation of chart series objects """

from __future__ import annotations
from typing import Optional, TYPE_CHECKING

from .js_cmd import JS_CMD

from .orm import series as s
from .orm.types import SeriesPriceLine, SeriesMarker

if TYPE_CHECKING:
    from .indicator import Indicator


# This was placed here and not in orm.Series because of the Queue & Pane Dependency
class SeriesCommon:
    """
    Baseclass to define the common functionality of all series types. This object provides
    direct access to a lightweight-charts ISeriesAPI Object. This Object is mutable between
    all of the series types.

    This object does not store a copy of the dataset given

    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi
    """

    def __init__(
        self,
        indicator: Indicator,
        series_type: s.SeriesType,
        display_pane_id: Optional[str],
        options=s.SeriesOptionsCommon(),
    ) -> None:
        if display_pane_id is None:
            display_pane_id = indicator._ids[0]
            # default to display_pane of the parent indicator

        self._options = options
        self.series_type = series_type
        self.js_id = indicator._series_.generate(self)
        self._ids = display_pane_id, indicator.js_id, self.js_id
        # Tuple of Ids to make addressing easier through Queue: order = (pane, indicator, series)

        self._parent = indicator
        self._fwd_queue = indicator._fwd_queue

        self._fwd_queue.put((JS_CMD.ADD_SERIES, *self._ids, self.series_type))
        self.apply_options(self._options)

    @property
    def options(self) -> s.SeriesOptionsCommon:
        # Using a Property Tag here so there's some indication options should be updated through
        # apply_options and not via direct dataclass manipulation
        return self._options

    def delete(self) -> None:
        self._parent._series_.pop(self.js_id)  # Ensure all references are removed
        self._fwd_queue.put((JS_CMD.REMOVE_SERIES, *self._ids))

    def set_data(self, data: s.Series_DF) -> None:
        "Sets the Data of the Series to the given data set. All irrlevant data is ignored"
        # Set display type so data.json() only passes relevant information
        data.disp_type = self.series_type
        self._fwd_queue.put((JS_CMD.SET_SERIES_DATA, *self._ids, data))

    def clear_data(self) -> None:
        "Remove All displayed Data. This does not remove/delete the Series Object."
        self._fwd_queue.put((JS_CMD.CLEAR_SERIES_DATA, *self._ids))

    def update_data(self, data: s.AnySeriesData) -> None:
        """
        Update the Data on Screen. The data is passed to the lightweight charts API without checks.
        """
        self._fwd_queue.put((JS_CMD.UPDATE_SERIES_DATA, *self._ids, data))

    def apply_options(self, options: s.AnySeriesOptions) -> None:
        "Update the Display Options of the Series."
        self._options = options
        self._fwd_queue.put((JS_CMD.UPDATE_SERIES_OPTS, *self._ids, options))

    def change_series_type(self, series_type: s.SeriesType, data: s.Series_DF) -> None:
        # Set display type so data.json() only passes relevant information
        data.disp_type = series_type
        self.series_type = series_type
        self._fwd_queue.put((JS_CMD.CHANGE_SERIES_TYPE, *self._ids, series_type, data))

    def change_pane(self, new_pane: str) -> None: ...

    def add_marker(self, marker: SeriesMarker) -> None: ...

    def remove_marker(self, marker: SeriesMarker | str) -> None: ...

    def add_price_line(self, price_line: SeriesPriceLine) -> None: ...

    def remove_price_line(self, price_line: SeriesPriceLine | float) -> None: ...


# region --------------------------------------- Single Value Series Objects --------------------------------------- #

# The Subclasses below are solely to make object creation cleaner for the user. They don't
# actually provide any additional functionality (beyond type hinting) to SeriesCommon.


class LineSeries(SeriesCommon):
    "Subclass of SeriesCommon that Type Hints for a Line Series."

    def __init__(
        self,
        indicator: Indicator,
        display_pane_id: Optional[str] = None,
        options=s.LineStyleOptions(),
    ):
        super().__init__(indicator, s.SeriesType.Line, display_pane_id, options)
        self._options = options

    @property
    def options(self) -> s.LineStyleOptions:
        return self._options

    def update_data(
        self, data: s.WhitespaceData | s.SingleValueData | s.LineData
    ) -> None:
        super().update_data(data)

    def apply_options(self, options: s.LineStyleOptions) -> None:
        super().apply_options(options)

    def change_series_type(self, series_type: s.SeriesType, data: s.Series_DF) -> None:
        """
        **Pre-defined Series Types are not type mutable.** Use SeriesCommon instead.
        Calling this function will raise an Attribute Error.
        """
        raise AttributeError(
            "Pre-defined Series Types are not type mutable. Use SeriesCommon instead."
        )


class HistogramSeries(SeriesCommon):
    "Subclass of SeriesCommon that Type Hints for a Histogram Series"
    __series_type__ = s.SeriesType.Histogram


class AreaSeries(SeriesCommon):
    "Subclass of SeriesCommon that Type Hints for an Area Series"
    __series_type__ = s.SeriesType.Area


class BaselineSeries(SeriesCommon):
    "Subclass of SeriesCommon that Type Hints for a Baseline Series"
    __series_type__ = s.SeriesType.Baseline


class BarSeries(SeriesCommon):
    "Subclass of SeriesCommon that Type Hints for a Bar Series"
    __series_type__ = s.SeriesType.Bar


class CandlestickSeries(SeriesCommon):
    "Subclass of SeriesCommon that Type Hints for a Candlestick Series"

    def __init__(self, indicator: Indicator, display_pane_id: Optional[str] = None):
        super().__init__(indicator, s.SeriesType.Candlestick, display_pane_id)

    def update_data(
        self, data: s.WhitespaceData | s.OhlcData | s.CandlestickData
    ) -> None:
        super().update_data(data)

    def apply_options(
        self, options: s.CandlestickStyleOptions | s.SeriesOptionsCommon
    ) -> None:
        super().apply_options(options)


class RoundedCandleSeries(SeriesCommon):
    "Subclass of SeriesCommon that Type Hints for a Rounded Candle Series"
    __series_type__ = s.SeriesType.Rounded_Candle


# endregion
