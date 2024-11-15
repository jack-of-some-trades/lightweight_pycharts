""" Basic Types and TypeAliases """

from math import floor
from datetime import datetime
from dataclasses import dataclass
from typing import TypeAlias, Literal, Optional, Self

from pandas import Timestamp

# pylint: disable=line-too-long, invalid-name

PERIOD_CODES = ["s", "m", "h", "D", "W", "M", "Y", "E"]
Period: TypeAlias = Literal["s", "m", "h", "D", "W", "M", "Y", "E"]

UTCTimestamp: TypeAlias = int
Time: TypeAlias = UTCTimestamp | str | Timestamp | datetime
# Time: TypeAlias = Union[UTCTimestamp, BusinessDay, str]
# BusinessDay is an object in the lightweight charts library. It is not included since
# it only supports timeframes of 'Day' or longer. Technically, this is true for string
# as well, but this python library converts all times to a UTCtimestamp


@dataclass(slots=True)
class Symbol:
    "Dataclass interface used to send Symbol Search information to the Symbol Search Menu"
    ticker: str
    name: Optional[str] = None
    broker: Optional[str] = None
    sec_type: Optional[str] = None
    exchange: Optional[str] = None


class j_func:
    """
    String Representation of a Javascript Function.

    This object allows raw python strings to be given to the JavaScript Script Executor
    and executed as anonymous functions. This is intended to be used to provide custom
    formatters for the various lightweight chart options that take them.
    """

    def __init__(self, func: str):
        # Replace '\n' with ';' to ensure command separation,
        # Replace all internal quotes with ` to avoid json.dumps adding escape characters,
        # Split and join w/ " " to limit excess whitespace
        # Add "~" as markers to target trim outer quotes after dumping the string.
        self.func = func.replace("\n", ";").replace('"', "`").replace("'", "`")
        self.func = "~" + " ".join(self.func.split()) + "~"

    @staticmethod
    def format(str_in: str) -> str:
        "Deletes the Outer Quotes, Call after String has been JSON Dumped."
        return str_in.replace('"~', "").replace('~"', "")


def NumtoHex(num: int):
    "Format a [0,255] number into Hex"
    return hex(num).lstrip("0x").zfill(2)


# Note, this object cannot be a dataclass otherwise json.dumps()
# will dump this out as a dict. For functionality we need to call repr() on dumps()
class Color:
    """
    RBGa Color Class. To instatiate use Color.from_rgb() or Color.from_hex()
    Original Object: https://www.w3schools.com/cssref/func_rgba.php
    """

    def __init__(self, r: int, g: int, b: int, a: float):
        self._r = r
        self._b = b
        self._g = g
        self._a = a

    def __eq__(self, other: Self):
        return (
            (self._r == other.r)
            and (self._g == other.g)
            and (self._b == other.b)
            and (self._a == other.a)
        )

    def __neq__(self, other: Self):
        return (
            (self._r != other.r)
            or (self._g != other.g)
            or (self._b != other.b)
            or (self._a != other.a)
        )

    @classmethod
    def from_color(
        cls,
        ref: Self,
        r: int | None = None,
        g: int | None = None,
        b: int | None = None,
        a: float | None = None,
    ):
        "Instantiate a new Color Instance, from a Given Color Instance, updating the given RGB Values"
        new_inst = cls(0, 0, 0, 0)
        # Pass variables after construction to Value Check them w/ setter funcs
        new_inst.r = r if r is not None else ref.r
        new_inst.g = g if g is not None else ref.g
        new_inst.b = b if b is not None else ref.b
        new_inst.a = a if a is not None else ref.a
        return new_inst

    @classmethod
    def from_rgb(cls, r: int, g: int, b: int, a: float = 1):
        "Instantiate a new Color Instance from RGB Values"
        new_inst = cls(0, 0, 0, 0)
        # Pass variables after construction to Value Check them w/ setter funcs
        new_inst.r = r
        new_inst.g = g
        new_inst.b = b
        new_inst.a = a
        return new_inst

    @classmethod
    def from_hex(cls, hex_value: str):
        "Instantiate a new Color Instance from a hex string of 3, 4, 6, or 8 chars."
        hex_value = hex_value.lstrip("#")
        if len(hex_value) == 6 or len(hex_value) == 8:
            # Hex String of 6 or 8 Chars
            r, g, b = [int(hex_value[i : i + 2], 16) for i in (0, 2, 4)]
            alpha = 1 if (len(hex_value) != 8) else int(hex_value[6:8], 16) / 255

        elif len(hex_value) == 3 or len(hex_value) == 4:
            # Hex String of 3 or 4 Chars
            r, g, b = [
                ((int(char, 16) << 4) + (int(char, 16))) for char in hex_value[0:3]
            ]
            alpha = (
                1
                if (len(hex_value) != 4)
                else ((int(hex_value[3], 16) << 4) + int(hex_value[3], 16)) / 255
            )
        else:
            raise ValueError(f"Hex Color of length {len(hex_value)} is not valid.")
        return cls(r, g, b, alpha)

    @classmethod
    def from_gradient(
        cls, value: float, bot: float, top: float, bot_color: Self, top_color: Self
    ) -> Self:
        "Returns a color based on the relative position of value in the [bot, top] Range."
        if value <= bot:
            return bot_color
        if value >= top:
            return top_color
        ratio = (value - bot) / (top - bot)

        r = floor((top_color._r - bot_color._r) * ratio + bot_color._r)
        g = floor((top_color._g - bot_color._g) * ratio + bot_color._g)
        b = floor((top_color._b - bot_color._b) * ratio + bot_color._b)
        a = floor((top_color._a - bot_color._a) * ratio + bot_color._a)

        return cls(r, g, b, a)

    # region // -------------- Color Getters & Setters -------------- //
    @property
    def r(self):
        "Red: int [0, 255]"
        return self._r

    @r.setter
    def r(self, r: int):
        if r > 255:
            raise ValueError(f"Arg: {r = } is not valid. Max Value is 255.")
        if r < 0:
            raise ValueError(f"Arg: {r = } is not valid. Min Value is 0.")
        self._r = r

    @property
    def g(self):
        "Green: int [0, 255]"
        return self._g

    @g.setter
    def g(self, g: int):
        if g > 255:
            raise ValueError(f"Arg: {g = } is not valid. Max Value is 255.")
        if g < 0:
            raise ValueError(f"Arg: {g = } is not valid. Min Value is 0.")
        self._g = g

    @property
    def b(self):
        "Blue: int [0, 255]"
        return self._b

    @b.setter
    def b(self, b: int):
        if b > 255:
            raise ValueError(f"Arg: {b = } is not valid. Max Value is 255.")
        if b < 0:
            raise ValueError(f"Arg: {b = } is not valid. Min Value is 0.")
        self._b = b

    @property
    def a(self):
        "alpha: float [0, 1]"
        return self._a

    @a.setter
    def a(self, a: float):
        if a > 1:
            raise ValueError(f"Arg: {a = } is not valid. Max Value is 1.")
        if a < 0:
            raise ValueError(f"Arg: {a = } is not valid. Min Value is 0.")
        self._a = a

    # endregion

    def __repr__(self):
        "Javascript RGBA Representation of Class Params."
        return f"rgba({self._r},{self._g},{self._b},{self._a})"

    def to_hex(self):
        "Javascript RGBA Representation of Class Params."
        return f"#{NumtoHex(self._r)}{NumtoHex(self._g)}{NumtoHex(self._b)}{NumtoHex(round(self._a*255))}"


