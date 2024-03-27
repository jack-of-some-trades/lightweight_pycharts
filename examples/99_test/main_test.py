import sys
import pathlib

sys.path.append(str(pathlib.Path().resolve()))
# prior code is only needed for when developing/editing the library directly

import asyncio
import lightweight_pycharts as lwc


async def main():
    window = lwc.Window(debug=True)
    # window.queue_test()

    window.containers[0].set_layout(lwc.orm.Container_Layouts.DOUBLE_HORIZ)

    # Sleep to halt main process since window process is Daemon
    await asyncio.sleep(500)


# lightweight_pycharts Spawns a new Process to manage the display
# so any code that uses it must have a __name__ == __main__ block.
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
