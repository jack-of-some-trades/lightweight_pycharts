""" Meta Classes for Both the Indicator and IndicatorOptions Class """

from enum import Enum
from abc import ABCMeta
from logging import getLogger
from inspect import Signature, signature, _empty
from types import NoneType
from typing import (
    Optional,
    Any,
    Callable,
    Tuple,
    get_args,
    get_origin,
)

import pandas as pd

from .util import is_dunder

logger = getLogger("lightweight-pycharts")


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
        set_sig = signature(getattr(cls, "set_data", lambda: None))
        if len(set_sig.parameters) <= 1:
            raise TypeError(f"{name}.set_data() must take at least 1 argument")
        set_args = mcs.parse_input_args(set_sig)
        setattr(cls, "__set_args__", set_args)

        update_sig = signature(getattr(cls, "update_data", lambda: None))
        if len(update_sig.parameters) <= 1:
            raise TypeError(f"{name}.update_data() must take at least 1 argument")
        update_args = mcs.parse_input_args(update_sig)
        setattr(cls, "__update_args__", update_args)

        for _param in set(set_args.keys()).intersection(update_args.keys()):
            if set_args[_param][0] != update_args[_param][0]:
                raise TypeError(
                    f"{cls} reused input argument name '{_param}' but changed the argument type."
                )
        setattr(cls, "__input_args__", dict(set_args, **update_args))

        # Determine Exposed Parameters
        outputs, default_out = mcs.parse_output_type(name, namespace)
        setattr(cls, "__exposed_outputs__", outputs)
        setattr(cls, "__default_output__", default_out)

        # Dunder Defined by Indicator Base Class. Note: all dunders set via setattr() are subclass
        # specific and don't cross contaminate __registered_indicators__, however, is a class var
        # of Indicator so all subclasses are reading / writing to the same dict
        cls.__registered_indicators__[name] = cls  # type: ignore

        return cls

    @staticmethod
    def parse_input_args(sig: Signature) -> dict[str, tuple[type, Any]]:
        "Parse Function Signatures into a dict of param names, type definitions and default values"
        args = {}
        for pos, (name, _param) in enumerate(sig.parameters.items()):

            if (
                _param.kind == _param.VAR_POSITIONAL
                or _param.kind == _param.VAR_KEYWORD
                or pos == 0
            ):
                continue  # Skip the Self Parameter & Variadics

            if _param.kind == _param.POSITIONAL_ONLY:
                raise TypeError(
                    "Indicator Abstract Methods Cannot Use Position Only Args."
                )  # Look, i'm not gonna code the Watcher to dance around that shit.

            param_default = _param.default
            param_type = (
                object if isinstance(_param.annotation, _empty) else _param.annotation
            )

            args[name] = (param_type, param_default)

        return args

    @staticmethod
    def parse_output_type(
        cls_name, namespace
    ) -> Tuple[dict[str, type], Optional[Callable]]:
        "Parse the return signatures of output properties"
        outputs = {}
        __default_output__ = None
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

            if (
                getattr(output_func, "__default_param__", False)
                and rtn_type == pd.Series
            ):
                # Default output must be a single series for consistency
                # May change this to default_output_series & default_output_dataframe
                __default_output__ = output_func

        return outputs, __default_output__


