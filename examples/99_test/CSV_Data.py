import sys
import pathlib

sys.path.append(str(pathlib.Path().resolve()))
# prior code is only needed for when developing/editing the library directly

import asyncio
import pandas as pd
from typing import Optional

import lightweight_pycharts as lwc
from lightweight_pycharts.orm.types import Symbol


def symbol_search_handler(ticker: str, **kwargs) -> Optional[list[Symbol]]:
    return [
        Symbol("AAPL", name="Apple", exchange="NASDAQ"),
        Symbol("GOOGL", name="Google", exchange="NASDAQ"),
        Symbol("TSLA", name="Tesla", exchange="NASDAQ"),
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


async def main():
    window = lwc.Window(debug=True, daemon=True, frameless=False)
    window.events.symbol_search += symbol_search_handler
    window.events.data_request += data_request_handler

    window.set_search_filters("type", ["Equity"])
    window.set_search_filters("broker", ["Local"])
    window.set_search_filters("exchange", [])
    window.set_timeframes(
        favs=[
            lwc.TF(1, "m"),
            lwc.TF(5, "m"),
            lwc.TF(30, "m"),
        ],
    )

    df = pd.read_csv("examples/data/ohlcv.csv")
    window.containers[0].frames[0].set_data(df)
    window.containers[0].set_layout(lwc.layouts.TRIPLE_VERT_LEFT)

    await window.await_close()  # Useful to make Ctrl-C in the terminal kill the window.


# lightweight_pycharts Spawns a new Process to manage the display
# so any code that uses it must have a __name__ == __main__ block.
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
