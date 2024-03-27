import { AreaData, AreaStyleOptions, BarData, BarStyleOptions, BaselineData, BaselineStyleOptions, CandlestickData, CandlestickStyleOptions, Color, ColorType, CrosshairMode, DeepPartial as DP, HistogramData, HistogramStyleOptions, LastPriceAnimationMode, LineData, LineStyle, LineStyleOptions, LineType, OhlcData, PriceLineSource, PriceScaleMode, SeriesData, SeriesOptionsCommon, SingleValueData, TimeChartOptions, WhitespaceData } from "./pkg.js";


// ---------------- Enums ---------------- //
/**
 * Enum that corresponds to the different static divs of the window wrapper
*/
export enum Wrapper_Divs {
    TOP_BAR = 'div_top',
    DRAW_TOOLS = 'div_left',
    NAV_BAR = 'div_right',
    UTIL_BAR = 'div_bottom',
    CHART = 'div_center'
}

export enum Orientation {
    Horizontal,
    Vertical,
    null
}

export enum Container_Layouts {
    SINGLE,
    DOUBLE_VERT,
    DOUBLE_HORIZ,
    // TRIPLE_VERT,
    // TRIPLE_VERT_TOP,
    // TRIPLE_VERT_BOT,
    // TRIPLE_HORIZ,
    // TRIPLE_HORIZ_LEFT,
    // TRIPLE_HORIZ_RIGHT,
    // QUAD
}

// ---------------- Container/Layout/Pane Super Object Interfaces ---------------- //

export interface flex_div {
    div: HTMLDivElement,
    isFrame: boolean,
    flex_width: number,
    flex_height: number,
    orientation: Orientation
}

export interface chart_id {

}


// ---------------- Base Layout Dimensions ---------------- //
export const LAYOUT_MARGIN = 5
export const LAYOUT_CHART_MARGIN = 2
export const LAYOUT_DIM_TOP = {
    WIDTH: `100vw`,
    HEIGHT: 38,
    LEFT: 0,
    TOP: 0
}
export const LAYOUT_DIM_LEFT = {
    WIDTH: 52,
    HEIGHT: -1, //Dynamically set
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    LEFT: 0
}
export const LAYOUT_DIM_RIGHT = {
    WIDTH: 52,
    HEIGHT: -1, //Dynamically set
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    RIGHT: 0
}
export const LAYOUT_DIM_BOTTOM = {
    WIDTH: -1, //Dynamically set
    HEIGHT: 38,
    BOTTOM: 0,
    LEFT: LAYOUT_DIM_LEFT.WIDTH + LAYOUT_MARGIN
}
export const LAYOUT_DIM_CENTER = {
    WIDTH: -1, //Dynamically set
    HEIGHT: -1, //Dynamically set 
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    LEFT: LAYOUT_DIM_LEFT.WIDTH + LAYOUT_MARGIN
}


// ---------------- Series Data Type Checking Functions ---------------- //
//These are actually flawed. May be no need to fix these either.. 
//There is series data type checking on the python side and that check is better since it checks the whole
//list of data, not just the first datapoint.

/**
 * Checks if the given datatype is WhitespaceData.
 * @param data The data type to be tested
 * @returns true if data matches the WhitespaceData interface and has no extra parameters; false otherwise.
 */
function isWhitespaceData(data: SeriesData): data is WhitespaceData {
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    //Check all the Optional and expected key arguments that exist in the object.
    mandatory_keys_len += keys.includes('time') ? 1 : 0
    optional_keys_len += keys.includes('customValues') ? 1 : 0

    //Ensure Total and Mandatory key lengths match expected values
    //(If Total doesn't match it means there are excess keys and should match an extended interface)
    return (keys.length == (optional_keys_len + mandatory_keys_len) && mandatory_keys_len == 1)
}

/**
 * Checks if the given datatype is SingleValueData.
 * @param data The data type to be tested
 * @returns true if data matches the SingleValueData interface and has no extra parameters; false otherwise.
 */
function isSingleValueData(data: SeriesData): data is SingleValueData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('value') ? 1 : 0
    optional_keys_len += keys.includes('customValues') ? 1 : 0

    return (keys.length == (optional_keys_len + mandatory_keys_len) && mandatory_keys_len == 2)
}

/**
 * Checks if the given datatype is OhlcData.
 * @param data The data type to be tested
 * @returns true if data matches the OhlcData interface and has no extra parameters; false otherwise.
 */
