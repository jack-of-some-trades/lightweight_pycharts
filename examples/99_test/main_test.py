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
    return [
        Symbol("AAPL", name="Apple", exchange="NASDAQ"),
        Symbol("GOOGL", name="Google", exchange="NASDAQ"),
        Symbol("TSLA", name="Tesla", exchange="NASDAQ"),
        Symbol("LWPC", name="Update by Bar Test", exchange="NASDAQ"),
        Symbol("LWPC-TICK", name="Update by Tick Test", exchange="NASDAQ"),
    ]


def data_request_handler(symbol: lwc.Symbol, tf: lwc.TF) -> Optional[pd.DataFrame]:
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


async def socket_request_handler(state: str, symbol: lwc.Symbol, frame: lwc.Frame):
    if state == "open" and symbol.ticker == "LWPC":
        df = pd.read_csv("examples/data/lwpc_next_ohlcv.csv")
        for _, _, t, o, h, l, c, v in df.itertuples():
            frame.update_data(OhlcData(t, o, h, l, c, v))
            await asyncio.sleep(0.08)

    if state == "open" and symbol.ticker == "LWPC-TICK":
        df = pd.read_csv("examples/data/lwpc_ticks.csv")
        for _, _, t, p in df.itertuples():
            frame.update_data(SingleValueData(t, p))
            await asyncio.sleep(0.02)


async def main():
    window = lwc.Window(debug=True, daemon=True, frameless=False)
    window.events.symbol_search += symbol_search_handler
    window.events.data_request += data_request_handler
    window.events.socket_switch += socket_request_handler

    window.set_search_filters("type", ["Crypto", "Equity"])
    window.set_search_filters("broker", ["Local", "Alpaca"])
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
    df = pd.read_csv("examples/data/ohlcv.csv")
    window.containers[0].frames[0].set_data(df)

    await window.await_close()  # Useful to make Ctrl-C in the terminal kill the window.


# lightweight_pycharts Spawns a new Process to manage the display
# so any code that uses it must have a __name__ == __main__ block.
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
