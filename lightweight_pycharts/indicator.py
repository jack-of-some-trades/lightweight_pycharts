""" Classes and functions that handle implementation of chart indicators """

from logging import getLogger
from dataclasses import dataclass
from abc import ABCMeta, abstractmethod
from inspect import Signature, signature, _empty
from typing import Literal, Optional, Any, Callable

import pandas as pd
from numpy import nan

from lightweight_pycharts.orm.options import PriceScaleMargins, PriceScaleOptions
from lightweight_pycharts.orm.types import Color, PriceFormat

from . import window as win
from . import series_common as sc
from .util import ID_List, ID_Dict
from .js_cmd import JS_CMD
from .orm import Symbol, TF
from .orm.series import (
    HistogramData,
    HistogramStyleOptions,
    LineStyleOptions,
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


class Null:
    "Null Object Class"


def output_property[T: Callable](func: T) -> T:
    "Property Decorator used to expose Indicator Parameters to other Indicators"
    func.__expose_param__ = True
    return func


@dataclass(slots=True)
class BarState:
    """
    Dataclass object that holds various information about the current bar.
    """

    index: int = -1
    time: pd.Timestamp = pd.Timestamp(-1)
    timestamp: pd.Timestamp = pd.Timestamp(-1)
    time_close: pd.Timestamp = pd.Timestamp(-1)
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


Notification = Literal["set", "update", "clear"]


class Watcher:
    """
    An Indicator instance object that is handed to another indicator it wishes to observe.

    Holds references to set, clear, and update methods.
    Holds a bar_state, and a set of arguments
    """

    def __init__(self, parent: "Indicator"):
        self._set_data = parent.set_data
        self._clear_data = parent.clear_data
        self._update_data = parent.update_data
        self._notify_observers = parent.notify_observers

        self._set = False

        self.observables: dict[str, Callable] = {}
        self.set_args: dict[str, Callable] = {}
        self.set_notifiers: dict[Indicator, bool] = {}
        self.update_args: dict[str, Callable] = {}
        self.update_notifiers: dict[Indicator, bool] = {}

    def notify(self, notifier: Optional["Indicator"], notification: Notification):
        "Notify the Watcher that an update occured in the given Indicator"
        if notification == "set":
            if notifier is not None and notifier not in self.set_notifiers:
                return  # This Notifier not involved in setting data (Probably just updates data)

            if notifier is not None:
                self.set_notifiers[notifier] = True
            if all(self.set_args.values()):
                # Ready, Fire Set Calc then reset set_Notifier Readiness State
                # Will Fire on Notifier = None, intentional so Watcher self-fires on init
                self._set_data(
                    **dict([(name, func()) for name, func in self.set_args.items()])
                )
                self.set_notifiers = dict.fromkeys(self.set_notifiers.keys(), False)
                self._set = True
                self._notify_observers("set")
            return

        if notification == "update" and notifier is not None:
            if notifier not in self.update_notifiers:
                return  # This Notifier not involved in updating data (Probably just sets data)

            if not self._set:
                raise Warning(
                    f"'{notifier.name}' tried to update {self} before Watcher got 'Set' command"
                )

            self.update_notifiers[notifier] = True
            if all(self.update_args.values()):
                # Ready, Fire Update then reset Update_Notifier Readiness State
                self._update_data(
                    **dict([(name, func()) for name, func in self.update_args.items()])
                )
                self.update_notifiers = dict.fromkeys(
                    self.update_notifiers.keys(), False
                )
                self._notify_observers("update")
            return

        if notification == "clear":
            if (
                notifier is not None
                and notifier not in self.update_notifiers
                and notifier not in self.set_notifiers
            ):
                raise Warning(
                    f"'{notifier.name}' tried to clear {self}, but Watcher doesn't care."
                )

            self._clear_data()
            self._set = False
            return


class IndicatorMeta(ABCMeta):
    "Metaclass that creates class parameters based on an Indicator's implementation"

    def __new__(mcs, name, bases, namespace, /, **kwargs):
        # Allow ABCMeta to create the first implementation of the class
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)

        if name == "Indicator":
            setattr(cls, "__registered_indicators__", {})
            return cls

        # Place the Signatures of these functions into Class Attributes. These Attributes
        # will be used by the Watcher and others for indicator on indicator integration.
        set_sig = signature(getattr(cls, "set_data", Null))
        if len(set_sig.parameters) <= 1:
            raise TypeError("{name}.set_data() must take at least 1 argument")
        set_args = mcs.parse_input_args(set_sig)
        setattr(cls, "__set_args__", set_args)

        update_sig = signature(getattr(cls, "update_data", Null))
        if len(update_sig.parameters) <= 1:
            raise TypeError("{name}.update_data() must take at least 1 argument")
        update_args = mcs.parse_input_args(update_sig)
        setattr(cls, "__update_args__", update_args)

        for param in set(set_args.keys()).intersection(update_args.keys()):
            if set_args[param][0] != update_args[param][0]:
                raise TypeError(
                    f"{cls} reused input argument name '{param}' but changed the argument type."
                )
        setattr(cls, "__input_args__", dict(set_args, **update_args))

        # Determine Exposed Parameters
        setattr(cls, "__exposed_outputs__", mcs.parse_output_type(name, namespace))

        # Dunder Defined by Indicator Base Class.
        cls.__registered_indicators__[name] = cls  # type: ignore

        return cls

    @staticmethod
    def parse_input_args(sig: Signature) -> dict[str, tuple[type, Any]]:
        "Parse Function Signatures into a dict of param names, type definitions and default values"
        args = {}
        for pos, (name, param) in enumerate(sig.parameters.items()):

            if (
                param.kind == param.VAR_POSITIONAL
                or param.kind == param.VAR_KEYWORD
                or pos == 0
            ):
                continue  # Skip the Self Parameter & Variadics

            if param.kind == param.POSITIONAL_ONLY:
                raise TypeError(
                    "Indicator Abstract Methods Cannot Use Position Only Args."
                )  # Look, i'm not gonna code the Watcher to dance around that shit.

            param_default = (
                Null() if isinstance(param.default, _empty) else param.default
            )
            param_type = (
                object if isinstance(param.annotation, _empty) else param.annotation
            )

            args[name] = (param_type, param_default)

        return args

    @staticmethod
    def parse_output_type(cls_name, namespace) -> dict[str, type]:
        "Parse the return signatures of output properties"
        outputs = {}
        for output_name, output_func in namespace.items():
            if not getattr(output_func, "__expose_param__", False):
                continue
            if not callable(output_func):
                logger.warning(
                    "%s.%s must be a callable function", cls_name, output_name
                )
                continue
            output_func_sig = signature(output_func)
            if len(output_func_sig.parameters) > 1:
                logger.warning("%s.%s cannot take args.", cls_name, output_name)
                continue

            rtn_type = output_func_sig.return_annotation

            outputs[output_name] = object if isinstance(rtn_type, _empty) else rtn_type
        return outputs


