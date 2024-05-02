import sys
import pathlib
from typing import Optional


sys.path.append(str(pathlib.Path().resolve()))
# prior code is only needed for when developing/editing the library directly

import asyncio
import pandas as pd

import lightweight_pycharts as lwc
from lightweight_pycharts.orm.types import SymbolItem


def symbol_search(symbol: str, **kwargs) -> Optional[list[SymbolItem]]:
    print(symbol)
    print(kwargs)
    return [
        SymbolItem("BTC_USD"),
        SymbolItem("ETH_USD"),
        SymbolItem("AAPL", exchange="NASDAQ"),
        SymbolItem("NVDA", name="Nvidia Co."),
    ]


def timeframe_change(
    timeframe: lwc.TF, **_  # container: lwc.Container, frame: lwc.Frame
) -> None:
    print(f"Requested Timeframe Change to {timeframe}")


async def main():
    window = lwc.Window(debug=True, daemon=True, frameless=False)
    window.events.tf_change += timeframe_change
    window.events.symbol_search += symbol_search

    window.set_search_filters("type", ["Crypto", "Equity"])
    window.set_search_filters("broker", ["Local", "Alpaca"])
    window.set_search_filters("exchange", [])

    df = pd.read_csv("examples/data/ohlcv.csv")
    window.containers[0].frames[0].panes[0].set_data(df)
    window.containers[0].set_layout(lwc.layouts.TRIPLE_VERT_LEFT)

    await window.await_close()  # Useful to make Ctrl-C in the terminal kill the window.


# lightweight_pycharts Spawns a new Process to manage the display
# so any code that uses it must have a __name__ == __main__ block.
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
