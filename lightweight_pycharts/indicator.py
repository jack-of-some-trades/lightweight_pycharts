""" Classes and functions that handle implementation of chart indicators """

from logging import getLogger
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

from lightweight_pycharts.indicator_meta import IndicatorMeta, OptionsMeta
from lightweight_pycharts.orm.types import Color

from . import window as win
from . import primative as pr
from . import series_common as sc
from .util import ID_Dict, is_dunder
from .js_cmd import JS_CMD

logger = getLogger("lightweight-pycharts")

SeriesData: TypeAlias = Callable[[], pd.Series]
DataframeData: TypeAlias = Callable[[], pd.DataFrame]


# pylint: disable=protected-access
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

        # set & updated ensure all indicators only set/update once they are ready to. Set, being
        # more of a latch, is likely bug free. However, doing this for updated **may** lead to an
        # edge case bug where an indicator may never (or only intermittently) update if it depends
        # on two or more Series Indicators that receive data updates at different rates.
        self.set = False
        self.updated = False

        self.observables: dict[str, Callable] = {}
        self.set_args: dict[str, Callable] = {}
        self.set_notifiers: list[Indicator] = []
        self.update_args: dict[str, Callable] = {}
        self.update_notifiers: list[Indicator] = []

    def reset_updated_state(self):
        "Reset the Updated state and tell all observers to reset as well, an update is coming"
        self.updated = False
        for ind in self.update_notifiers:
            ind._watcher.reset_updated_state()

    def notify_set(self, notifier: Optional["Indicator"] = None):
        "Notify the Watcher that an update occured in the given Indicator"
        if notifier is not None and notifier not in self.set_notifiers:
            return  # This Notifier not involved in setting data (Probably just updates data)

        if all([ind._watcher.set for ind in self.set_notifiers]):
            # All indicator srcs Ready, Preform historical set_data calc.
            # Will Fire on Notifier = None, intentional so Watcher can self-fire on init
            self._set_data(
                **dict([(name, func()) for name, func in self.set_args.items()])
            )
            self.set = True
            self._notify_observers_set()

    def notify_update(self, notifier: "Indicator"):
        "Notify the Watcher that an update occured in the given Indicator"
        # Following If statements & logging is really just edge case monitoring
        if notifier not in self.update_notifiers:
            logger.warning("Watcher tried to Update, but is not dependent on updater.")
            return
        if not self.set:
            logger.warning("Watcher tried to Update, but is not set yet")
            return

        if all([ind._watcher.updated for ind in self.set_notifiers]):
            # Ready to Update, Fire Update then set updated Readiness State
            self._update_data(
                **dict([(name, func()) for name, func in self.update_args.items()])
            )
            self.updated = True
            self._notify_observers_update()

    def notify_clear(self, notifier: Optional["Indicator"] = None):
        "Notify the Watcher that the source it calculated from is no longer valid and should clear"
        if notifier is not None and notifier not in self.set_notifiers:
            logger.warning(
                "'%s' tried to clear '%s', but Watcher doesn't care.",
                notifier.cls_name,
                self,
            )  # Really just an edge case that would be interesting to observe happen.

        self._clear_data()
        self.set = False
        self.updated = False
        self._notify_observers_clear()


# region --------------------------- Indicator Classes --------------------------- #


class Options(metaclass=OptionsMeta):
    "Inheritable OptionsMeta Class"
    __arg_types__: ClassVar[dict] = {}
    __src_types__: ClassVar[dict] = {}
    __menu_struct__: ClassVar[dict] = {}


class IndicatorOptions(Protocol):
    "Protocol Class to type check for an Indicator Options Dataclass Instance"
    __arg_types__: ClassVar[dict]
    __src_types__: ClassVar[dict]
    __menu_struct__: ClassVar[dict]
    __dataclass_fields__: ClassVar[Dict[str, Any]]


