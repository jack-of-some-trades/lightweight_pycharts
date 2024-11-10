""" Enumeration Defenitions """

from enum import IntEnum, StrEnum, Enum, auto

from .types import Color

# pylint: disable=line-too-long
# pylint: disable=invalid-name


class layouts(IntEnum):
    "1:1 Mapping of util.ts Container_Layouts Enum"
    SINGLE = 0
    DOUBLE_VERT = auto()
    DOUBLE_HORIZ = auto()
    TRIPLE_VERT = auto()
    TRIPLE_VERT_LEFT = auto()
    TRIPLE_VERT_RIGHT = auto()
    TRIPLE_HORIZ = auto()
    TRIPLE_HORIZ_TOP = auto()
    TRIPLE_HORIZ_BOTTOM = auto()
    QUAD_SQ_V = auto()
    QUAD_SQ_H = auto()
    QUAD_VERT = auto()
    QUAD_HORIZ = auto()
    QUAD_LEFT = auto()
    QUAD_RIGHT = auto()
    QUAD_TOP = auto()
    QUAD_BOTTOM = auto()

    @property
    def num_frames(self) -> int:
        "Function that returns the number of Frames this layout contains"
        if self.name.startswith("SINGLE"):
            return 1
        elif self.name.startswith("DOUBLE"):
            return 2
        elif self.name.startswith("TRIPLE"):
            return 3
        elif self.name.startswith("QUAD"):
            return 4
        else:
            return 0


class ColorType(StrEnum):
    """
    Represents a type of color.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/ColorType
    """

    Solid = "solid"
    VerticalGradient = "gradient"


class CrosshairMode(IntEnum):
    """
    Represents the crosshair mode.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/CrosshairMode
    Tutorial: https://tradingview.github.io/lightweight-charts/tutorials/customization/crosshair#crosshair-mode
    """

    Normal = 0
    Magnet = 1
    Hidden = 2


class LastPriceAnimationMode(IntEnum):
    """
    Represents the type of the last price animation for series such as area or line.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/LastPriceAnimationMode
    """

    Disabled = 0
    Continuous = 1
    OnDataUpdate = 2


class LineStyle(IntEnum):
    """
    Represents the possible line styles.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/LineStyle
    """

    Solid = 0
    Dotted = 1
    Dashed = 2
    LargeDashed = 3
    SparseDotted = 4


class LineType(IntEnum):
    """
    Represents the possible line types.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/LineType
    """

    Simple = 0
    WithSteps = 1
    Curved = 2


class MismatchDirection(IntEnum):
    """
    Search direction if no data found at provided index
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/MismatchDirection
    """

    NearestLeft = -1
    None_ = 0  # 'None' is a reserved keyword in Python, so use 'None_' instead
    NearestRight = 1


class PriceLineSource(IntEnum):
    """
    Represents the source of data to be used for the horizontal price line.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api/enums/PriceLineSource
    """

    LastBar = 0
    LastVisible = 1


class PriceScaleMode(IntEnum):
    """
    Represents the price scale mode.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/enums/PriceScaleMode
    """

    Normal = 0
    Logarithmic = 1
    Percentage = 2
    IndexedTo100 = 3


class TickMarkType(IntEnum):
    """
    Represents the type of a tick mark on the time axis.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/enums/TickMarkType
    """

    Year = 0
    Month = 1
    DayOfMonth = 2
    Time = 3
    TimeWithSeconds = 4


class TrackingModeExitMode(IntEnum):
    """
    Determine how to exit the tracking mode.

    By default, mobile users will long press to deactivate the scroll and have the ability to check values and dates.
    Another press is required to activate the scroll, be able to move left/right, zoom, etc.
    Docs:https://tradingview.github.io/lightweight-charts/docs/api/enums/TrackingModeExitMode
    """

    OnTouchEnd = 0
    OnNextTap = 1


class MarkerLoc(StrEnum):
    """
    Represents the position of a series marker relative to a bar.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api#seriesmarkerposition
    """

    Above = "aboveBar"
    Below = "belowBar"
    In = "inBar"


class MarkerShape(StrEnum):
    """
    Represents the shape of a series marker.
    Docs: https://tradingview.github.io/lightweight-charts/docs/api#seriesmarkershape
    """

    Circle = "circle"
    Square = "square"
    Arrow_Up = "arrowUp"
    Arrow_Down = "arrowDown"


