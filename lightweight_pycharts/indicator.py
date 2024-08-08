""" Classes and functions that handle implementation of chart indicators """

from logging import getLogger
from dataclasses import dataclass
from abc import abstractmethod
from inspect import signature, _empty, currentframe
from typing import (
    ClassVar,
    Dict,
    Optional,
    Any,
    Callable,
    Protocol,
    TypeAlias,
)

import pandas as pd
from numpy import nan

from lightweight_pycharts.indicator_meta import IndicatorMeta, OptionsMeta
from lightweight_pycharts.orm.options import PriceScaleMargins, PriceScaleOptions
from lightweight_pycharts.orm.types import Color, PriceFormat

from . import window as win
from . import primative as pr
from . import series_common as sc
from .util import ID_Dict, is_dunder
from .js_cmd import JS_CMD
from .orm import Symbol, TF
from .orm.series import (
    HistogramData,
    HistogramStyleOptions,
    Series_DF,
    SeriesType,
    AnyBasicData,
    ValueMap,
    Whitespace_DF,
    SingleValueData,
    update_dataframe,
)

# pylint: disable=protected-access
# pylint: disable=arguments-differ
logger = getLogger("lightweight-pycharts")

SeriesData: TypeAlias = Callable[[], pd.Series]
DataframeData: TypeAlias = Callable[[], pd.DataFrame]


@dataclass(slots=True)
class BarState:
    """
    Dataclass object that holds various information about the current bar.
    """

    index: int = -1
    time: pd.Timestamp = pd.Timestamp(0)
    timestamp: pd.Timestamp = pd.Timestamp(0)
    time_close: pd.Timestamp = pd.Timestamp(0)
    time_length: pd.Timedelta = pd.Timedelta(0)

    open: float = nan
    high: float = nan
    low: float = nan
    close: float = nan
    value: float = nan
    volume: float = nan
    ticks: float = nan

    is_ext: bool = False
    is_new: bool = False
    is_ohlc: bool = False
    is_single_value: bool = False


class Watcher:
    """
    An Indicator instance object that is handed to another indicator it wishes to observe.

    Holds references to it's parent Indicators set, clear, and update methods.
    Holds References to other indicator's output function calls to fetch data.
    """

    def __init__(self, parent: "Indicator"):
        self._set_data = parent.set_data
        self._clear_data = parent.clear_data
        self._update_data = parent.update_data
        self._notify_observers_set = parent._notify_observers_set
        self._notify_observers_clear = parent._notify_observers_clear
        self._notify_observers_update = parent._notify_observers_update

        self._set = False

        self.observables: dict[str, Callable] = {}
        self.set_args: dict[str, Callable] = {}
        self.set_notifiers: list[Indicator] = []
        self.update_args: dict[str, Callable] = {}
        self.update_notifiers: list[Indicator] = []

    def notify_set(self, notifier: Optional["Indicator"] = None):
        "Notify the Watcher that an update occured in the given Indicator"
        if notifier is not None and notifier not in self.set_notifiers:
            return  # This Notifier not involved in setting data (Probably just updates data)

        # TODO: Update this if statement to check a state variable of the observed indicators
        if all(self.set_args.values()):
            # Ready, Fire Set Calc then reset set_Notifier Readiness State
            # Will Fire on Notifier = None, intentional so Watcher self-fires on init
            self._set_data(
                **dict([(name, func()) for name, func in self.set_args.items()])
            )
            self._set = True
            self._notify_observers_set()

    def notify_update(self, notifier: Optional["Indicator"] = None):
        "Notify the Watcher that an update occured in the given Indicator"
        if notifier is not None:
            if notifier not in self.update_notifiers:
                return  # This Notifier not involved in updating data (Probably just sets data)
            if not self._set:
                return  # Indicator not Ready to Update. (Ext. src probably called Update)

            if all(self.update_args.values()):
                # Ready, Fire Update then reset Update_Notifier Readiness State
                self._update_data(
                    **dict([(name, func()) for name, func in self.update_args.items()])
                )
                self._notify_observers_update()

    def notify_clear(self, notifier: Optional["Indicator"] = None):
        "Notify the Watcher that an update occured in the given Indicator"
        if (
            notifier is not None
            and notifier not in self.update_notifiers
            and notifier not in self.set_notifiers
        ):
            logger.warning(
                "'%s' tried to clear '%s', but Watcher doesn't care.",
                notifier.name,
                self,
            )

        self._clear_data()
        self._set = False
        self._notify_observers_update()