# String Should be a #(Hex) Color.
JS_Color: TypeAlias = str | Color


@dataclass(slots=True)
class TF:
    "Dataclass Representation of a Timeframe"
    _mult: int
    _period: Period

    def __init__(self, mult: int, period: Period):
        self._validate(mult, period)
        self._period = period
        self._mult = mult

    def __str__(self) -> str:
        return self.toString

    @classmethod
    def fromString(cls, tf_str: str) -> Self:
        "Create a TF Object from a formatted string"
        period = tf_str[-1]
        mult = int(tf_str[0:-1])
        if period in PERIOD_CODES:
            return TF(mult, period)  # type: ignore

        raise TypeError(f"'{period}' not a valid Timeframe Period Code.")

    # region ---- Timeframe Getters and Setters ----

    @property
    def mult(self) -> int:
        "Timeframe Multiplier"
        return self._mult

    @mult.setter
    def amount(self, value: int):
        self._validate(value, self._period)
        self._mult = value

    @property
    def period(self) -> Period:
        "Timeframe Period"
        return self._period

    @period.setter
    def period(self, value: Period):
        self._validate(self._mult, value)
        self._period = value

    @property
    def toString(self) -> str:
        "String representation fmt:{multiplier}{period}"
        return f"{self._mult}{self._period}"

    @staticmethod
    def _validate(amount: int, unit: Period):
        if amount <= 0:
            raise ValueError(
                f"Timeframe Period Multiplier,{amount}, must be a positive value."
            )
        if amount != round(amount):
            raise ValueError(
                f"Timeframe Period Multiplier,{amount}, must be an integer value."
            )

        match unit:
            case "s" | "m":
                if amount > 59:
                    raise ValueError("Seconds & Minutes multiplier must be in [1, 59].")
            case "h":
                if amount > 23:
                    raise ValueError("Hour multiplier must be in [1, 23].")
            case "D":
                if amount > 6:
                    raise ValueError("Hour multiplier must be in [1, 6].")
            case "W":
                if amount > 3:
                    raise ValueError("Hour multiplier must be in [1, 3].")
            case "M":
                if amount not in (1, 2, 3, 6):
                    raise ValueError("Month units must be (1, 2, 3, 6)")
            case "Y" | "E":
                return
            case _:
                raise ValueError(f"'{unit}' Not a valid timeframe period.")

    @property
    def unix_len(self) -> int:
        """
        The length, in seconds, that the timeframe represents.

        1 Month = 30.44 Days, 1 Year = 365.24 Days (Unix Standard Conversions)
        """
        match self._period:
            case "s":
                return self._mult
            case "m":
                return self._mult * 60
            case "h":
                return self._mult * 3600
            case "D":
                return self._mult * 86400
            case "W":
                return self._mult * 604800
            case "M":
                return self._mult * 2629743
            case "Y":
                return self._mult * 31556926
            case _:
                return -1

    # endregion