# class ColorLiteral(Enum):
#     "An Enumeration of all the colors given in the Lightweight Charts API. Return Object is an orm.Color"
#     khaki = Color.from_hex("#f0e68c")
#     azure = Color.from_hex("#f0ffff")
#     aliceblue = Color.from_hex("#f0f8ff")
#     ghostwhite = Color.from_hex("#f8f8ff")
#     gold = Color.from_hex("#ffd700")
#     goldenrod = Color.from_hex("#daa520")
#     gainsboro = Color.from_hex("#dcdcdc")
#     gray = Color.from_hex("#808080")
#     green = Color.from_hex("#008000")
#     honeydew = Color.from_hex("#f0fff0")
#     floralwhite = Color.from_hex("#fffaf0")
#     lightblue = Color.from_hex("#add8e6")
#     lightcoral = Color.from_hex("#f08080")
#     lemonchiffon = Color.from_hex("#fffacd")
#     hotpink = Color.from_hex("#ff69b4")
#     lightyellow = Color.from_hex("#ffffe0")
#     greenyellow = Color.from_hex("#adff2f")
#     lightgoldenrodyellow = Color.from_hex("#fafad2")
#     limegreen = Color.from_hex("#32cd32")
#     linen = Color.from_hex("#faf0e6")
#     lightcyan = Color.from_hex("#e0ffff")
#     magenta = Color.from_hex("#f0f")
#     maroon = Color.from_hex("#800000")
#     olive = Color.from_hex("#808000")
#     orange = Color.from_hex("#ffa500")
#     oldlace = Color.from_hex("#fdf5e6")
#     mediumblue = Color.from_hex("#0000cd")
#     transparent = Color.from_hex("#0000")
#     lime = Color.from_hex("#0f0")
#     lightpink = Color.from_hex("#ffb6c1")
#     mistyrose = Color.from_hex("#ffe4e1")
#     moccasin = Color.from_hex("#ffe4b5")
#     midnightblue = Color.from_hex("#191970")
#     orchid = Color.from_hex("#da70d6")
#     mediumorchid = Color.from_hex("#ba55d3")
#     mediumturquoise = Color.from_hex("#48d1cc")
#     orangered = Color.from_hex("#ff4500")
#     royalblue = Color.from_hex("#4169e1")
#     powderblue = Color.from_hex("#b0e0e6")
#     red = Color.from_hex("#f00")
#     coral = Color.from_hex("#ff7f50")
#     turquoise = Color.from_hex("#40e0d0")
#     white = Color.from_hex("#fff")
#     whitesmoke = Color.from_hex("#f5f5f5")
#     wheat = Color.from_hex("#f5deb3")
#     teal = Color.from_hex("#008080")
#     steelblue = Color.from_hex("#4682b4")
#     bisque = Color.from_hex("#ffe4c4")
#     aquamarine = Color.from_hex("#7fffd4")
#     aqua = Color.from_hex("#0ff")
#     sienna = Color.from_hex("#a0522d")
#     silver = Color.from_hex("#c0c0c0")
#     springgreen = Color.from_hex("#00ff7f")
#     antiquewhite = Color.from_hex("#faebd7")
#     burlywood = Color.from_hex("#deb887")
#     brown = Color.from_hex("#a52a2a")
#     beige = Color.from_hex("#f5f5dc")
#     chocolate = Color.from_hex("#d2691e")
#     chartreuse = Color.from_hex("#7fff00")
#     cornflowerblue = Color.from_hex("#6495ed")
#     cornsilk = Color.from_hex("#fff8dc")
#     crimson = Color.from_hex("#dc143c")
#     cadetblue = Color.from_hex("#5f9ea0")
#     tomato = Color.from_hex("#ff6347")
#     fuchsia = Color.from_hex("#f0f")
#     blue = Color.from_hex("#00f")
#     salmon = Color.from_hex("#fa8072")
#     blanchedalmond = Color.from_hex("#ffebcd")
#     slateblue = Color.from_hex("#6a5acd")
#     slategray = Color.from_hex("#708090")
#     thistle = Color.from_hex("#d8bfd8")
#     tan = Color.from_hex("#d2b48c")
#     cyan = Color.from_hex("#0ff")
#     darkblue = Color.from_hex("#00008b")
#     darkcyan = Color.from_hex("#008b8b")
#     darkgoldenrod = Color.from_hex("#b8860b")
#     darkgray = Color.from_hex("#a9a9a9")
#     blueviolet = Color.from_hex("#8a2be2")
#     black = Color.from_hex("#000")
#     darkmagenta = Color.from_hex("#8b008b")
#     darkslateblue = Color.from_hex("#483d8b")
#     darkkhaki = Color.from_hex("#bdb76b")
#     darkorchid = Color.from_hex("#9932cc")
#     darkorange = Color.from_hex("#ff8c00")
#     darkgreen = Color.from_hex("#006400")
#     darkred = Color.from_hex("#8b0000")
#     dodgerblue = Color.from_hex("#1e90ff")
#     darkslategray = Color.from_hex("#2f4f4f")
#     dimgray = Color.from_hex("#696969")
#     deepskyblue = Color.from_hex("#00bfff")
#     firebrick = Color.from_hex("#b22222")
#     forestgreen = Color.from_hex("#228b22")
#     indigo = Color.from_hex("#4b0082")
#     ivory = Color.from_hex("#fffff0")
#     lavenderblush = Color.from_hex("#fff0f5")
#     feldspar = Color.from_hex("#d19275")
#     indianred = Color.from_hex("#cd5c5c")
#     lightgreen = Color.from_hex("#90ee90")
#     lightgrey = Color.from_hex("#d3d3d3")
#     lightskyblue = Color.from_hex("#87cefa")
#     lightslategray = Color.from_hex("#789")
#     lightslateblue = Color.from_hex("#8470ff")
#     snow = Color.from_hex("#fffafa")
#     lightseagreen = Color.from_hex("#20b2aa")
#     lightsalmon = Color.from_hex("#ffa07a")
#     darksalmon = Color.from_hex("#e9967a")
#     darkviolet = Color.from_hex("#9400d3")
#     mediumpurple = Color.from_hex("#9370d8")
#     mediumaquamarine = Color.from_hex("#66cdaa")
#     skyblue = Color.from_hex("#87ceeb")
#     lavender = Color.from_hex("#e6e6fa")
#     lightsteelblue = Color.from_hex("#b0c4de")
#     mediumvioletred = Color.from_hex("#c71585")
#     mintcream = Color.from_hex("#f5fffa")
#     navajowhite = Color.from_hex("#ffdead")
#     navy = Color.from_hex("#000080")
#     olivedrab = Color.from_hex("#6b8e23")
#     palevioletred = Color.from_hex("#d87093")
#     violetred = Color.from_hex("#d02090")
#     yellow = Color.from_hex("#ff0")
#     yellowgreen = Color.from_hex("#9acd32")
#     lawngreen = Color.from_hex("#7cfc00")
#     pink = Color.from_hex("#ffc0cb")
#     paleturquoise = Color.from_hex("#afeeee")
#     palegoldenrod = Color.from_hex("#eee8aa")
#     darkolivegreen = Color.from_hex("#556b2f")
#     darkseagreen = Color.from_hex("#8fbc8f")
#     darkturquoise = Color.from_hex("#00ced1")
#     peachpuff = Color.from_hex("#ffdab9")
#     deeppink = Color.from_hex("#ff1493")
#     violet = Color.from_hex("#ee82ee")
#     palegreen = Color.from_hex("#98fb98")
#     mediumseagreen = Color.from_hex("#3cb371")
#     peru = Color.from_hex("#cd853f")
#     saddlebrown = Color.from_hex("#8b4513")
#     sandybrown = Color.from_hex("#f4a460")
#     rosybrown = Color.from_hex("#bc8f8f")
#     purple = Color.from_hex("#800080")
#     seagreen = Color.from_hex("#2e8b57")
#     seashell = Color.from_hex("#fff5ee")
#     papayawhip = Color.from_hex("#ffefd5")
#     mediumslateblue = Color.from_hex("#7b68ee")
#     plum = Color.from_hex("#dda0dd")
#     mediumspringgreen = Color.from_hex("#00fa9a")