# region --------------------------- Indicator Classes --------------------------- #


class IndicatorOptions(metaclass=OptionsMeta):
    "Inheritable OptionsMeta Class"
    __menu_struct__: ClassVar[dict] = {}


class IsIndicatorOptions(Protocol):
    "Protocol Class to type check for an Indicator Options Dataclass"
    __menu_struct__: dict
    __dataclass_fields__: Dict[str, Any]


class Indicator(metaclass=IndicatorMeta):
    """
    Indicator Abstract Base Class. This class defines the code neccessary for subclasses to manage
    timeseries data calculations, updates, and creating series/primitives objects that are
    drawn on the screen.

    Subclasses need to define an __init__(), Set_Data(), and Update_Data() function to be complete.
    __init__ must link callables (That fetch a set of timeseries data) to the function arguments of
    Set_data and Update_data (See function Docstrings). Set_Data should define a historical data
    calculation based on a full dataset. Update_Data Should update the historical calculation
    given an update to the source dataset.

    Indicators apply themselves to the screen by appending themselves to their parent frame's
    indicators dictionary.
    """

    # An object self appending to a parent's instance dictionary may obfuscate the how that dict
    # is populated, but it is by far the simplest solution

    # The first alternative would be requesting a _js_id from the Frame, letting the user create the
    # object. The problem is that there is no indication that the user *must* get an ID from the
    # frame. They could have simply supplied their own string and run into bugs later.

    # The second alternative would be to have the user supply the Indicator subclass and all the
    # required arguments only for the Frame to then construct and return the indicator. This isn't
    # ideal since you lose all type checking during object creation, and the owner of the object
    # isn't the one actually creating the object.

    # Dunder Cls Params specific to each Sub-Class; set by MetaClass
    __options__: IsIndicatorOptions
    __set_args__: dict[str, tuple[type, Any]]
    __input_args__: dict[str, tuple[type, Any]]
    __update_args__: dict[str, tuple[type, Any]]
    __default_output__: Optional[SeriesData]
    __exposed_outputs__: dict[str, SeriesData | DataframeData]

    # Dunder Cls Param referenced by all Sub-Classes of Indicator
    __registered_indicators__: dict[str, "Indicator"]

    def __init__(
        self,
        parent: "win.Frame | Indicator",
        js_id: Optional[str] = None,
        display_pane_id: Optional[str] = None,
    ) -> None:
        if isinstance(parent, win.Frame):
            self.parent_frame = parent
        else:
            self.parent_frame = parent.parent_frame

        if display_pane_id is None:
            display_pane_id = self.parent_frame.main_pane._js_id

        if js_id is None:
            self._js_id = self.parent_frame.indicators.generate_id(self)
        else:
            self._js_id = self.parent_frame.indicators.affix_id(js_id, self)

        # Must preform this check after id generation so parent.main_series is guaranteed valid.
        # (Specifically for when parent.main_series is trying to find a reference to itself)
        if isinstance(parent, win.Frame):
            self.parent_indicator = parent.main_series
        else:
            self.parent_indicator = parent

        # Tuple of Ids to make addressing through Queue easier: order = (pane, indicator)
        self._ids = display_pane_id, self._js_id
        self._fwd_queue = self.parent_frame._fwd_queue

        # Bind the default output function to this instance
        if self.__default_output__ is not None:
            self.default_output: Optional[Callable[[], pd.Series]] = (
                self.__default_output__.__get__(self, self.__class__)
            )
        else:
            self.default_output = None

        self._series = ID_Dict[sc.SeriesCommon]("s")
        self._primitives = ID_Dict[pr.Primitive]("p")

        # Setup Indicator Observer Structures
        self._watcher = Watcher(self)
        self._observers: list[Watcher] = []

        # Name is used as an identifier when linking args from the screen.
        self.name = self.__class__.__name__
        self.events = self.parent_frame._window.events

        self.opts = None

        self._fwd_queue.put((JS_CMD.ADD_INDICATOR, *self._ids, self.name))

    @property
    def js_id(self) -> str:
        "Immutable Copy of the Object's Javascript_ID"
        return self._js_id

    @property
    def default_parent_src(self) -> Callable[[], pd.Series]:
        """
        The default series output of the parent indicator. If the parent does not have a default
        output then the 'close' of the current frame's main series is returned.
        """
        if self.parent_indicator.default_output is not None:
            return self.parent_indicator.default_output

        return self.parent_frame.main_series.close

    def __del__(self):
        logger.debug("Deleteing %s: %s", self.__class__.__name__, self._js_id)

    def __getitem__(self, index: int):
        "Syntactic sugar for accessing the time of a bar index"
        return self.bar_time(index)

    def _notify_observers_set(self):
        "Notify All observers to preform a bulk historical calculation"
        for watcher in self._observers:
            if watcher is not None:
                watcher.notify_set(self)

    def _notify_observers_update(self):
        "Notify All observers there is an update to be made"
        for watcher in self._observers:
            if watcher is not None:
                watcher.notify_update(self)

    def _notify_observers_clear(self):
        "Notify All observers they should clear their state"
        for watcher in self._observers:
            if watcher is not None:
                watcher.notify_clear(self)

    def delete(self):
        "Remove the indicator and all of it's instance objects"
        self.unlink_all_args()
        for series in self._series.copy().values():
            series.delete()
        for primative in self._primitives.copy().values():
            primative.delete()
        self.clear_data()  # Clear data after deleting sub-objects to limit redundant actions
        self.parent_frame.indicators.pop(self._js_id)
        self._fwd_queue.put((JS_CMD.REMOVE_INDICATOR, *self._ids))

    @abstractmethod
    def set_data(self, *_, **__):
        """
        Set the base data of the indicator. This is called when the base dataset of the indicator
        becomes available or changes due to a timeframe / symbol change. This is analogous to
        historical bar calculation in Pinescript, however should be done in vectorized calculations
        on Pandas' DataFrames / Series Objects

        The arguments of this function are completely arbitrary. They can be any data type so long
        as they have a unique keyword. If this keyword is used by the update_data() method then they
        must share the same datatype. set_data() and update_data() can have different signatures and
        dependencies though!

        During initialization / A change in options this indicator may call the link_args() method.
        This method takes a dict[str:Callable]. The string is a keyword that matches a keyword arg
        of the set_data() or update_data() methods. The Callable must be an output property of
        another indicator. Once all source Indicators have be set/updated this indicator will
        have it's respective set_data() / update_data() method automatically called.

        This method does not have to be dependent on other indicators though. The Series(Indicator)
        class is a great example. It only recieves data from external sources. Those sources simply
        invoke the set_data() / update_data() methods manually.
        """

    @abstractmethod
    def update_data(self, *_, **__):
        """
        Update the output of the indicator given an incremental update. This method will typically
        require bar_state:BarState as an argument.

        bar_state is a default argument that will automatically link when present in the signature
        of a set_data()/update_data() method. The automatic link will connect to the base source of
        series data on the Frame this indicator is attached too. This connection can be overwritten
        by manually passing the desired connection to link_args().
        """

    def clear_data(self):
        """
        Clear Data from the indicator, resetting it the post __init__ state. This is also called
        just prior to indicator deletion, so can reliably clean up the state of linked objects.

        The series and primitive objects are not guaranteed to exist since this might be called
        ahead of deletion.
        """
        for series in self._series.values():
            series.clear_data()
        for primative in self._primitives.values():
            primative.clear()

    def set_options(self, opts: IsIndicatorOptions):
        "Called by Javascript when the user updates the Indicator's Options on Screen"
        self.opts = opts
        self.recalculate()

    def recalculate(self):
        "Manually force a full recalculation of this indicator and all dependent indicators"
        self._watcher.notify_set(None)

    def link_args(self, args: dict[str, Callable]):
        """
        Subscribe this indicator's inputs to the provided indicator output arguments.

        :param: args: a dictionary providing links for all Set and Update args.
        """
        if len(self._watcher.observables) > 0:
            self.unlink_all_args()  # Clear all present args before setting

        cls = self.__class__

        # Auto-Link default args if the Indicator requests it.
        if "bar_state" in cls.__input_args__ and "bar_state" not in args:
            args["bar_state"] = self.parent_frame.main_series.bar_state
        if "time" in cls.__input_args__ and "time" not in args:
            args["time"] = self.parent_frame.main_series.last_bar_time
        if "index" in cls.__input_args__ and "index" not in args:
            args["index"] = self.parent_frame.main_series.last_bar_index

        # Check all required argument links are present
        if not set(cls.__input_args__.keys()).issubset(args.keys()):
            missing_args = set(cls.__input_args__.keys()).difference(args.keys())
            raise ValueError(f"{self.name} Missing Arg Links for: {missing_args}")

        # In the loops below the '_' param is the default_arg of the function.
        # It's not used because quite frankly i'm not sure how to implement that...

        # Type check the inputs, Prepare Watcher, and look for circular dependencies
        for name, (arg_type, _) in cls.__input_args__.items():
            rtn_type = signature(args[name]).return_annotation
            rtn_type = object if rtn_type is _empty else rtn_type

            if not issubclass(arg_type, rtn_type):
                raise TypeError(
                    f"{self.name} Given {rtn_type} for parameter {name}. Expected type {arg_type}"
                )

            # Observables is the Union of set_args & update_args. Useful to have it's own reference
            self._watcher.observables[name] = args[name]

            # Give this Indicator's watcher to the function's bound instance
            bound_cls_inst = args[name].__self__
            if self._watcher not in bound_cls_inst._observers:
                # Append a weakref of this indicator's observer
                bound_cls_inst._observers.append(self._watcher)

            if bound_cls_inst in self._observers:
                raise Warning(
                    f"Circular Indicator dependency between {bound_cls_inst.name} & {self.name}"
                )

            # Create Dicts of Param_Name:Callable & Host_Indicator: Bool
            if name in cls.__set_args__:
                self._watcher.set_args[name] = args[name]
                self._watcher.set_notifiers.append(bound_cls_inst)
            if name in cls.__update_args__:
                self._watcher.update_args[name] = args[name]
                self._watcher.update_notifiers.append(bound_cls_inst)

        # Preform initial calc If all the indicators observed are ready.
        self._watcher.notify_set()

    def unlink_all_args(self):
        "Unsubscribe from all of the Indicator's linked input args."
        # Remove self from all of the '_observers' lists that it's appended to
        bound_arg_funcs = self._watcher.observables.values()
        for bound_func_cls in set([func.__self__ for func in bound_arg_funcs]):
            bound_func_cls._observers.remove(self._watcher)

        # Clear Watcher
        self._watcher.set_args = {}
        self._watcher.set_notifiers = []
        self._watcher.update_args = {}
        self._watcher.update_notifiers = []
        self._watcher.observables = {}

    def get_primitives_of_type[T: pr.Primitive](self, _type: type[T]) -> dict[str, T]:
        "Returns a Dictionary of Primitives owned by this indicator of the Given Type"
        if _type == pr.Primitive:
            return self._primitives.copy()  # type: ignore ... I know what I'm doing? wtf?
        rtn_dict = {}
        for _key, _primitive in self._primitives.items():
            if isinstance(_primitive, _type):
                rtn_dict[_key] = _primitive
        return rtn_dict

    def get_series_of_type[T: sc.SeriesCommon](self, _type: type[T]) -> dict[str, T]:
        "Returns a Dictionary of Series Objects owned by this indicator of the Given Type"
        if _type == sc.SeriesCommon:
            return self._series.copy()  # type: ignore (ID_Dict is still a dict.)
        rtn_dict = {}
        for _key, _series in self._series.items():
            if isinstance(_series, _type):
                rtn_dict[_key] = _series
        return rtn_dict

    def delete_primitives(self, _type: type = pr.Primitive):
        """
        Deletes all Primitives owned by this indicator of the given type.
        If no argument is given, all of the primitives will be deleted.
        """
        for _primitive in self._primitives.copy().values():
            if isinstance(_primitive, _type):
                _primitive.delete()

    def delete_series(self, _type: type = sc.SeriesCommon):
        """
        Deletes all Primitives owned by this indicator of the given type.
        If no argument is given, all of the primitives will be deleted.
        """
        for _series in self._series.copy().values():
            if isinstance(_series, _type):
                _series.delete()

    def bar_time(self, index: int) -> pd.Timestamp:
        """
        Get the timestamp at a given bar index. Negative indices are valid and will start at
        the last bar time.

        The returned timestamp will always be bound to the limits of the underlying dataset
        e.g. [FirstBarTime, LastBarTime]. If no underlying data exists 1970-01-01[UTC] is returned.

        The index may be up to 500 bars into the future, though this timestamp is not guaranteed to
        always remain valid depending on the data received. This can cause Primitives to de-render.

        For example, say the projected time of the next bar is 4:15pm and we draw a Primitive at
        that timestamp. The next piece of bar data is received with an opening time of 5PM so the
        4:15PM Bar is skipped. The Library will remove the Whitespace between 4:15PM and 5PM so
        the chart doesn't have visible gaps. If the Primitive is still supposed to be drawn at
        4:15PM, it will de-render until a valid timestamp is given.
        """
        return self.parent_frame.main_series.bar_time(index)