class Indicator(metaclass=IndicatorMeta):
    """
    Indicator Abstract Base Class.

    Indicators take a frame as an argument. Using this reference they append themselves to the
    Indicators Dictionary. While a child object appending itself to their parent's dict
    obfuscates the how that dict is populated, it is by far the simplest solution.
    """

    # The first alternative would be requesting a _js_id from the Frame, letting the user create the
    # object. The problem is that there is no indication that the user *must* get an ID from the
    # frame. They could have simply supplied their own string and run into bugs later.

    # The second alternative would be to have the user supply the Indicator subclass and all the
    # required arguments only for the Frame to then construct and return the indicator. This isn't
    # ideal since you lose all type checking during object creation, and the owner of the object
    # isn't the one actually creating the object.

    # Dunder Cls Params set by MetaClass
    __set_args__: dict[str, tuple[type, Any]]
    __input_args__: dict[str, tuple[type, Any]]
    __update_args__: dict[str, tuple[type, Any]]
    __exposed_outputs__: dict[str, type]
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

        self._series = ID_Dict[sc.SeriesCommon]("s")
        self._primitives = ID_List("p")
        # TODO: Make into an ID_Dict once Primitive Baseclass is made.

        # Setup Indicator Observer Structures
        self._watcher = Watcher(self)
        self._observers: list[Watcher] = []

        # Name is used as an identifier when linking args from the screen.
        self.name = self.__class__.__name__
        self.events = self.parent_frame._window.events

        self._fwd_queue.put((JS_CMD.ADD_INDICATOR, *self._ids, self.__class__.__name__))

    @property
    def js_id(self) -> str:
        "Immutable Copy of the Object's Javascript_ID"
        return self._js_id

    def __del__(self):
        logger.debug("Deleteing %s: %s", self.__class__.__name__, self._js_id)

    def delete(self):
        "Remove the indicator and all of it's instance objects"
        for series in self._series.copy().values():
            series.delete()
        # for primitive in self._primitives_.copy().values():
        #     primitive.delete()
        self.unlink_all_args()

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
        "Clear Data from the indicator, resetting it the post __init__ state"
        for _, series in self._series.items():
            series.clear_data()
        # for _, primative in self._primitives_.items():
        #     primative.delete()?
        # Notify Observers
        self.notify_observers("clear")

    def apply_options(self):
        "Applies the given set of indicator options"

    def hoist(self, *_, **__):
        "Hoist Data From another indicator into this one."

    def notify_observers(self, notif_type: Notification):
        "Loop through observers notifying them there is an update to be made"
        for watcher in self._observers:
            watcher.notify(self, notif_type)

    def link_args(self, args: dict[str, Callable]):
        """
        Subscribe this indicator's inputs to the provided indicator output arguments.

        :param: args: a dictionary providing links for all Set and Update args.
        """
        if len(self._watcher.observables) > 0:
            self.unlink_all_args()  # Clear all present args before setting

        cls = self.__class__

        # Auto-Link Bar_State if the Indicator requests it.
        if "bar_state" in cls.__input_args__ and "bar_state" not in args:
            args["bar_state"] = self.parent_frame.main_series.bar_state

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
                bound_cls_inst._observers.append(self._watcher)

            if bound_cls_inst in self._observers:
                raise Warning(
                    f"Circular Indicator dependency between {bound_cls_inst.name} & {self.name}"
                )

            # Create Dicts of Param_Name:Callable & Host_Indicator: Bool
            if name in cls.__set_args__:
                self._watcher.set_args[name] = args[name]
                self._watcher.set_notifiers[bound_cls_inst] = (
                    bound_cls_inst._watcher._set
                )
            if name in cls.__update_args__:
                self._watcher.update_args[name] = args[name]
                self._watcher.update_notifiers[bound_cls_inst] = False

        # Preform initial calc If all the indicators observed are ready.
        self._watcher.notify(None, "set")

    def unlink_all_args(self):
        "Unsubscribe from all of the Indicator's linked input args."
        # Remove self from all of the '_observers' lists that it's appended to
        bound_arg_funcs = self._watcher.observables.values()
        for bound_func_cls in set([func.__self__ for func in bound_arg_funcs]):
            bound_func_cls._observers.remove(self._watcher)

        # Clear Watcher
        self._watcher.set_args = {}
        self._watcher.set_notifiers = {}
        self._watcher.update_args = {}
        self._watcher.update_notifiers = {}
        self._watcher.observables = {}


