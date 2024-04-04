import sys
import pathlib

sys.path.append(str(pathlib.Path().resolve()))
# prior code is only needed for when developing/editing the library directly

import asyncio
import pandas as pd

import lightweight_pycharts as lwc
import lightweight_pycharts.orm as orm


async def main():
    window = lwc.Window(debug=True)
    df = pd.read_csv("examples/data/ohlcv.csv")

    await asyncio.sleep(2)
    window.containers[0].frames[0].panes[0].set_data(df)

    # Halt main process since window process is Daemon by default
    await window.await_close()


# lightweight_pycharts Spawns a new Process to manage the display
# so any code that uses it must have a __name__ == __main__ block.
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
