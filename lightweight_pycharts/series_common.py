""" 
Classes that handle the implementation of Abstract and Specific Chart Series Objects 

(Classes known as ISeriesAPI in the Lightweight-Charts API) 
Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi
"""

import logging
from weakref import ref
from typing import Optional, TYPE_CHECKING

import pandas as pd
from pandas.api.types import is_datetime64_any_dtype

from .js_cmd import JS_CMD
from .orm import series as s
from .orm.options import PriceScaleOptions
from .orm.types import SeriesPriceLine, SeriesMarker

if TYPE_CHECKING:
    from .indicator import Indicator

logger = logging.getLogger("lightweight-pycharts")


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
        *,
        name: Optional[str] = None,
        display_pane_id: Optional[str] = None,
        v_map: s.ValueMap | dict[str, str] = {"close": "value", "value": "close"},
    ) -> None:
        if display_pane_id is None:
            display_pane_id = indicator._ids[0]
            # default to display_pane of the parent indicator

        self._options = options
        self._series_type = self._series_type_check_(series_type)
        self._series_data_cls = self._series_type.cls
        self._series_ohlc_derived = s.SeriesType.OHLC_Derived(self._series_type)

        self._js_id = indicator._series.generate_id(self)
        # Tuple of Ids to make addressing through Queue easier: order = (pane, indicator, series)
        self._ids = display_pane_id, indicator.js_id, self._js_id

        if isinstance(v_map, s.ValueMap):
            self._value_map = v_map.as_dict
        else:
            # Ensure data can be displayed as both OHLC and Single Value based
            self._value_map = v_map.copy()
            if "close" not in v_map and "value" in v_map:
                self._value_map["close"] = v_map["value"]
            elif "value" not in v_map and "close" in v_map:
                self._value_map["value"] = v_map["close"]
            if "value" not in v_map:
                self._value_map["value"] = "close"
            if "close" not in v_map:
                self._value_map["close"] = "value"

        # Make _series reference a Weakref since this is a child obj.
        self._parent_series = ref(indicator._series)
        self._fwd_queue = indicator._fwd_queue

        self._fwd_queue.put((JS_CMD.ADD_SERIES, *self._ids, self._series_type, name))
        self.apply_options(self._options)

    def __del__(self):
        logger.debug("Deleteing %s: %s", self.__class__.__name__, self._js_id)

    def delete(self):
        "Remove the Object from the screen"
        if (parent_dict := self._parent_series()) is not None:
            parent_dict.pop(self._js_id)  # Ensure all references are gone
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

    def _to_transfer_dataframe_(
        self,
        data: s.Series_DF | pd.DataFrame | pd.Series,
    ) -> pd.DataFrame:
        """
        Creates a formatted Dataframe from a Series/Series_DF/DataFrame object.
        This formatted dataframe:

        - Renames the columns to OHLC / value as needed.
        - Drops all unnecessary columns and rows
        - Formats the timestamp as a Unix Epoch Integer (in seconds)

        This is the smallest form factor dataset that is optimized for transfer over a
        multiprocessor Queue.
        """
        # Format 'data' to a dataframe called '_df' (A reference)
        if isinstance(data, s.Series_DF):
            _df = data.df
        elif isinstance(data, pd.DataFrame):
            _df = data
        else:
            if not is_datetime64_any_dtype(data.index):
                raise AttributeError(
                    "Pandas Series must have a datetimeindex to be displayed."
                )
            _df = data.rename("value")
            _df.index.set_names("time", inplace=True)
            _df = _df.reset_index()

        # Rename the Columns based on the display type and the rename map
        valid_keys = self._series_type.params.difference({"volume"})
        rename_keys = valid_keys.intersection(self._value_map.keys())
        rename_dict = dict(
            [
                (self._value_map[key], key)
                for key in rename_keys
                if key != self._value_map[key] and self._value_map[key] in _df.columns
            ]
        )
        conflict_keys = list(set(rename_dict.values()).intersection(_df.columns))

        # Turn (Reference) _df into new instance tmp_df with columns renamed as needed.
        tmp_df = _df.drop(columns=conflict_keys).rename(columns=rename_dict)

        # Drop Unused Data
        unused_cols = list(set(tmp_df.columns).difference(valid_keys))
        tmp_df.drop(columns=unused_cols, inplace=True)

        # Need atleast one of the following to display anything on the screen
        if len(set(tmp_df.columns).intersection({"value", "close"})) == 0:
            logger.warning(
                "Series %s of type %s doesn't know what to display!",
                self._ids,
                self._series_type,
            )

        # Ensure 'Time' is a column
        if "time" not in tmp_df.columns:
            if is_datetime64_any_dtype(tmp_df.index):
                tmp_df.index.set_names("time", inplace=True)
                tmp_df.reset_index(inplace=True)
            else:
                raise AttributeError(
                    "Cannot Display Series_Common Data. Need a 'time' index or column"
                )

        # Convert pd.Timestamp to Unix Epoch time (confirmed working w/ pre Jan 1, 1970 dates)
        tmp_df["time"] = tmp_df["time"].astype("int64") / 10**9

        return tmp_df

    def set_data(self, data: s.Series_DF | pd.DataFrame | pd.Series) -> None:
        "Sets the Data of the Series to the given data set. All irrlevant data is ignored"
        # Set display type so data.json() only passes relevant information
        xfer_df = self._to_transfer_dataframe_(data)
        self._fwd_queue.put((JS_CMD.SET_SERIES_DATA, *self._ids, xfer_df))

    def clear_data(self) -> None:
        "Remove All displayed Data. This does not remove/delete the Series Object."
        self._fwd_queue.put((JS_CMD.CLEAR_SERIES_DATA, *self._ids))

    def update_data(self, data: s.AnySeriesData) -> None:
        """
        Update the Data on Screen. The data is sent to the lightweight charts API without checks.
        """
        # Recast AnySeriesData into the type of data expected for this series as needed
        if self._series_ohlc_derived != s.SeriesType.OHLC_Derived(data):
            data_dict = data.as_dict
            if "value" in data_dict:
                data_dict["close"] = data_dict["value"]
            elif "close" in data_dict:
                data_dict["value"] = data_dict["close"]
            data = self._series_data_cls.from_dict(data_dict)

        self._fwd_queue.put((JS_CMD.UPDATE_SERIES_DATA, *self._ids, data))

    def apply_options(self, options: s.AnySeriesOptions) -> None:
        "Update the Display Options of the Series."
        self._options = options
        self._fwd_queue.put((JS_CMD.UPDATE_SERIES_OPTS, *self._ids, options))

    def apply_scale_options(self, options: PriceScaleOptions) -> None:
        """
        Update the Options for the Price Scale this Series belongs too.
        **Warning**: These changes may be shared with other series objects!
        """
        self._fwd_queue.put((JS_CMD.UPDATE_PRICE_SCALE_OPTS, *self._ids, options))

    def change_series_type(
        self, series_type: s.SeriesType, data: s.Series_DF | pd.DataFrame | pd.Series
    ) -> None:
        "Change the type of Series object that is displayed on the screen."
        # Set display type so data.json() only passes relevant information
        self._series_type = self._series_type_check_(series_type)
        self._series_data_cls = self._series_type.cls
        self._series_ohlc_derived = s.SeriesType.OHLC_Derived(self._series_type)

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


