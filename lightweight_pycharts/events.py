""" Utility functions and objects that are used across the library """

from asyncio import iscoroutinefunction, create_task
from typing import (
    Protocol,
    Self,
    TypeAlias,
    Callable,
    Optional,
    Any,
    TYPE_CHECKING,
)

from pandas import DataFrame

from .orm import types

# prevent circular import
if TYPE_CHECKING:
    from .indicators import Series


class Events:
    "A Super Object that is a Collection of Emitters"

    def __init__(self):
        self.symbol_search = Emitter[Symbol_Search_Protocol]()
        self.data_request = Emitter[Data_Request_Protocol]()
        self.open_socket = Emitter[Socket_Open_Protocol]()
        self.close_socket = Emitter[Socket_Close_Protocol]()


# region -------------------------- Python Event Protocol Definitions -------------------------- #
# pylint: disable=invalid-name disable=missing-class-docstring


# Test Protocol for generic string callbacks
class Command_sync(Protocol):
    def __call__(self, cmd: str) -> None: ...
class Command_async(Protocol):
    async def __call__(self, cmd: str) -> None: ...


class Data_request_sync(Protocol):
    def __call__(
        self, symbol: types.Symbol, timeframe: types.TF
    ) -> DataFrame | list[dict[str, Any]] | None: ...
class Data_request_async(Protocol):
    def __call__(
        self, symbol: types.Symbol, timeframe: types.TF
    ) -> DataFrame | list[dict[str, Any]] | None: ...


# Symbol Search Request Protocol
class Symbol_search_sync_1(Protocol):
    def __call__(self, ticker: str, **kwargs) -> Optional[list[types.Symbol]]: ...
class Symbol_search_sync_2(Protocol):
    def __call__(
        self,
        ticker: str,
        confirmed: bool,
        sec_types: list[str],
        brokers: list[str],
        exchanges: list[str],
    ) -> Optional[list[types.Symbol]]: ...
class Symbol_search_async_1(Protocol):
    async def __call__(self, ticker: str, **kwargs) -> Optional[list[types.Symbol]]: ...
class Symbol_search_async_2(Protocol):
    async def __call__(
        self,
        ticker: str,
        confirmed: bool,
        sec_types: list[str],
        brokers: list[str],
        exchanges: list[str],
    ) -> Optional[list[types.Symbol]]: ...


class Socket_Open_sync(Protocol):
    def __call__(self, symbol: types.Symbol, series: "Series") -> None: ...
class Socket_Open_async(Protocol):
    async def __call__(self, symbol: types.Symbol, series: "Series") -> None: ...


class Socket_Close_sync(Protocol):
    def __call__(self, series: "Series") -> None: ...
class Socket_close_async(Protocol):
    async def __call__(self, series: "Series") -> None: ...


# Type Aliases to congregate various different Protocol Signatures into Groups
Command_Protocol: TypeAlias = Command_sync | Command_async
Symbol_Search_Protocol: TypeAlias = (
    Symbol_search_sync_1
    | Symbol_search_sync_2
    | Symbol_search_async_1
    | Symbol_search_async_2
)
Data_Request_Protocol: TypeAlias = Data_request_sync | Data_request_async
Socket_Open_Protocol: TypeAlias = Socket_Open_sync | Socket_Open_async
Socket_Close_Protocol: TypeAlias = Socket_Close_sync | Socket_close_async

# endregion

Emitter_Protocols: TypeAlias = (
    Command_Protocol
    | Symbol_Search_Protocol
    | Data_Request_Protocol
    | Socket_Open_Protocol
    | Socket_Close_Protocol
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
    """

    # TODO : Make this class track async tasks that it has created so they can be closed
    # This will likely entail making the class definitively only handle one response function

    def __init__(self, responder: Optional[Callable] = None):
        super().__init__()
        # A Caller is a function that is appended to this Object.
        # Each caller gets called when an event it emitted
        self.__single_caller__ = True

        # The responder function called with the return products of each Caller
        # There can only be one responder
        self.responder = responder

    def __iadd__(self, func: T) -> Self:
        if func not in self:
            if self.__single_caller__:
                self.clear()
            self.append(func)
        return self

    def __isub__(self, func: T) -> Self:
        if func in self:
            self.remove(func)
        return self

    # rsp_kwargs are set when the event is emitted, They are arguments
    # passed directly to the response function of the emitter.
    def __call__(self, *args, rsp_kwargs: Optional[dict[str, Any]] = None, **kwargs):
        if len(self) == 0:
            return  # No Functions have been appended to this Emitter Yet

        for caller in self:
            if iscoroutinefunction(caller):
                # Run Self, Asynchronously
                create_task(
                    self._async_response_wrap_(
                        caller, *args, **kwargs, rsp_kwargs=rsp_kwargs
                    )
                )
            else:
                # Run Self, Synchronously
                rsp = caller(*args, **kwargs)
                if self.responder is None:
                    return

                self.responder(  # only unpack rsp tuples, not lists
                    *rsp if isinstance(rsp, tuple) else (rsp,),
                    **rsp_kwargs if rsp_kwargs is not None else {},
                )

    async def _async_response_wrap_(
        self, call, *args, rsp_kwargs: Optional[dict[str, Any]] = None, **kwargs
    ):
        "Simple Wrapper to await the initial caller function."
        rsp = await call(*args, **kwargs)
        if self.responder is None:
            return

        self.responder(
            *rsp if isinstance(rsp, tuple) else rsp,  # only unpack tuples, not lists
            **rsp_kwargs if rsp_kwargs is not None else {},
        )