ParentType: TypeAlias = win.Frame | Indicator
# pylint: enable=protected-access


# endregion

# region --------------------------- Attribute Application Functions --------------------------- #


def output_property[T: Callable](func: T) -> T:
    "Property Decorator used to expose Indicator Parameters to other Indicators"
    func.__expose_param__ = True
    return func


def default_output_property[T: Callable](func: T) -> T:
    "Property Decorator used to expose Indicator Parameters to other Indicators"
    func.__expose_param__ = True
    func.__default_param__ = True
    return func


def param[
    T
](
    default: T,
    title: Optional[str] = None,
    group: Optional[str] = None,
    inline: Optional[str] = None,
    tooltip: str = "",
    *,
    options: Optional[list[T]] = None,
    min_val: Optional[T] = None,
    max_val: Optional[T] = None,
    step: Optional[T] = None,
):
    """
    Define additional configuration options for an indicator input variable.

    Ints and floats can provide min_val, max_val, and step_val arguments.

    If given an options list, a drop down menu selector will become available.
    An options list will override any min, max, and step params that are given.
    """

    try:
        # All I have to say is know when to break the rules >:D
        namespace = currentframe().f_back.f_locals  # type: ignore
        struct = namespace.get("__arg_params__")
        if struct is None:
            struct = namespace["__arg_params__"] = {}

        arg_name = "@arg" + str(
            len([key for key in namespace.keys() if not is_dunder(key)])
        )

        struct[arg_name] = {
            "title": title,
            "group": group,
            "inline": inline,
            "tooltip": tooltip if tooltip != "" else None,
            "options": options,
            "min": min_val,
            "max": max_val,
            "step": step,
        }

    except AttributeError as e:
        raise AttributeError(
            "Options input function invoked in improper context."
        ) from e

    return default


