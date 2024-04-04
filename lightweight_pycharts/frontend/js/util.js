import { get_svg } from "./icons.js";
import { ColorType, CrosshairMode, LastPriceAnimationMode, LineStyle, LineType, PriceLineSource, PriceScaleMode } from "./pkg.js";
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
export function overlay_menu(overlay_div, parent_div, items) {
    let overlay_menu = document.createElement('div');
    overlay_menu.classList.add('overlay_menu');
    parent_div.addEventListener('click', () => {
        overlay_menu.classList.add('overlay_menu_active');
        overlay_menu.style.top = `${parent_div.getBoundingClientRect().top}px`;
        overlay_menu.style.left = `${parent_div.getBoundingClientRect().right + 1}px`;
    });
    document.addEventListener('mousedown', () => {
        overlay_menu.classList.remove('overlay_menu_active');
    });
    overlay_menu.addEventListener('mousedown', (event) => { event.stopPropagation(); });
    items.forEach((item) => {
        let item_div = document.createElement('div');
        item_div.classList.add('menu_item');
        let text = document.createElement('div');
        text.classList.add('icon_text');
        text.innerHTML = item.label;
        item_div.appendChild(get_svg(item.icon));
        item_div.appendChild(text);
        item_div.addEventListener('click', () => {
            overlay_menu.classList.remove('overlay_menu_active');
            if (parent_div.firstElementChild)
                parent_div.removeChild(parent_div.firstElementChild);
            parent_div.insertBefore(get_svg(item.icon, ['icon_v_margin', 'icon_l_margin', 'icon_hover']), parent_div.firstChild);
            if (item.func)
                item.func();
        });
        overlay_menu.appendChild(item_div);
    });
    overlay_div.appendChild(overlay_menu);
}
export function isWhitespaceData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    return (mandatory_keys_len == 1);
}
export function isSingleValueData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    mandatory_keys_len += keys.includes('value') ? 1 : 0;
    return (mandatory_keys_len == 2);
}
export function isOhlcData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    mandatory_keys_len += keys.includes('open') ? 1 : 0;
    mandatory_keys_len += keys.includes('close') ? 1 : 0;
    return (mandatory_keys_len == 3);
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
export function isHistogramData(data) {
    let keys = Object.keys(data);
    let mandatory_keys_len = 0;
    let optional_keys_len = 0;
    mandatory_keys_len += keys.includes('time') ? 1 : 0;
    mandatory_keys_len += keys.includes('value') ? 1 : 0;
    optional_keys_len += keys.includes('color') ? 1 : 0;
    return (mandatory_keys_len == 2 && optional_keys_len > 0);
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
