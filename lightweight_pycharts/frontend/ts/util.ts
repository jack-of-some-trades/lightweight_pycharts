import { get_svg, icons } from "./icons.js";
import { AnySeries, AnySeriesData, AreaData, AreaStyleOptions, BarData, BarStyleOptions, BaselineData, BaselineStyleOptions, CandlestickData, CandlestickStyleOptions, ColorType, CrosshairMode, DeepPartial as DP, HistogramData, HistogramStyleOptions, LastPriceAnimationMode, LineData, LineStyle, LineStyleOptions, LineType, OhlcData, PriceLineSource, PriceScaleMode, SeriesOptionsCommon, SingleValueData, TimeChartOptions, UTCTimestamp, WhitespaceData } from "./pkg.js";


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
    TRIPLE_VERT,
    TRIPLE_VERT_LEFT,
    TRIPLE_VERT_RIGHT,
    TRIPLE_HORIZ,
    TRIPLE_HORIZ_TOP,
    TRIPLE_HORIZ_BOTTOM,
    QUAD_HORIZ,
    QUAD_VERT,
    QUAD_LEFT,
    QUAD_RIGHT,
    QUAD_TOP,
    QUAD_BOTTOM
}

// ---------------- Container/Layout/Pane Super Object Interfaces ---------------- //

/**
 * interface that represents a portion of a Frame's Layout. Could be either a Frame or a Frame Separator
 */
export interface flex_div {
    div: HTMLDivElement,
    isFrame: boolean,
    flex_width: number,
    flex_height: number,
    orientation: Orientation,
    resize_pos: flex_div[],
    resize_neg: flex_div[],
}

/**
 * interface describing a source of data, be it a single series of OHLC data, or an indicator
 * that has mutiple sub-series or drawing primitives
 */
export interface source {
    id: string
    title: string
    expose: boolean
    series: series_id[]
}

/**
 * interface to wrap around a Series Data type with additional information
 */
export interface series_id {
    id: string
    expose: boolean
    series_obj: AnySeries
}

/**
 * Interface used when creating selectable menus
 */
export interface menu_item {
    label: string,
    icon: icons,
    func?: CallableFunction
}


// ---------------- Base Layout Dimensions ---------------- //
export const LAYOUT_MARGIN = 5
export const LAYOUT_CHART_MARGIN = 4
export const LAYOUT_CHART_SEP_BORDER = 2
export const LAYOUT_DIM_TOP = {
    WIDTH: `100vw`,
    HEIGHT: 38,
    LEFT: 0,
    TOP: 0,
    V_BUFFER: 8,
    H_BUFFER: 2,
}
export const LAYOUT_DIM_LEFT = {
    WIDTH: 46,
    HEIGHT: -1, //Dynamically set
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    LEFT: 0,
    V_BUFFER: 3,
    H_BUFFER: 6,
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

//Minimum flex Widths/Heights of each frame
export const MIN_FRAME_WIDTH = 0.15
export const MIN_FRAME_HEIGHT = 0.1


// ---------------- Generic Utility Functions ---------------- //


/**
 * Generate an overlay menu from the given menu_item interfaces
 * @param parent_div Div Element that should make this menu visible when clicked
 * @param items List of menu_item(s) to add to the menu
 */
export function overlay_menu(overlay_div: HTMLDivElement, parent_div: HTMLDivElement, items: menu_item[]) {
    let overlay_menu = document.createElement('div')
    overlay_menu.classList.add('overlay_menu')

    //Event listener to add visibility and interactivity
    parent_div.addEventListener('click', () => {
        overlay_menu.classList.add('overlay_menu_active')
        overlay_menu.style.top = `${parent_div.getBoundingClientRect().top}px`
        overlay_menu.style.left = `${parent_div.getBoundingClientRect().right + 1}px`
    })

    //Event Listener to Remove visibility and interactivity
    document.addEventListener('mousedown', () => {
        overlay_menu.classList.remove('overlay_menu_active')
    })
    //Stop the Propogation of the document mousedown event when it originates somewhere in this menu
    overlay_menu.addEventListener('mousedown', (event) => { event.stopPropagation() })

    //Append each of the requested items
    items.forEach((item) => {
        let item_div = document.createElement('div')
        item_div.classList.add('menu_item')

        let text = document.createElement('div')
        text.classList.add('icon_text')
        text.innerHTML = item.label

        item_div.appendChild(get_svg(item.icon))
        item_div.appendChild(text)

        //Setup click behavior
        item_div.addEventListener('click', () => {
            overlay_menu.classList.remove('overlay_menu_active')//Remove Visibility

            if (parent_div.firstElementChild)   //Update Menu Icon
                parent_div.removeChild(parent_div.firstElementChild)
            parent_div.insertBefore(get_svg(item.icon, ['icon_v_margin', 'icon_l_margin', 'icon_hover']), parent_div.firstChild)

            if (item.func)
                item.func()
        })

        overlay_menu.appendChild(item_div)
    });

    overlay_div.appendChild(overlay_menu)
}

// #region ---------------- Series Data Type Checking Functions ---------------- //

/**
 * Checks if the given datatype implements the WhitespaceData interface.
 * @param data The data type to be tested
 * @returns true if data matches the WhitespaceData interface; false otherwise. Extra Parameters are ignored
 */
export function isWhitespaceData(data: AnySeriesData): data is WhitespaceData {
    let keys = Object.keys(data)
    let mandatory_keys_len = 0

    //Check all the Optional and expected key arguments that exist in the object.
    mandatory_keys_len += keys.includes('time') ? 1 : 0

    //Ensure Mandatory key lengths match expected values and,
    //If there are optional keys, at least one of them is present
    return (mandatory_keys_len == 1)
}

/**
 * Checks if the given datatype implements the SingleValueData interface.
 * @param data The data type to be tested
 * @returns true if data matches the SingleValueData interface; false otherwise.
 */
export function isSingleValueData(data: AnySeriesData): data is SingleValueData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('value') ? 1 : 0

    return (mandatory_keys_len == 2)
}