class OptionsMeta(type):
    """
    Metaclass to parse the dataclass and create a __menu_struct__ and __src_args__ Dict.
    __src_args__ store the argument type for source functions to aide in the transfer of
    this information to the screen and back (Since functions aren't pickleable)

    Used in conjunction with param() this Meta class creates a __menu_struct__ dict that
    can define Groups, inlines, and tooltips for the UI Menu.
    """

    def __new__(mcs, name, bases, namespace, /, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        if name == "Options":
            return cls

        arg_params = namespace.get("__arg_params__")
        args = [key for key in namespace.keys() if not is_dunder(key)]

        # -------- Check that there are no extra dunder variables -------- #
        std_dunders = {
            "__doc__",
            "__annotations__",
            "__qualname__",
            "__module__",
            "__arg_params__",
        }
        if len(set(namespace.keys()).difference(set(args)).difference(std_dunders)) > 0:
            raise AttributeError("Indicator Options cannot use Dunder Variable Names")

        # -------- Check that every non-dunder has a default value -------- #
        __annotations__ = namespace.get("__annotations__")
        if __annotations__ is None:
            __annotations__ = {}

        if not set(args).issuperset(set(__annotations__)):
            raise AttributeError(
                f"Cannot init '{name}' All Parameters must have a default value."
            )
        if not set(args).issubset(set(__annotations__)):
            raise AttributeError(
                f"""
                Cannot init '{name}' Parameters must have a type annotation
                **Dataclass will not create an init input arg without one**
                An Ellipsis (...) can be used as an Any Type.
                """
            )

        # ------ Populate __menu_struct__ and __src_args__ ------ #
        __src_args__ = {}
        __menu_struct__ = {}
        # __menu_struct__ === {  Name: (type, *args*) } ** used to generate JS menu
        # Where type can be [bool, int, float, str, Timestamp, enum, source, group, inline]
        # if type is an inline or group then *args* is another Dict of { Name: (type, *args*) }
        # Groups can Nest Inlines, but not other groups, inlines cannot nest other inlines

        # __src_args__ = { arg_name : arg_type } ** used to denote arguments that are functions
        # Used to help make packaging the arguments for Queue transfer easier
        # Since you can't directly send the functions through the queue

        for i, arg_key in enumerate(args):
            arg_type, src_type = mcs._process_type(
                namespace[arg_key], __annotations__[arg_key]
            )

            if arg_type == "source":
                __src_args__[arg_key] = src_type

            # Place var in the global space if there was no param() call.
            if (alt_arg_name := f"@arg{i}") not in arg_params:
                arg_struct = mcs._parse_arg(
                    arg_key, namespace[arg_key], arg_type, src_type
                )
                __menu_struct__[arg_key] = (arg_type, arg_struct)
                continue

            # Param() call on this arg. Fetch the Param() Options
            arg_param = arg_params[alt_arg_name]
            # An argument with an options list is always a drop down menu
            if arg_param["options"] is not None and arg_type != "enum":
                arg_type = "select"

            arg_struct = mcs._parse_arg_param(
                arg_key, namespace[arg_key], arg_type, src_type, arg_param
            )

            # region  -- Place the argument at appropriate inline and group position --
            group = arg_param["group"]
            inline = arg_param["inline"]
            if group is not None:
                # Ensure Group has been made in the menu_struct
                if group not in __menu_struct__:
                    __menu_struct__[group] = ("group", {})

                if inline is None:
                    # Place arg into the Group
                    __menu_struct__[group][1][arg_key] = (arg_type, arg_struct)
                else:
                    # Ensure inline has been made in the group
                    if inline not in __menu_struct__[group][1]:
                        __menu_struct__[group][1][inline] = ("inline", {})

                    # Place arg into the Group and inline
                    __menu_struct__[group][1][inline][1][arg_key] = (
                        arg_type,
                        arg_struct,
                    )

            elif inline is not None:
                # Ensure inline has been made in the menu_struct
                if inline not in __menu_struct__:
                    __menu_struct__[inline] = ("inline", {})

                # Place arg into the inline
                __menu_struct__[inline][1][arg_key] = (arg_type, arg_struct)

            else:
                # Place arg directly into the menu_struct
                __menu_struct__[arg_key] = (arg_type, arg_struct)

            # endregion

        setattr(cls, "__args__", set(args))
        setattr(cls, "__src_args__", __src_args__)
        setattr(cls, "__menu_struct__", __menu_struct__)
        return cls

    @staticmethod
    def _parse_arg_param(
        arg_key: str,
        arg: Any,
        arg_type: str,
        src_arg: str,
        arg_params: Any,
    ) -> dict:
        "Create __menu_struct__ args from a parameter that has param() arguments"
        rtn_struct = {
            "default": arg,
            "tooltip": arg_params["tooltip"],
        }

        rtn_struct["title"] = (
            arg_key if arg_params["title"] is None else arg_params["title"]
        )

        if arg_type == "source":  # ------------------------------------------------
            rtn_struct["src_type"] = src_arg

        elif arg_type == "select":  # ----------------------------------------------
            # Ensure the default is in the options list
            if arg not in arg_params["options"]:
                arg_params["options"] = [arg, *arg_params["options"]]
            rtn_struct["options"] = arg_params["options"]

        elif arg_type == "int" or arg_type == "float":  # --------------------------
            if arg < arg_params["min"]:
                raise ValueError(
                    f"Indicator Option ({arg_key}) default value is less than minimum"
                )
            if arg > arg_params["max"]:
                raise ValueError(
                    f"Indicator Option ({arg_key}) default value is greater than maximum"
                )
            if arg_params["min"] > arg_params["max"]:
                raise ValueError(
                    f"Indicator Option ({arg_key}) Minimum Greater than Maximum"
                )
            if (arg_params["max"] - arg_params["min"]) < abs(arg_params["step"]):
                raise ValueError(f"Indicator Option ({arg_key}) Step too large")

            rtn_struct["min"] = arg_params["min"]
            rtn_struct["max"] = arg_params["max"]
            rtn_struct["step"] = arg_params["step"]

        elif arg_type == "enum":  # ------------------------------------------------
            # Remap all of the Enums to be their value
            rtn_struct["default"] = arg.value
            if arg_params["options"] is not None:
                # Ensure the default is in the options list
                if arg not in arg_params["options"]:
                    arg_params["options"] = [arg, *arg_params["options"]]

                rtn_struct["options"] = [e.value for e in arg_params["options"]]
                rtn_struct["label_map"] = dict(
                    [(e.value, e.name) for e in arg_params["options"]]
                )
            else:
                rtn_struct["options"] = [e.value for e in type(arg)]  # type: ignore
                rtn_struct["label_map"] = dict(
                    [(e.value, e.name) for e in type(arg)]  # type: ignore
                )

        # elif arg_type == "bool":
        # elif arg_type == "timestamp":

        return rtn_struct

    @staticmethod
    def _parse_arg(arg_key: str, arg: Any, arg_type: str, src_arg: str) -> dict:
        "Create __menu_struct__ args from a parameter that had no param() call"

        rtn_struct = {"title": arg_key, "default": arg}

        if arg_type == "source" and src_arg != "":
            rtn_struct["src_type"] = src_arg

        # If given an Enum, Auto Populate an Options list
        elif isinstance(arg, Enum):
            rtn_struct["default"] = arg.value
            rtn_struct["options"] = [e.value for e in type(arg)]
            rtn_struct["label_map"] = dict([(e.value, e.name) for e in type(arg)])

        return rtn_struct

    @staticmethod
    def _process_type(arg: Any, arg_type: type) -> Tuple[str, str]:
        if arg_type == Ellipsis or arg_type == Any:
            arg_type = type(arg)

        origin = get_origin(arg_type)
        if origin is list:
            raise TypeError("Indicator Option Type Cannot be a List")
        if origin is dict:
            raise TypeError("Indicator Option Type Cannot be a Dict")

        type_bases = set(get_args(arg_type))

        # Strip Optional / Union[None] Types from type _annotation_
        if is_optional := NoneType in type_bases:
            type_bases = type_bases.difference({NoneType})

        if len(type_bases) == 1:
            arg_type = (*type_bases,)[0]
        elif len(type_bases) > 1:
            raise TypeError("Indicator Option Type Cannot be a Union of Types")

        type_str = ""
        src_type = ""

        # Bit nasty of an if statement, but it standardizes the names.
        # Differentiating between classes and callables is annoying
        if arg_type == int or arg_type == float:
            type_str = "number"
        elif arg_type == str:
            type_str = "string"
        elif arg_type == bool:
            type_str = "bool"
        elif arg_type == pd.Timestamp:
            type_str = "timestamp"
        elif len(type_bases) == 0:
            if issubclass(arg_type, Enum):
                type_str = "enum"
            else:
                raise TypeError("Indicator Option Type Cannot be an Object or NoneType")
        elif len(type_bases) == 1:
            inputs, outputs = get_args(arg_type)
            if len(inputs) > 0:
                raise TypeError(
                    "Indicator Callables/Sources cannot require an input argument"
                )
            type_str = "source"
            src_type = str(outputs)
        else:
            raise TypeError(f"Unknown Indicator Option Type: {arg_type = }")

        if (is_optional or arg is None) and type_str != "source":
            raise TypeError(
                "Indicator Option Default Value/Type cannot be None/Optional unless it's a callable"
            )

        return type_str, src_type
