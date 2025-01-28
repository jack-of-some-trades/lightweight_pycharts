"Simple Main script to run Lightweight-Pycharts sourcing data from local csv files."
import asyncio

import pandas as pd

import csv_reader as csv

import lightweight_pycharts as lwc


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

    window = lwc.Window(log_level="INFO", debug=True, frameless=False)
    window.events.data_request += csv.data_request_handler
    window.events.symbol_search += csv.symbol_search_handler
    window.events.open_socket += csv.socket_request_handler

    window.set_search_filters("security_type", ["Crypto", "Equity"])
    window.set_search_filters("data_broker", ["Local", "Alpaca"])
    window.set_search_filters("exchange", [])
    window.set_layout_favs(
        [
            lwc.Layouts.SINGLE,
            lwc.Layouts.DOUBLE_VERT,
            lwc.Layouts.TRIPLE_VERT_LEFT,
            lwc.Layouts.QUAD_SQ_H,
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
        favs=[lwc.TF(1, "m"), lwc.TF(5, "m"), lwc.TF(30, "m")],
    )

    window.new_tab()
    main_frame = window.containers[0].frames[0]
    df = pd.read_csv("examples/data/ohlcv.csv")

    if isinstance(main_frame, lwc.ChartingFrame):
        main_frame.main_series.symbol = lwc.Symbol(
            "LWPC", name="Update by Bar Test", exchange="NASDAQ"
        )
        main_frame.main_series.set_data(df)

        sma20 = lwc.indicators.SMA(main_frame)
        lwc.indicators.SMA(sma20)

    await window.await_close()  # Useful to make Ctrl-C in the terminal kill the window.


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
