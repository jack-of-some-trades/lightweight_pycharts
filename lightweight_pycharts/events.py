""" Utility functions and objects that are used across the library """

from asyncio import iscoroutinefunction, create_task
from typing import (
    Literal,
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
    from .indicator import Series


class Events:
    "A Super Object that is a Collection of Emitters"

    def __init__(self):
        self.symbol_search = Emitter[Symbol_Search_Protocol]()
        self.data_request = Emitter[Data_Request_Protocol]()
        self.socket_switch = Emitter[Socket_Switch_Protocol]()


# region --------------------------------------- Python Event Protocol Definitions --------------------------------------- #
# pylint: disable=invalid-name disable=missing-class-docstring


# Test Protocol for generic string callbacks
class Command_sync(Protocol):
    def __call__(self, cmd: str) -> None: ...
class Command_async(Protocol):
    async def __call__(self, cmd: str) -> None: ...


class Data_request_sync(Protocol):
    def __call__(
        self, symbol: types.Symbol, tf: types.TF
    ) -> DataFrame | list[dict[str, Any]] | None: ...
class Data_request_async(Protocol):
    def __call__(
        self, symbol: types.Symbol, tf: types.TF
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


class Socket_switch_sync(Protocol):
    def __call__(
        self,
        state: Literal["open", "close"],
        symbol: types.Symbol,
        series: "Series",
    ) -> None: ...
class Socket_switch_async(Protocol):
    async def __call__(
        self,
        state: Literal["open", "close"],
        symbol: types.Symbol,
        series: "Series",
    ) -> None: ...


# Type Aliases to congregate various different Protocol Signatures into Groups
Command_Protocol: TypeAlias = Command_sync | Command_async
Symbol_Search_Protocol: TypeAlias = (
    Symbol_search_sync_1
    | Symbol_search_sync_2
    | Symbol_search_async_1
    | Symbol_search_async_2
)
Data_Request_Protocol: TypeAlias = Data_request_sync | Data_request_async
Socket_Switch_Protocol: TypeAlias = Socket_switch_sync | Socket_switch_async

# endregion

Emitter_Protocols: TypeAlias = (
    Command_Protocol
    | Symbol_Search_Protocol
    | Data_Request_Protocol
    | Socket_Switch_Protocol
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

    def __init__(self, response: Optional[Callable] = None, single_responder=True):
        super().__init__()
        self.response = response
        self.__single_responder__ = single_responder

    def __iadd__(self, func: T) -> Self:
        if func not in self:
            if self.__single_responder__:
                self.clear()
            self.append(func)
        return self

    def __isub__(self, func: T) -> Self:
        if func in self:
            self.remove(func)
        return self

    # rsp_kwargs are set when the event it emitted, They are arguments
    # passed directly to the response function of the emitter.
    # Needed so Multiple Emits can safely be done at once.
    def __call__(self, *_, rsp_kwargs: Optional[dict[str, Any]] = None, **kwargs):
        if len(self) == 0:
            return
        if iscoroutinefunction(call := self[0]):
            # Run Self, Asynchronously
            create_task(
                self._async_response_wrap_(call, **kwargs, rsp_kwargs=rsp_kwargs)
            )
        else:
            # Run Self, Synchronously
            rsp = call(**kwargs)
            if self.response is None:
                return

            self.response(  # only unpack rsp tuples, not lists
                *rsp if isinstance(rsp, tuple) else (rsp,),
                **rsp_kwargs if rsp_kwargs is not None else {},
            )

    async def _async_response_wrap_(
        self, call, *_, rsp_kwargs: Optional[dict[str, Any]] = None, **kwargs
    ):
        "Simple Wrapper to 'await' the initial 'call' function."
        rsp = await call(**kwargs)
        if self.response is None:
            return

        self.response(
            *rsp if isinstance(rsp, tuple) else rsp,  # only unpack tuples, not lists
            **rsp_kwargs if rsp_kwargs is not None else {},
        )
