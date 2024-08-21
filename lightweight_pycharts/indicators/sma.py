from enum import Enum, auto
from dataclasses import dataclass
from typing import Optional, Self

import pandas as pd

from lightweight_pycharts.indicator import (
    Options,
    Indicator,
    SeriesData,
    default_output_property,
    param,
)
from lightweight_pycharts.orm.enum import LineStyle
from lightweight_pycharts.orm.series import LineStyleOptions, SingleValueData
from lightweight_pycharts import series_common as sc
from lightweight_pycharts.orm.types import Color


class Method(Enum):
    "Calculation Methods"
    SMA = auto()
    EMA = auto()
    RMA = auto()


@dataclass
class SMAOptions(Options):
    "Dataclass of Options for the SMA Indicator"
    src: Optional[SeriesData] = None
    method: Method = param(Method.SMA, "Calculation Method")
    period: int = param(9, "Period")
    color: ... = param(Color.from_rgb(200, 50, 100), "Line Color", inline="line_style")
    size: ... = param(1, "Line Size", inline="line_style", min_val=0, max_val=5)


# pylint: disable=arguments-differ possibly-unused-variable
class SMA(Indicator):
    "Simple Moving Average Indicator"

    __options__ = SMAOptions

    def __init__(self, parent, opts: Optional[SMAOptions] = None):
        super().__init__(parent)
        if opts is None:
            opts = SMAOptions()

        self.src = None
        self.period = 0
        self._data = pd.Series()
        self.line_series = sc.LineSeries(self)
        self.line_series.apply_options(
            LineStyleOptions(lineStyle=LineStyle.SparseDotted)
        )

        self.update_options(opts)
        self.init_menu(opts)
        self.recalculate()

    def update_options(self, opts: SMAOptions) -> bool:
        self.line_series.apply_options(
            LineStyleOptions(color=opts.color, lineWidth=opts.size)
        )

        if self.period != opts.period:
            self.period = opts.period
            recalc = True

        if opts.src is None:
            opts.src = self.default_parent_src

        if self.src != opts.src:
            self.src = opts.src
            self.link_args({"data": self.src})
            recalc = True

        return "recalc" in locals()

    def set_data(self, data: pd.Series, *_, **__):
        self._data = data.rolling(window=self.period).mean()
        self.line_series.set_data(self._data)

    def update_data(self, time: pd.Timestamp, data: pd.Series, *_, **__):
        self._data[time] = data.tail(self.period).mean()
        self.line_series.update_data(SingleValueData(time, self._data.iloc[-1]))

    @default_output_property
    def average(self) -> pd.Series:
        "The resulting SMA"
        return self._data