/**
 * Checks if the given datatype implements the OhlcData interface.
 * @param data The data type to be tested
 * @returns true if data matches the OhlcData interface; false otherwise. Extra Parameters are ignored
 */
export function isOhlcData(data: AnySeriesData): data is OhlcData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0

    //OHLC Needs Open and Close to plot, High and Low aren't necessary
    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('open') ? 1 : 0
    mandatory_keys_len += keys.includes('close') ? 1 : 0
    // optional_keys_len += keys.includes('high') ? 1 : 0
    // optional_keys_len += keys.includes('low') ? 1 : 0

    return (mandatory_keys_len == 3)
}

/**
 * Checks if the given datatype implements the CandlestickData interface.
 * @param data The data type to be tested
 * @returns true if data matches the CandlestickData interface; false otherwise. Extra Parameters are ignored
 */
export function isCandlestickData(data: AnySeriesData): data is CandlestickData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('open') ? 1 : 0
    mandatory_keys_len += keys.includes('close') ? 1 : 0
    optional_keys_len += keys.includes('high') ? 1 : 0
    optional_keys_len += keys.includes('low') ? 1 : 0
    optional_keys_len += keys.includes('color') ? 1 : 0
    optional_keys_len += keys.includes('borderColor') ? 1 : 0
    optional_keys_len += keys.includes('wickColor') ? 1 : 0

    return (mandatory_keys_len == 3 && optional_keys_len > 0)
}

/**
 * Checks if the given datatype implements the BarData interface.
 * @param data The data type to be tested
 * @returns true if data matches the BarData interface; false otherwise. Extra Parameters are ignored
 */
export function isBarData(data: AnySeriesData): data is BarData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('open') ? 1 : 0
    mandatory_keys_len += keys.includes('close') ? 1 : 0
    optional_keys_len += keys.includes('high') ? 1 : 0
    optional_keys_len += keys.includes('low') ? 1 : 0
    optional_keys_len += keys.includes('color') ? 1 : 0

    return (mandatory_keys_len == 3 && optional_keys_len > 0)
}

/**
 * Checks if the given datatype implements the HistogramData interface.
 * @param data The data type to be tested
 * @returns true if data matches the HistogramData interface; false otherwise. Extra Parameters are ignored
 */
export function isHistogramData(data: AnySeriesData): data is HistogramData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('value') ? 1 : 0
    optional_keys_len += keys.includes('color') ? 1 : 0

    return (mandatory_keys_len == 2 && optional_keys_len > 0)
}

/**
 * Checks if the given datatype implements the LineData interface.
 * @param data The data type to be tested
 * @returns true if data matches the LineData interface; false otherwise. Extra Parameters are ignored
 */
export function isLineData(data: AnySeriesData): data is LineData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('value') ? 1 : 0
    optional_keys_len += keys.includes('color') ? 1 : 0

    return (mandatory_keys_len == 2 && optional_keys_len > 0)
}