class IndicatorOptionsCls(Protocol):
    "Protocol Class to type check for an Indicator Options Dataclass"
    __arg_types__: dict
    __src_types__: dict
    __menu_struct__: dict
    __dataclass_fields__: Dict[str, Any]

    def __call__(self, *_, **__) -> IndicatorOptions: ...


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
    __options__: Optional[IndicatorOptionsCls] = None
    __set_args__: dict[str, tuple[type, Any]]
    __input_args__: dict[str, tuple[type, Any]]
    __update_args__: dict[str, tuple[type, Any]]
    __default_output__: Optional[SeriesData]
    __exposed_outputs__: dict[str, str]

    # Dunder Cls Param referenced by all Sub-Classes of Indicator
    __registered_indicators__: dict[str, "Indicator"]

    def __init__(
        self,
        parent: "win.Frame | Indicator",
        *,
        display_name: str = "",
        js_id: Optional[str] = None,
        display_pane_id: Optional[str] = None,
    ) -> None:
        if isinstance(parent, win.Frame):
            self.parent_frame = parent
        else:
            self.parent_frame = parent.parent_frame

        if display_pane_id is None:
            display_pane_id = self.parent_frame.main_pane._js_id
        self.display_pane_id = display_pane_id

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

        # Tuple of Ids to make addressing through Queue easier: order = (frame, indicator)
        self._ids = self.parent_frame.js_id, self._js_id
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

        self.events = self.parent_frame._window.events
        self.cls_name = self.__class__.__name__
        self.display_name = display_name

        self._fwd_queue.put(
            (
                JS_CMD.CREATE_INDICATOR,
                *self._ids,
                self.display_pane_id,
                self.__exposed_outputs__,
                self.cls_name,
                display_name,
            )
        )

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

    def __parse_options_obj__(self, obj: IndicatorOptions) -> dict:
        "Parse an IndicatorOptions instance into a picklable dict"
        if self.__options__ is None:
            logger.error("Cannot parse obj, %s needs an options Class", self.cls_name)
            return {}

        _opts = {}
        for k, arg_type in self.__options__.__arg_types__.items():
            v = getattr(obj, k, None)
            if arg_type == "source":
                # Replace all source args with Tuple[str] representations of the functions
                # boundCls.Func_name() -> out_args === "[boundCls.id]:[Func_name]"
                _opts[k] = getattr(getattr(v, "__self__", None), "_js_id", "None")
                _opts[k] += ":" + getattr(v, "__name__", "None")
            elif arg_type == "enum":
                # Normally we dump the value, in this case we dump the name since
                # it's only displayed in JS, not used.
                _opts[k] = v.name if v is not None else None
            else:
                # Remaining Objs are picklable and can be json dumped
                _opts[k] = v

        return _opts

    def __parse_options_dict__(self, args: dict) -> Optional[IndicatorOptions]:
        "Parse a dictionary into an instance of self.__options__"
        if self.__options__ is None:
            logger.error("Cannot load obj, %s needs an options Class", self.cls_name)
            return

        # Change all of the encoded dictonary values into their python objects
        for k, v in args.items():
            arg_type = self.__options__.__arg_types__[k]
            if arg_type == "source":
                ind_id, func_name = v.split(":")
                try:
                    ind = self.parent_frame.indicators[ind_id]
                    args[k] = getattr(ind, func_name)
                except (IndexError, AttributeError):
                    logger.critical("Source link %s is invalid.", v)
                    args[k] = lambda: None
                    # Critical Error since this will most likely cause an
                    # indicator's Set/Update_Data to throw an exception
            elif arg_type == "timestamp":
                args[k] = pd.Timestamp(v)
            elif arg_type == "enum":
                args[k] = self.__options__.__src_types__[k]._member_map_[v]
            elif arg_type == "color":
                args[k] = Color.from_hex(v)

        # pylint: disable=not-callable
        logger.info(self.__options__(**args))  # ...but I defined it as callable?
        # pylint: enable=not-callable

        self.recalculate()

    def delete(self):
        "Remove the indicator and all of it's instance objects"
        self.unlink_all_args()
        for series in self._series.copy().values():
            series.delete()
        for primative in self._primitives.copy().values():
            primative.delete()
        self.clear_data()  # Clear data after deleting sub-objects to limit redundant actions
        self.parent_frame.indicators.pop(self._js_id)
        self._fwd_queue.put((JS_CMD.DELETE_INDICATOR, *self._ids))

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
            raise ValueError(f"{self.cls_name} Missing Arg Links for: {missing_args}")

        # In the loops below the '_' param is the default_arg of the function.
        # It's not used because quite frankly i'm not sure how or why you'd implement that...

        # Type check the inputs, Prepare Watcher, and look for circular dependencies
        for name, (arg_type, _) in cls.__input_args__.items():
            rtn_type = signature(args[name]).return_annotation
            rtn_type = object if rtn_type is _empty else rtn_type

            if not issubclass(arg_type, rtn_type):
                raise TypeError(
                    f"{self.cls_name} Given {rtn_type} for parameter {name}. Expected {arg_type}"
                )

            # Observables is the Union of set_args & update_args. Useful to have it's own reference
            self._watcher.observables[name] = args[name]

            # Give this Indicator's watcher to the function's bound indicator
            bound_cls_inst = args[name].__self__
            if self._watcher not in bound_cls_inst._observers:
                # Append a weakref of this indicator's observer
                bound_cls_inst._observers.append(self._watcher)

            if bound_cls_inst in self._observers:
                raise Warning(
                    f"Circular Indicator dependency between {bound_cls_inst.name} & {self.cls_name}"
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

    def init_menu(self, opts: IndicatorOptions):
        "Initilize Options Menu with the given Options. Must be called to use UI Options Menu"
        if self.__options__ is None:
            logger.error("Cannot set Menu, %s needs an options Class", self.cls_name)
            return

        self._fwd_queue.put(
            (
                JS_CMD.SET_INDICATOR_MENU,
                *self._ids,
                self.__options__.__menu_struct__,
                self.__parse_options_obj__(opts),
            )
        )

    def set_label(self, label: str):
        "Set the label text for this indicator in the pane's Legend. Raw HTML Accepted"
        self._fwd_queue.put((JS_CMD.SET_LEGEND_LABEL, *self._ids, label))

    def get_primitives_of_type[T: pr.Primitive](self, _type: type[T]) -> dict[str, T]:
        "Returns a Dictionary of Primitives owned by this indicator of the Given Type"
        if _type == pr.Primitive:
            return self._primitives.copy()  # type: ignore (ID_Dict is still a dict.)
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


IndParentType: TypeAlias = win.Frame | Indicator
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
        # Know when to break the rules >:D
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