# endregion

# region ----------------------------- Series & Series Options ----------------------------- #


@dataclass
class SeriesIndicatorOptions:
    "Indicator Options for a Series"
    visible: bool = True
    series_type: SeriesType = SeriesType.Candlestick


class Series(Indicator):
    """
    Draws a Series Object onto the Screen. Expands SeriesCommon behavior by filtering & Aggregating
    data, Creating a Whitespace Expansion Series, & Allowing the ability to change the series type.

    Other Indicators should subscribe to this object's bar updates as a filtered form of data.
    """

    __special_id__ = "XyzZy"

    def __init__(
        self,
        parent: win.Frame,
        options: SeriesIndicatorOptions = SeriesIndicatorOptions(),
        *,
        js_id: Optional[str] = None,
    ) -> None:
        super().__init__(parent, js_id)

        # Dunder to allow specific permissions to the main source of a data for a Frame.
        # Because reasons, the user can never accidentally set the _js_id to be __special_id__.
        self.__frame_primary_src__ = (
            self._js_id == self.parent_frame.indicators.prefix + Series.__special_id__
        )

        self.opts = options
        self.socket_open = False
        self.symbol = Symbol("LWPC")
        self._bar_state: Optional[BarState] = None
        self.main_data: Optional[Series_DF] = None
        self.whitespace_data: Optional[Whitespace_DF] = None

        self.main_series = sc.SeriesCommon(self, self.opts.series_type)

    def _init_bar_state(self):
        if self.main_data is None:
            return

        df = self.main_data.df
        col_names = self.main_data.df.columns

        self._bar_state = BarState(
            index=len(self.main_data.df) - 1,
            time=self.main_data.curr_bar_open_time,
            timestamp=self.main_data.curr_bar_open_time,
            time_close=self.main_data.curr_bar_close_time,
            time_length=self.main_data.timedelta,
            open=(df.iloc[-1]["open"] if "open" in col_names else nan),
            high=(df.iloc[-1]["high"] if "high" in col_names else nan),
            low=(df.iloc[-1]["low"] if "low" in col_names else nan),
            close=(df.iloc[-1]["close"] if "close" in col_names else nan),
            value=(df.iloc[-1]["value"] if "value" in col_names else nan),
            volume=(df.iloc[-1]["volume"] if "volume" in col_names else nan),
            ticks=(df.iloc[-1]["ticks"] if "ticks" in col_names else nan),
            # is_ext=self.main_data.ext, # TODO: Implement time check
            is_new=True,
            is_single_value="value" in col_names,
            is_ohlc="close" in col_names,
        )

    def _update_bar_state(self):
        if self.main_data is None or self._bar_state is None:
            return

        df = self.main_data.df
        col_names = self.main_data.df.columns

        self._bar_state.index = len(self.main_data.df) - 1
        self._bar_state.time = self.main_data.curr_bar_open_time
        # self._bar_state.timestamp ## Set in Update Data
        self._bar_state.time_close = self.main_data.curr_bar_close_time
        self._bar_state.time_length = self.main_data.timedelta
        self._bar_state.open = df.iloc[-1]["open"] if "open" in col_names else nan
        self._bar_state.high = df.iloc[-1]["high"] if "high" in col_names else nan
        self._bar_state.low = df.iloc[-1]["low"] if "low" in col_names else nan
        self._bar_state.close = df.iloc[-1]["close"] if "close" in col_names else nan
        self._bar_state.value = df.iloc[-1]["value"] if "value" in col_names else nan
        self._bar_state.volume = df.iloc[-1]["volume"] if "volume" in col_names else nan
        self._bar_state.ticks = df.iloc[-1]["ticks"] if "ticks" in col_names else nan
        # self._bar_state.is_ext=self.main_data.ext, TODO: Implement Time check
        # self._bar_state.is_new ## Set in Update Data
        # self._bar_state.is_single_value ## Constant
        # self._bar_state.is_ohlc ## Constant

    def delete(self):
        super().delete()
        if self.socket_open:
            self.events.socket_switch(state="close", symbol=self.symbol, series=self)

    def set_data(
        self,
        data: pd.DataFrame | list[dict[str, Any]],
        *_,
        symbol: Optional[Symbol] = None,
        **__,
    ):
        "Sets the main source of data for this Frame"
        # Update the Symbol Regardless if data is good or not
        if symbol is not None:
            self.symbol = symbol
        else:
            self.symbol = Symbol("LWPC")

        if self.__frame_primary_src__:
            self.parent_frame.__set_displayed_symbol__(self.symbol)

        # Initialize Data
        if not isinstance(data, pd.DataFrame):
            data = pd.DataFrame(data)
        self.main_data = Series_DF(data, self.symbol.exchange)

        # Clear and Return on bad data.
        if self.main_data.timeframe == TF(1, "E"):
            self.clear_data()
            return
        if self.main_data.data_type == SeriesType.WhitespaceData:
            self.clear_data(timeframe=self.main_data.timeframe)
            return

        self._init_bar_state()
        self.main_series.set_data(self.main_data)

        # Only make Whitespace Series if this is the primary dataset
        if self.__frame_primary_src__:
            self.whitespace_data = Whitespace_DF(self.main_data)
            self.parent_frame.__set_whitespace__(
                self.whitespace_data.df,
                SingleValueData(self.main_data.curr_bar_open_time, 0),
            )

        if self.__frame_primary_src__:
            # Only do this once everything else has completed and not Error'd.
            self.parent_frame.__set_displayed_timeframe__(self.main_data.timeframe)

        # Notify Observers
        self._notify_observers_set()

    def update_data(self, data_update: AnyBasicData, *_, accumulate=False, **__):
        """
        Updates the prexisting Frame's Primary Dataframe. The data point's time should
        be equal to or greater than the last data point otherwise this will have no effect.

        Can Accept WhitespaceData, SingleValueData, and OhlcData.
        Function will auto detect if this is a tick or bar update.
        When Accumulate is set to True, tick updates will accumulate volume,
        otherwise the last volume will be overwritten.
        """
        # Ignoring 4 Operator Errors, it's a false alarm since WhitespaceData.__post_init__()
        # Will Always convert 'data.time' to a compatible pd.Timestamp.
        if self.main_data is None or data_update.time < self.main_data.curr_bar_open_time:  # type: ignore
            return

        if data_update.time < self.main_data.next_bar_time:  # type: ignore
            # Update the last bar
            display_data = self.main_data.update_from_tick(
                data_update, accumulate=accumulate
            )
            if self._bar_state is not None:
                self._bar_state.is_new = False
        else:
            # Create new Bar
            if data_update.time != self.main_data.next_bar_time:
                # Update given is a new bar, but not the expected time
                # Ensure it fits the data's time interval
                time_delta = data_update.time - self.main_data.next_bar_time  # type: ignore
                data_update.time -= time_delta % self.main_data.timedelta  # type: ignore

            curr_bar_time = self.main_data.curr_bar_open_time
            display_data = self.main_data.update(data_update)
            if self._bar_state is not None:
                self._bar_state.is_new = True

            # Manage Whitespace Series
            if self.__frame_primary_src__ and self.whitespace_data is not None:
                if data_update.time != (
                    expected_time := self.whitespace_data.next_timestamp(curr_bar_time)
                ):
                    # New Data Jumped more than expected, Replace Whitespace Data So
                    # There are no unnecessary gaps.
                    logger.info(
                        "Whitespace_DF Predicted incorrectly. Expected_time: %s, Recieved_time: %s",
                        expected_time,
                        data_update.time,
                    )
                    self.whitespace_data = Whitespace_DF(self.main_data)
                    self.parent_frame.__set_whitespace__(
                        self.whitespace_data.df,
                        SingleValueData(self.main_data.curr_bar_open_time, 0),
                    )
                else:
                    # Lengthen Whitespace Data to keep 500bar Buffer
                    self.parent_frame.__update_whitespace__(
                        self.whitespace_data.extend(),
                        SingleValueData(self.main_data.curr_bar_open_time, 0),
                    )

        self._update_bar_state()
        if self._bar_state is not None:
            self._bar_state.timestamp = pd.Timestamp(data_update.time)
        self.main_series.update_data(display_data)

        # Notify Observers
        self._notify_observers_update()

    def clear_data(
        self, timeframe: Optional[TF] = None, symbol: Optional[Symbol] = None, **_
    ):
        """
        Clears the data in memory and on the screen and, if not none,
        updates the desired timeframe and symbol for the Frame
        """
        self.main_data = None
        self._bar_state = None

        if self.__frame_primary_src__:
            self.whitespace_data = None
            self.parent_frame.__clear_whitespace__()

        if self.socket_open:
            # Ensure Socket is Closed
            self.events.socket_switch(state="close", symbol=self.symbol, series=self)

        if symbol is not None:
            self.symbol = symbol
            if self.__frame_primary_src__:
                self.parent_frame.__set_displayed_symbol__(symbol)

        if timeframe is not None and self.__frame_primary_src__:
            self.parent_frame.__set_displayed_timeframe__(timeframe)

        super().clear_data()

        # Notify Observers
        self._notify_observers_clear()

    def change_series_type(self, series_type: SeriesType):
        "Change the Series Type of the main dataset"
        # Check Input
        if series_type == SeriesType.WhitespaceData:
            return
        if series_type == SeriesType.OHLC_Data:
            series_type = SeriesType.Candlestick
        if series_type == SeriesType.SingleValueData:
            series_type = SeriesType.Line
        if self.main_data is None or self.opts.series_type == series_type:
            return

        # Set. No Data renaming needed, that is handeled when converting to json
        self.opts.series_type = series_type
        self.main_series.change_series_type(series_type, self.main_data)

        # Update window display if necessary
        if self.__frame_primary_src__:
            self.parent_frame.__set_displayed_series_type__(self.opts.series_type)

    def bar_time(self, index: int) -> pd.Timestamp:
        """
        Get the timestamp at a given bar index. Negative indices are valid and will start
        at the last bar time.

        The returned timestamp will always be bound to the limits of the underlying dataset
        e.g. [FirstBarTime, LastBarTime]. If no underlying data exists 1970-01-01[UTC] is returned.

        The index may be up to 500 bars into the future, though this is only guaranteed to be the
        desired timestamp if this Series Indicator is the Main Series Data for it's parent Frame.
        Depending on the data received, Future Timestamps may not always remain valid.
        """
        if self.main_data is None:
            logger.warning("Requested Bar-Time prior setting series data!")
            return pd.Timestamp(0)

        if self.whitespace_data is not None:
            # Find index given main dataset and Whitespace Projection
            total_len = len(self.main_data.df) + len(self.whitespace_data.df)
            if index > total_len - 1:
                logger.warning("Requested Bar-Time beyond 500 Bars in the Future.")
                return self.whitespace_data.df.index[-1]
            elif index < -(len(self.main_data.df) - 1):
                logger.warning("Requested Bar-Time prior to start of the dataset.")
                return self.main_data.df.index[0]
            else:
                if index < len(self.main_data.df):
                    return self.main_data.df.index[index]
                else:
                    # Whitespace df grows as data is added hence funky iloc index.
                    return self.whitespace_data.df["time"].iloc[
                        (index - len(self.main_data.df)) - 500
                    ]
        else:
            # Series has no Whitespace projection
            if index > len(self.main_data.df) - 1:
                logger.warning("Requested Bar-Time beyond the dataset.")
                return self.main_data.df.index[-1]
            elif index < -(len(self.main_data.df) - 1):
                logger.warning("Requested Bar-Time prior to start of the dataset.")
                return self.main_data.df.index[0]
            else:
                return self.main_data.df.index[index]

    # region ---------------- Output Properties ----------------

    @output_property
    def last_bar_index(self) -> int:
        "Last Bar Index of the dataset. Returns -1 if there is no valid data"
        return -1 if self._bar_state is None else self._bar_state.index

    @output_property
    def last_bar_time(self) -> pd.Timestamp:
        "Open Time of the Last Bar. Returns 1970-01-01 if there is no valid data"
        return pd.Timestamp(0) if self._bar_state is None else self._bar_state.time

    @output_property
    def bar_state(self) -> BarState:
        "BarState Object that represents the most recent data update. This is an Update-Only Output"
        if self._bar_state is not None:
            return self._bar_state
        return BarState()

    @output_property
    def dataframe(self) -> pd.DataFrame:
        "A Reference to the full series dataframe"
        if self.main_data is not None:
            return self.main_data.df
        return pd.DataFrame({})

    @default_output_property
    def close(self) -> pd.Series:
        "A Series' Bar closing value"
        if self.main_data is not None:
            return self.main_data.df["close"]
        return pd.Series({})

    # endregion


