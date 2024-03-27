""" Utility functions and objects that are used across the library """

from asyncio import iscoroutinefunction, run
from random import choices
from string import ascii_letters
from typing import Optional, Callable


class ID_List(list):
    """
    A List of ID Strings with a generator function.
    """

    def __init__(self, prefix: str = "unknown"):
        self.prefix = prefix + "_"
        super().__init__()

    def generate(self) -> str:
        "Generate a new ID and add it to the list"
        _id = self.prefix + "".join(choices(ascii_letters, k=4))

        if _id not in self:
            self.append(_id)
            return _id
        else:
            return self.generate()

    def affix(self, _id: str) -> str:
        "Add a specifc ID string to the List"
        _id_prefix = self.prefix + _id
        if _id_prefix not in self:
            self.append(_id_prefix)
            return _id_prefix
        else:
            # In case of a collision.
            return self.generate()


def jbool(b: bool) -> str:
    "Python to Javascript Bool Mapping"
    return "true" if b else "false"


## Something like this. I'll fix it when I need to use this wrapper function
def async_wrapper(
    func: Callable, *args, wrapper: Optional[Callable] = None, **kwargs
) -> Callable:
    """Wrap a function in an 'await' flag if it is a coroutine"""
    if wrapper is not None:
        func = wrapper(func(args, kwargs))

    if iscoroutinefunction(func):
        return lambda: run(func(args, kwargs))
    else:
        return lambda: func(args, kwargs)
