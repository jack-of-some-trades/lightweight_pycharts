""" Utility functions and objects that are used across the library """

from asyncio import iscoroutinefunction, create_task
from typing import Protocol, Self, TypeAlias, Callable, Optional

from .orm import enum
from .orm.types import TF
from .containers import Container, Frame
from lightweight_pycharts.orm import types


class Events:
    "A Super Object that is a Collection of Emitters"

    def __init__(self, symbol_search_func: Callable):
        self.tf_change = Emitter[TimeFrame_Protocol]()
        self.layout_change = Emitter[Layout_Protocol]()
        self.symbol_search = Emitter[Symbol_Search_Protocol](symbol_search_func)
        self.symbol_select = Emitter[Symbol_Select_Protocol]()


# region --------------------------------------- Python Event Protocol Definitions --------------------------------------- #
# pylint: disable=invalid-name disable=missing-class-docstring


# Test Protocol for generic string callbacks
class Command_sync(Protocol):
    def __call__(self, cmd: str) -> None: ...
class Command_async(Protocol):
    async def __call__(self, cmd: str) -> None: ...


# Timeframe Change Request Protocol
class Timeframe_sync_1(Protocol):
    def __call__(self, timeframe: TF, container: Container, frame: Frame) -> None: ...
class Timeframe_sync_2(Protocol):
    def __call__(self, timeframe: TF, **kwargs) -> None: ...
class Timeframe_async_1(Protocol):
    async def __call__(
        self, timeframe: TF, container: Container, frame: Frame
    ) -> None: ...
class Timeframe_async_2(Protocol):
    async def __call__(self, timeframe: TF, **kwargs) -> None: ...


# Layout Change Request Protocol
class Layout_sync(Protocol):
    def __call__(self, layout: enum.layouts, container: Container) -> None: ...
class Layout_async(Protocol):
    async def __call__(self, layout: enum.layouts, container: Container) -> None: ...


# Symbol Search Request Protocol
class Symbol_search_sync_1(Protocol):
    def __call__(self, symbol: str, **kwargs) -> Optional[list[types.SymbolItem]]: ...
class Symbol_search_sync_2(Protocol):
    def __call__(
        self,
        symbol: str,
        confirmed: bool,
        types: list[str],
        brokers: list[str],
        exchanges: list[str],
    ) -> Optional[list[types.SymbolItem]]: ...
class Symbol_search_async_1(Protocol):
    async def __call__(
        self, symbol: str, **kwargs
    ) -> Optional[list[types.SymbolItem]]: ...
class Symbol_search_async_2(Protocol):
    async def __call__(
        self,
        symbol: str,
        confirmed: bool,
        types: list[str],
        brokers: list[str],
        exchanges: list[str],
    ) -> Optional[list[types.SymbolItem]]: ...


class Symbol_select_sync(Protocol):
    def __call__(self, selection: types.SymbolItem) -> None: ...
class Symbol_select_async(Protocol):
    async def __call__(self, selection: types.SymbolItem) -> None: ...


# Type Aliases to congregate various different Protocol Signatures into Groups
Command_Protocol: TypeAlias = Command_sync | Command_async
TimeFrame_Protocol: TypeAlias = (
    Timeframe_sync_1 | Timeframe_sync_2 | Timeframe_async_1 | Timeframe_async_2
)
Layout_Protocol: TypeAlias = Layout_sync | Layout_async
Symbol_Search_Protocol: TypeAlias = (
    Symbol_search_sync_1
    | Symbol_search_sync_2
    | Symbol_search_async_1
    | Symbol_search_async_2
)
Symbol_Select_Protocol: TypeAlias = Symbol_select_sync | Symbol_select_async

# endregion

Emitter_Protocols: TypeAlias = (
    TimeFrame_Protocol
    | Layout_Protocol
    | Command_Protocol
    | Symbol_Search_Protocol
    | Symbol_Select_Protocol
)


# Pylint Thinks "T" is undefined.
# pylint: disable=undefined-variable
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
        if self._response and len(args) > 0:
            self._response(*args)

    async def _async_response_(self, call, *args, **kwargs):
        rsp = await call(*args, **kwargs)
        if self._response and rsp is not None:
            self._response(*rsp)