/**
 * Checks if the given datatype implements the BaselineData interface.
 * @param data The data type to be tested
 * @returns true if data matches the BaselineData interface; false otherwise. Extra Parameters are ignored
 */
export function isBaselineData(data: AnySeriesData): data is BaselineData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('value') ? 1 : 0
    optional_keys_len += keys.includes('topFillColor1') ? 1 : 0
    optional_keys_len += keys.includes('topFillColor2') ? 1 : 0
    optional_keys_len += keys.includes('topLineColor') ? 1 : 0
    optional_keys_len += keys.includes('bottomFillColor1') ? 1 : 0
    optional_keys_len += keys.includes('bottomFillColor2') ? 1 : 0
    optional_keys_len += keys.includes('bottomLineColor') ? 1 : 0

    return (mandatory_keys_len == 2 && optional_keys_len > 0)
}

/**
 * Checks if the given datatype implements the AreaData interface.
 * @param data The data type to be tested
 * @returns true if data matches the AreaData interface; false otherwise. Extra Parameters are ignored
 */
export function isAreaData(data: AnySeriesData): data is AreaData {
    // See `isWhitespaceData` for code comments.
    let keys = Object.keys(data)
    let mandatory_keys_len = 0
    let optional_keys_len = 0

    mandatory_keys_len += keys.includes('time') ? 1 : 0
    mandatory_keys_len += keys.includes('value') ? 1 : 0
    optional_keys_len += keys.includes('lineColor') ? 1 : 0
    optional_keys_len += keys.includes('topColor') ? 1 : 0
    optional_keys_len += keys.includes('bottomColor') ? 1 : 0

    return (mandatory_keys_len == 2 && optional_keys_len > 0)
}

// #endregion

