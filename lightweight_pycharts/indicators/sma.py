from enum import Enum, auto
from dataclasses import dataclass
from typing import Optional

import pandas as pd

from lightweight_pycharts.indicator import (
    Options,
    Indicator,
    ParentType,
    SeriesData,
    default_output_property,
    param,
)
from lightweight_pycharts.orm.series import SingleValueData
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
    per: ... = pd.Timestamp(1e15)
    src: Optional[SeriesData] = None
    period: int = param(9, group="Test", inline="sub-group")
    period_box: bool = param(False, group="Test", inline="sub-group")
    period2: int = param(3, "Another_param", "Test", min_val=5, max_val=10, step=2)
    arg: ... = Color.from_rgb(200, 50, 100)
    arg2: ... = param(True, tooltip="Just a checkbox")
    method: Method = param(Method.SMA, group="Test")


# pylint: disable=arguments-differ
class SMA(Indicator):
    "Simple Moving Average Indicator"

    __options__ = SMAOptions

    def __init__(
        self,
        parent: ParentType,
        opts: SMAOptions = SMAOptions(),
    ):
        super().__init__(parent)

        self.opts = opts

        if opts.src is None:
            opts.src = self.default_parent_src

        self._data = pd.Series()
        self.line_series = sc.LineSeries(self)

        self.init_menu(opts)
        self.link_args({"data": opts.src})

    def set_data(self, data: pd.Series, *_, **__):
        self._data = data.rolling(window=self.opts.period).mean()
        self.line_series.set_data(self._data)

    def update_data(self, time: pd.Timestamp, data: pd.Series, *_, **__):
        self._data[time] = data.tail(self.opts.period).mean()
        self.line_series.update_data(SingleValueData(time, self._data.iloc[-1]))

    @default_output_property
    def average(self) -> pd.Series:
        "The resulting SMA"
        return self._data
