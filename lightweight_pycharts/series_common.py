""" 
Classes that handle the implementation of Abstract and Specific Chart Series Objects 

(Classes known as ISeriesAPI in the Lightweight-Charts API) 
Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi
"""

import logging
from inspect import signature
from dataclasses import dataclass, asdict
from typing import Optional, TYPE_CHECKING

import pandas as pd

from .js_cmd import JS_CMD
from .orm import series as s
from .orm.types import SeriesPriceLine, SeriesMarker

if TYPE_CHECKING:
    from .indicator import Indicator

logger = logging.getLogger("lightweight-pycharts")


@dataclass
class SeriesValueMap:
    "Renaming map to specify which DataFrame Columns should be displayed as Single Value Data"
    value: str


@dataclass
class OHLCValueMap:
    "Renaming map to specify which DataFrame Columns should be displayed as OHLC Data"
    close: str
    open: str = "open"
    high: str = "high"
    low: str = "low"


# This was placed here and not in orm.Series because of the Queue & Pane Dependency
class SeriesCommon:
    """
    Baseclass to define the common functionality of all series types. This object provides
    direct access to a lightweight-charts ISeriesAPI Object. This Object is mutable between
    all of the series types.

    This object does not store a copy of the dataset given.

    Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi
    """

    def __init__(
        self,
        indicator: "Indicator",
        series_type: s.SeriesType,
        options=s.SeriesOptionsCommon(),
        display_pane_id: Optional[str] = None,
        ohlc_map: Optional[OHLCValueMap] = None,
        value_map: Optional[SeriesValueMap] = None,
    ) -> None:
        if display_pane_id is None:
            display_pane_id = indicator._ids[0]
            # default to display_pane of the parent indicator

        self._options = options
        self.series_type = self._series_type_check_(series_type)
        self.series_data_cls = self.series_type.cls
        self.series_ohlc_derived = s.SeriesType.OHLC_Derived(self.series_type)

        self._js_id = indicator._series_.generate_id(self)
        # Tuple of Ids to make addressing through Queue easier: order = (pane, indicator, series)
        self._ids = display_pane_id, indicator._js_id, self._js_id

        self.ohlc_map = ohlc_map
        self.value_map = value_map

        self._parent = indicator
        self._fwd_queue = indicator._fwd_queue

        self._fwd_queue.put((JS_CMD.ADD_SERIES, *self._ids, self.series_type))
        self.apply_options(self._options)

    def delete(self) -> None:
        "Remove the Series Object from the Chart and the Parent Indicator"
        self._parent._series_.pop(self._js_id)  # Ensure all references are removed
        self._fwd_queue.put((JS_CMD.REMOVE_SERIES, *self._ids))

    @property
    def js_id(self) -> str:
        "Immutable Copy of the Object's Javascript_ID"
        return self._js_id

    @property
    def options(self) -> s.SeriesOptionsCommon:
        "Copy of the Object's Series Options Dataclass"
        # Using a Property Tag here so there's some indication options should be updated through
        # apply_options and not via direct dataclass manipulation
        return self._options

    @staticmethod
    def _series_type_check_(series_type: s.SeriesType) -> s.SeriesType:
        "Set a default series_type for the display ambiguous series types"
        if (
            series_type == s.SeriesType.SingleValueData
            or series_type == s.SeriesType.WhitespaceData
        ):
            return s.SeriesType.Line
        elif series_type == s.SeriesType.OHLC_Data:
            return s.SeriesType.Candlestick
        elif series_type == s.SeriesType.Custom:
            logger.warning(
                "SeriesCommon given an invalid display type of 'Custom'. Making SeriesType a line"
            )
            return s.SeriesType.Line
        return series_type

    def _to_transfer_dataframe_(self, data: s.Series_DF) -> pd.DataFrame:
        """
        Creates a formatted Dataframe from a Series_DF object. This formatted dataframe:

        - Renames the columns to OHLC / value as needed.
        - Drops all unnecessary columns and rows
        - Formats the timestamp as a Unix Epoch Integer

        This is the smallest form factor dataset that is optimized for transfer over a
        multiprocessor Queue.
        """
        # region -------------------- Column Renaming --------------------
        if s.SeriesType.SValue_Derived(self.series_type) and self.value_map is not None:
            drop_list = []
            if self.value_map.value != "value" and "value" in data.df.columns:
                drop_list.append("value")

            tmp_df = data.df.drop(columns=drop_list).rename(
                columns=asdict(self.value_map)
            )

        elif s.SeriesType.OHLC_Derived(self.series_type) and self.ohlc_map is not None:
            drop_list = []
            if self.ohlc_map.open != "open" and "open" in data.df.columns:
                drop_list.append("open")
            if self.ohlc_map.open != "high" and "high" in data.df.columns:
                drop_list.append("high")
            if self.ohlc_map.open != "low" and "low" in data.df.columns:
                drop_list.append("low")
            if self.ohlc_map.close != "close" and "close" in data.df.columns:
                drop_list.append("close")

            tmp_df = data.df.drop(columns=drop_list).rename(
                columns=asdict(self.ohlc_map)
            )

        elif (
            data.data_type == s.SeriesType.Custom
            and self.ohlc_map is None
            and self.value_map is None
        ):
            logger.warning(
                "Attempting to display Custom Data without specifying what to display."
            )
            tmp_df = data.df.copy()

        elif s.SeriesType.SValue_Derived(data.data_type) != s.SeriesType.SValue_Derived(
            self.series_type
        ):  # No remapping given, but data type doesn't match the display type.
            tmp_df = data.df.rename(columns={"close": "value", "value": "close"})

        else:
            # Data Type inherently matches the display type.
            tmp_df = data.df.copy()

        # endregion

        # region -------------------- Drop Unused Data --------------------

        # Get the list of columns that are valid to pass to the window
        visual_columns = set(signature(self.series_type.cls).parameters.keys())
        visual_columns.remove("volume")

        columns_to_drop = set(tmp_df.columns).difference(visual_columns)
        tmp_df.drop(columns=columns_to_drop, inplace=True)  # type: ignore (set is valid type)

        # endregion

        # Convert pd.Timestamp to Unix Epoch time (confirmed working w/ pre Jan 1, 1970 dates)
        tmp_df["time"] = tmp_df["time"].astype("int64") / 10**9

        return tmp_df

    def set_data(self, data: s.Series_DF) -> None:
        "Sets the Data of the Series to the given data set. All irrlevant data is ignored"
        # Set display type so data.json() only passes relevant information
        self._fwd_queue.put(
            (JS_CMD.SET_SERIES_DATA, *self._ids, self._to_transfer_dataframe_(data))
        )

    def clear_data(self) -> None:
        "Remove All displayed Data. This does not remove/delete the Series Object."
        self._fwd_queue.put((JS_CMD.CLEAR_SERIES_DATA, *self._ids))

    def update_data(self, data: s.AnySeriesData) -> None:
        """
        Update the Data on Screen. The data is sent to the lightweight charts API without checks.
        """
        # Recast AnySeriesData into the type of data expected for this series as needed
        if self.series_ohlc_derived != s.SeriesType.OHLC_Derived(data):
            data_dict = data.as_dict
            if "value" in data_dict:
                data_dict["close"] = data_dict["value"]
            elif "close" in data_dict:
                data_dict["value"] = data_dict["close"]
            data = self.series_data_cls.from_dict(data_dict)

        self._fwd_queue.put((JS_CMD.UPDATE_SERIES_DATA, *self._ids, data))

    def apply_options(self, options: s.AnySeriesOptions) -> None:
        "Update the Display Options of the Series."
        self._options = options
        self._fwd_queue.put((JS_CMD.UPDATE_SERIES_OPTS, *self._ids, options))

    def change_series_type(self, series_type: s.SeriesType, data: s.Series_DF) -> None:
        "Change the type of Series object that is displayed on the screen."
        # Set display type so data.json() only passes relevant information
        self.series_type = self._series_type_check_(series_type)
        self.series_data_cls = self.series_type.cls
        self.series_ohlc_derived = s.SeriesType.OHLC_Derived(self.series_type)
        self._fwd_queue.put(
            (
                JS_CMD.CHANGE_SERIES_TYPE,
                *self._ids,
                series_type,
                self._to_transfer_dataframe_(data),
            )
        )

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
        indicator: "Indicator",
        options=s.LineStyleOptions(),
        display_pane_id: Optional[str] = None,
    ):
        super().__init__(indicator, s.SeriesType.Line, options, display_pane_id)
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

    def __init__(
        self,
        indicator: "Indicator",
        options=s.CandlestickStyleOptions(),
        display_pane_id: Optional[str] = None,
    ):
        super().__init__(indicator, s.SeriesType.Candlestick, options, display_pane_id)

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
