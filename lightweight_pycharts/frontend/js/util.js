import { ColorType, CrosshairMode, LastPriceAnimationMode, LineStyle, LineType, PriceLineSource, PriceScaleMode } from "./lib/pkg.js";
export var Wrapper_Divs;
(function (Wrapper_Divs) {
    Wrapper_Divs["TOP_BAR"] = "div_top";
    Wrapper_Divs["DRAW_TOOLS"] = "div_left";
    Wrapper_Divs["NAV_BAR"] = "div_right";
    Wrapper_Divs["UTIL_BAR"] = "div_bottom";
    Wrapper_Divs["CHART"] = "div_center";
})(Wrapper_Divs || (Wrapper_Divs = {}));
export var Orientation;
(function (Orientation) {
    Orientation[Orientation["Horizontal"] = 0] = "Horizontal";
    Orientation[Orientation["Vertical"] = 1] = "Vertical";
    Orientation[Orientation["null"] = 2] = "null";
})(Orientation || (Orientation = {}));
export var Container_Layouts;
(function (Container_Layouts) {
    Container_Layouts[Container_Layouts["SINGLE"] = 0] = "SINGLE";
    Container_Layouts[Container_Layouts["DOUBLE_VERT"] = 1] = "DOUBLE_VERT";
    Container_Layouts[Container_Layouts["DOUBLE_HORIZ"] = 2] = "DOUBLE_HORIZ";
    Container_Layouts[Container_Layouts["TRIPLE_VERT"] = 3] = "TRIPLE_VERT";
    Container_Layouts[Container_Layouts["TRIPLE_VERT_LEFT"] = 4] = "TRIPLE_VERT_LEFT";
    Container_Layouts[Container_Layouts["TRIPLE_VERT_RIGHT"] = 5] = "TRIPLE_VERT_RIGHT";
    Container_Layouts[Container_Layouts["TRIPLE_HORIZ"] = 6] = "TRIPLE_HORIZ";
    Container_Layouts[Container_Layouts["TRIPLE_HORIZ_TOP"] = 7] = "TRIPLE_HORIZ_TOP";
    Container_Layouts[Container_Layouts["TRIPLE_HORIZ_BOTTOM"] = 8] = "TRIPLE_HORIZ_BOTTOM";
    Container_Layouts[Container_Layouts["QUAD_HORIZ"] = 9] = "QUAD_HORIZ";
    Container_Layouts[Container_Layouts["QUAD_VERT"] = 10] = "QUAD_VERT";
    Container_Layouts[Container_Layouts["QUAD_LEFT"] = 11] = "QUAD_LEFT";
    Container_Layouts[Container_Layouts["QUAD_RIGHT"] = 12] = "QUAD_RIGHT";
    Container_Layouts[Container_Layouts["QUAD_TOP"] = 13] = "QUAD_TOP";
    Container_Layouts[Container_Layouts["QUAD_BOTTOM"] = 14] = "QUAD_BOTTOM";
})(Container_Layouts || (Container_Layouts = {}));
const interval_list = ["s", "m", "h", "D", "W", "M", "Y"];
const interval_val_map = { "s": 1, "m": 60, "h": 3600, "D": 86400, "W": 604800, "M": 18396000, "Y": 220752000, "E": 1 };
export const interval_map = { "s": "Second", "m": "Minute", "h": "Hour", "D": "Day", "W": "Week", "M": "Month", "Y": "Year", "E": "Error" };
export class tf {
    constructor(mult, interval) {
        this.multiplier = Math.floor(mult);
        this.interval = interval;
    }
    static from_str(str_in) {
        let interval_str = str_in.charAt(str_in.length - 1);
        if (!interval_list.includes(interval_str))
            return new tf(-1, 'E');
        let mult_str = str_in.split(interval_str)[0];
        let mult_num = mult_str === "" ? 1 : parseFloat(mult_str);
        return new tf(mult_num, interval_str);
    }
    static from_value(val) {
        for (let i = interval_list.length - 1; i >= 0; i--) {
            let mult = (val / interval_val_map[interval_list[i]]);
            if (mult >= 1) {
                return new tf(mult, interval_list[i]);
            }
        }
        return new tf(-1, 'E');
    }
    toSectionLabel() { return interval_map[this.interval]; }
    toString() { return `${this.multiplier}${this.interval}`; }
    toLabel() { return `${this.multiplier} ${interval_map[this.interval]}${(this.multiplier !== 1) ? 's' : ''}`; }
    toValue() { return this.multiplier * interval_val_map[this.interval]; }
}
export const LAYOUT_MARGIN = 5;
export const LAYOUT_CHART_MARGIN = 4;
export const LAYOUT_CHART_SEP_BORDER = 2;
export const LAYOUT_DIM_TOP = {
    WIDTH: `100vw`,
    HEIGHT: 38,
    LEFT: 0,
    TOP: 0,
    V_BUFFER: 8,
    H_BUFFER: 2,
};
export const LAYOUT_DIM_LEFT = {
    WIDTH: 46,
    HEIGHT: -1,
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    LEFT: 0,
    V_BUFFER: 3,
    H_BUFFER: 6,
};
export const LAYOUT_DIM_RIGHT = {
    WIDTH: 52,
    HEIGHT: -1,
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    RIGHT: 0
};
export const LAYOUT_DIM_BOTTOM = {
    WIDTH: -1,
    HEIGHT: 38,
    BOTTOM: 0,
    LEFT: LAYOUT_DIM_LEFT.WIDTH + LAYOUT_MARGIN
};
export const LAYOUT_DIM_CENTER = {
    WIDTH: -1,
    HEIGHT: -1,
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    LEFT: LAYOUT_DIM_LEFT.WIDTH + LAYOUT_MARGIN
};
export const MIN_FRAME_WIDTH = 0.15;
export const MIN_FRAME_HEIGHT = 0.1;
export function isWhitespaceData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    return (mandatory_keys_len == 1);
}
export function isWhitespaceDataList(data) {
    return isWhitespaceData(data[0]);
}
export function isSingleValueData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    mandatory_keys_len += keys.includes('value') ? 1 : 0;
    return (mandatory_keys_len == 2);
}
export function isSingleValueDataList(data) {
    return isSingleValueData(data[0]);
}
export function isOhlcData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    mandatory_keys_len += keys.includes('open') ? 1 : 0;
    mandatory_keys_len += keys.includes('close') ? 1 : 0;
    return (mandatory_keys_len == 3);
}
export function isOhlcDataList(data) {
    return isOhlcData(data[0]);
}
export function isCandlestickData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    let optional_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    mandatory_keys_len += keys.includes('open') ? 1 : 0;
    mandatory_keys_len += keys.includes('close') ? 1 : 0;
    optional_keys_len += keys.includes('high') ? 1 : 0;
    optional_keys_len += keys.includes('low') ? 1 : 0;
    optional_keys_len += keys.includes('color') ? 1 : 0;
    optional_keys_len += keys.includes('borderColor') ? 1 : 0;
    optional_keys_len += keys.includes('wickColor') ? 1 : 0;
    return (mandatory_keys_len == 3 && optional_keys_len > 0);
}
export function isCandlestickDataList(data) {
    return isCandlestickData(data[0]);
}
export function isBarData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    let optional_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    mandatory_keys_len += keys.includes('open') ? 1 : 0;
    mandatory_keys_len += keys.includes('close') ? 1 : 0;
    optional_keys_len += keys.includes('high') ? 1 : 0;
    optional_keys_len += keys.includes('low') ? 1 : 0;
    optional_keys_len += keys.includes('color') ? 1 : 0;
    return (mandatory_keys_len == 3 && optional_keys_len > 0);
}
export function isBarDataList(data) {
    return isBarData(data[0]);
}
export function isHistogramData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    let optional_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    mandatory_keys_len += keys.includes('value') ? 1 : 0;
    optional_keys_len += keys.includes('color') ? 1 : 0;
    return (mandatory_keys_len == 2 && optional_keys_len > 0);
}
export function isHistogramDataList(data) {
    return isHistogramData(data[0]);
}
export function isLineData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    let optional_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    mandatory_keys_len += keys.includes('value') ? 1 : 0;
    optional_keys_len += keys.includes('color') ? 1 : 0;
    return (mandatory_keys_len == 2 && optional_keys_len > 0);
}
export function isLineDataList(data) {
    return isLineData(data[0]);
}
export function isBaselineData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    let optional_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    mandatory_keys_len += keys.includes('value') ? 1 : 0;
    optional_keys_len += keys.includes('topFillColor1') ? 1 : 0;
    optional_keys_len += keys.includes('topFillColor2') ? 1 : 0;
    optional_keys_len += keys.includes('topLineColor') ? 1 : 0;
    optional_keys_len += keys.includes('bottomFillColor1') ? 1 : 0;
    optional_keys_len += keys.includes('bottomFillColor2') ? 1 : 0;
    optional_keys_len += keys.includes('bottomLineColor') ? 1 : 0;
    return (mandatory_keys_len == 2 && optional_keys_len > 0);
}
export function isBaselineDataList(data) {
    return isBaselineData(data[0]);
}
export function isAreaData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    let optional_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    mandatory_keys_len += keys.includes('value') ? 1 : 0;
    optional_keys_len += keys.includes('lineColor') ? 1 : 0;
    optional_keys_len += keys.includes('topColor') ? 1 : 0;
    optional_keys_len += keys.includes('bottomColor') ? 1 : 0;
    return (mandatory_keys_len == 2 && optional_keys_len > 0);
}
export function isAreaDataList(data) {
    return isAreaData(data[0]);
}
const DEFAULT_CHART_OPTS = {
    width: 0,
    height: 0,
    autoSize: true,
    watermark: {
        visible: false,
        color: 'rgba(0, 0, 0, 0)',
        text: '',
        fontSize: 48,
        fontFamily: `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`,
        fontStyle: '',
        horzAlign: "center",
        vertAlign: "center"
    },
    layout: {
        background: {
            type: ColorType.Solid,
        },
        textColor: '#191919',
        fontSize: 12,
        fontFamily: `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`
    },
    leftPriceScale: undefined,
    rightPriceScale: {
        visible: true,
        autoScale: true,
        mode: PriceScaleMode.Normal,
        invertScale: false,
        alignLabels: true,
        scaleMargins: {
            top: 0.2,
            bottom: 0.1
        },
        borderVisible: true,
        borderColor: '#2B2B43',
        textColor: undefined,
        entireTextOnly: false,
        ticksVisible: false,
        minimumWidth: 0
    },
    overlayPriceScales: {
        mode: PriceScaleMode.Normal,
        invertScale: false,
        alignLabels: true,
        scaleMargins: {
            top: 0.2,
            bottom: 0.1
        },
        borderVisible: true,
        borderColor: '#2B2B43',
        textColor: undefined,
        entireTextOnly: false,
        ticksVisible: false,
        minimumWidth: 0
    },
    crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
            width: 1,
            color: '#758696',
            style: LineStyle.LargeDashed,
            visible: true,
            labelVisible: true,
            labelBackgroundColor: '#4c525e'
        },
        horzLine: {
            width: 1,
            color: '#758696',
            style: LineStyle.LargeDashed,
            visible: true,
            labelVisible: true,
            labelBackgroundColor: '#4c525e'
        }
    },
    grid: {
        vertLines: {
            visible: true,
            color: '#D6DCDE',
            style: LineStyle.Solid
        },
        horzLines: {
            visible: true,
            color: '#D6DCDE',
            style: LineStyle.Solid
        },
    },
    handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true
    },
    handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
        axisDoubleClickReset: true
    },
    kineticScroll: {
        touch: false,
        mouse: false
    },
    trackingMode: {},
    timeScale: {
        rightOffset: 0,
        barSpacing: 0,
        minBarSpacing: 0.5,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
        rightBarStaysOnScroll: false,
        borderVisible: true,
        borderColor: '#2B2B43',
        visible: true,
        timeVisible: false,
        secondsVisible: true,
        shiftVisibleRangeOnNewBar: true,
        allowShiftVisibleRangeOnWhitespaceReplacement: false,
        ticksVisible: false,
        tickMarkMaxCharacterLength: undefined,
        uniformDistribution: true,
        minimumHeight: 0,
        allowBoldLabels: true,
        tickMarkFormatter: undefined
    },
    localization: {
        locale: 'navigator.language',
        priceFormatter: undefined,
        percentageFormatter: undefined
    },
};
export const DEFAULT_PYCHART_OPTS = {
    layout: {
        background: {
            type: ColorType.VerticalGradient,
            topColor: '#171c27',
            bottomColor: '#131722'
        },
        textColor: '#b2b5be',
    },
    grid: {
        vertLines: {
            color: '#222631'
        },
        horzLines: {
            color: '#222631'
        }
    },
    rightPriceScale: {
        mode: PriceScaleMode.Logarithmic,
    },
    crosshair: {
        mode: CrosshairMode.Normal,
    },
    kineticScroll: {
        touch: true
    },
};
const DEFAULT_SERIES_OPTS = {
    lastValueVisible: true,
    visible: true,
    title: '',
    priceScaleId: 'right',
    priceLineVisible: true,
    priceLineSource: PriceLineSource.LastBar,
    priceLineWidth: 1,
    priceLineColor: '',
    priceLineStyle: LineStyle.Dashed,
    priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01
    },
    baseLineVisible: false,
    baseLineColor: '#B2B5BE',
    baseLineWidth: 1,
    baseLineStyle: LineStyle.Solid,
    autoscaleInfoProvider: undefined
};
const DEFAULT_LINE_STYLE_OPTIONS = {
    color: '#2196f3',
    lineVisible: true,
    lineWidth: 3,
    lineStyle: LineStyle.Solid,
    lineType: LineType.Simple,
    pointMarkersVisible: false,
    pointMarkersRadius: undefined,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 4,
    crosshairMarkerBorderColor: '',
    crosshairMarkerBackgroundColor: '',
    crosshairMarkerBorderWidth: 2,
    lastPriceAnimation: LastPriceAnimationMode.Disabled
};
const DEFAULT_BAR_STYLE_OPTIONS = {
    openVisible: true,
    thinBars: true,
    upColor: '#26a69a',
    downColor: '#ef5350'
};
const DEFAULT_CANDLESTICK_STYLE_OPTIONS = {
    upColor: '#26a69a',
    downColor: '#ef5350',
    wickVisible: true,
    wickColor: '#737375',
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    borderVisible: true,
    borderColor: '#378658',
    borderUpColor: '#26a69a',
    borderDownColor: '#ef5350',
};
const DEFAULT_AREA_STYLE_OPTIONS = {
    topColor: 'rgba( 46, 220, 135, 0.4)',
    bottomColor: 'rgba( 40, 221, 100, 0)',
    invertFilledArea: false,
    lineVisible: true,
    lineWidth: 3,
    lineColor: '#33D778',
    lineStyle: LineStyle.Solid,
    lineType: LineType.Simple,
    pointMarkersVisible: false,
    pointMarkersRadius: undefined,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 4,
    crosshairMarkerBorderWidth: 2,
    crosshairMarkerBorderColor: '',
    crosshairMarkerBackgroundColor: '',
    lastPriceAnimation: LastPriceAnimationMode.Disabled
};
const DEFAULT_HISTOGRAM_STYLE_OPTIONS = {
    color: '#26a69a',
    base: 0
};
const DEFAULT_BASELINE_STYLE_OPTIONS = {
    baseValue: {
        type: 'price',
        price: 0
    },
    lineVisible: true,
    lineWidth: 3,
    lineType: LineType.Simple,
    lineStyle: LineStyle.Solid,
    topLineColor: 'rgba(38, 166, 154, 1)',
    topFillColor1: 'rgba(38, 166, 154, 0.28)',
    topFillColor2: 'rgba(38, 166, 154, 0.05)',
    bottomLineColor: 'rgba(239, 83, 80, 1)',
    bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
    bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
    pointMarkersVisible: false,
    pointMarkersRadius: undefined,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 4,
    crosshairMarkerBorderWidth: 2,
    crosshairMarkerBorderColor: '',
    crosshairMarkerBackgroundColor: '',
    lastPriceAnimation: LastPriceAnimationMode.Disabled
};
export const fake_bar_data = [
    { "time": 1591623000, "open": 320.22, "high": 323.41, "low": 298.6, "close": 304.21 },
    { "time": 1592227800, "open": 298.02, "high": 315.64, "low": 296.74, "close": 308.64 },
    { "time": 1592832600, "open": 307.99, "high": 314.5, "low": 299.42, "close": 300.05 },
    { "time": 1593437400, "open": 301.41, "high": 315.7, "low": 298.93, "close": 312.23 },
    { "time": 1594042200, "open": 316.37, "high": 317.88, "low": 310.68, "close": 317.59 },
    { "time": 1594647000, "open": 320.13, "high": 323.04, "low": 312, "close": 321.72 },
    { "time": 1595251800, "open": 321.43, "high": 327.23, "low": 319.246, "close": 320.88 },
    { "time": 1595856600, "open": 321.63, "high": 326.63, "low": 319.64, "close": 326.52 },
    { "time": 1596461400, "open": 328.32, "high": 334.88, "low": 327.73, "close": 334.57 },
    { "time": 1597066200, "open": 335.06, "high": 338.28, "low": 332.01, "close": 336.84 },
    { "time": 1597671000, "open": 337.94, "high": 339.72, "low": 335.22, "close": 339.48 },
    { "time": 1598275800, "open": 342.12, "high": 350.72, "low": 339.4504, "close": 350.58 },
    { "time": 1598880600, "open": 350.35, "high": 358.75, "low": 334.87, "close": 342.57 },
    { "time": 1599571800, "open": 336.71, "high": 342.64, "low": 331, "close": 334.06 },
    { "time": 1600090200, "open": 337.49, "high": 343.06, "low": 327.97, "close": 330.65 },
    { "time": 1600695000, "open": 325.7, "high": 331.2, "low": 319.8, "close": 328.73 },
    { "time": 1601299800, "open": 333.22, "high": 338.74, "low": 331.19, "close": 333.84 },
    { "time": 1601904600, "open": 336.06, "high": 347.35, "low": 334.38, "close": 346.85 },
    { "time": 1602509400, "open": 349.59, "high": 354.02, "low": 343.13, "close": 347.29 },
    { "time": 1603114200, "open": 348.65, "high": 349.33, "low": 340.65, "close": 345.78 },
    { "time": 1603719000, "open": 342.13, "high": 342.98, "low": 322.6, "close": 326.54 },
    { "time": 1604327400, "open": 330.2, "high": 352.19, "low": 327.24, "close": 350.16 },
    { "time": 1604932200, "open": 363.97, "high": 364.38, "low": 350.51, "close": 358.1 },
    { "time": 1605537000, "open": 360.98, "high": 362.78, "low": 354.15, "close": 355.33 },
    { "time": 1606141800, "open": 357.28, "high": 364.18, "low": 354.865, "close": 363.67 },
    { "time": 1606746600, "open": 362.83, "high": 369.85, "low": 359.17, "close": 369.85 },
    { "time": 1607351400, "open": 369.02, "high": 371.05, "low": 363.26, "close": 366.3 },
    { "time": 1607956200, "open": 368.64, "high": 372.46, "low": 364.47, "close": 369.18 },
    { "time": 1608561000, "open": 364.97, "high": 378.46, "low": 362.03, "close": 369 },
    { "time": 1609165800, "open": 371.74, "high": 374.66, "low": 370.83, "close": 373.88 },
    { "time": 1609770600, "open": 375.31, "high": 381.49, "low": 364.82, "close": 381.26 },
    { "time": 1610375400, "open": 377.85, "high": 381.13, "low": 373.7, "close": 375.7 },
    { "time": 1611066600, "open": 378.34, "high": 384.95, "low": 376.75, "close": 382.88 },
    { "time": 1611585000, "open": 383.67, "high": 385.85, "low": 368.27, "close": 370.07 },
    { "time": 1612189800, "open": 373.72, "high": 388.47, "low": 370.376, "close": 387.71 },
    { "time": 1612794600, "open": 389.27, "high": 392.9, "low": 387.5, "close": 392.64 },
    { "time": 1613485800, "open": 393.96, "high": 394.17, "low": 387.74, "close": 390.03 },
    { "time": 1614004200, "open": 387.06, "high": 392.23, "low": 378.23, "close": 380.36 },
    { "time": 1614609000, "open": 385.59, "high": 390.92, "low": 371.88, "close": 383.63 },
    { "time": 1615213800, "open": 384.66, "high": 395.65, "low": 381.42, "close": 394.06 },
    { "time": 1615815000, "open": 394.33, "high": 398.12, "low": 387.15, "close": 389.48 },
    { "time": 1616419800, "open": 390.03, "high": 396.41, "low": 383.9, "close": 395.98 },
    { "time": 1617024600, "open": 394.4, "high": 400.67, "low": 392.81, "close": 400.61 },
    { "time": 1617629400, "open": 403.46, "high": 411.67, "low": 403.38, "close": 411.49 },
    { "time": 1618234200, "open": 410.85, "high": 417.91, "low": 410.2, "close": 417.26 },
    { "time": 1618839000, "open": 416.26, "high": 418.25, "low": 410.59, "close": 416.74 },
    { "time": 1619443800, "open": 417.44, "high": 420.72, "low": 416.3, "close": 417.3 },
    { "time": 1620048600, "open": 419.43, "high": 422.815, "low": 411.67, "close": 422.12 },
    { "time": 1620653400, "open": 422.5, "high": 422.74, "low": 404, "close": 416.58 },
    { "time": 1621258200, "open": 415.39, "high": 418.2, "low": 405.33, "close": 414.94 },
    { "time": 1621863000, "open": 417.34, "high": 421.25, "low": 417.08, "close": 420.04 },
    { "time": 1622554200, "open": 422.57, "high": 422.92, "low": 416.28, "close": 422.6 },
    { "time": 1623072600, "open": 422.59, "high": 424.63, "low": 420.32, "close": 424.31 },
    { "time": 1623677400, "open": 424.43, "high": 425.46, "low": 414.7, "close": 414.92 },
    { "time": 1624282200, "open": 416.8, "high": 427.0943, "low": 415.93, "close": 426.61 },
    { "time": 1624887000, "open": 427.17, "high": 434.1, "low": 425.89, "close": 433.72 },
    { "time": 1625578200, "open": 433.78, "high": 435.84, "low": 427.52, "close": 435.52 },
    { "time": 1626096600, "open": 435.43, "high": 437.92, "low": 430.92, "close": 431.34 },
    { "time": 1626701400, "open": 426.19, "high": 440.3, "low": 421.97, "close": 439.94 },
    { "time": 1627306200, "open": 439.31, "high": 441.8, "low": 435.99, "close": 438.51 },
    { "time": 1627911000, "open": 440.34, "high": 442.94, "low": 436.1, "close": 442.49 },
    { "time": 1628515800, "open": 442.46, "high": 445.94, "low": 441.31, "close": 445.92 },
    { "time": 1629120600, "open": 444.53, "high": 447.11, "low": 436.12, "close": 443.36 },
    { "time": 1629725400, "open": 445.16, "high": 450.65, "low": 443.4355, "close": 450.25 },
    { "time": 1630330200, "open": 450.97, "high": 454.05, "low": 450.71, "close": 453.08 },
    { "time": 1631021400, "open": 452.71, "high": 452.81, "low": 445.31, "close": 445.44 },
    { "time": 1631539800, "open": 448.64, "high": 448.92, "low": 441.02, "close": 441.4 },
    { "time": 1632144600, "open": 434.88, "high": 444.89, "low": 428.86, "close": 443.91 },
    { "time": 1632749400, "open": 442.81, "high": 444.05, "low": 427.23, "close": 434.24 },
    { "time": 1633354200, "open": 433, "high": 441.68, "low": 426.36, "close": 437.86 },
    { "time": 1633959000, "open": 437.16, "high": 446.26, "low": 431.54, "close": 445.87 },
    { "time": 1634563800, "open": 443.97, "high": 454.67, "low": 443.27, "close": 453.12 },
    { "time": 1635168600, "open": 454.28, "high": 459.56, "low": 452.39, "close": 459.25 },
    { "time": 1635773400, "open": 460.3, "high": 470.65, "low": 458.2, "close": 468.53 },
    { "time": 1636381800, "open": 469.7, "high": 470.23, "low": 462.04, "close": 467.27 },
    { "time": 1636986600, "open": 468.64, "high": 470.94, "low": 466.23, "close": 468.89 },
    { "time": 1637591400, "open": 470.89, "high": 473.54, "low": 457.77, "close": 458.97 },
    { "time": 1638196200, "open": 464.07, "high": 466.56, "low": 448.92, "close": 453.42 },
    { "time": 1638801000, "open": 456.13, "high": 470.9, "low": 453.56, "close": 470.74 },
    { "time": 1639405800, "open": 470.19, "high": 472.87, "low": 458.06, "close": 459.87 },
    { "time": 1640010600, "open": 454.48, "high": 472.19, "low": 451.14, "close": 470.6 },
    { "time": 1640615400, "open": 472.06, "high": 479, "low": 472.01, "close": 474.96 },
    { "time": 1641220200, "open": 476.3, "high": 479.98, "low": 464.65, "close": 466.09 },
    { "time": 1641825000, "open": 462.7, "high": 473.2, "low": 456.5973, "close": 464.72 },
    { "time": 1642516200, "open": 459.74, "high": 459.96, "low": 437.95, "close": 437.98 },
    { "time": 1643034600, "open": 432.03, "high": 444.04, "low": 420.76, "close": 441.95 },
    { "time": 1643639400, "open": 441.24, "high": 458.12, "low": 439.81, "close": 448.7 },
    { "time": 1644244200, "open": 449.51, "high": 457.88, "low": 438.94, "close": 440.46 },
    { "time": 1644849000, "open": 439.92, "high": 448.055, "low": 431.82, "close": 434.23 },
    { "time": 1645540200, "open": 431.89, "high": 437.84, "low": 410.64, "close": 437.75 },
    { "time": 1646058600, "open": 432.03, "high": 441.11, "low": 427.11, "close": 432.17 },
    { "time": 1646663400, "open": 431.55, "high": 432.3018, "low": 415.12, "close": 420.07 },
    { "time": 1647264600, "open": 420.89, "high": 444.86, "low": 415.79, "close": 444.52 },
    { "time": 1647869400, "open": 444.34, "high": 452.98, "low": 440.68, "close": 452.69 },
    { "time": 1648474200, "open": 452.06, "high": 462.07, "low": 449.14, "close": 452.92 },
    { "time": 1649079000, "open": 453.13, "high": 457.83, "low": 443.47, "close": 447.57 },
    { "time": 1649683800, "open": 444.11, "high": 445.75, "low": 436.6501, "close": 437.79 },
    { "time": 1650288600, "open": 436.81, "high": 450.01, "low": 425.44, "close": 426.04 },
    { "time": 1650893400, "open": 423.67, "high": 429.64, "low": 411.21, "close": 412 },
    { "time": 1651498200, "open": 412.07, "high": 429.66, "low": 405.02, "close": 411.34 },
    { "time": 1652103000, "open": 405.1, "high": 406.41, "low": 385.15, "close": 401.72 },
    { "time": 1652707800, "open": 399.98, "high": 408.57, "low": 380.54, "close": 389.63 },
    { "time": 1653312600, "open": 392.83, "high": 415.3801, "low": 386.96, "close": 415.26 },
    { "time": 1654003800, "open": 413.55, "high": 417.44, "low": 406.93, "close": 410.54 },
    { "time": 1654522200, "open": 414.78, "high": 416.609, "low": 389.75, "close": 389.8 },
    { "time": 1655127000, "open": 379.85, "high": 383.9, "low": 362.17, "close": 365.86 },
    { "time": 1655818200, "open": 371.89, "high": 390.09, "low": 370.18, "close": 390.08 },
    { "time": 1656336600, "open": 391.05, "high": 393.16, "low": 372.56, "close": 381.24 },
    { "time": 1657027800, "open": 375.88, "high": 390.64, "low": 372.9, "close": 388.67 },
    { "time": 1657546200, "open": 385.85, "high": 386.87, "low": 371.04, "close": 385.13 },
    { "time": 1658151000, "open": 388.38, "high": 400.18, "low": 380.66, "close": 395.09 },
    { "time": 1658755800, "open": 395.75, "high": 413.03, "low": 389.95, "close": 411.99 },
    { "time": 1659360600, "open": 409.15, "high": 415.68, "low": 406.82, "close": 413.47 },
    { "time": 1659965400, "open": 415.25, "high": 427.21, "low": 410.22, "close": 427.1 },
    { "time": 1660570200, "open": 424.765, "high": 431.73, "low": 421.22, "close": 422.14 },
    { "time": 1661175000, "open": 417.05, "high": 419.96, "low": 405.25, "close": 405.31 },
    { "time": 1661779800, "open": 402.2, "high": 405.84, "low": 390.04, "close": 392.24 },
    { "time": 1662471000, "open": 393.13, "high": 407.51, "low": 388.42, "close": 406.6 },
    { "time": 1662989400, "open": 408.78, "high": 411.73, "low": 382.11, "close": 385.56 },
    { "time": 1663594200, "open": 382.26, "high": 389.31, "low": 363.29, "close": 367.95 },
    { "time": 1664199000, "open": 366.41, "high": 372.3, "low": 357.04, "close": 357.18 },
    { "time": 1664803800, "open": 361.08, "high": 379.46, "low": 359.21, "close": 362.79 },
    { "time": 1665408600, "open": 363.96, "high": 370.26, "low": 348.11, "close": 357.63 },
    { "time": 1666013400, "open": 364.01, "high": 375.45, "low": 357.2808, "close": 374.29 },
    { "time": 1666618200, "open": 375.89, "high": 389.52, "low": 373.11, "close": 389.02 },
    { "time": 1667223000, "open": 386.44, "high": 390.39, "low": 368.79, "close": 376.35 },
    { "time": 1667831400, "open": 377.71, "high": 399.35, "low": 373.61, "close": 398.51 },
    { "time": 1668436200, "open": 396.66, "high": 402.31, "low": 390.14, "close": 396.03 },
    { "time": 1669041000, "open": 394.64, "high": 402.93, "low": 392.66, "close": 402.33 },
    { "time": 1669645800, "open": 399.09, "high": 410, "low": 393.3, "close": 406.91 },
    { "time": 1670250600, "open": 403.95, "high": 404.93, "low": 391.64, "close": 393.28 },
    { "time": 1670855400, "open": 394.11, "high": 410.49, "low": 381.04, "close": 383.27 },
    { "time": 1671460200, "open": 383.47, "high": 387.41, "low": 374.77, "close": 382.91 },
    { "time": 1672151400, "open": 382.79, "high": 384.35, "low": 376.42, "close": 382.43 },
    { "time": 1672756200, "open": 384.37, "high": 389.25, "low": 377.831, "close": 388.08 },
    { "time": 1673274600, "open": 390.37, "high": 399.1, "low": 386.27, "close": 398.5 },
    { "time": 1673965800, "open": 398.48, "high": 400.23, "low": 387.26, "close": 395.88 },
    { "time": 1674484200, "open": 396.72, "high": 408.16, "low": 393.56, "close": 405.68 },
    { "time": 1675089000, "open": 402.8, "high": 418.31, "low": 400.28, "close": 412.35 },
    { "time": 1675693800, "open": 409.79, "high": 416.49, "low": 405.01, "close": 408.04 },
    { "time": 1676298600, "open": 408.72, "high": 415.05, "low": 404.05, "close": 407.26 },
    { "time": 1676989800, "open": 403.06, "high": 404.16, "low": 393.64, "close": 396.38 },
    { "time": 1677508200, "open": 399.87, "high": 404.45, "low": 392.33, "close": 404.19 },
    { "time": 1678113000, "open": 405.05, "high": 407.45, "low": 384.32, "close": 385.91 },
    { "time": 1678714200, "open": 381.81, "high": 396.47, "low": 380.65, "close": 389.99 },
    { "time": 1679319000, "open": 390.8, "high": 402.49, "low": 389.4, "close": 395.75 },
    { "time": 1679923800, "open": 398.12, "high": 409.7, "low": 393.69, "close": 409.39 },
    { "time": 1680528600, "open": 408.85, "high": 411.92, "low": 405.678, "close": 409.19 },
    { "time": 1681133400, "open": 406.61, "high": 415.09, "low": 405.97, "close": 412.46 },
    { "time": 1681738200, "open": 412.37, "high": 415.72, "low": 410.17, "close": 412.2 },
    { "time": 1682343000, "open": 411.99, "high": 415.94, "low": 403.78, "close": 415.93 },
    { "time": 1682947800, "open": 415.47, "high": 417.62, "low": 403.74, "close": 412.63 },
    { "time": 1683552600, "open": 412.97, "high": 414.535, "low": 408.87, "close": 411.59 },
    { "time": 1684157400, "open": 412.22, "high": 420.72, "low": 410.23, "close": 418.62 },
    { "time": 1684762200, "open": 418.64, "high": 420.77, "low": 409.8795, "close": 420.02 },
    { "time": 1685453400, "open": 422.03, "high": 428.74, "low": 416.22, "close": 427.92 },
    { "time": 1685971800, "open": 428.28, "high": 431.99, "low": 425.82, "close": 429.9 },
    { "time": 1686576600, "open": 430.92, "high": 443.9, "low": 430.17, "close": 439.46 },
    { "time": 1687267800, "open": 437.45, "high": 438.37, "low": 432.47, "close": 433.21 },
    { "time": 1687786200, "open": 432.62, "high": 444.3, "low": 431.19, "close": 443.28 },
    { "time": 1688391000, "open": 442.92, "high": 444.08, "low": 437.06, "close": 438.55 },
    { "time": 1688995800, "open": 438.18, "high": 451.36, "low": 437.585, "close": 449.28 },
    { "time": 1689600600, "open": 449.13, "high": 456.43, "low": 449.08, "close": 452.18 },
    { "time": 1690205400, "open": 453.37, "high": 459.44, "low": 451.55, "close": 456.92 },
    { "time": 1690810200, "open": 457.41, "high": 458.16, "low": 446.27, "close": 446.81 },
    { "time": 1691415000, "open": 448.71, "high": 451.7, "low": 443.345, "close": 445.65 },
    { "time": 1692019800, "open": 444.7, "high": 448.11, "low": 433.01, "close": 436.5 },
    { "time": 1692624600, "open": 437.55, "high": 445.22, "low": 435, "close": 439.97 },
    { "time": 1693229400, "open": 442.24, "high": 453.67, "low": 439.9728, "close": 451.19 },
    { "time": 1693920600, "open": 450.73, "high": 451.06, "low": 442.75, "close": 445.52 },
    { "time": 1694439000, "open": 448.24, "high": 451.08, "low": 442.92, "close": 443.37 },
    { "time": 1695043800, "open": 443.05, "high": 444.97, "low": 429.99, "close": 430.42 },
    { "time": 1695648600, "open": 429.17, "high": 432.27, "low": 422.29, "close": 427.48 },
    { "time": 1696253400, "open": 426.62, "high": 431.125, "low": 420.18, "close": 429.54 },
    { "time": 1696858200, "open": 427.58, "high": 437.335, "low": 427.0101, "close": 431.5 },
    { "time": 1697463000, "open": 433.82, "high": 438.14, "low": 421.08, "close": 421.19 },
    { "time": 1698067800, "open": 419.61, "high": 424.82, "low": 409.21, "close": 410.68 },
    { "time": 1698672600, "open": 413.56, "high": 436.29, "low": 412.22, "close": 434.69 },
    { "time": 1699281000, "open": 435.47, "high": 440.93, "low": 433.4, "close": 440.61 },
    { "time": 1699885800, "open": 439.23, "high": 451.42, "low": 438.42, "close": 450.79 },
];