function isOhlcData(data: SeriesData): data is OhlcData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    //OHLC Needs Open and Close to plot, High and Low aren't necessary
    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('open') ? 1 : 0
    mandatory_keys_len += keys.includes('close') ? 1 : 0
    optional_keys_len += keys.includes('customValues') ? 1 : 0
    optional_keys_len += keys.includes('high') ? 1 : 0
    optional_keys_len += keys.includes('low') ? 1 : 0

    return (keys.length == (optional_keys_len + mandatory_keys_len) && mandatory_keys_len == 3)
}

/**
 * Checks if the given datatype is CandlestickData.
 * @param data The data type to be tested
 * @returns true if data matches the CandlestickData interface and has no extra parameters; false otherwise.
 */
function isCandlestickData(data: SeriesData): data is CandlestickData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('open') ? 1 : 0
    mandatory_keys_len += keys.includes('close') ? 1 : 0
    optional_keys_len += keys.includes('customValues') ? 1 : 0
    optional_keys_len += keys.includes('high') ? 1 : 0
    optional_keys_len += keys.includes('low') ? 1 : 0
    optional_keys_len += keys.includes('color') ? 1 : 0
    optional_keys_len += keys.includes('borderColor') ? 1 : 0
    optional_keys_len += keys.includes('wickColor') ? 1 : 0

    return (keys.length == (optional_keys_len + mandatory_keys_len) && mandatory_keys_len == 3)
}

/**
 * Checks if the given datatype is BarData.
 * @param data The data type to be tested
 * @returns true if data matches the BarData interface and has no extra parameters; false otherwise.
 */
function isBarData(data: SeriesData): data is BarData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('open') ? 1 : 0
    mandatory_keys_len += keys.includes('close') ? 1 : 0
    optional_keys_len += keys.includes('customValues') ? 1 : 0
    optional_keys_len += keys.includes('high') ? 1 : 0
    optional_keys_len += keys.includes('low') ? 1 : 0
    optional_keys_len += keys.includes('color') ? 1 : 0

    return (keys.length == (optional_keys_len + mandatory_keys_len) && mandatory_keys_len == 3)
}

/**
 * Checks if the given datatype is HistogramData.
 * @param data The data type to be tested
 * @returns true if data matches the HistogramData interface and has no extra parameters; false otherwise.
 */
function isHistogramData(data: SeriesData): data is HistogramData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('value') ? 1 : 0
    optional_keys_len += keys.includes('customValues') ? 1 : 0
    optional_keys_len += keys.includes('color') ? 1 : 0

    return (keys.length == (optional_keys_len + mandatory_keys_len) && mandatory_keys_len == 2)
}

/**
 * Checks if the given datatype is LineData.
 * @param data The data type to be tested
 * @returns true if data matches the LineData interface and has no extra parameters; false otherwise.
 */
function isLineData(data: SeriesData): data is LineData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('value') ? 1 : 0
    optional_keys_len += keys.includes('customValues') ? 1 : 0
    optional_keys_len += keys.includes('color') ? 1 : 0

    return (keys.length == (optional_keys_len + mandatory_keys_len) && mandatory_keys_len == 2)
}

/**
 * Checks if the given datatype is BaselineData.
 * @param data The data type to be tested
 * @returns true if data matches the BaselineData interface and has no extra parameters; false otherwise.
 */
function isBaselineData(data: SeriesData): data is BaselineData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('value') ? 1 : 0
    optional_keys_len += keys.includes('customValues') ? 1 : 0
    optional_keys_len += keys.includes('topFillColor1') ? 1 : 0
    optional_keys_len += keys.includes('topFillColor2') ? 1 : 0
    optional_keys_len += keys.includes('topLineColor') ? 1 : 0
    optional_keys_len += keys.includes('bottomFillColor1') ? 1 : 0
    optional_keys_len += keys.includes('bottomFillColor2') ? 1 : 0
    optional_keys_len += keys.includes('bottomLineColor') ? 1 : 0

    return (keys.length == (optional_keys_len + mandatory_keys_len) && mandatory_keys_len == 2)
}

/**
 * Checks if the given datatype is AreaData.
 * @param data The data type to be tested
 * @returns true if data matches the AreaData interface and has no extra parameters; false otherwise.
 */
function isAreaData(data: SeriesData): data is AreaData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('value') ? 1 : 0
    optional_keys_len += keys.includes('customValues') ? 1 : 0
    optional_keys_len += keys.includes('lineColor') ? 1 : 0
    optional_keys_len += keys.includes('topColor') ? 1 : 0
    optional_keys_len += keys.includes('bottomColor') ? 1 : 0

    return (keys.length == (optional_keys_len + mandatory_keys_len) && mandatory_keys_len == 2)
}



// ---------------- TimeChart Options ---------------- //

/**
 * Default TimeChart Options from Lightweight Charts API.
 * Full Options Set Listed to make it easier to see what options are available
 */