# region ----------------------------- Single Value Series Objects ------------------------------ #

# The Subclasses below are solely to make object creation cleaner for the user. They don't
# actually provide any additional functionality (beyond type hinting) to SeriesCommon.


class LineSeries(SeriesCommon):
    "Subclass of SeriesCommon that Type Hints for a Line Series."

    def __init__(
        self,
        indicator: "Indicator",
        options=s.LineStyleOptions(),
        *,
        name: Optional[str] = None,
        display_pane_id: Optional[str] = None,
    ):
        super().__init__(
            indicator,
            s.SeriesType.Line,
            options,
            name=name,
            display_pane_id=display_pane_id,
        )
        self._options = options

    @property
    def options(self) -> s.LineStyleOptions:
        return self._options

    def update_data(
        self, data: s.WhitespaceData | s.SingleValueData | s.LineData
    ) -> None:
        self._fwd_queue.put((JS_CMD.UPDATE_SERIES_DATA, *self._ids, data))

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

    def __init__(
        self,
        indicator: "Indicator",
        options=s.HistogramStyleOptions(),
        display_pane_id: Optional[str] = None,
    ):
        super().__init__(
            indicator, s.SeriesType.Histogram, options, display_pane_id=display_pane_id
        )
        self._options = options

    @property
    def options(self) -> s.HistogramStyleOptions:
        return self._options

    def update_data(
        self, data: s.WhitespaceData | s.SingleValueData | s.HistogramData
    ) -> None:
        self._fwd_queue.put((JS_CMD.UPDATE_SERIES_DATA, *self._ids, data))

    def apply_options(self, options: s.HistogramStyleOptions) -> None:
        super().apply_options(options)

    def change_series_type(self, series_type: s.SeriesType, data: s.Series_DF) -> None:
        """
        **Pre-defined Series Types are not type mutable.** Use SeriesCommon instead.
        Calling this function will raise an Attribute Error.
        """
        raise AttributeError(
            "Pre-defined Series Types are not type mutable. Use SeriesCommon instead."
        )


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
        super().__init__(
            indicator,
            s.SeriesType.Candlestick,
            options,
            display_pane_id=display_pane_id,
        )

    def update_data(
        self, data: s.WhitespaceData | s.OhlcData | s.CandlestickData
    ) -> None:
        self._fwd_queue.put((JS_CMD.UPDATE_SERIES_DATA, *self._ids, data))

    def apply_options(
        self, options: s.CandlestickStyleOptions | s.SeriesOptionsCommon
    ) -> None:
        super().apply_options(options)


class RoundedCandleSeries(SeriesCommon):
    "Subclass of SeriesCommon that Type Hints for a Rounded Candle Series"
    __series_type__ = s.SeriesType.Rounded_Candle


# endregion
