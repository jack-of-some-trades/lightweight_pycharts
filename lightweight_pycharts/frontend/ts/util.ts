import { get_svg, icons } from "./icons.js";
import { AnySeries, AnySeriesData, AreaData, AreaStyleOptions, BarData, BarStyleOptions, BaselineData, BaselineStyleOptions, CandlestickData, CandlestickStyleOptions, ColorType, CrosshairMode, DeepPartial as DP, HistogramData, HistogramStyleOptions, LastPriceAnimationMode, LineData, LineStyle, LineStyleOptions, LineType, OhlcData, PriceLineSource, PriceScaleMode, SeriesOptionsCommon, SingleValueData, TimeChartOptions, WhitespaceData } from "./pkg.js";


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

// ---------------- Series Data Type Checking Functions ---------------- //

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
