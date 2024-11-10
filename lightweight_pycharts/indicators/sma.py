from enum import Enum, auto
from dataclasses import dataclass
from typing import Optional

import pandas as pd

from lightweight_pycharts.indicator import (
    IndParent_T,
    Indicator,
    IndicatorOptions,
    SeriesData,
    default_output_property,
    param,
)
from lightweight_pycharts.orm.enum import (
    LineStyle,
    MarkerLoc,
    MarkerShape,
)
from lightweight_pycharts.orm.series import LineStyleOptions, SingleValueData
from lightweight_pycharts import series_common as sc
from lightweight_pycharts.orm.types import Color, SeriesMarker, SeriesPriceLine


class Method(Enum):
    "Calculation Methods"
    SMA = auto()
    EMA = auto()
    RMA = auto()


@dataclass
class SMAOptions(IndicatorOptions):
    "Dataclass of Options for the SMA Indicator"
    src: Optional[SeriesData] = None
    method: Method = param(Method.SMA, "Calculation Method")
    period: int = param(9, "Period")
    color: ... = param(Color.from_rgb(200, 50, 100), "Line Color", inline="line_style")
    size: ... = param(1, "Line Size", inline="line_style", min=0, max=5)


# pylint: disable=arguments-differ possibly-unused-variable
class SMA(Indicator):
    "Simple Moving Average Indicator"

    __options__ = SMAOptions

    def __init__(
        self,
        parent: IndParent_T,
        opts: Optional[SMAOptions] = None,
        display_name: str = "",
    ):
        super().__init__(parent, display_name=display_name)
        if opts is None:
            opts = SMAOptions()

        self.src = None
        self.period = 0
        self._data = pd.Series()
        self.line_series = sc.LineSeries(self, name="My SMA")
        self.line_series.apply_options(
            LineStyleOptions(lineStyle=LineStyle.SparseDotted)
        )

        self.pl1 = SeriesPriceLine(title="+5%", color="#26a69a77")
        self.pl2 = SeriesPriceLine(title="-5%", color="#ef535077")

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

        self.pl1.price = self._data[time] * 1.05
        self.pl2.price = self._data[time] * 0.95

        self.line_series.update_priceline(self.pl1)
        self.line_series.update_priceline(self.pl2)

        self.check_markers()

    def check_markers(self):
        "Add Markers when crossing $20 to check system"
        if self._data.iloc[-1] < 20 and self._data.iloc[-2] > 20:
            # Crossed Down
            self.line_series.add_marker(
                SeriesMarker(
                    self[-1],
                    MarkerShape.Arrow_Down,
                    MarkerLoc.Below,
                    color="#ef5350",
                )
            )
        elif self._data.iloc[-1] > 20 and self._data.iloc[-2] < 20:
            # Crossed Up
            self.line_series.add_marker(
                SeriesMarker(
                    self[-1],
                    MarkerShape.Arrow_Up,
                    MarkerLoc.Above,
                    color="#26a69a",
                )
            )

    @default_output_property
    def average(self) -> pd.Series:
        "The resulting SMA"
        return self._data
