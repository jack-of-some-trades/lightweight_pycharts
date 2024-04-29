""" Utility functions and objects that are used across the library """

from dataclasses import is_dataclass, asdict
from random import choices
from string import ascii_letters
from typing import Any
from json import JSONEncoder, dumps

from .orm.types import Color


class ORM_JSONEncoder(JSONEncoder):
    "Enhanced JSON Encoder that encodes DataClasses as dicts, Color as JS rgba(), bools as JS bools"

    def default(self, o):
        if is_dataclass(o):
            return asdict(o)
        if isinstance(o, Color):
            return repr(o)
        if isinstance(o, bool):
            return "true" if o else "false"
        return super().default(o)


def dump(obj: Any) -> str:
    "Enchanced JSON.dumps() to serialize all ORM Objects"
    return str(dumps(obj, cls=ORM_JSONEncoder))


def load(obj: str) -> Any:
    "Enchanced JSON.loads() to load ORM Objects"
    raise NotImplementedError


class ID_List(list[str]):
    """
    A List of ID Strings with a generator function.
    """

    def __init__(self, prefix: str):
        self.prefix = prefix + "_"
        super().__init__()

    def generate(self) -> str:
        "Generate a new ID and add it to the list"
        _id = self.prefix + "".join(choices(ascii_letters, k=4))

        if _id not in self:
            self.append(_id)
            return _id
        else:  # In case of a collision.
            return self.generate()

    def affix(self, _id: str) -> str:
        "Add a specifc ID string to the List"
        _id_prefixed = self.prefix + _id
        if _id_prefixed not in self:
            self.append(_id_prefixed)
            return _id_prefixed
        else:  # In case of a collision.
            return self.generate()