// #region ---------------- TimeChart Options ---------------- //

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
    rightPriceScale: {          // ---- VisiblePriceScaleOptions ---- 
        mode: PriceScaleMode.Logarithmic,
        // borderColor: '#161a25',
    },
    crosshair: {                // ---- Crosshair Options ---- 
        mode: CrosshairMode.Normal,
    },
    kineticScroll: {            // ---- Kinetic Scroll ---- 
        touch: true
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

//#endregion

export const fake_bar_data: BarData[] = [
    { "time": 1591623000 as UTCTimestamp, "open": 320.22, "high": 323.41, "low": 298.6, "close": 304.21 },
    { "time": 1592227800 as UTCTimestamp, "open": 298.02, "high": 315.64, "low": 296.74, "close": 308.64 },
    { "time": 1592832600 as UTCTimestamp, "open": 307.99, "high": 314.5, "low": 299.42, "close": 300.05 },
    { "time": 1593437400 as UTCTimestamp, "open": 301.41, "high": 315.7, "low": 298.93, "close": 312.23 },
    { "time": 1594042200 as UTCTimestamp, "open": 316.37, "high": 317.88, "low": 310.68, "close": 317.59 },
    { "time": 1594647000 as UTCTimestamp, "open": 320.13, "high": 323.04, "low": 312, "close": 321.72 },
    { "time": 1595251800 as UTCTimestamp, "open": 321.43, "high": 327.23, "low": 319.246, "close": 320.88 },
    { "time": 1595856600 as UTCTimestamp, "open": 321.63, "high": 326.63, "low": 319.64, "close": 326.52 },
    { "time": 1596461400 as UTCTimestamp, "open": 328.32, "high": 334.88, "low": 327.73, "close": 334.57 },
    { "time": 1597066200 as UTCTimestamp, "open": 335.06, "high": 338.28, "low": 332.01, "close": 336.84 },
    { "time": 1597671000 as UTCTimestamp, "open": 337.94, "high": 339.72, "low": 335.22, "close": 339.48 },
    { "time": 1598275800 as UTCTimestamp, "open": 342.12, "high": 350.72, "low": 339.4504, "close": 350.58 },
    { "time": 1598880600 as UTCTimestamp, "open": 350.35, "high": 358.75, "low": 334.87, "close": 342.57 },
    { "time": 1599571800 as UTCTimestamp, "open": 336.71, "high": 342.64, "low": 331, "close": 334.06 },
    { "time": 1600090200 as UTCTimestamp, "open": 337.49, "high": 343.06, "low": 327.97, "close": 330.65 },
    { "time": 1600695000 as UTCTimestamp, "open": 325.7, "high": 331.2, "low": 319.8, "close": 328.73 },
    { "time": 1601299800 as UTCTimestamp, "open": 333.22, "high": 338.74, "low": 331.19, "close": 333.84 },
    { "time": 1601904600 as UTCTimestamp, "open": 336.06, "high": 347.35, "low": 334.38, "close": 346.85 },
    { "time": 1602509400 as UTCTimestamp, "open": 349.59, "high": 354.02, "low": 343.13, "close": 347.29 },
    { "time": 1603114200 as UTCTimestamp, "open": 348.65, "high": 349.33, "low": 340.65, "close": 345.78 },
    { "time": 1603719000 as UTCTimestamp, "open": 342.13, "high": 342.98, "low": 322.6, "close": 326.54 },
    { "time": 1604327400 as UTCTimestamp, "open": 330.2, "high": 352.19, "low": 327.24, "close": 350.16 },
    { "time": 1604932200 as UTCTimestamp, "open": 363.97, "high": 364.38, "low": 350.51, "close": 358.1 },
    { "time": 1605537000 as UTCTimestamp, "open": 360.98, "high": 362.78, "low": 354.15, "close": 355.33 },
    { "time": 1606141800 as UTCTimestamp, "open": 357.28, "high": 364.18, "low": 354.865, "close": 363.67 },
    { "time": 1606746600 as UTCTimestamp, "open": 362.83, "high": 369.85, "low": 359.17, "close": 369.85 },
    { "time": 1607351400 as UTCTimestamp, "open": 369.02, "high": 371.05, "low": 363.26, "close": 366.3 },
    { "time": 1607956200 as UTCTimestamp, "open": 368.64, "high": 372.46, "low": 364.47, "close": 369.18 },
    { "time": 1608561000 as UTCTimestamp, "open": 364.97, "high": 378.46, "low": 362.03, "close": 369 },
    { "time": 1609165800 as UTCTimestamp, "open": 371.74, "high": 374.66, "low": 370.83, "close": 373.88 },
    { "time": 1609770600 as UTCTimestamp, "open": 375.31, "high": 381.49, "low": 364.82, "close": 381.26 },
    { "time": 1610375400 as UTCTimestamp, "open": 377.85, "high": 381.13, "low": 373.7, "close": 375.7 },
    { "time": 1611066600 as UTCTimestamp, "open": 378.34, "high": 384.95, "low": 376.75, "close": 382.88 },
    { "time": 1611585000 as UTCTimestamp, "open": 383.67, "high": 385.85, "low": 368.27, "close": 370.07 },
    { "time": 1612189800 as UTCTimestamp, "open": 373.72, "high": 388.47, "low": 370.376, "close": 387.71 },
    { "time": 1612794600 as UTCTimestamp, "open": 389.27, "high": 392.9, "low": 387.5, "close": 392.64 },
    { "time": 1613485800 as UTCTimestamp, "open": 393.96, "high": 394.17, "low": 387.74, "close": 390.03 },
    { "time": 1614004200 as UTCTimestamp, "open": 387.06, "high": 392.23, "low": 378.23, "close": 380.36 },
    { "time": 1614609000 as UTCTimestamp, "open": 385.59, "high": 390.92, "low": 371.88, "close": 383.63 },
    { "time": 1615213800 as UTCTimestamp, "open": 384.66, "high": 395.65, "low": 381.42, "close": 394.06 },
    { "time": 1615815000 as UTCTimestamp, "open": 394.33, "high": 398.12, "low": 387.15, "close": 389.48 },
    { "time": 1616419800 as UTCTimestamp, "open": 390.03, "high": 396.41, "low": 383.9, "close": 395.98 },
    { "time": 1617024600 as UTCTimestamp, "open": 394.4, "high": 400.67, "low": 392.81, "close": 400.61 },
    { "time": 1617629400 as UTCTimestamp, "open": 403.46, "high": 411.67, "low": 403.38, "close": 411.49 },
    { "time": 1618234200 as UTCTimestamp, "open": 410.85, "high": 417.91, "low": 410.2, "close": 417.26 },
    { "time": 1618839000 as UTCTimestamp, "open": 416.26, "high": 418.25, "low": 410.59, "close": 416.74 },
    { "time": 1619443800 as UTCTimestamp, "open": 417.44, "high": 420.72, "low": 416.3, "close": 417.3 },
    { "time": 1620048600 as UTCTimestamp, "open": 419.43, "high": 422.815, "low": 411.67, "close": 422.12 },
    { "time": 1620653400 as UTCTimestamp, "open": 422.5, "high": 422.74, "low": 404, "close": 416.58 },
    { "time": 1621258200 as UTCTimestamp, "open": 415.39, "high": 418.2, "low": 405.33, "close": 414.94 },
    { "time": 1621863000 as UTCTimestamp, "open": 417.34, "high": 421.25, "low": 417.08, "close": 420.04 },
    { "time": 1622554200 as UTCTimestamp, "open": 422.57, "high": 422.92, "low": 416.28, "close": 422.6 },
    { "time": 1623072600 as UTCTimestamp, "open": 422.59, "high": 424.63, "low": 420.32, "close": 424.31 },
    { "time": 1623677400 as UTCTimestamp, "open": 424.43, "high": 425.46, "low": 414.7, "close": 414.92 },
    { "time": 1624282200 as UTCTimestamp, "open": 416.8, "high": 427.0943, "low": 415.93, "close": 426.61 },
    { "time": 1624887000 as UTCTimestamp, "open": 427.17, "high": 434.1, "low": 425.89, "close": 433.72 },
    { "time": 1625578200 as UTCTimestamp, "open": 433.78, "high": 435.84, "low": 427.52, "close": 435.52 },
    { "time": 1626096600 as UTCTimestamp, "open": 435.43, "high": 437.92, "low": 430.92, "close": 431.34 },
    { "time": 1626701400 as UTCTimestamp, "open": 426.19, "high": 440.3, "low": 421.97, "close": 439.94 },
    { "time": 1627306200 as UTCTimestamp, "open": 439.31, "high": 441.8, "low": 435.99, "close": 438.51 },
    { "time": 1627911000 as UTCTimestamp, "open": 440.34, "high": 442.94, "low": 436.1, "close": 442.49 },
    { "time": 1628515800 as UTCTimestamp, "open": 442.46, "high": 445.94, "low": 441.31, "close": 445.92 },
    { "time": 1629120600 as UTCTimestamp, "open": 444.53, "high": 447.11, "low": 436.12, "close": 443.36 },
    { "time": 1629725400 as UTCTimestamp, "open": 445.16, "high": 450.65, "low": 443.4355, "close": 450.25 },
    { "time": 1630330200 as UTCTimestamp, "open": 450.97, "high": 454.05, "low": 450.71, "close": 453.08 },
    { "time": 1631021400 as UTCTimestamp, "open": 452.71, "high": 452.81, "low": 445.31, "close": 445.44 },
    { "time": 1631539800 as UTCTimestamp, "open": 448.64, "high": 448.92, "low": 441.02, "close": 441.4 },
    { "time": 1632144600 as UTCTimestamp, "open": 434.88, "high": 444.89, "low": 428.86, "close": 443.91 },
    { "time": 1632749400 as UTCTimestamp, "open": 442.81, "high": 444.05, "low": 427.23, "close": 434.24 },
    { "time": 1633354200 as UTCTimestamp, "open": 433, "high": 441.68, "low": 426.36, "close": 437.86 },
    { "time": 1633959000 as UTCTimestamp, "open": 437.16, "high": 446.26, "low": 431.54, "close": 445.87 },
    { "time": 1634563800 as UTCTimestamp, "open": 443.97, "high": 454.67, "low": 443.27, "close": 453.12 },
    { "time": 1635168600 as UTCTimestamp, "open": 454.28, "high": 459.56, "low": 452.39, "close": 459.25 },
    { "time": 1635773400 as UTCTimestamp, "open": 460.3, "high": 470.65, "low": 458.2, "close": 468.53 },
    { "time": 1636381800 as UTCTimestamp, "open": 469.7, "high": 470.23, "low": 462.04, "close": 467.27 },
    { "time": 1636986600 as UTCTimestamp, "open": 468.64, "high": 470.94, "low": 466.23, "close": 468.89 },
    { "time": 1637591400 as UTCTimestamp, "open": 470.89, "high": 473.54, "low": 457.77, "close": 458.97 },
    { "time": 1638196200 as UTCTimestamp, "open": 464.07, "high": 466.56, "low": 448.92, "close": 453.42 },
    { "time": 1638801000 as UTCTimestamp, "open": 456.13, "high": 470.9, "low": 453.56, "close": 470.74 },
    { "time": 1639405800 as UTCTimestamp, "open": 470.19, "high": 472.87, "low": 458.06, "close": 459.87 },
    { "time": 1640010600 as UTCTimestamp, "open": 454.48, "high": 472.19, "low": 451.14, "close": 470.6 },
    { "time": 1640615400 as UTCTimestamp, "open": 472.06, "high": 479, "low": 472.01, "close": 474.96 },
    { "time": 1641220200 as UTCTimestamp, "open": 476.3, "high": 479.98, "low": 464.65, "close": 466.09 },
    { "time": 1641825000 as UTCTimestamp, "open": 462.7, "high": 473.2, "low": 456.5973, "close": 464.72 },
    { "time": 1642516200 as UTCTimestamp, "open": 459.74, "high": 459.96, "low": 437.95, "close": 437.98 },
    { "time": 1643034600 as UTCTimestamp, "open": 432.03, "high": 444.04, "low": 420.76, "close": 441.95 },
    { "time": 1643639400 as UTCTimestamp, "open": 441.24, "high": 458.12, "low": 439.81, "close": 448.7 },
    { "time": 1644244200 as UTCTimestamp, "open": 449.51, "high": 457.88, "low": 438.94, "close": 440.46 },
    { "time": 1644849000 as UTCTimestamp, "open": 439.92, "high": 448.055, "low": 431.82, "close": 434.23 },
    { "time": 1645540200 as UTCTimestamp, "open": 431.89, "high": 437.84, "low": 410.64, "close": 437.75 },
    { "time": 1646058600 as UTCTimestamp, "open": 432.03, "high": 441.11, "low": 427.11, "close": 432.17 },
    { "time": 1646663400 as UTCTimestamp, "open": 431.55, "high": 432.3018, "low": 415.12, "close": 420.07 },
    { "time": 1647264600 as UTCTimestamp, "open": 420.89, "high": 444.86, "low": 415.79, "close": 444.52 },
    { "time": 1647869400 as UTCTimestamp, "open": 444.34, "high": 452.98, "low": 440.68, "close": 452.69 },
    { "time": 1648474200 as UTCTimestamp, "open": 452.06, "high": 462.07, "low": 449.14, "close": 452.92 },
    { "time": 1649079000 as UTCTimestamp, "open": 453.13, "high": 457.83, "low": 443.47, "close": 447.57 },
    { "time": 1649683800 as UTCTimestamp, "open": 444.11, "high": 445.75, "low": 436.6501, "close": 437.79 },
    { "time": 1650288600 as UTCTimestamp, "open": 436.81, "high": 450.01, "low": 425.44, "close": 426.04 },
    { "time": 1650893400 as UTCTimestamp, "open": 423.67, "high": 429.64, "low": 411.21, "close": 412 },
    { "time": 1651498200 as UTCTimestamp, "open": 412.07, "high": 429.66, "low": 405.02, "close": 411.34 },
    { "time": 1652103000 as UTCTimestamp, "open": 405.1, "high": 406.41, "low": 385.15, "close": 401.72 },
    { "time": 1652707800 as UTCTimestamp, "open": 399.98, "high": 408.57, "low": 380.54, "close": 389.63 },
    { "time": 1653312600 as UTCTimestamp, "open": 392.83, "high": 415.3801, "low": 386.96, "close": 415.26 },
    { "time": 1654003800 as UTCTimestamp, "open": 413.55, "high": 417.44, "low": 406.93, "close": 410.54 },
    { "time": 1654522200 as UTCTimestamp, "open": 414.78, "high": 416.609, "low": 389.75, "close": 389.8 },
    { "time": 1655127000 as UTCTimestamp, "open": 379.85, "high": 383.9, "low": 362.17, "close": 365.86 },
    { "time": 1655818200 as UTCTimestamp, "open": 371.89, "high": 390.09, "low": 370.18, "close": 390.08 },
    { "time": 1656336600 as UTCTimestamp, "open": 391.05, "high": 393.16, "low": 372.56, "close": 381.24 },
    { "time": 1657027800 as UTCTimestamp, "open": 375.88, "high": 390.64, "low": 372.9, "close": 388.67 },
    { "time": 1657546200 as UTCTimestamp, "open": 385.85, "high": 386.87, "low": 371.04, "close": 385.13 },
    { "time": 1658151000 as UTCTimestamp, "open": 388.38, "high": 400.18, "low": 380.66, "close": 395.09 },
    { "time": 1658755800 as UTCTimestamp, "open": 395.75, "high": 413.03, "low": 389.95, "close": 411.99 },
    { "time": 1659360600 as UTCTimestamp, "open": 409.15, "high": 415.68, "low": 406.82, "close": 413.47 },
    { "time": 1659965400 as UTCTimestamp, "open": 415.25, "high": 427.21, "low": 410.22, "close": 427.1 },
    { "time": 1660570200 as UTCTimestamp, "open": 424.765, "high": 431.73, "low": 421.22, "close": 422.14 },
    { "time": 1661175000 as UTCTimestamp, "open": 417.05, "high": 419.96, "low": 405.25, "close": 405.31 },
    { "time": 1661779800 as UTCTimestamp, "open": 402.2, "high": 405.84, "low": 390.04, "close": 392.24 },
    { "time": 1662471000 as UTCTimestamp, "open": 393.13, "high": 407.51, "low": 388.42, "close": 406.6 },
    { "time": 1662989400 as UTCTimestamp, "open": 408.78, "high": 411.73, "low": 382.11, "close": 385.56 },
    { "time": 1663594200 as UTCTimestamp, "open": 382.26, "high": 389.31, "low": 363.29, "close": 367.95 },
    { "time": 1664199000 as UTCTimestamp, "open": 366.41, "high": 372.3, "low": 357.04, "close": 357.18 },
    { "time": 1664803800 as UTCTimestamp, "open": 361.08, "high": 379.46, "low": 359.21, "close": 362.79 },
    { "time": 1665408600 as UTCTimestamp, "open": 363.96, "high": 370.26, "low": 348.11, "close": 357.63 },
    { "time": 1666013400 as UTCTimestamp, "open": 364.01, "high": 375.45, "low": 357.2808, "close": 374.29 },
    { "time": 1666618200 as UTCTimestamp, "open": 375.89, "high": 389.52, "low": 373.11, "close": 389.02 },
    { "time": 1667223000 as UTCTimestamp, "open": 386.44, "high": 390.39, "low": 368.79, "close": 376.35 },
    { "time": 1667831400 as UTCTimestamp, "open": 377.71, "high": 399.35, "low": 373.61, "close": 398.51 },
    { "time": 1668436200 as UTCTimestamp, "open": 396.66, "high": 402.31, "low": 390.14, "close": 396.03 },
    { "time": 1669041000 as UTCTimestamp, "open": 394.64, "high": 402.93, "low": 392.66, "close": 402.33 },
    { "time": 1669645800 as UTCTimestamp, "open": 399.09, "high": 410, "low": 393.3, "close": 406.91 },
    { "time": 1670250600 as UTCTimestamp, "open": 403.95, "high": 404.93, "low": 391.64, "close": 393.28 },
    { "time": 1670855400 as UTCTimestamp, "open": 394.11, "high": 410.49, "low": 381.04, "close": 383.27 },
    { "time": 1671460200 as UTCTimestamp, "open": 383.47, "high": 387.41, "low": 374.77, "close": 382.91 },
    { "time": 1672151400 as UTCTimestamp, "open": 382.79, "high": 384.35, "low": 376.42, "close": 382.43 },
    { "time": 1672756200 as UTCTimestamp, "open": 384.37, "high": 389.25, "low": 377.831, "close": 388.08 },
    { "time": 1673274600 as UTCTimestamp, "open": 390.37, "high": 399.1, "low": 386.27, "close": 398.5 },
    { "time": 1673965800 as UTCTimestamp, "open": 398.48, "high": 400.23, "low": 387.26, "close": 395.88 },
    { "time": 1674484200 as UTCTimestamp, "open": 396.72, "high": 408.16, "low": 393.56, "close": 405.68 },
    { "time": 1675089000 as UTCTimestamp, "open": 402.8, "high": 418.31, "low": 400.28, "close": 412.35 },
    { "time": 1675693800 as UTCTimestamp, "open": 409.79, "high": 416.49, "low": 405.01, "close": 408.04 },
    { "time": 1676298600 as UTCTimestamp, "open": 408.72, "high": 415.05, "low": 404.05, "close": 407.26 },
    { "time": 1676989800 as UTCTimestamp, "open": 403.06, "high": 404.16, "low": 393.64, "close": 396.38 },
    { "time": 1677508200 as UTCTimestamp, "open": 399.87, "high": 404.45, "low": 392.33, "close": 404.19 },
    { "time": 1678113000 as UTCTimestamp, "open": 405.05, "high": 407.45, "low": 384.32, "close": 385.91 },
    { "time": 1678714200 as UTCTimestamp, "open": 381.81, "high": 396.47, "low": 380.65, "close": 389.99 },
    { "time": 1679319000 as UTCTimestamp, "open": 390.8, "high": 402.49, "low": 389.4, "close": 395.75 },
    { "time": 1679923800 as UTCTimestamp, "open": 398.12, "high": 409.7, "low": 393.69, "close": 409.39 },
    { "time": 1680528600 as UTCTimestamp, "open": 408.85, "high": 411.92, "low": 405.678, "close": 409.19 },
    { "time": 1681133400 as UTCTimestamp, "open": 406.61, "high": 415.09, "low": 405.97, "close": 412.46 },
    { "time": 1681738200 as UTCTimestamp, "open": 412.37, "high": 415.72, "low": 410.17, "close": 412.2 },
    { "time": 1682343000 as UTCTimestamp, "open": 411.99, "high": 415.94, "low": 403.78, "close": 415.93 },
    { "time": 1682947800 as UTCTimestamp, "open": 415.47, "high": 417.62, "low": 403.74, "close": 412.63 },
    { "time": 1683552600 as UTCTimestamp, "open": 412.97, "high": 414.535, "low": 408.87, "close": 411.59 },
    { "time": 1684157400 as UTCTimestamp, "open": 412.22, "high": 420.72, "low": 410.23, "close": 418.62 },
    { "time": 1684762200 as UTCTimestamp, "open": 418.64, "high": 420.77, "low": 409.8795, "close": 420.02 },
    { "time": 1685453400 as UTCTimestamp, "open": 422.03, "high": 428.74, "low": 416.22, "close": 427.92 },
    { "time": 1685971800 as UTCTimestamp, "open": 428.28, "high": 431.99, "low": 425.82, "close": 429.9 },
    { "time": 1686576600 as UTCTimestamp, "open": 430.92, "high": 443.9, "low": 430.17, "close": 439.46 },
    { "time": 1687267800 as UTCTimestamp, "open": 437.45, "high": 438.37, "low": 432.47, "close": 433.21 },
    { "time": 1687786200 as UTCTimestamp, "open": 432.62, "high": 444.3, "low": 431.19, "close": 443.28 },
    { "time": 1688391000 as UTCTimestamp, "open": 442.92, "high": 444.08, "low": 437.06, "close": 438.55 },
    { "time": 1688995800 as UTCTimestamp, "open": 438.18, "high": 451.36, "low": 437.585, "close": 449.28 },
    { "time": 1689600600 as UTCTimestamp, "open": 449.13, "high": 456.43, "low": 449.08, "close": 452.18 },
    { "time": 1690205400 as UTCTimestamp, "open": 453.37, "high": 459.44, "low": 451.55, "close": 456.92 },
    { "time": 1690810200 as UTCTimestamp, "open": 457.41, "high": 458.16, "low": 446.27, "close": 446.81 },
    { "time": 1691415000 as UTCTimestamp, "open": 448.71, "high": 451.7, "low": 443.345, "close": 445.65 },
    { "time": 1692019800 as UTCTimestamp, "open": 444.7, "high": 448.11, "low": 433.01, "close": 436.5 },
    { "time": 1692624600 as UTCTimestamp, "open": 437.55, "high": 445.22, "low": 435, "close": 439.97 },
    { "time": 1693229400 as UTCTimestamp, "open": 442.24, "high": 453.67, "low": 439.9728, "close": 451.19 },
    { "time": 1693920600 as UTCTimestamp, "open": 450.73, "high": 451.06, "low": 442.75, "close": 445.52 },
    { "time": 1694439000 as UTCTimestamp, "open": 448.24, "high": 451.08, "low": 442.92, "close": 443.37 },
    { "time": 1695043800 as UTCTimestamp, "open": 443.05, "high": 444.97, "low": 429.99, "close": 430.42 },
    { "time": 1695648600 as UTCTimestamp, "open": 429.17, "high": 432.27, "low": 422.29, "close": 427.48 },
    { "time": 1696253400 as UTCTimestamp, "open": 426.62, "high": 431.125, "low": 420.18, "close": 429.54 },
    { "time": 1696858200 as UTCTimestamp, "open": 427.58, "high": 437.335, "low": 427.0101, "close": 431.5 },
    { "time": 1697463000 as UTCTimestamp, "open": 433.82, "high": 438.14, "low": 421.08, "close": 421.19 },
    { "time": 1698067800 as UTCTimestamp, "open": 419.61, "high": 424.82, "low": 409.21, "close": 410.68 },
    { "time": 1698672600 as UTCTimestamp, "open": 413.56, "high": 436.29, "low": 412.22, "close": 434.69 },
    { "time": 1699281000 as UTCTimestamp, "open": 435.47, "high": 440.93, "low": 433.4, "close": 440.61 },
    { "time": 1699885800 as UTCTimestamp, "open": 439.23, "high": 451.42, "low": 438.42, "close": 450.79 },
]