# pylint: enable=protected-access


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
            self.parent_frame.__set_whitespace__(self.whitespace_data.df)

        if self.__frame_primary_src__:
            # Only do this once everything else has completed and not Error'd.
            self.parent_frame.__set_displayed_timeframe__(self.main_data.timeframe)

        # Notify Observers
        self.notify_observers("set")

    def update_data(self, data_update: AnyBasicData, *_, accumulate=False, **__):
        """
        Updates the prexisting Frame's Primary Dataframe. The data point's time should
        be equal to or greater than the last data point otherwise this will have no effect.

        Can Accept WhitespaceData, SingleValueData, and OhlcData.
        Function will auto detect if this is a tick or bar update.
        When Accumulate is set to True, tick updates will accumulate volume,
        otherwise the last volume will be overwritten.
        """
        # Ignoring Operator issue, it's a false alarm since WhitespaceData.__post_init__()
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
                data_update.time -= time_delta % self.main_data.timedelta

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
                    self.parent_frame.__set_whitespace__(self.whitespace_data.df)
                else:
                    # Lengthen Whitespace Data to keep 500bar Buffer
                    self.parent_frame.__update_whitespace__(
                        self.whitespace_data.extend()
                    )

        self._update_bar_state()
        if self._bar_state is not None:
            self._bar_state.timestamp = pd.Timestamp(data_update.time)
        self.main_series.update_data(display_data)

        # Notify Observers
        self.notify_observers("update")

    def clear_data(
        self, timeframe: Optional[TF] = None, symbol: Optional[Symbol] = None, **_
    ):
        """
        Clears the data in memory and on the screen and, if not none,
        updates the desired timeframe and symbol for the Frame
        """
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

    # region ---------------- Output Properties ----------------

    @output_property
    def bar_state(self) -> BarState:
        "BarState Object that represents the most recent data update"
        if self._bar_state is not None:
            return self._bar_state
        return BarState()

    @output_property
    def blank_series_df(self) -> Series_DF:
        "A new Series_DF object that shares the source Series' parameters & time index."
        if self.main_data is not None:
            new_series_df = Series_DF(self.main_data)
            new_series_df.df.drop(columns=new_series_df.df.columns, inplace=True)
            return new_series_df
        return Series_DF(pd.DataFrame({}))

    @output_property
    def dataframe(self) -> pd.DataFrame:
        "A Reference to the full series dataframe"
        if self.main_data is not None:
            return self.main_data.df
        return pd.DataFrame({})

    @output_property
    def close(self) -> pd.Series:
        "A Series' Bar closing value"
        if self.main_data is not None:
            return self.main_data.df["close"]
        return pd.Series({})

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
        logger.info(self._data)
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


@dataclass
class SMAIndicatorOptions:
    "Options for a volume series"
    period: int = 9
    line_options = LineStyleOptions()


class SMA(Indicator):
    "Simple Moving Average Indicator"

    def __init__(
        self,
        parent: win.Frame | Indicator,
        period: int = 9,
        src: Optional[Callable] = None,
    ):
        super().__init__(parent)

        if src is None:
            src = self.parent_frame.main_series.close

        self.period = period
        self._data = pd.Series()
        self.line_series = sc.LineSeries(self)

        self.link_args({"data": src})

    def set_data(self, data: pd.Series, *_, **__):
        self._data = data.rolling(window=self.period).mean()
        self.line_series.set_data(self._data)

    def update_data(self, bar_state: BarState, data: pd.Series, *_, **__):
        self._data[bar_state.time] = data.tail(self.period).mean()
        self.line_series.update_data(
            SingleValueData(bar_state.time, self._data.iloc[-1])
        )

    @output_property
    def average(self) -> pd.Series:
        "The resulting SMA"
        return self._data
