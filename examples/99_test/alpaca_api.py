"""Realtime and Historical data stream access through alpaca"""

import os
import asyncio
from itertools import islice
from logging import getLogger
from typing import Optional, Dict, Any, overload
from dotenv import find_dotenv, load_dotenv


from pandas import DataFrame, Timestamp

from alpaca.common.exceptions import APIError
from alpaca.trading.enums import AssetClass
from alpaca.trading.client import TradingClient
from alpaca.data.enums import Adjustment
from alpaca.data.timeframe import TimeFrame, TimeFrameUnit
from alpaca.data.historical import StockHistoricalDataClient, CryptoHistoricalDataClient
from alpaca.data.requests import CryptoBarsRequest, StockBarsRequest
from alpaca.data.live.stock import StockDataStream
from alpaca.data.live.crypto import CryptoDataStream

import lightweight_pycharts as lwc

load_dotenv(find_dotenv())
log = getLogger("lightweight-pycharts")

MAX_SYMBOL_SEARCH_RETURN = 200
ALPACA_API_KEYS: Dict[str, Any] = {
    "raw_data": True,
    "api_key": os.getenv("ALPACA_API_KEY"),
    "secret_key": os.getenv("ALPACA_API_SECRET_KEY"),
}

_asset_rename_map = {
    "class": "sec_type",
    "symbol": "ticker",
}


class AlpacaAPI:
    """
    API to bridge between Lightweight-Pycharts' Event Requests and the Alpaca Trade API
    Alpaca-py is a great library for getting some data into the system for free. Too bad
    it's terrible at everything else beyond this.

    Alpaca-py seems to be desined to be the highest level event loop controller, which it's not
    in this application environment.  Couple that with the abysmal *THREE SECOND BLOCKING* retry
    timer when an API call limit is reached and this library gets very annoying.

    Furthermore, to get Alpaca-py websockets to work you need to go into the DataStream class and
    delete the .result() calls when subscribing and unsubscribing. When these are invoked they wait
    for a result from a future call... that drum-roll.. has no return data. Better yet, this
    *BLOCKING* statement prevents the program from ever returning to the event-loop to launch the
    coroutine so the entire program hangs on a blocking call that's waiting for a Future, that never
    get's launched, to return nothing. Beautiful.
    """

    # _api: alpaca.REST
    # _async_api: alpaca.AsyncRest

    def __init__(self):
        self.stock_client = StockHistoricalDataClient(**ALPACA_API_KEYS)
        self.crypto_client = CryptoHistoricalDataClient(**ALPACA_API_KEYS)
        self.stock_stream = StockDataStream(**ALPACA_API_KEYS)
        self.crypto_stream = CryptoDataStream(**ALPACA_API_KEYS)

        evt_loop = asyncio.get_running_loop()
        self.stock_task = evt_loop.create_task(self.stock_stream._run_forever())
        self.crypto_task = evt_loop.create_task(self.crypto_stream._run_forever())

        self.open_sockets: Dict[str, list[lwc.indicators.Series]] = {}
        self.series_ticker_map: Dict[int, str] = {}

        self._init_symbols()

    @staticmethod
    def set_window_filters(window: lwc.Window):
        "Set the Pychart's Window Filters for Alpaca"
        window.set_search_filters("security_type", ["Crypto", "Equity"])
        window.set_search_filters("data_broker", ["Local", "Alpaca"])
        window.set_search_filters("exchange", [])

    async def shutdown(self):
        "Turn off the Alpaca Data Streams"
        # This would need to be refined in a final implementation, though that absolutely is
        # not worth it right now considering how much of a conflict this data-broker api is with
        # the lightweight-pycharts architecture
        log.info("Shutting Down Alpaca")
        self.stock_stream.stop()
        self.crypto_stream.stop()
        await asyncio.gather(self.stock_task, self.crypto_task)

    def _init_symbols(self):
        # Store Alpaca's Full asset list so it can be searched later without another API Request
        client = TradingClient(**ALPACA_API_KEYS, paper=True)
        # Why does this not have an Async Version?
        assets_json = client.get_all_assets()
        self.assets = (
            DataFrame(assets_json).rename(columns=_asset_rename_map).set_index("id")
        )
        # Drop All OTC since they aren't Tradable
        self.assets = self.assets[self.assets.exchange != "OTC"]

    def search_symbols(self, ticker: str, **_) -> list[lwc.Symbol]:
        "Search the Active symbols on Alpaca. This ignores OTC Symbols"
        # Search Tickers
        matches = self.assets[self.assets["ticker"].str.contains(ticker, case=False)]
        if len(matches) > 0:
            return symbols_from_df(matches, broker="alpaca")

        # Search Names if ticker search failed to return anything
        matches = self.assets[self.assets["name"].str.contains(ticker, case=False)]
        return symbols_from_df(matches, broker="alpaca")

    def get_hist(self, symbol: lwc.Symbol, timeframe: lwc.TF) -> Optional[DataFrame]:
        "Return timeseries data for the given symbol"
        args = {
            "symbol_or_symbols": symbol.ticker,
            "timeframe": _format_time(timeframe),
            # Grab 50K Bars Starting 50K bars ago so Current time is always shown
            "start": str(Timestamp.now() - (50_000 * timeframe.as_timedelta())),
            "limit": 50_000,
        }

        # This library currently doesn't support async requests on history fetches.
        # To make matters worse, there's is a 3 second sleep timer in the request call
        # that gets invoked when the request limit is reached. That timer could be why
        # this is painfully slow when requesting large sets of data.
        try:
            if symbol.sec_type == AssetClass.CRYPTO:
                rsp: Dict[str, Any] = self.crypto_client.get_crypto_bars(  # type: ignore
                    CryptoBarsRequest(**args)
                )
                return DataFrame(rsp[symbol.ticker]) if symbol.ticker in rsp else None
            else:
                rsp: Dict[str, Any] = self.stock_client.get_stock_bars(  # type: ignore
                    StockBarsRequest(**args, adjustment=Adjustment.ALL)
                )
                return DataFrame(rsp[symbol.ticker]) if symbol.ticker in rsp else None
        except APIError as e:
            log.error("get_bars() APIError: %s", e)
            return None

    def open_socket(self, symbol: lwc.Symbol, series: lwc.indicators.Series):
        "Open Websocket Datastream if a channel is available"
        log.info("%s Requested Socket open of %s.", series.js_id, symbol.ticker)

        if symbol.ticker not in self.assets["ticker"].unique():
            log.info("Symbol %s does not exist on Alpaca", symbol.ticker)
            return

        # Handle case where another series indicator is already listening to the given symbol
        if symbol.ticker in self.open_sockets:
            listeners = self.open_sockets[symbol.ticker]
            if series not in listeners:
                listeners.append(series)
                self.series_ticker_map[id(series)] = symbol.ticker
            log.info("Series Added as a listener to %s", symbol.ticker)
            return

        if symbol.sec_type == AssetClass.CRYPTO and not self.crypto_task.cancelled():
            self.crypto_stream.subscribe_bars(self._socket_handler, symbol.ticker)
        elif not self.stock_task.cancelled():
            self.stock_stream.subscribe_bars(self._socket_handler, symbol.ticker)
        self.open_sockets[symbol.ticker] = [series]
        self.series_ticker_map[id(series)] = symbol.ticker

    def close_socket(self, series: lwc.indicators.Series):
        "Close a Websocket Datastream that's no longer needed"
        if id(series) not in self.series_ticker_map:
            return

        ticker = self.series_ticker_map.pop(id(series))
        self.open_sockets[ticker].remove(series)

        if len(self.open_sockets[ticker]) == 0:
            log.info("No More Listeners on %s. Closed down socket", ticker)

            if series.symbol.sec_type == AssetClass.CRYPTO:
                self.crypto_stream.unsubscribe_bars(ticker)
            else:
                self.stock_stream.unsubscribe_bars(ticker)
            self.open_sockets.pop(ticker)

    async def _socket_handler(self, data):
        listeners = self.open_sockets[data.get("S")]

        if listeners is None:
            log.warning(
                "Recieved Data for a symbol (%s) that isnt being tracked.",
                data.get("S"),
            )
            return

        update_obj = lwc.OhlcData(
            time=data.get("t").seconds * 1_000_000_000,
            open=data.get("o"),
            high=data.get("h"),
            low=data.get("l"),
            close=data.get("c"),
            volume=data.get("v"),
        )

        log.info(update_obj)

        for series in listeners:
            series.update_data(update_obj, accumulate=True)


