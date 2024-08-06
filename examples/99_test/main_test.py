import sys
import pathlib

sys.path.append(str(pathlib.Path().resolve()))
# prior code is only needed for when developing/editing the library directly

import asyncio
import pandas as pd
from typing import Optional

import lightweight_pycharts as lwc
from lightweight_pycharts.orm.types import Symbol
from lightweight_pycharts.orm.series import OhlcData, SingleValueData


def symbol_search_handler(ticker: str, **kwargs) -> Optional[list[Symbol]]:
    """
    The handler that is called when a symbol search is requested. The List of Symbols given
    will be displayed, verbatim, on screen. When an item is selected on screen, an equivalent
    symbol object to the one returned by this function will be passed as an argument into the
    data_request_handler. (the object is deconstructed to json then reconstructed upon return)

    'confirmed' in kwargs is True when the Search Button was pressed. Invocations of this function
    when confirmed = False were called by key-stokes updating the ticker search text

    psst... Nothing here is stopping you from evaluating mathematical Functions, e.g. (SPX/SPY)
    """
    return [
        Symbol("AAPL", name="Apple", exchange="NASDAQ"),
        Symbol("GOOGL", name="Google", exchange="NASDAQ"),
        Symbol("TSLA", name="Tesla", exchange="NASDAQ"),
        Symbol("LWPC", name="Update by Bar Test", exchange="NASDAQ"),
        Symbol("LWPC-TICK", name="Update by Tick Test", exchange="NASDAQ"),
    ]


def data_request_handler(symbol: lwc.Symbol, tf: lwc.TF) -> Optional[pd.DataFrame]:
    "Request Handler for REST Bulk Data Fetches."
    if tf.period == "m" and (tf.mult in [1, 5, 30]):
        match symbol.ticker:
            case "AAPL":
                return pd.read_csv(f"examples/data/AAPL_{tf.mult}min.csv")
            case "GOOGL":
                return pd.read_csv(f"examples/data/GOOGL_{tf.mult}min.csv")
            case "TSLA":
                return pd.read_csv(f"examples/data/TSLA_{tf.mult}min.csv")
            case "LWPC":
                return pd.read_csv("examples/data/lwpc_ohlcv.csv")
            case "LWPC-TICK":
                return pd.read_csv("examples/data/lwpc_ohlc.csv")


async def socket_request_handler(state: str, symbol: lwc.Symbol, series: lwc.Series):
    """
    Request Handler for Web-Sockets. The requested 'state' is determined by Symbol Changes
    and the frame.socket_open Boolean. The user should keep this Boolean as up-to-date as possible.

    #Note: The implementation below, while simple and functional, is actually bugged. If a symbol
    change from LWPC to LWPC-TICK (or vise-versa) is requested, this function has no way of
    breaking the for-loop. Hence, data from one loop is sent to the other. This would be fixed by
    allowing this function to spawn an Async Task and return. On the Symbol change the task could
    then be killed when this function is called w/ the state = 'close' parameter.
    """
    if state == "open" and symbol.ticker == "LWPC":
        df = pd.read_csv("examples/data/lwpc_next_ohlcv.csv")
        series.socket_open = True
        for _, _, t, o, h, l, c, v in df.itertuples():
            series.update_data(OhlcData(t, o, h, l, c, v))
            await asyncio.sleep(0.08)
        series.socket_open = False

    if state == "open" and symbol.ticker == "LWPC-TICK":
        df = pd.read_csv("examples/data/lwpc_ticks.csv")
        series.socket_open = True
        for _, _, t, p in df.itertuples():
            series.update_data(SingleValueData(t, p))
            await asyncio.sleep(0.02)
        series.socket_open = False


async def main():
    """
    Main Function for creating a Window. While the implementation of this is largely
    left for the user, there should be two constants: The Function is Async and called
    from a [ if __name__ == "__main__": ] block.

    The window internally runs a loop manager that handles a return queue. This loop manager
    is run using async/await hence the need for main() to be an async function.

    The Loop that is managed is a multi-process Queue that receives feedback commands
    from the window. The spawning of a child process is what necessitates
    the use of a [ if __name__ == "__main__": ] block.
    """
    window = lwc.Window(daemon=True, log_level="INFO", debug=True, frameless=True)
    window.events.data_request += data_request_handler
    window.events.symbol_search += symbol_search_handler
    window.events.socket_switch += socket_request_handler

    window.set_search_filters("security_type", ["Crypto", "Equity"])
    window.set_search_filters("data_broker", ["Local", "Alpaca"])
    window.set_search_filters("exchange", [])
    window.set_layout_favs(
        [
            lwc.layouts.SINGLE,
            lwc.layouts.DOUBLE_VERT,
            lwc.layouts.TRIPLE_VERT_LEFT,
            lwc.layouts.QUAD_SQ_H,
        ]
    )
    window.set_series_favs(
        [
            lwc.SeriesType.Candlestick,
            lwc.SeriesType.Rounded_Candle,
            lwc.SeriesType.Line,
            lwc.SeriesType.Area,
        ]
    )
    window.set_timeframes(
        favs=[
            lwc.TF(1, "m"),
            lwc.TF(5, "m"),
            lwc.TF(30, "m"),
        ],
    )

    main_frame = window.containers[0].frames[0]
    df = pd.read_csv("examples/data/ohlcv.csv")

    main_frame.main_series.set_data(
        df, symbol=Symbol("LWPC", name="Update by Bar Test", exchange="NASDAQ")
    )

    lwc.indicator.Volume(main_frame)
    # opts = lwc.indicators.SMA.__options__(period=20)
    sma20 = lwc.indicators.SMA(main_frame)
    lwc.indicators.SMA(sma20)

    await window.await_close()  # Useful to make Ctrl-C in the terminal kill the window.


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
