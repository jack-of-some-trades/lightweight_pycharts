"Simple Main Script to launch Lightweight-Pycharts sorcing data from the Alpaca API"
import asyncio

import pandas as pd

from alpaca_api import AlpacaAPI

import lightweight_pycharts as lwc


async def main():
    # The Window is about twice as slow to load compared to the CSV main because of the Alpaca API
    # All symbols are loaded at the start and for some reason that API never decided to make that an
    # Async request so here we wait.
    alpaca_api = AlpacaAPI()

    window = lwc.Window(log_level="INFO", debug=True, frameless=False)
    window.events.data_request += alpaca_api.get_hist
    window.events.symbol_search += alpaca_api.search_symbols
    window.events.open_socket += alpaca_api.open_socket
    window.events.close_socket += alpaca_api.close_socket

    AlpacaAPI.set_window_filters(window)
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
        main_frame.main_series.set_data(
            df, symbol=lwc.Symbol("LWPC", name="Update by Bar Test", exchange="NASDAQ")
        )

        # indicators.Volume(main_frame)
        # opts = lwc.indicators.SMA.__options__(period=20)
        sma20 = lwc.indicators.SMA(main_frame)
        lwc.indicators.SMA(sma20)

    await window.await_close()  # Useful to make Ctrl-C in the terminal kill the window.
    await alpaca_api.shutdown()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
