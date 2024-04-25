""" Utility functions and objects that are used across the library """

from asyncio import iscoroutinefunction, create_task, sleep, run
from dataclasses import is_dataclass, asdict
from random import choices
from string import ascii_letters
from typing import Protocol, Self, TypeAlias, Callable, Optional, Any
from json import JSONEncoder, dumps

from .orm.types import TF, Color


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


# pylint: disable=undefined-variable // Pylint Thinks "T" is undefined.
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


# pylint: disable=invalid-name disable=missing-class-docstring
class Timeframe_sync(Protocol):
    def __call__(self, timeframe: TF) -> None: ...
class Timeframe_async(Protocol):
    async def __call__(self, timeframe: TF) -> None: ...


class Layout_sync(Protocol):
    def __call__(self, cmd: str) -> None: ...
class Layout_async(Protocol):
    async def __call__(self, cmd: str) -> None: ...


class Command_sync(Protocol):
    def __call__(self, cmd: str) -> None: ...
class Command_async(Protocol):
    async def __call__(self, cmd: str) -> None: ...


Layout_Protocol: TypeAlias = Layout_sync | Layout_async
Command_Protocol: TypeAlias = Command_sync | Command_async
TimeFrame_Protocol: TypeAlias = Timeframe_sync | Timeframe_async

Emitter_Protocols: TypeAlias = TimeFrame_Protocol | Layout_Protocol | Command_Protocol


class Emitter[T: Emitter_Protocols](list[T]):
    """
    Emitter is a list type extension. It should be instantiated with one of the below
    Protocol Type Aliases. Functions of that TypeAlias can be appended.
    When an instance of this class is called it will create tasks
    for all appended async functions, then sequentially run all non-coroutine functions.

    This class can be instantiated with a callable function. This function will be
    called with the appended functions's return args as parameters if there are any.

    Applicable Protocol Types:
        - Timeframe_Protocol: ( arg1:TF, ) => {None}
    """

    def __init__(self, respose_func: Optional[Callable] = None):
        super().__init__()
        self._response = respose_func

    def __iadd__(self, func: T) -> Self:
        if func not in self:
            self.append(func)
        return self

    def __isub__(self, func: T) -> Self:
        self.remove(func)
        return self

    def __call__(self, *args, **kwargs):
        for call in iter(self):  # Dispatch all Async requests
            if iscoroutinefunction(call):
                create_task(self._async_response_(call, *args, **kwargs))

        for call in iter(self):  # Then Execute all Blocking functions
            if not iscoroutinefunction(call):
                self._response_(call(*args, **kwargs))

    def _response_(self, *args):
        if self._response:
            self._response(*args)

    async def _async_response_(self, call, *args, **kwargs):
        rsp = await call(*args, **kwargs)
        if self._response and rsp is not None:
            self._response(*rsp)


def test_func_1(cmd: str):
    print(f"Dad said {cmd}")


def test_func_2(cmd: str):
    print(f"Executing order: {cmd =}")


async def test_func_3(cmd: str):
    await sleep(1)
    print("I dont wanna")


def test_func_4():
    print("No link")


async def main():
    my_emit_list = Emitter[Command_Protocol]()
    my_emit_list += test_func_2
    my_emit_list += test_func_1
    my_emit_list += test_func_3
    # my_emit_list += test_func_4

    await sleep(0.5)
    my_emit_list("Hello!!")
    await sleep(2)
    print("\nWell Fine then Bitch \n")
    await sleep(1)

    my_emit_list -= test_func_3

    my_emit_list("get wrekt Boi.")


if __name__ == "__main__":
    run(main())