const DEFAULT_CHART_OPTS: DP<TimeChartOptions> = {
    width: 0,               // ---- Default to container size ----
    height: 0,              // ---- Default to container size ----
    autoSize: true,         // ---- Default normally False ----
    watermark: {            // ---- WatermarkOptions ----
        visible: false,
        color: 'rgba(0, 0, 0, 0)',
        text: '',
        fontSize: 48,
        fontFamily: `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`,
        fontStyle: '',
        horzAlign: "center",
        vertAlign: "center"
    },
    layout: {                   // ---- Layout Options ----
        background: {
            type: ColorType.Solid,
            // color:
            // topColor:
            // bottomColor
        },
        textColor: '#191919',
        fontSize: 12,
        fontFamily: `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`
    },
    leftPriceScale:             // ---- VisiblePriceScaleOptions ----  (same as Right Price Scale)
        undefined,
    rightPriceScale: {          // ---- VisiblePriceScaleOptions ---- 
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
    overlayPriceScales: {       // ---- OverlayPriceScaleOptions ----  (No Visible or AutoScale Options)
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
    crosshair: {                // ---- Crosshair Options ---- 
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
    grid: {                     // ---- Grid Options ---- 
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
    handleScroll: {             // ---- Handle Scroll ---- 
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true
    },
    handleScale: {              // ---- Handle Scale ---- 
        mouseWheel: true,        //Options or Boolean to Enable/Disable
        pinch: true,
        axisPressedMouseMove: true,
        axisDoubleClickReset: true
    },
    kineticScroll: {            // ---- Kinetic Scroll ---- 
        touch: false,
        mouse: false
    },
    trackingMode: {},           //Only useful for Mobile
    timeScale: {                // ---- TimeScaleOptions ---- 
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
    localization: {             // ---- LocalizationOptions ---- 
        locale: 'navigator.language',
        priceFormatter: undefined,
        percentageFormatter: undefined
    },
}


/**
 * Default TimeChart Options For Lightweight PyCharts.
 */
export const DEFAULT_PYCHART_OPTS: DP<TimeChartOptions> = {
    layout: {                   // ---- Layout Options ----
        background: {
            type: ColorType.Solid,
            color: Color.black
        },
        textColor: 'white',
    },
    rightPriceScale: {          // ---- VisiblePriceScaleOptions ---- 
        mode: PriceScaleMode.Logarithmic,
    },
    crosshair: {                // ---- Crosshair Options ---- 
        mode: CrosshairMode.Normal,
    },
    kineticScroll: {            // ---- Kinetic Scroll ---- 
        mouse: true
    },
}



// ---------------- Series Options ---------------- //
// All of the following definitions serve to show the series options
// in a simple and consise place.

/**
 * Default Series Options Given by the Lightweight Charts API.
 * 
 * Each individual SeriesOptionsType is the union of these params
 * and that particular Series*Style*Options
 */
const DEFAULT_SERIES_OPTS: SeriesOptionsCommon = {
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
}

/**
 * Default Line Style in the Lightweigh Charts API
 */
const DEFAULT_LINE_STYLE_OPTIONS: LineStyleOptions = {
    color: '#2196f3',
    lineVisible: true,
    lineWidth: 3,
    lineStyle: LineStyle.Solid,
    lineType: LineType.Simple,
    //Markers
    pointMarkersVisible: false,
    pointMarkersRadius: undefined,
    //Crosshair
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 4,
    crosshairMarkerBorderColor: '',
    crosshairMarkerBackgroundColor: '',
    crosshairMarkerBorderWidth: 2,
    //Animation
    lastPriceAnimation: LastPriceAnimationMode.Disabled
}

/**
 * Default Bar Style in the Lightweigh Charts API
 */
const DEFAULT_BAR_STYLE_OPTIONS: BarStyleOptions = {
    openVisible: true,
    thinBars: true,
    upColor: '#26a69a',
    downColor: '#ef5350'
}

/**
 * Default Candlestick Style in the Lightweigh Charts API
 */
const DEFAULT_CANDLESTICK_STYLE_OPTIONS: CandlestickStyleOptions = {
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
}

/**
 * Default Area Style in the Lightweigh Charts API
 */
const DEFAULT_AREA_STYLE_OPTIONS: AreaStyleOptions = {
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
}

/**
 * Default Histogram Style in the Lightweigh Charts API
 */
const DEFAULT_HISTOGRAM_STYLE_OPTIONS: HistogramStyleOptions = {
    color: '#26a69a',
    base: 0
}

/**
 * Default Baseline Style in the Lightweigh Charts API
 */
const DEFAULT_BASELINE_STYLE_OPTIONS: BaselineStyleOptions = {
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
}
