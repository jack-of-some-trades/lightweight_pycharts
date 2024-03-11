""" Utility functions and objects that are used across the library """

from asyncio import iscoroutinefunction
from random import choices
from typing import Optional, Callable


class ID_List(list):
    ascii = "abcdefghijklmnopqrstuvwxyz"

    def generate(self, prefix: str = "") -> str:
        var = "".join(choices(self.ascii, k=8))
        var = prefix + var

        if var not in self:
            self.append(var)
            return var
        else:
            return self.generate()


## Something like this. I'll fix it when I need to use this wrapper function
def async_wrapper(
    func: Callable, *args, wrapper: Optional[Callable] = None, **kwargs
) -> Callable:
    """Wrap a function in an 'await' flag if it is a coroutine"""
    if wrapper is not None:
        func = wrapper(func(args, kwargs))

    if iscoroutinefunction(func):
        return lambda: func(args, kwargs)
    else:
        return lambda: func(args, kwargs)


def jbool(b: bool) -> str:
    "Python to Javascript Bool Mapping"
    return "true" if b else "false"
