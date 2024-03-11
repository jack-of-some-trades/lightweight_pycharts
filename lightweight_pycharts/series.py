""" Python File to hold all Lightweight Chart Series Classes and ChartOption Classes """

from abc import ABC


class seriesCommon(ABC):
    def __init__(self) -> None:
        pass


class histogram(seriesCommon):
    def __init__(self) -> None:
        pass


class line(seriesCommon):
    def __init__(self) -> None:
        pass


class candlestick(seriesCommon):
    def __init__(self) -> None:
        pass