# endregion


@dataclass
class VolumeIndicatorOptions:
    "Options for a volume series"
    up_color: Color = Color.from_hex("#26a69a80")
    down_color: Color = Color.from_hex("#ef535080")

    series_opts = HistogramStyleOptions(
        priceScaleId="vol", priceFormat=PriceFormat("volume")
    )
    price_scale_opts = PriceScaleOptions(scaleMargins=PriceScaleMargins(0.7, 0))


class Volume(Indicator):
    "Histogram Series that plots the Volume of a given Series(Indicator)"

    def __init__(
        self,
        parent: win.Frame | Series,
        src: Optional[Callable] = None,
        options=VolumeIndicatorOptions(),
    ) -> None:
        super().__init__(parent)

        self.opts = options
        self._data = pd.DataFrame()
        self.series_map = ValueMap("volume", color="vol_color")
        self.series = sc.SeriesCommon(
            self, SeriesType.Histogram, self.opts.series_opts, None, self.series_map
        )
        self.series.apply_scale_options(self.opts.price_scale_opts)

        if src is None:
            src = self.parent_frame.main_series.dataframe

        self.link_args({"data": src})

    def set_data(self, data: pd.DataFrame, *_, **__):
        if "volume" not in data.columns:
            return

        self._data = pd.DataFrame(data["volume"])

        if set(["open", "close"]).issubset(data.columns):
            color = data["close"] > data["open"]
            self._data["vol_color"] = color.replace(
                {True: self.opts.up_color, False: self.opts.down_color}
            )
        self.series.set_data(self._data)

    def update_data(self, bar_state: BarState, *_, **__):
        if bar_state.volume is nan:
            return

        if bar_state.close is nan or bar_state.open is nan:
            color = None
        elif bar_state.close > bar_state.open:
            color = self.opts.up_color
        else:
            color = self.opts.down_color

        update_data = HistogramData(bar_state.time, bar_state.volume, color=color)
        self.series.update_data(update_data)
        self._data = update_dataframe(self._data, update_data, self.series_map)
