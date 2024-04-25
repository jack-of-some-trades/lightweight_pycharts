import sys
import pathlib

sys.path.append(str(pathlib.Path().resolve()))
# prior code is only needed for when developing/editing the library directly

import asyncio
import pandas as pd

import lightweight_pycharts as lwc


def timeframe_change(timeframe: lwc.TF) -> None:
    print(f"Requested Timeframe Change to {timeframe}")


async def main():
    window = lwc.Window(debug=True, daemon=True)
    window.events.tf_change += timeframe_change

    df = pd.read_csv("examples/data/ohlcv.csv")
    window.containers[0].frames[0].panes[0].set_data(df)

    await window.await_close()  # Useful to make Ctrl-C in the terminal kill the window.


# lightweight_pycharts Spawns a new Process to manage the display
# so any code that uses it must have a __name__ == __main__ block.
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