def symbols_from_df(matches: DataFrame, **defaults) -> list[lwc.Symbol]:
    "Generate a list of Symbols from a dataframe of the relevant data"
    generator = (
        lwc.Symbol.from_dict(obj, **defaults)
        for obj in matches.to_dict(orient="records")
    )
    # Return the Given Max number of entries from a generator expression
    return list(islice(generator, MAX_SYMBOL_SEARCH_RETURN))


# region ---- ---- ---- ---- Format Timeframes  ---- ---- ---- ---- #

lwc_to_alpaca_map: Dict[lwc.orm.types.PERIOD_CODES, Optional[str]] = {
    "s": None,
    "m": TimeFrameUnit.Minute,
    "h": TimeFrameUnit.Hour,
    "D": TimeFrameUnit.Day,
    "W": TimeFrameUnit.Week,
    "M": TimeFrameUnit.Month,
    "Y": None,
}
alpaca_to_lwc_map = dict((v, k) for k, v in lwc_to_alpaca_map.items())


@overload
def _format_time(timeframe: TimeFrame) -> lwc.TF: ...
@overload
def _format_time(timeframe: lwc.TF) -> TimeFrame: ...


def _format_time(timeframe: lwc.TF | TimeFrame) -> lwc.TF | TimeFrame:
    return (
        _lwc_to_alp(timeframe)
        if isinstance(timeframe, lwc.TF)
        else _alp_to_lwc(timeframe)
    )


def _alp_to_lwc(timeframe: TimeFrame) -> lwc.TF:
    period = alpaca_to_lwc_map[timeframe.unit]
    if period == "M" and timeframe.amount == 12:
        # Special case
        return lwc.TF(1, "Y")

    return lwc.TF(timeframe.amount, period)


def _lwc_to_alp(timeframe: lwc.TF) -> TimeFrame:
    if timeframe.toStr == "1Y":
        # Special case
        return TimeFrame(12, TimeFrameUnit.Month)
    else:
        if (period := lwc_to_alpaca_map[timeframe.period]) is not None:
            return TimeFrame(timeframe.mult, period)
        else:
            log.warning("Period '%s' is not supported. Defaulting to 1 Day.")

        return TimeFrame(1, TimeFrameUnit.Day)


# endregion


if __name__ == "__main__":
    api = AlpacaAPI()
