/* Altered verserion of index.d.ts from the lightweight chart library (v4.1.3). See README.md in ./frontend for more info. */

import { CanvasRenderingTarget2D } from "./fancy-canvas.js";

//@ts-ignore
import * as lwc from '../../js/lib/pkg.mjs';

export const customSeriesDefaultOptions: CustomSeriesOptions = lwc.customSeriesDefaultOptions;

/**
 * Represents a type of color.
 */
export enum ColorType {
    /** Solid color */
    Solid = "solid",
    /** Vertical gradient color */
    VerticalGradient = "gradient"
}
/**
 * Represents the crosshair mode.
 */
export enum CrosshairMode {
    /**
     * This mode allows crosshair to move freely on the chart.
     */
    Normal = 0,
    /**
     * This mode sticks crosshair's horizontal line to the price value of a single-value series or to the close price of OHLC-based series.
     */
    Magnet = 1,
    /**
     * This mode disables rendering of the crosshair.
     */
    Hidden = 2
}
/**
 * Represents the type of the last price animation for series such as area or line.
 */
export enum LastPriceAnimationMode {
    /**
     * Animation is always disabled
     */
    Disabled = 0,
    /**
     * Animation is always enabled.
     */
    Continuous = 1,
    /**
     * Animation is active after new data.
     */
    OnDataUpdate = 2
}
/**
 * Represents the possible line styles.
 */
export enum LineStyle {
    /**
     * A solid line.
     */
    Solid = 0,
    /**
     * A dotted line.
     */
    Dotted = 1,
    /**
     * A dashed line.
     */
    Dashed = 2,
    /**
     * A dashed line with bigger dashes.
     */
    LargeDashed = 3,
    /**
     * A dotted line with more space between dots.
     */
    SparseDotted = 4
}
/**
 * Represents the possible line types.
 */
export enum LineType {
    /**
     * A line.
     */
    Simple = 0,
    /**
     * A stepped line.
     */
    WithSteps = 1,
    /**
     * A curved line.
     */
    Curved = 2
}
/**
 * Search direction if no data found at provided index
 */
export enum MismatchDirection {
    /**
     * Search the nearest left item
     */
    NearestLeft = -1,
    /**
     * Do not search
     */
    None = 0,
    /**
     * Search the nearest right item
     */
    NearestRight = 1
}
/**
 * Represents the source of data to be used for the horizontal price line.
 */
export enum PriceLineSource {
    /**
     * Use the last bar data.
     */
    LastBar = 0,
    /**
     * Use the last visible data of the chart viewport.
     */
    LastVisible = 1
}
/**
 * Represents the price scale mode.
 */
export enum PriceScaleMode {
    /**
     * Price scale shows prices. Price range changes linearly.
     */
    Normal = 0,
    /**
     * Price scale shows prices. Price range changes logarithmically.
     */
    Logarithmic = 1,
    /**
     * Price scale shows percentage values according the first visible value of the price scale.
     * The first visible value is 0% in this mode.
     */
    Percentage = 2,
    /**
     * The same as percentage mode, but the first value is moved to 100.
     */
    IndexedTo100 = 3
}
/**
 * Represents the type of a tick mark on the time axis.
 */
export enum TickMarkType {
    /**
     * The start of the year (e.g. it's the first tick mark in a year).
     */
    Year = 0,
    /**
     * The start of the month (e.g. it's the first tick mark in a month).
     */
    Month = 1,
    /**
     * A day of the month.
     */
    DayOfMonth = 2,
    /**
     * A time without seconds.
     */
    Time = 3,
    /**
     * A time with seconds.
     */
    TimeWithSeconds = 4
}
/**
 * Determine how to exit the tracking mode.
 *
 * By default, mobile users will long press to deactivate the scroll and have the ability to check values and dates.
 * Another press is required to activate the scroll, be able to move left/right, zoom, etc.
 */
export enum TrackingModeExitMode {
    /**
     * Tracking Mode will be deactivated on touch end event.
     */
    OnTouchEnd = 0,
    /**
     * Tracking Mode will be deactivated on the next tap event.
     */
    OnNextTap = 1
}

/*--------------------- Function Definitions -----------------------*/
//This section is all the functions that are exported in ../js/lib/pkg.mjs
//They are redefined here as typescript functions (to get type hinting), but 
//are really just references to the original funcitons exported in the packaged 
//lightweight charts api

/**
 * This function is the simplified main entry point of the Lightweight Charting Library with time points for the horizontal scale.
 *
 * @param container - ID of HTML element or element itself
 * @param options - Any subset of options to be applied at start.
 * @returns An interface to the created chart
 */
export function createChart(container: string | HTMLElement, options?: DeepPartial<ChartOptions>): IChartApi {
    return lwc.createChart(container, options)
}
/**
 * This function is the main entry point of the Lightweight Charting Library. If you are using time values
 * for the horizontal scale then it is recommended that you rather use the {@link createChart} function.
 *
 * @template HorzScaleItem - type of points on the horizontal scale
 * @template THorzScaleBehavior - type of horizontal axis strategy that encapsulate all the specific behaviors of the horizontal scale type
 *
 * @param container - ID of HTML element or element itself
 * @param horzScaleBehavior - Horizontal scale behavior
 * @param options - Any subset of options to be applied at start.
 * @returns An interface to the created chart
 */
export function createChartEx<HorzScaleItem, THorzScaleBehavior extends IHorzScaleBehavior<HorzScaleItem>>(container: string | HTMLElement, horzScaleBehavior: THorzScaleBehavior, options?: DeepPartial<ReturnType<THorzScaleBehavior["options"]>>): IChartApiBase<HorzScaleItem> {
    return lwc.createChartEx(container, horzScaleBehavior, options)
}
/**
 * Check if a time value is a business day object.
 *
 * @param time - The time to check.
 * @returns `true` if `time` is a {@link BusinessDay} object, false otherwise.
 */
export function isBusinessDay(time: Time): time is BusinessDay {
    return lwc.isBusinessDay(time)
}
/**
 * Check if a time value is a UTC timestamp number.
 *
 * @param time - The time to check.
 * @returns `true` if `time` is a {@link UTCTimestamp} number, false otherwise.
 */
export function isUTCTimestamp(time: Time): time is UTCTimestamp {
    return lwc.isUTCTimestamp(time)
}
/**
 * Returns the current version as a string. For example `'3.3.0'`.
 */
export function version(): string {
    return lwc.version()
}

/*--------------------- End Duplicate Function Definitions -----------------------*/

/**
 * Structure describing a single item of data for area series
 */
export interface AreaData<HorzScaleItem = Time> extends SingleValueData<HorzScaleItem> {
    /**
     * Optional line color value for certain data item. If missed, color from options is used
     */
    lineColor?: string;
    /**
     * Optional top color value for certain data item. If missed, color from options is used
     */
    topColor?: string;
    /**
     * Optional bottom color value for certain data item. If missed, color from options is used
     */
    bottomColor?: string;
}
/**
 * Represents style options for an area series.
 */
export interface AreaStyleOptions {
    /**
     * Color of the top part of the area.
     *
     * @defaultValue `'rgba( 46, 220, 135, 0.4)'`
     */
    topColor: string;
    /**
     * Color of the bottom part of the area.
     *
     * @defaultValue `'rgba( 40, 221, 100, 0)'`
     */
    bottomColor: string;
    /**
     * Invert the filled area. Fills the area above the line if set to true.
     *
     * @defaultValue `false`
     */
    invertFilledArea: boolean;
    /**
     * Line color.
     *
     * @defaultValue `'#33D778'`
     */
    lineColor: string;
    /**
     * Line style.
     *
     * @defaultValue {@link LineStyle.Solid}
     */
    lineStyle: LineStyle;
    /**
     * Line width in pixels.
     *
     * @defaultValue `3`
     */
    lineWidth: LineWidth;
    /**
     * Line type.
     *
     * @defaultValue {@link LineType.Simple}
     */
    lineType: LineType;
    /**
     * Show series line.
     *
     * @defaultValue `true`
     */
    lineVisible: boolean;
    /**
     * Show circle markers on each point.
     *
     * @defaultValue `false`
     */
    pointMarkersVisible: boolean;
    /**
     * Circle markers radius in pixels.
     *
     * @defaultValue `undefined`
     */
    pointMarkersRadius?: number;
    /**
     * Show the crosshair marker.
     *
     * @defaultValue `true`
     */
    crosshairMarkerVisible: boolean;
    /**
     * Crosshair marker radius in pixels.
     *
     * @defaultValue `4`
     */
    crosshairMarkerRadius: number;
    /**
     * Crosshair marker border color. An empty string falls back to the color of the series under the crosshair.
     *
     * @defaultValue `''`
     */
    crosshairMarkerBorderColor: string;
    /**
     * The crosshair marker background color. An empty string falls back to the color of the series under the crosshair.
     *
     * @defaultValue `''`
     */
    crosshairMarkerBackgroundColor: string;
    /**
     * Crosshair marker border width in pixels.
     *
     * @defaultValue `2`
     */
    crosshairMarkerBorderWidth: number;
    /**
     * Last price animation mode.
     *
     * @defaultValue {@link LastPriceAnimationMode.Disabled}
     */
    lastPriceAnimation: LastPriceAnimationMode;
}
/**
 * Represents the margin used when updating a price scale.
 */
export interface AutoScaleMargins {
    /** The number of pixels for bottom margin */
    below: number;
    /** The number of pixels for top margin */
    above: number;
}
/**
 * Represents information used to update a price scale.
 */
export interface AutoscaleInfo {
    /**
     * Price range.
     */
    priceRange: PriceRange;
    /**
     * Scale margins.
     */
    margins?: AutoScaleMargins;
}
/**
 * Represents options for how the time and price axes react to mouse double click.
 */
export interface AxisDoubleClickOptions {
    /**
     * Enable resetting scaling the time axis by double-clicking the left mouse button.
     *
     * @defaultValue `true`
     */
    time: boolean;
    /**
     * Enable reseting scaling the price axis by by double-clicking the left mouse button.
     *
     * @defaultValue `true`
     */
    price: boolean;
}
/**
 * Represents options for how the time and price axes react to mouse movements.
 */
export interface AxisPressedMouseMoveOptions {
    /**
     * Enable scaling the time axis by holding down the left mouse button and moving the mouse.
     *
     * @defaultValue `true`
     */
    time: boolean;
    /**
     * Enable scaling the price axis by holding down the left mouse button and moving the mouse.
     *
     * @defaultValue `true`
     */
    price: boolean;
}
/**
 * Structure describing a single item of data for bar series
 */
export interface BarData<HorzScaleItem = Time> extends OhlcData<HorzScaleItem> {
    /**
     * Optional color value for certain data item. If missed, color from options is used
     */
    color?: string;
}
/**
 * Represents style options for a bar series.
 */
export interface BarStyleOptions {
    /**
     * Color of rising bars.
     *
     * @defaultValue `'#26a69a'`
     */
    upColor: string;
    /**
     * Color of falling bars.
     *
     * @defaultValue `'#ef5350'`
     */
    downColor: string;
    /**
     * Show open lines on bars.
     *
     * @defaultValue `true`
     */
    openVisible: boolean;
    /**
     * Show bars as sticks.
     *
     * @defaultValue `true`
     */
    thinBars: boolean;
}
/**
 * Represents a range of bars and the number of bars outside the range.
 */
export interface BarsInfo<HorzScaleItem> extends Partial<Range<HorzScaleItem>> {
    /**
     * The number of bars before the start of the range.
     * Positive value means that there are some bars before (out of logical range from the left) the {@link Range.from} logical index in the series.
     * Negative value means that the first series' bar is inside the passed logical range, and between the first series' bar and the {@link Range.from} logical index are some bars.
     */
    barsBefore: number;
    /**
     * The number of bars after the end of the range.
     * Positive value in the `barsAfter` field means that there are some bars after (out of logical range from the right) the {@link Range.to} logical index in the series.
     * Negative value means that the last series' bar is inside the passed logical range, and between the last series' bar and the {@link Range.to} logical index are some bars.
     */
    barsAfter: number;
}
/**
 * Represents a type of priced base value of baseline series type.
 */
export interface BaseValuePrice {
    /**
     * Distinguished type value.
     */
    type: "price";
    /**
     * Price value.
     */
    price: number;
}
/**
 * Structure describing a single item of data for baseline series
 */
export interface BaselineData<HorzScaleItem = Time> extends SingleValueData<HorzScaleItem> {
    /**
     * Optional top area top fill color value for certain data item. If missed, color from options is used
     */
    topFillColor1?: string;
    /**
     * Optional top area bottom fill color value for certain data item. If missed, color from options is used
     */
    topFillColor2?: string;
    /**
     * Optional top area line color value for certain data item. If missed, color from options is used
     */
    topLineColor?: string;
    /**
     * Optional bottom area top fill color value for certain data item. If missed, color from options is used
     */
    bottomFillColor1?: string;
    /**
     * Optional bottom area bottom fill color value for certain data item. If missed, color from options is used
     */
    bottomFillColor2?: string;
    /**
     * Optional bottom area line color value for certain data item. If missed, color from options is used
     */
    bottomLineColor?: string;
}
/**
 * Represents style options for a baseline series.
 */
export interface BaselineStyleOptions {
    /**
     * Base value of the series.
     *
     * @defaultValue `{ type: 'price', price: 0 }`
     */
    baseValue: BaseValueType;
    /**
     * The first color of the top area.
     *
     * @defaultValue `'rgba(38, 166, 154, 0.28)'`
     */
    topFillColor1: string;
    /**
     * The second color of the top area.
     *
     * @defaultValue `'rgba(38, 166, 154, 0.05)'`
     */
    topFillColor2: string;
    /**
     * The line color of the top area.
     *
     * @defaultValue `'rgba(38, 166, 154, 1)'`
     */
    topLineColor: string;
    /**
     * The first color of the bottom area.
     *
     * @defaultValue `'rgba(239, 83, 80, 0.05)'`
     */
    bottomFillColor1: string;
    /**
     * The second color of the bottom area.
     *
     * @defaultValue `'rgba(239, 83, 80, 0.28)'`
     */
    bottomFillColor2: string;
    /**
     * The line color of the bottom area.
     *
     * @defaultValue `'rgba(239, 83, 80, 1)'`
     */
    bottomLineColor: string;
    /**
     * Line width.
     *
     * @defaultValue `3`
     */
    lineWidth: LineWidth;
    /**
     * Line style.
     *
     * @defaultValue {@link LineStyle.Solid}
     */
    lineStyle: LineStyle;
    /**
     * Line type.
     *
     * @defaultValue {@link LineType.Simple}
     */
    lineType: LineType;
    /**
     * Show series line.
     *
     * @defaultValue `true`
     */
    lineVisible: boolean;
    /**
     * Show circle markers on each point.
     *
     * @defaultValue `false`
     */
    pointMarkersVisible: boolean;
    /**
     * Circle markers radius in pixels.
     *
     * @defaultValue `undefined`
     */
    pointMarkersRadius?: number;
    /**
     * Show the crosshair marker.
     *
     * @defaultValue `true`
     */
    crosshairMarkerVisible: boolean;
    /**
     * Crosshair marker radius in pixels.
     *
     * @defaultValue `4`
     */
    crosshairMarkerRadius: number;
    /**
     * Crosshair marker border color. An empty string falls back to the color of the series under the crosshair.
     *
     * @defaultValue `''`
     */
    crosshairMarkerBorderColor: string;
    /**
     * The crosshair marker background color. An empty string falls back to the color of the series under the crosshair.
     *
     * @defaultValue `''`
     */
    crosshairMarkerBackgroundColor: string;
    /**
     * Crosshair marker border width in pixels.
     *
     * @defaultValue `2`
     */
    crosshairMarkerBorderWidth: number;
    /**
     * Last price animation mode.
     *
     * @defaultValue {@link LastPriceAnimationMode.Disabled}
     */
    lastPriceAnimation: LastPriceAnimationMode;
}
/**
 * Represents a time as a day/month/year.
 *
 * @example
 * ```js
 * const day = { year: 2019, month: 6, day: 1 }; // June 1, 2019
 * ```
 */
export interface BusinessDay {
    /**
     * The year.
     */
    year: number;
    /**
     * The month.
     */
    month: number;
    /**
     * The day.
     */
    day: number;
}
/**
 * Structure describing a single item of data for candlestick series
 */
export interface CandlestickData<HorzScaleItem = Time> extends OhlcData<HorzScaleItem> {
    /**
     * Optional color value for certain data item. If missed, color from options is used
     */
    color?: string;
    /**
     * Optional border color value for certain data item. If missed, color from options is used
     */
    borderColor?: string;
    /**
     * Optional wick color value for certain data item. If missed, color from options is used
     */
    wickColor?: string;
}
/**
 * Represents style options for a candlestick series.
 */
export interface CandlestickStyleOptions {
    /**
     * Color of rising candles.
     *
     * @defaultValue `'#26a69a'`
     */
    upColor: string;
    /**
     * Color of falling candles.
     *
     * @defaultValue `'#ef5350'`
     */
    downColor: string;
    /**
     * Enable high and low prices candle wicks.
     *
     * @defaultValue `true`
     */
    wickVisible: boolean;
    /**
     * Enable candle borders.
     *
     * @defaultValue `true`
     */
    borderVisible: boolean;
    /**
     * Border color.
     *
     * @defaultValue `'#378658'`
     */
    borderColor: string;
    /**
     * Border color of rising candles.
     *
     * @defaultValue `'#26a69a'`
     */
    borderUpColor: string;
    /**
     * Border color of falling candles.
     *
     * @defaultValue `'#ef5350'`
     */
    borderDownColor: string;
    /**
     * Wick color.
     *
     * @defaultValue `'#737375'`
     */
    wickColor: string;
    /**
     * Wick color of rising candles.
     *
     * @defaultValue `'#26a69a'`
     */
    wickUpColor: string;
    /**
     * Wick color of falling candles.
     *
     * @defaultValue `'#ef5350'`
     */
    wickDownColor: string;
}
/**
 * Represents common chart options
 */
export interface ChartOptionsBase {
    /**
     * Width of the chart in pixels
     *
     * @defaultValue If `0` (default) or none value provided, then a size of the widget will be calculated based its container's size.
     */
    width: number;
    /**
     * Height of the chart in pixels
     *
     * @defaultValue If `0` (default) or none value provided, then a size of the widget will be calculated based its container's size.
     */
    height: number;
    /**
     * Setting this flag to `true` will make the chart watch the chart container's size and automatically resize the chart to fit its container whenever the size changes.
     *
     * This feature requires [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) class to be available in the global scope.
     * Note that calling code is responsible for providing a polyfill if required. If the global scope does not have `ResizeObserver`, a warning will appear and the flag will be ignored.
     *
     * Please pay attention that `autoSize` option and explicit sizes options `width` and `height` don't conflict with one another.
     * If you specify `autoSize` flag, then `width` and `height` options will be ignored unless `ResizeObserver` has failed. If it fails then the values will be used as fallback.
     *
     * The flag `autoSize` could also be set with and unset with `applyOptions` function.
     * ```js
     * const chart = LightweightCharts.createChart(document.body, {
     *     autoSize: true,
     * });
     * ```
     */
    autoSize: boolean;
    /**
     * Watermark options.
     *
     * A watermark is a background label that includes a brief description of the drawn data. Any text can be added to it.
     *
     * Please make sure you enable it and set an appropriate font color and size to make your watermark visible in the background of the chart.
     * We recommend a semi-transparent color and a large font. Also note that watermark position can be aligned vertically and horizontally.
     */
    watermark: WatermarkOptions;
    /**
     * Layout options
     */
    layout: LayoutOptions;
    /**
     * Left price scale options
     */
    leftPriceScale: VisiblePriceScaleOptions;
    /**
     * Right price scale options
     */
    rightPriceScale: VisiblePriceScaleOptions;
    /**
     * Overlay price scale options
     */
    overlayPriceScales: OverlayPriceScaleOptions;
    /**
     * Time scale options
     */
    timeScale: HorzScaleOptions;
    /**
     * The crosshair shows the intersection of the price and time scale values at any point on the chart.
     *
     */
    crosshair: CrosshairOptions;
    /**
     * A grid is represented in the chart background as a vertical and horizontal lines drawn at the levels of visible marks of price and the time scales.
     */
    grid: GridOptions;
    /**
     * Scroll options, or a boolean flag that enables/disables scrolling
     */
    handleScroll: HandleScrollOptions | boolean;
    /**
     * Scale options, or a boolean flag that enables/disables scaling
     */
    handleScale: HandleScaleOptions | boolean;
    /**
     * Kinetic scroll options
     */
    kineticScroll: KineticScrollOptions;
    /** @inheritDoc TrackingModeOptions
     */
    trackingMode: TrackingModeOptions;
    /**
     * Basic localization options
     */
    localization: LocalizationOptionsBase;
}
/**
 * Structure describing options of the chart. Series options are to be set separately
 */
export interface ChartOptionsImpl<HorzScaleItem> extends ChartOptionsBase {
    /**
     * Localization options.
     */
    localization: LocalizationOptions<HorzScaleItem>;
}
/** Structure describing a crosshair line (vertical or horizontal) */
export interface CrosshairLineOptions {
    /**
     * Crosshair line color.
     *
     * @defaultValue `'#758696'`
     */
    color: string;
    /**
     * Crosshair line width.
     *
     * @defaultValue `1`
     */
    width: LineWidth;
    /**
     * Crosshair line style.
     *
     * @defaultValue {@link LineStyle.LargeDashed}
     */
    style: LineStyle;
    /**
     * Display the crosshair line.
     *
     * Note that disabling crosshair lines does not disable crosshair marker on Line and Area series.
     * It can be disabled by using `crosshairMarkerVisible` option of a relevant series.
     *
     * @see {@link LineStyleOptions.crosshairMarkerVisible}
     * @see {@link AreaStyleOptions.crosshairMarkerVisible}
     * @see {@link BaselineStyleOptions.crosshairMarkerVisible}
     * @defaultValue `true`
     */
    visible: boolean;
    /**
     * Display the crosshair label on the relevant scale.
     *
     * @defaultValue `true`
     */
    labelVisible: boolean;
    /**
     * Crosshair label background color.
     *
     * @defaultValue `'#4c525e'`
     */
    labelBackgroundColor: string;
}
/** Structure describing crosshair options  */
export interface CrosshairOptions {
    /**
     * Crosshair mode
     *
     * @defaultValue {@link CrosshairMode.Magnet}
     */
    mode: CrosshairMode;
    /**
     * Vertical line options.
     */
    vertLine: CrosshairLineOptions;
    /**
     * Horizontal line options.
     */
    horzLine: CrosshairLineOptions;
}
/**
 * Renderer data for an item within the custom series.
 */
export interface CustomBarItemData<HorzScaleItem, TData extends CustomData<HorzScaleItem> = CustomData<HorzScaleItem>> {
    /**
     * Horizontal coordinate for the item. Measured from the left edge of the pane in pixels.
     */
    x: number;
    /**
     * Time scale index for the item. This isn't the timestamp but rather the logical index.
     */
    time: number;
    /**
     * Original data for the item.
     */
    originalData: TData;
    /**
     * Color assigned for the item, typically used for price line and price scale label.
     */
    barColor: string;
}
/**
 * Base structure describing a single item of data for a custom series.
 *
 * This type allows for any properties to be defined
 * within the interface. It is recommended that you extend this interface with
 * the required data structure.
 */
export interface CustomData<HorzScaleItem = Time> extends CustomSeriesWhitespaceData<HorzScaleItem> {
    /**
     * If defined then this color will be used for the price line and price scale line
     * for this specific data item of the custom series.
     */
    color?: string;
}
/**
 * Represents a whitespace data item, which is a data point without a value.
 */
export interface CustomSeriesWhitespaceData<HorzScaleItem> {
    /**
     * The time of the data.
     */
    time: HorzScaleItem;
    /**
     * Additional custom values which will be ignored by the library, but
     * could be used by plugins.
     */
    customValues?: Record<string, unknown>;
}
/**
 * Represents style options for a custom series.
 */
export interface CustomStyleOptions {
    /**
     * Color used for the price line and price scale label.
     */
    color: string;
}
/** Grid line options. */
export interface GridLineOptions {
    /**
     * Line color.
     *
     * @defaultValue `'#D6DCDE'`
     */
    color: string;
    /**
     * Line style.
     *
     * @defaultValue {@link LineStyle.Solid}
     */
    style: LineStyle;
    /**
     * Display the lines.
     *
     * @defaultValue `true`
     */
    visible: boolean;
}
/** Structure describing grid options. */
export interface GridOptions {
    /**
     * Vertical grid line options.
     */
    vertLines: GridLineOptions;
    /**
     * Horizontal grid line options.
     */
    horzLines: GridLineOptions;
}
/**
 * Represents options for how the chart is scaled by the mouse and touch gestures.
 */
export interface HandleScaleOptions {
    /**
     * Enable scaling with the mouse wheel.
     *
     * @defaultValue `true`
     */
    mouseWheel: boolean;
    /**
     * Enable scaling with pinch/zoom gestures.
     *
     * @defaultValue `true`
     */
    pinch: boolean;
    /**
     * Enable scaling the price and/or time scales by holding down the left mouse button and moving the mouse.
     */
    axisPressedMouseMove: AxisPressedMouseMoveOptions | boolean;
    /**
     * Enable resetting scaling by double-clicking the left mouse button.
     */
    axisDoubleClickReset: AxisDoubleClickOptions | boolean;
}
/**
 * Represents options for how the chart is scrolled by the mouse and touch gestures.
 */
export interface HandleScrollOptions {
    /**
     * Enable scrolling with the mouse wheel.
     *
     * @defaultValue `true`
     */
    mouseWheel: boolean;
    /**
     * Enable scrolling by holding down the left mouse button and moving the mouse.
     *
     * @defaultValue `true`
     */
    pressedMouseMove: boolean;
    /**
     * Enable horizontal touch scrolling.
     *
     * When enabled the chart handles touch gestures that would normally scroll the webpage horizontally.
     *
     * @defaultValue `true`
     */
    horzTouchDrag: boolean;
    /**
     * Enable vertical touch scrolling.
     *
     * When enabled the chart handles touch gestures that would normally scroll the webpage vertically.
     *
     * @defaultValue `true`
     */
    vertTouchDrag: boolean;
}
/**
 * Structure describing a single item of data for histogram series
 */
export interface HistogramData<HorzScaleItem = Time> extends SingleValueData<HorzScaleItem> {
    /**
     * Optional color value for certain data item. If missed, color from options is used
     */
    color?: string;
}
/**
 * Represents style options for a histogram series.
 */
export interface HistogramStyleOptions {
    /**
     * Column color.
     *
     * @defaultValue `'#26a69a'`
     */
    color: string;
    /**
     * Initial level of histogram columns.
     *
     * @defaultValue `0`
     */
    base: number;
}
/**
 * Options for the time scale; the horizontal scale at the bottom of the chart that displays the time of data.
 */
export interface HorzScaleOptions {
    /**
     * The margin space in bars from the right side of the chart.
     *
     * @defaultValue `0`
     */
    rightOffset: number;
    /**
     * The space between bars in pixels.
     *
     * @defaultValue `6`
     */
    barSpacing: number;
    /**
     * The minimum space between bars in pixels.
     *
     * @defaultValue `0.5`
     */
    minBarSpacing: number;
    /**
     * Prevent scrolling to the left of the first bar.
     *
     * @defaultValue `false`
     */
    fixLeftEdge: boolean;
    /**
     * Prevent scrolling to the right of the most recent bar.
     *
     * @defaultValue `false`
     */
    fixRightEdge: boolean;
    /**
     * Prevent changing the visible time range during chart resizing.
     *
     * @defaultValue `false`
     */
    lockVisibleTimeRangeOnResize: boolean;
    /**
     * Prevent the hovered bar from moving when scrolling.
     *
     * @defaultValue `false`
     */
    rightBarStaysOnScroll: boolean;
    /**
     * Show the time scale border.
     *
     * @defaultValue `true`
     */
    borderVisible: boolean;
    /**
     * The time scale border color.
     *
     * @defaultValue `'#2B2B43'`
     */
    borderColor: string;
    /**
     * Show the time scale.
     *
     * @defaultValue `true`
     */
    visible: boolean;
    /**
     * Show the time, not just the date, in the time scale and vertical crosshair label.
     *
     * @defaultValue `false`
     */
    timeVisible: boolean;
    /**
     * Show seconds in the time scale and vertical crosshair label in `hh:mm:ss` format for intraday data.
     *
     * @defaultValue `true`
     */
    secondsVisible: boolean;
    /**
     * Shift the visible range to the right (into the future) by the number of new bars when new data is added.
     *
     * Note that this only applies when the last bar is visible.
     *
     * @defaultValue `true`
     */
    shiftVisibleRangeOnNewBar: boolean;
    /**
     * Allow the visible range to be shifted to the right when a new bar is added which
     * is replacing an existing whitespace time point on the chart.
     *
     * Note that this only applies when the last bar is visible & `shiftVisibleRangeOnNewBar` is enabled.
     *
     * @defaultValue `false`
     */
    allowShiftVisibleRangeOnWhitespaceReplacement: boolean;
    /**
     * Draw small vertical line on time axis labels.
     *
     * @defaultValue `false`
     */
    ticksVisible: boolean;
    /**
     * Maximum tick mark label length. Used to override the default 8 character maximum length.
     *
     * @defaultValue `undefined`
     */
    tickMarkMaxCharacterLength?: number;
    /**
     * Changes horizontal scale marks generation.
     * With this flag equal to `true`, marks of the same weight are either all drawn or none are drawn at all.
     */
    uniformDistribution: boolean;
    /**
     * Define a minimum height for the time scale.
     * Note: This value will be exceeded if the
     * time scale needs more space to display it's contents.
     *
     * Setting a minimum height could be useful for ensuring that
     * multiple charts positioned in a horizontal stack each have
     * an identical time scale height, or for plugins which
     * require a bit more space within the time scale pane.
     *
     * @defaultValue 0
     */
    minimumHeight: number;
    /**
     * Allow major time scale labels to be rendered in a bolder font weight.
     *
     * @defaultValue true
     */
    allowBoldLabels: boolean;
}
/**
 * The main interface of a single chart using time for horizontal scale.
 */
export interface IChartApi extends IChartApiBase<Time> {
    /**
     * Applies new options to the chart
     *
     * @param options - Any subset of options.
     */
    applyOptions(options: DeepPartial<ChartOptions>): void;
}
/**
 * The main interface of a single chart.
 */
export interface IChartApiBase<HorzScaleItem = Time> {
    /**
     * Removes the chart object including all DOM elements. This is an irreversible operation, you cannot do anything with the chart after removing it.
     */
    remove(): void;
    /**
     * Sets fixed size of the chart. By default chart takes up 100% of its container.
     *
     * If chart has the `autoSize` option enabled, and the ResizeObserver is available then
     * the width and height values will be ignored.
     *
     * @param width - Target width of the chart.
     * @param height - Target height of the chart.
     * @param forceRepaint - True to initiate resize immediately. One could need this to get screenshot immediately after resize.
     */
    resize(width: number, height: number, forceRepaint?: boolean): void;
    /**
     * Creates a custom series with specified parameters.
     *
     * A custom series is a generic series which can be extended with a custom renderer to
     * implement chart types which the library doesn't support by default.
     *
     * @param customPaneView - A custom series pane view which implements the custom renderer.
     * @param customOptions - Customization parameters of the series being created.
     * ```js
     * const series = chart.addCustomSeries(myCustomPaneView);
     * ```
     */
    addCustomSeries<TData extends CustomData<HorzScaleItem>, TOptions extends CustomSeriesOptions, TPartialOptions extends SeriesPartialOptions<TOptions> = SeriesPartialOptions<TOptions>>(customPaneView: ICustomSeriesPaneView<HorzScaleItem, TData, TOptions>, customOptions?: SeriesPartialOptions<TOptions>): ISeriesApi<"Custom", HorzScaleItem, TData | WhitespaceData<HorzScaleItem>, TOptions, TPartialOptions>;
    /**
     * Creates an area series with specified parameters.
     *
     * @param areaOptions - Customization parameters of the series being created.
     * @returns An interface of the created series.
     * @example
     * ```js
     * const series = chart.addAreaSeries();
     * ```
     */
    addAreaSeries(areaOptions?: AreaSeriesPartialOptions): ISeriesApi<"Area", HorzScaleItem>;
    /**
     * Creates a baseline series with specified parameters.
     *
     * @param baselineOptions - Customization parameters of the series being created.
     * @returns An interface of the created series.
     * @example
     * ```js
     * const series = chart.addBaselineSeries();
     * ```
     */
    addBaselineSeries(baselineOptions?: BaselineSeriesPartialOptions): ISeriesApi<"Baseline", HorzScaleItem>;
    /**
     * Creates a bar series with specified parameters.
     *
     * @param barOptions - Customization parameters of the series being created.
     * @returns An interface of the created series.
     * @example
     * ```js
     * const series = chart.addBarSeries();
     * ```
     */
    addBarSeries(barOptions?: BarSeriesPartialOptions): ISeriesApi<"Bar", HorzScaleItem>;
    /**
     * Creates a candlestick series with specified parameters.
     *
     * @param candlestickOptions - Customization parameters of the series being created.
     * @returns An interface of the created series.
     * @example
     * ```js
     * const series = chart.addCandlestickSeries();
     * ```
     */
    addCandlestickSeries(candlestickOptions?: CandlestickSeriesPartialOptions): ISeriesApi<"Candlestick", HorzScaleItem>;
    /**
     * Creates a histogram series with specified parameters.
     *
     * @param histogramOptions - Customization parameters of the series being created.
     * @returns An interface of the created series.
     * @example
     * ```js
     * const series = chart.addHistogramSeries();
     * ```
     */
    addHistogramSeries(histogramOptions?: HistogramSeriesPartialOptions): ISeriesApi<"Histogram", HorzScaleItem>;
    /**
     * Creates a line series with specified parameters.
     *
     * @param lineOptions - Customization parameters of the series being created.
     * @returns An interface of the created series.
     * @example
     * ```js
     * const series = chart.addLineSeries();
     * ```
     */
    addLineSeries(lineOptions?: LineSeriesPartialOptions): ISeriesApi<"Line", HorzScaleItem>;
    /**
     * Removes a series of any type. This is an irreversible operation, you cannot do anything with the series after removing it.
     *
     * @example
     * ```js
     * chart.removeSeries(series);
     * ```
     */
    removeSeries(seriesApi: ISeriesApi<SeriesType, HorzScaleItem>): void;
    /**
     * Subscribe to the chart click event.
     *
     * @param handler - Handler to be called on mouse click.
     * @example
     * ```js
     * function myClickHandler(param) {
     *     if (!param.point) {
     *         return;
     *     }
     *
     *     console.log(`Click at ${param.point.x}, ${param.point.y}. The time is ${param.time}.`);
     * }
     *
     * chart.subscribeClick(myClickHandler);
     * ```
     */
    subscribeClick(handler: MouseEventHandler<HorzScaleItem>): void;
    /**
     * Unsubscribe a handler that was previously subscribed using {@link subscribeClick}.
     *
     * @param handler - Previously subscribed handler
     * @example
     * ```js
     * chart.unsubscribeClick(myClickHandler);
     * ```
     */
    unsubscribeClick(handler: MouseEventHandler<HorzScaleItem>): void;
    /**
     * Subscribe to the chart double-click event.
     *
     * @param handler - Handler to be called on mouse double-click.
     * @example
     * ```js
     * function myDblClickHandler(param) {
     *     if (!param.point) {
     *         return;
     *     }
     *
     *     console.log(`Double Click at ${param.point.x}, ${param.point.y}. The time is ${param.time}.`);
     * }
     *
     * chart.subscribeDblClick(myDblClickHandler);
     * ```
     */
    subscribeDblClick(handler: MouseEventHandler<HorzScaleItem>): void;
    /**
     * Unsubscribe a handler that was previously subscribed using {@link subscribeDblClick}.
     *
     * @param handler - Previously subscribed handler
     * @example
     * ```js
     * chart.unsubscribeDblClick(myDblClickHandler);
     * ```
     */
    unsubscribeDblClick(handler: MouseEventHandler<HorzScaleItem>): void;
    /**
     * Subscribe to the crosshair move event.
     *
     * @param handler - Handler to be called on crosshair move.
     * @example
     * ```js
     * function myCrosshairMoveHandler(param) {
     *     if (!param.point) {
     *         return;
     *     }
     *
     *     console.log(`Crosshair moved to ${param.point.x}, ${param.point.y}. The time is ${param.time}.`);
     * }
     *
     * chart.subscribeCrosshairMove(myCrosshairMoveHandler);
     * ```
     */
    subscribeCrosshairMove(handler: MouseEventHandler<HorzScaleItem>): void;
    /**
     * Unsubscribe a handler that was previously subscribed using {@link subscribeCrosshairMove}.
     *
     * @param handler - Previously subscribed handler
     * @example
     * ```js
     * chart.unsubscribeCrosshairMove(myCrosshairMoveHandler);
     * ```
     */
    unsubscribeCrosshairMove(handler: MouseEventHandler<HorzScaleItem>): void;
    /**
     * Returns API to manipulate a price scale.
     *
     * @param priceScaleId - ID of the price scale.
     * @returns Price scale API.
     */
    priceScale(priceScaleId: string): IPriceScaleApi;
    /**
     * Returns API to manipulate the time scale
     *
     * @returns Target API
     */
    timeScale(): ITimeScaleApi<HorzScaleItem>;
    /**
     * Applies new options to the chart
     *
     * @param options - Any subset of options.
     */
    applyOptions(options: DeepPartial<ChartOptionsImpl<HorzScaleItem>>): void;
    /**
     * Returns currently applied options
     *
     * @returns Full set of currently applied options, including defaults
     */
    options(): Readonly<ChartOptionsImpl<HorzScaleItem>>;
    /**
     * Make a screenshot of the chart with all the elements excluding crosshair.
     *
     * @returns A canvas with the chart drawn on. Any `Canvas` methods like `toDataURL()` or `toBlob()` can be used to serialize the result.
     */
    takeScreenshot(): HTMLCanvasElement;
    /**
     * Returns the active state of the `autoSize` option. This can be used to check
     * whether the chart is handling resizing automatically with a `ResizeObserver`.
     *
     * @returns Whether the `autoSize` option is enabled and the active.
     */
    autoSizeActive(): boolean;
    /**
     * Returns the generated div element containing the chart. This can be used for adding your own additional event listeners, or for measuring the
     * elements dimensions and position within the document.
     *
     * @returns generated div element containing the chart.
     */
    chartElement(): HTMLDivElement;
    /**
     * Set the crosshair position within the chart.
     *
     * Usually the crosshair position is set automatically by the user's actions. However in some cases you may want to set it explicitly.
     *
     * For example if you want to synchronise the crosshairs of two separate charts.
     *
     * @param price - The price (vertical coordinate) of the new crosshair position.
     * @param horizontalPosition - The horizontal coordinate (time by default) of the new crosshair position.
     */
    setCrosshairPosition(price: number, horizontalPosition: HorzScaleItem, seriesApi: ISeriesApi<SeriesType, HorzScaleItem>): void;
    /**
     * Clear the crosshair position within the chart.
     */
    clearCrosshairPosition(): void;
    /**
     * Returns the dimensions of the chart pane (the plot surface which excludes time and price scales).
     * This would typically only be useful for plugin development.
     *
     * @returns Dimensions of the chart pane
     */
    paneSize(): PaneSize;
}
/**
 * Renderer for the custom series. This paints on the main chart pane.
 */
export interface ICustomSeriesPaneRenderer {
    /**
     * Draw function for the renderer.
     *
     * @param target - canvas context to draw on, refer to FancyCanvas library for more details about this class.
     * @param priceConverter - converter function for changing prices into vertical coordinate values.
     * @param isHovered - Whether the series is hovered.
     * @param hitTestData - Optional hit test data for the series.
     */
    draw(target: CanvasRenderingTarget2D, priceConverter: PriceToCoordinateConverter, isHovered: boolean, hitTestData?: unknown): void;
}
/**
 * This interface represents the view for the custom series
 */
export interface ICustomSeriesPaneView<HorzScaleItem = Time, TData extends CustomData<HorzScaleItem> = CustomData<HorzScaleItem>, TSeriesOptions extends CustomSeriesOptions = CustomSeriesOptions> {
    /**
     * This method returns a renderer - special object to draw data for the series
     * on the main chart pane.
     *
     * @returns an renderer object to be used for drawing.
     */
    renderer(): ICustomSeriesPaneRenderer;
    /**
     * This method will be called with the latest data for the renderer to use
     * during the next paint.
     */
    update(data: PaneRendererCustomData<HorzScaleItem, TData>, seriesOptions: TSeriesOptions): void;
    /**
     * A function for interpreting the custom series data and returning an array of numbers
     * representing the price values for the item. These price values are used
     * by the chart to determine the auto-scaling (to ensure the items are in view) and the crosshair
     * and price line positions. The last value in the array will be used as the current value. You shouldn't need to
     * have more than 3 values in this array since the library only needs a largest, smallest, and current value.
     */
    priceValueBuilder(plotRow: TData): CustomSeriesPricePlotValues;
    /**
     * A function for testing whether a data point should be considered fully specified, or if it should
     * be considered as whitespace. Should return `true` if is whitespace.
     *
     * @param data - data point to be tested
     */
    isWhitespace(data: TData | CustomSeriesWhitespaceData<HorzScaleItem>): data is CustomSeriesWhitespaceData<HorzScaleItem>;
    /**
     * Default options
     */
    defaultOptions(): TSeriesOptions;
    /**
     * This method will be evoked when the series has been removed from the chart. This method should be used to
     * clean up any objects, references, and other items that could potentially cause memory leaks.
     *
     * This method should contain all the necessary code to clean up the object before it is removed from memory.
     * This includes removing any event listeners or timers that are attached to the object, removing any references
     * to other objects, and resetting any values or properties that were modified during the lifetime of the object.
     */
    destroy?(): void;
}
/**
 * Class interface for Horizontal scale behavior
 */
export interface IHorzScaleBehavior<HorzScaleItem> {
    /**
     * Structure describing options of the chart.
     *
     * @returns ChartOptionsBase
     */
    options(): ChartOptionsImpl<HorzScaleItem>;
    /**
     * Set the chart options. Note that this is different to `applyOptions` since the provided options will overwrite the current options
     * instead of merging with the current options.
     *
     * @param options - Chart options to be set
     * @returns void
     */
    setOptions(options: ChartOptionsImpl<HorzScaleItem>): void;
    /**
     * Method to preprocess the data.
     *
     * @param data - Data items for the series
     * @returns void
     */
    preprocessData(data: DataItem<HorzScaleItem> | DataItem<HorzScaleItem>[]): void;
    /**
     * Convert horizontal scale item into an internal horizontal scale item.
     *
     * @param item - item to be converted
     * @returns InternalHorzScaleItem
     */
    convertHorzItemToInternal(item: HorzScaleItem): InternalHorzScaleItem;
    /**
     * Creates and returns a converter for changing series data into internal horizontal scale items.
     *
     * @param data - series data
     * @returns HorzScaleItemConverterToInternalObj
     */
    createConverterToInternalObj(data: SeriesDataItemTypeMap<HorzScaleItem>[SeriesType][]): HorzScaleItemConverterToInternalObj<HorzScaleItem>;
    /**
     * Returns the key for the specified horizontal scale item.
     *
     * @param internalItem - horizontal scale item for which the key should be returned
     * @returns InternalHorzScaleItemKey
     */
    key(internalItem: InternalHorzScaleItem | HorzScaleItem): InternalHorzScaleItemKey;
    /**
     * Returns the cache key for the specified horizontal scale item.
     *
     * @param internalItem - horizontal scale item for which the cache key should be returned
     * @returns number
     */
    cacheKey(internalItem: InternalHorzScaleItem): number;
    /**
     * Update the formatter with the localization options.
     *
     * @param options - Localization options
     * @returns void
     */
    updateFormatter(options: LocalizationOptions<HorzScaleItem>): void;
    /**
     * Format the horizontal scale item into a display string.
     *
     * @param item - horizontal scale item to be formatted as a string
     * @returns string
     */
    formatHorzItem(item: InternalHorzScaleItem): string;
    /**
     * Format the horizontal scale tickmark into a display string.
     *
     * @param item - tickmark item
     * @param localizationOptions - Localization options
     * @returns string
     */
    formatTickmark(item: TickMark, localizationOptions: LocalizationOptions<HorzScaleItem>): string;
    /**
     * Returns the maximum tickmark weight value for the specified tickmarks on the time scale.
     *
     * @param marks - Timescale tick marks
     * @returns TickMarkWeightValue
     */
    maxTickMarkWeight(marks: TimeMark[]): TickMarkWeightValue;
    /**
     * Fill the weights for the sorted time scale points.
     *
     * @param sortedTimePoints - sorted time scale points
     * @param startIndex - starting index
     * @returns void
     */
    fillWeightsForPoints(sortedTimePoints: readonly Mutable<TimeScalePoint>[], startIndex: number): void;
}
/** Interface to be implemented by the object in order to be used as a price formatter */
export interface IPriceFormatter {
    /**
     * Formatting function
     *
     * @param price - Original price to be formatted
     * @returns Formatted price
     */
    format(price: number): string;
}
/**
 * Represents the interface for interacting with price lines.
 */
export interface IPriceLine {
    /**
     * Apply options to the price line.
     *
     * @param options - Any subset of options.
     * @example
     * ```js
     * priceLine.applyOptions({
     *     price: 90.0,
     *     color: 'red',
     *     lineWidth: 3,
     *     lineStyle: LightweightCharts.LineStyle.Dashed,
     *     axisLabelVisible: false,
     *     title: 'P/L 600',
     * });
     * ```
     */
    applyOptions(options: Partial<PriceLineOptions>): void;
    /**
     * Get the currently applied options.
     */
    options(): Readonly<PriceLineOptions>;
}
/** Interface to control chart's price scale */
export interface IPriceScaleApi {
    /**
     * Applies new options to the price scale
     *
     * @param options - Any subset of options.
     */
    applyOptions(options: DeepPartial<PriceScaleOptions>): void;
    /**
     * Returns currently applied options of the price scale
     *
     * @returns Full set of currently applied options, including defaults
     */
    options(): Readonly<PriceScaleOptions>;
    /**
     * Returns a width of the price scale if it's visible or 0 if invisible.
     */
    width(): number;
}
/**
 * Represents the interface for interacting with series.
 */
export interface ISeriesApi<TSeriesType extends SeriesType, HorzScaleItem = Time, TData = SeriesDataItemTypeMap<HorzScaleItem>[TSeriesType], TOptions = SeriesOptionsMap[TSeriesType], TPartialOptions = SeriesPartialOptionsMap[TSeriesType]> {
    /**
     * Returns current price formatter
     *
     * @returns Interface to the price formatter object that can be used to format prices in the same way as the chart does
     */
    priceFormatter(): IPriceFormatter;
    /**
     * Converts specified series price to pixel coordinate according to the series price scale
     *
     * @param price - Input price to be converted
     * @returns Pixel coordinate of the price level on the chart
     */
    priceToCoordinate(price: number): Coordinate | null;
    /**
     * Converts specified coordinate to price value according to the series price scale
     *
     * @param coordinate - Input coordinate to be converted
     * @returns Price value of the coordinate on the chart
     */
    coordinateToPrice(coordinate: number): BarPrice | null;
    /**
     * Returns bars information for the series in the provided [logical range](/time-scale.md#logical-range) or `null`, if no series data has been found in the requested range.
     * This method can be used, for instance, to implement downloading historical data while scrolling to prevent a user from seeing empty space.
     *
     * @param range - The [logical range](/time-scale.md#logical-range) to retrieve info for.
     * @returns The bars info for the given logical range.
     * @example Getting bars info for current visible range
     * ```js
     * const barsInfo = series.barsInLogicalRange(chart.timeScale().getVisibleLogicalRange());
     * console.log(barsInfo);
     * ```
     * @example Implementing downloading historical data while scrolling
     * ```js
     * function onVisibleLogicalRangeChanged(newVisibleLogicalRange) {
     *     const barsInfo = series.barsInLogicalRange(newVisibleLogicalRange);
     *     // if there less than 50 bars to the left of the visible area
     *     if (barsInfo !== null && barsInfo.barsBefore < 50) {
     *         // try to load additional historical data and prepend it to the series data
     *     }
     * }
     *
     * chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);
     * ```
     */
    barsInLogicalRange(range: Range<number>): BarsInfo<HorzScaleItem> | null;
    /**
     * Applies new options to the existing series
     * You can set options initially when you create series or use the `applyOptions` method of the series to change the existing options.
     * Note that you can only pass options you want to change.
     *
     * @param options - Any subset of options.
     */
    applyOptions(options: TPartialOptions): void;
    /**
     * Returns currently applied options
     *
     * @returns Full set of currently applied options, including defaults
     */
    options(): Readonly<TOptions>;
    /**
     * Returns interface of the price scale the series is currently attached
     *
     * @returns IPriceScaleApi object to control the price scale
     */
    priceScale(): IPriceScaleApi;
    /**
     * Sets or replaces series data.
     *
     * @param data - Ordered (earlier time point goes first) array of data items. Old data is fully replaced with the new one.
     * @example Setting data to a line series
     * ```js
     * lineSeries.setData([
     *     { time: '2018-12-12', value: 24.11 },
     *     { time: '2018-12-13', value: 31.74 },
     * ]);
     * ```
     * @example Setting data to a bars (or candlestick) series
     * ```js
     * barSeries.setData([
     *     { time: '2018-12-19', open: 141.77, high: 170.39, low: 120.25, close: 145.72 },
     *     { time: '2018-12-20', open: 145.72, high: 147.99, low: 100.11, close: 108.19 },
     * ]);
     * ```
     */
    setData(data: TData[]): void;
    /**
     * Adds new data item to the existing set (or updates the latest item if times of the passed/latest items are equal).
     *
     * @param bar - A single data item to be added. Time of the new item must be greater or equal to the latest existing time point.
     * If the new item's time is equal to the last existing item's time, then the existing item is replaced with the new one.
     * @example Updating line series data
     * ```js
     * lineSeries.update({
     *     time: '2018-12-12',
     *     value: 24.11,
     * });
     * ```
     * @example Updating bar (or candlestick) series data
     * ```js
     * barSeries.update({
     *     time: '2018-12-19',
     *     open: 141.77,
     *     high: 170.39,
     *     low: 120.25,
     *     close: 145.72,
     * });
     * ```
     */
    update(bar: TData): void;
    /**
     * Returns a bar data by provided logical index.
     *
     * @param logicalIndex - Logical index
     * @param mismatchDirection - Search direction if no data found at provided logical index.
     * @returns Original data item provided via setData or update methods.
     * @example
     * ```js
     * const originalData = series.dataByIndex(10, LightweightCharts.MismatchDirection.NearestLeft);
     * ```
     */
    dataByIndex(logicalIndex: number, mismatchDirection?: MismatchDirection): TData | null;
    /**
     * Returns all the bar data for the series.
     *
     * @returns Original data items provided via setData or update methods.
     * @example
     * ```js
     * const originalData = series.data();
     * ```
     */
    data(): readonly TData[];
    /**
     * Subscribe to the data changed event. This event is fired whenever the `update` or `setData` method is evoked
     * on the series.
     *
     * @param handler - Handler to be called on a data changed event.
     * @example
     * ```js
     * function myHandler() {
     *     const data = series.data();
     *     console.log(`The data has changed. New Data length: ${data.length}`);
     * }
     *
     * series.subscribeDataChanged(myHandler);
     * ```
     */
    subscribeDataChanged(handler: DataChangedHandler): void;
    /**
     * Unsubscribe a handler that was previously subscribed using {@link subscribeDataChanged}.
     *
     * @param handler - Previously subscribed handler
     * @example
     * ```js
     * chart.unsubscribeDataChanged(myHandler);
     * ```
     */
    unsubscribeDataChanged(handler: DataChangedHandler): void;
    /**
     * Allows to set/replace all existing series markers with new ones.
     *
     * @param data - An array of series markers. This array should be sorted by time. Several markers with same time are allowed.
     * @example
     * ```js
     * series.setMarkers([
     *     {
     *         time: '2019-04-09',
     *         position: 'aboveBar',
     *         color: 'black',
     *         shape: 'arrowDown',
     *     },
     *     {
     *         time: '2019-05-31',
     *         position: 'belowBar',
     *         color: 'red',
     *         shape: 'arrowUp',
     *         id: 'id3',
     *     },
     *     {
     *         time: '2019-05-31',
     *         position: 'belowBar',
     *         color: 'orange',
     *         shape: 'arrowUp',
     *         id: 'id4',
     *         text: 'example',
     *         size: 2,
     *     },
     * ]);
     *
     * chart.subscribeCrosshairMove(param => {
     *     console.log(param.hoveredObjectId);
     * });
     *
     * chart.subscribeClick(param => {
     *     console.log(param.hoveredObjectId);
     * });
     * ```
     */
    setMarkers(data: SeriesMarker<HorzScaleItem>[]): void;
    /**
     * Returns an array of series markers.
     */
    markers(): SeriesMarker<HorzScaleItem>[];
    /**
     * Creates a new price line
     *
     * @param options - Any subset of options, however `price` is required.
     * @example
     * ```js
     * const priceLine = series.createPriceLine({
     *     price: 80.0,
     *     color: 'green',
     *     lineWidth: 2,
     *     lineStyle: LightweightCharts.LineStyle.Dotted,
     *     axisLabelVisible: true,
     *     title: 'P/L 500',
     * });
     * ```
     */
    createPriceLine(options: CreatePriceLineOptions): IPriceLine;
    /**
     * Removes the price line that was created before.
     *
     * @param line - A line to remove.
     * @example
     * ```js
     * const priceLine = series.createPriceLine({ price: 80.0 });
     * series.removePriceLine(priceLine);
     * ```
     */
    removePriceLine(line: IPriceLine): void;
    /**
     * Return current series type.
     *
     * @returns Type of the series.
     * @example
     * ```js
     * const lineSeries = chart.addLineSeries();
     * console.log(lineSeries.seriesType()); // "Line"
     *
     * const candlestickSeries = chart.addCandlestickSeries();
     * console.log(candlestickSeries.seriesType()); // "Candlestick"
     * ```
     */
    seriesType(): TSeriesType;
    /**
     * Attaches additional drawing primitive to the series
     *
     * @param primitive - any implementation of ISeriesPrimitive interface
     */
    attachPrimitive(primitive: ISeriesPrimitive<HorzScaleItem>): void;
    /**
     * Detaches additional drawing primitive from the series
     *
     * @param primitive - implementation of ISeriesPrimitive interface attached before
     * Does nothing if specified primitive was not attached
     */
    detachPrimitive(primitive: ISeriesPrimitive<HorzScaleItem>): void;
}
/**
 * This interface represents a label on the price or time axis
 */
export interface ISeriesPrimitiveAxisView {
    /**
     * The desired coordinate for the label. Note that the label will be automatically moved to prevent overlapping with other labels. If you would like the label to be drawn at the
     * exact coordinate under all circumstances then rather use `fixedCoordinate`.
     * For a price axis the value returned will represent the vertical distance (pixels) from the top. For a time axis the value will represent the horizontal distance from the left.
     *
     * @returns coordinate. distance from top for price axis, or distance from left for time axis.
     */
    coordinate(): number;
    /**
     * fixed coordinate of the label. A label with a fixed coordinate value will always be drawn at the specified coordinate and will appear above any 'unfixed' labels. If you supply
     * a fixed coordinate then you should return a large negative number for `coordinate` so that the automatic placement of unfixed labels doesn't leave a blank space for this label.
     * For a price axis the value returned will represent the vertical distance (pixels) from the top. For a time axis the value will represent the horizontal distance from the left.
     *
     * @returns coordinate. distance from top for price axis, or distance from left for time axis.
     */
    fixedCoordinate?(): number | undefined;
    /**
     * @returns text of the label
     */
    text(): string;
    /**
     * @returns text color of the label
     */
    textColor(): string;
    /**
     * @returns background color of the label
     */
    backColor(): string;
    /**
     * @returns whether the label should be visible (default: `true`)
     */
    visible?(): boolean;
    /**
     * @returns whether the tick mark line should be visible (default: `true`)
     */
    tickVisible?(): boolean;
}
/**
 * Base interface for series primitives. It must be implemented to add some external graphics to series
 */
export interface ISeriesPrimitiveBase<TSeriesAttachedParameters = unknown> {
    /**
     * This method is called when viewport has been changed, so primitive have to recalculate / invalidate its data
     */
    updateAllViews?(): void;
    /**
     * Returns array of labels to be drawn on the price axis used by the series
     *
     * @returns array of objects; each of then must implement ISeriesPrimitiveAxisView interface
     *
     * For performance reasons, the lightweight library uses internal caches based on references to arrays
     * So, this method must return new array if set of views has changed and should try to return the same array if nothing changed
     */
    priceAxisViews?(): readonly ISeriesPrimitiveAxisView[];
    /**
     * Returns array of labels to be drawn on the time axis
     *
     * @returns array of objects; each of then must implement ISeriesPrimitiveAxisView interface
     *
     * For performance reasons, the lightweight library uses internal caches based on references to arrays
     * So, this method must return new array if set of views has changed and should try to return the same array if nothing changed
     */
    timeAxisViews?(): readonly ISeriesPrimitiveAxisView[];
    /**
     * Returns array of objects representing primitive in the main area of the chart
     *
     * @returns array of objects; each of then must implement ISeriesPrimitivePaneView interface
     *
     * For performance reasons, the lightweight library uses internal caches based on references to arrays
     * So, this method must return new array if set of views has changed and should try to return the same array if nothing changed
     */
    paneViews?(): readonly ISeriesPrimitivePaneView[];
    /**
     * Returns array of objects representing primitive in the price axis area of the chart
     *
     * @returns array of objects; each of then must implement ISeriesPrimitivePaneView interface
     *
     * For performance reasons, the lightweight library uses internal caches based on references to arrays
     * So, this method must return new array if set of views has changed and should try to return the same array if nothing changed
     */
    priceAxisPaneViews?(): readonly ISeriesPrimitivePaneView[];
    /**
     * Returns array of objects representing primitive in the time axis area of the chart
     *
     * @returns array of objects; each of then must implement ISeriesPrimitivePaneView interface
     *
     * For performance reasons, the lightweight library uses internal caches based on references to arrays
     * So, this method must return new array if set of views has changed and should try to return the same array if nothing changed
     */
    timeAxisPaneViews?(): readonly ISeriesPrimitivePaneView[];
    /**
     * Return autoscaleInfo which will be merged with the series base autoscaleInfo. You can use this to expand the autoscale range
     * to include visual elements drawn outside of the series' current visible price range.
     *
     * **Important**: Please note that this method will be evoked very often during scrolling and zooming of the chart, thus it
     * is recommended that this method is either simple to execute, or makes use of optimisations such as caching to ensure that
     * the chart remains responsive.
     *
     * @param startTimePoint - start time point for the current visible range
     * @param endTimePoint - end time point for the current visible range
     * @returns AutoscaleInfo
     */
    autoscaleInfo?(startTimePoint: Logical, endTimePoint: Logical): AutoscaleInfo | null;
    /**
     * Attached Lifecycle hook.
     *
     * @param param - An object containing useful references for the attached primitive to use.
     * @returns void
     */
    attached?(param: TSeriesAttachedParameters): void;
    /**
     * Detached Lifecycle hook.
     *
     * @returns void
     */
    detached?(): void;
    /**
     * Hit test method which will be called by the library when the cursor is moved.
     * Use this to register object ids being hovered for use within the crosshairMoved
     * and click events emitted by the chart. Additionally, the hit test result can
     * specify a preferred cursor type to display for the main chart pane. This method
     * should return the top most hit for this primitive if more than one object is
     * being intersected.
     *
     * @param x - x Coordinate of mouse event
     * @param y - y Coordinate of mouse event
     */
    hitTest?(x: number, y: number): PrimitiveHoveredItem | null;
}
/**
 * This interface represents rendering some element on the canvas
 */
export interface ISeriesPrimitivePaneRenderer {
    /**
     * Method to draw main content of the element
     *
     * @param target - canvas context to draw on, refer to FancyCanvas library for more details about this class
     *
     */
    draw(target: CanvasRenderingTarget2D): void;
    /**
     * Optional method to draw the background.
     * Some elements could implement this method to draw on the background of the chart.
     * Usually this is some kind of watermarks or time areas highlighting.
     *
     * @param target - canvas context to draw on, refer FancyCanvas library for more details about this class
     */
    drawBackground?(target: CanvasRenderingTarget2D): void;
}
/**
 * This interface represents the primitive for one of the pane of the chart (main chart area, time scale, price scale).
 */
export interface ISeriesPrimitivePaneView {
    /**
     * Defines where in the visual layer stack the renderer should be executed. Default is `'normal'`.
     *
     * @returns the desired position in the visual layer stack. @see {@link SeriesPrimitivePaneViewZOrder}
     */
    zOrder?(): SeriesPrimitivePaneViewZOrder;
    /**
     * This method returns a renderer - special object to draw data
     *
     * @returns an renderer object to be used for drawing, or `null` if we have nothing to draw.
     */
    renderer(): ISeriesPrimitivePaneRenderer | null;
}
/** Interface to chart time scale */
export interface ITimeScaleApi<HorzScaleItem> {
    /**
     * Return the distance from the right edge of the time scale to the lastest bar of the series measured in bars.
     */
    scrollPosition(): number;
    /**
     * Scrolls the chart to the specified position.
     *
     * @param position - Target data position
     * @param animated - Setting this to true makes the chart scrolling smooth and adds animation
     */
    scrollToPosition(position: number, animated: boolean): void;
    /**
     * Restores default scroll position of the chart. This process is always animated.
     */
    scrollToRealTime(): void;
    /**
     * Returns current visible time range of the chart.
     *
     * Note that this method cannot extrapolate time and will use the only currently existent data.
     * To get complete information about current visible range, please use {@link getVisibleLogicalRange} and {@link ISeriesApi.barsInLogicalRange}.
     *
     * @returns Visible range or null if the chart has no data at all.
     */
    getVisibleRange(): Range<HorzScaleItem> | null;
    /**
     * Sets visible range of data.
     *
     * Note that this method cannot extrapolate time and will use the only currently existent data.
     * Thus, for example, if currently a chart doesn't have data prior `2018-01-01` date and you set visible range with `from` date `2016-01-01`, it will be automatically adjusted to `2018-01-01` (and the same for `to` date).
     *
     * But if you can approximate indexes on your own - you could use {@link setVisibleLogicalRange} instead.
     *
     * @param range - Target visible range of data.
     * @example
     * ```js
     * chart.timeScale().setVisibleRange({
     *     from: (new Date(Date.UTC(2018, 0, 1, 0, 0, 0, 0))).getTime() / 1000,
     *     to: (new Date(Date.UTC(2018, 1, 1, 0, 0, 0, 0))).getTime() / 1000,
     * });
     * ```
     */
    setVisibleRange(range: Range<HorzScaleItem>): void;
    /**
     * Returns the current visible [logical range](/time-scale.md#logical-range) of the chart as an object with the first and last time points of the logical range, or returns `null` if the chart has no data.
     *
     * @returns Visible range or null if the chart has no data at all.
     */
    getVisibleLogicalRange(): LogicalRange | null;
    /**
     * Sets visible [logical range](/time-scale.md#logical-range) of data.
     *
     * @param range - Target visible logical range of data.
     * @example
     * ```js
     * chart.timeScale().setVisibleLogicalRange({ from: 0, to: Date.now() / 1000 });
     * ```
     */
    setVisibleLogicalRange(range: Range<number>): void;
    /**
     * Restores default zoom level and scroll position of the time scale.
     */
    resetTimeScale(): void;
    /**
     * Automatically calculates the visible range to fit all data from all series.
     */
    fitContent(): void;
    /**
     * Converts a logical index to local x coordinate.
     *
     * @param logical - Logical index needs to be converted
     * @returns x coordinate of that time or `null` if the chart doesn't have data
     */
    logicalToCoordinate(logical: Logical): Coordinate | null;
    /**
     * Converts a coordinate to logical index.
     *
     * @param x - Coordinate needs to be converted
     * @returns Logical index that is located on that coordinate or `null` if the chart doesn't have data
     */
    coordinateToLogical(x: number): Logical | null;
    /**
     * Converts a time to local x coordinate.
     *
     * @param time - Time needs to be converted
     * @returns X coordinate of that time or `null` if no time found on time scale
     */
    timeToCoordinate(time: HorzScaleItem): Coordinate | null;
    /**
     * Converts a coordinate to time.
     *
     * @param x - Coordinate needs to be converted.
     * @returns Time of a bar that is located on that coordinate or `null` if there are no bars found on that coordinate.
     */
    coordinateToTime(x: number): HorzScaleItem | null;
    /**
     * Returns a width of the time scale.
     */
    width(): number;
    /**
     * Returns a height of the time scale.
     */
    height(): number;
    /**
     * Subscribe to the visible time range change events.
     *
     * The argument passed to the handler function is an object with `from` and `to` properties of type {@link Time}, or `null` if there is no visible data.
     *
     * @param handler - Handler (function) to be called when the visible indexes change.
     * @example
     * ```js
     * function myVisibleTimeRangeChangeHandler(newVisibleTimeRange) {
     *     if (newVisibleTimeRange === null) {
     *         // handle null
     *     }
     *
     *     // handle new logical range
     * }
     *
     * chart.timeScale().subscribeVisibleTimeRangeChange(myVisibleTimeRangeChangeHandler);
     * ```
     */
    subscribeVisibleTimeRangeChange(handler: TimeRangeChangeEventHandler<HorzScaleItem>): void;
    /**
     * Unsubscribe a handler that was previously subscribed using {@link subscribeVisibleTimeRangeChange}.
     *
     * @param handler - Previously subscribed handler
     * @example
     * ```js
     * chart.timeScale().unsubscribeVisibleTimeRangeChange(myVisibleTimeRangeChangeHandler);
     * ```
     */
    unsubscribeVisibleTimeRangeChange(handler: TimeRangeChangeEventHandler<HorzScaleItem>): void;
    /**
     * Subscribe to the visible logical range change events.
     *
     * The argument passed to the handler function is an object with `from` and `to` properties of type `number`, or `null` if there is no visible data.
     *
     * @param handler - Handler (function) to be called when the visible indexes change.
     * @example
     * ```js
     * function myVisibleLogicalRangeChangeHandler(newVisibleLogicalRange) {
     *     if (newVisibleLogicalRange === null) {
     *         // handle null
     *     }
     *
     *     // handle new logical range
     * }
     *
     * chart.timeScale().subscribeVisibleLogicalRangeChange(myVisibleLogicalRangeChangeHandler);
     * ```
     */
    subscribeVisibleLogicalRangeChange(handler: LogicalRangeChangeEventHandler): void;
    /**
     * Unsubscribe a handler that was previously subscribed using {@link subscribeVisibleLogicalRangeChange}.
     *
     * @param handler - Previously subscribed handler
     * @example
     * ```js
     * chart.timeScale().unsubscribeVisibleLogicalRangeChange(myVisibleLogicalRangeChangeHandler);
     * ```
     */
    unsubscribeVisibleLogicalRangeChange(handler: LogicalRangeChangeEventHandler): void;
    /**
     * Adds a subscription to time scale size changes
     *
     * @param handler - Handler (function) to be called when the time scale size changes
     */
    subscribeSizeChange(handler: SizeChangeEventHandler): void;
    /**
     * Removes a subscription to time scale size changes
     *
     * @param handler - Previously subscribed handler
     */
    unsubscribeSizeChange(handler: SizeChangeEventHandler): void;
    /**
     * Applies new options to the time scale.
     *
     * @param options - Any subset of options.
     */
    applyOptions(options: DeepPartial<HorzScaleOptions>): void;
    /**
     * Returns current options
     *
     * @returns Currently applied options
     */
    options(): Readonly<HorzScaleOptions>;
}
/**
 * Represents options for enabling or disabling kinetic scrolling with mouse and touch gestures.
 */
export interface KineticScrollOptions {
    /**
     * Enable kinetic scroll with touch gestures.
     *
     * @defaultValue `true`
     */
    touch: boolean;
    /**
     * Enable kinetic scroll with the mouse.
     *
     * @defaultValue `false`
     */
    mouse: boolean;
}
/** Represents layout options */
export interface LayoutOptions {
    /**
     * Chart and scales background color.
     *
     * @defaultValue `{ type: ColorType.Solid, color: '#FFFFFF' }`
     */
    background: Background;
    /**
     * Color of text on the scales.
     *
     * @defaultValue `'#191919'`
     */
    textColor: string;
    /**
     * Font size of text on scales in pixels.
     *
     * @defaultValue `12`
     */
    fontSize: number;
    /**
     * Font family of text on the scales.
     *
     * @defaultValue `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`
     */
    fontFamily: string;
}
/**
 * Structure describing a single item of data for line series
 */
export interface LineData<HorzScaleItem = Time> extends SingleValueData<HorzScaleItem> {
    /**
     * Optional color value for certain data item. If missed, color from options is used
     */
    color?: string;
}
/**
 * Represents style options for a line series.
 */
export interface LineStyleOptions {
    /**
     * Line color.
     *
     * @defaultValue `'#2196f3'`
     */
    color: string;
    /**
     * Line style.
     *
     * @defaultValue {@link LineStyle.Solid}
     */
    lineStyle: LineStyle;
    /**
     * Line width in pixels.
     *
     * @defaultValue `3`
     */
    lineWidth: LineWidth;
    /**
     * Line type.
     *
     * @defaultValue {@link LineType.Simple}
     */
    lineType: LineType;
    /**
     * Show series line.
     *
     * @defaultValue `true`
     */
    lineVisible: boolean;
    /**
     * Show circle markers on each point.
     *
     * @defaultValue `false`
     */
    pointMarkersVisible: boolean;
    /**
     * Circle markers radius in pixels.
     *
     * @defaultValue `undefined`
     */
    pointMarkersRadius?: number;
    /**
     * Show the crosshair marker.
     *
     * @defaultValue `true`
     */
    crosshairMarkerVisible: boolean;
    /**
     * Crosshair marker radius in pixels.
     *
     * @defaultValue `4`
     */
    crosshairMarkerRadius: number;
    /**
     * Crosshair marker border color. An empty string falls back to the color of the series under the crosshair.
     *
     * @defaultValue `''`
     */
    crosshairMarkerBorderColor: string;
    /**
     * The crosshair marker background color. An empty string falls back to the color of the series under the crosshair.
     *
     * @defaultValue `''`
     */
    crosshairMarkerBackgroundColor: string;
    /**
     * Crosshair marker border width in pixels.
     *
     * @defaultValue `2`
     */
    crosshairMarkerBorderWidth: number;
    /**
     * Last price animation mode.
     *
     * @defaultValue {@link LastPriceAnimationMode.Disabled}
     */
    lastPriceAnimation: LastPriceAnimationMode;
}
/**
 * Represents options for formatting dates, times, and prices according to a locale.
 */
export interface LocalizationOptions<HorzScaleItem> extends LocalizationOptionsBase {
    /**
     * Override formatting of the time scale crosshair label.
     *
     * @defaultValue `undefined`
     */
    timeFormatter?: TimeFormatterFn<HorzScaleItem>;
    /**
     * Date formatting string.
     *
     * Can contain `yyyy`, `yy`, `MMMM`, `MMM`, `MM` and `dd` literals which will be replaced with corresponding date's value.
     *
     * Ignored if {@link timeFormatter} has been specified.
     *
     * @defaultValue `'dd MMM \'yy'`
     */
    dateFormat: string;
}
/**
 * Represents basic localization options
 */
export interface LocalizationOptionsBase {
    /**
     * Current locale used to format dates. Uses the browser's language settings by default.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation
     * @defaultValue `navigator.language`
     */
    locale: string;
    /**
     * Override formatting of the price scale tick marks, labels and crosshair labels. Can be used for cases that can't be covered with built-in price formats.
     *
     * @see {@link PriceFormatCustom}
     * @defaultValue `undefined`
     */
    priceFormatter?: PriceFormatterFn;
    /**
     * Override formatting of the percentage scale tick marks, labels and crosshair labels. Can be used for cases that can't be covered with built-in percentage format.
     *
     * @defaultValue `undefined`
     */
    percentageFormatter?: PercentageFormatterFn;
}
/**
 * Represents a mouse event.
 */
export interface MouseEventParams<HorzScaleItem = Time> {
    /**
     * Time of the data at the location of the mouse event.
     *
     * The value will be `undefined` if the location of the event in the chart is outside the range of available data.
     */
    time?: HorzScaleItem;
    /**
     * Logical index
     */
    logical?: Logical;
    /**
     * Location of the event in the chart.
     *
     * The value will be `undefined` if the event is fired outside the chart, for example a mouse leave event.
     */
    point?: Point;
    /**
     * Data of all series at the location of the event in the chart.
     *
     * Keys of the map are {@link ISeriesApi} instances. Values are prices.
     * Values of the map are original data items
     */
    seriesData: Map<ISeriesApi<SeriesType, HorzScaleItem>, BarData<HorzScaleItem> | LineData<HorzScaleItem> | HistogramData<HorzScaleItem> | CustomData<HorzScaleItem>>;
    /**
     * The {@link ISeriesApi} for the series at the point of the mouse event.
     */
    hoveredSeries?: ISeriesApi<SeriesType, HorzScaleItem>;
    /**
     * The ID of the object at the point of the mouse event.
     */
    hoveredObjectId?: unknown;
    /**
     * The underlying source mouse or touch event data, if available
     */
    sourceEvent?: TouchMouseEventData;
}
/**
 * Represents a bar with a {@link Time} and open, high, low, and close prices.
 */
export interface OhlcData<HorzScaleItem = Time> extends WhitespaceData<HorzScaleItem> {
    /**
     * The bar time.
     */
    time: HorzScaleItem;
    /**
     * The open price.
     */
    open: number;
    /**
     * The high price.
     */
    high: number;
    /**
     * The low price.
     */
    low: number;
    /**
     * The close price.
     */
    close: number;
}
/**
 * Data provide to the custom series pane view which can be used within the renderer
 * for drawing the series data.
 */
export interface PaneRendererCustomData<HorzScaleItem, TData extends CustomData<HorzScaleItem>> {
    /**
     * List of all the series' items and their x coordinates.
     */
    bars: readonly CustomBarItemData<HorzScaleItem, TData>[];
    /**
     * Spacing between consecutive bars.
     */
    barSpacing: number;
    /**
     * The current visible range of items on the chart.
     */
    visibleRange: Range<number> | null;
}
/**
 * Dimensions of the Chart Pane
 * (the main chart area which excludes the time and price scales).
 */
export interface PaneSize {
    /** Height of the Chart Pane (pixels) */
    height: number;
    /** Width of the Chart Pane (pixels) */
    width: number;
}
/**
 * Represents a point on the chart.
 */
export interface Point {
    /**
     * The x coordinate.
     */
    readonly x: Coordinate;
    /**
     * The y coordinate.
     */
    readonly y: Coordinate;
}
/**
 * Represents series value formatting options.
 * The precision and minMove properties allow wide customization of formatting.
 *
 * @example
 * `minMove=0.01`, `precision` is not specified - prices will change like 1.13, 1.14, 1.15 etc.
 * @example
 * `minMove=0.01`, `precision=3` - prices will change like 1.130, 1.140, 1.150 etc.
 * @example
 * `minMove=0.05`, `precision` is not specified - prices will change like 1.10, 1.15, 1.20 etc.
 */
export interface PriceFormatBuiltIn {
    /**
     * Built-in price formats:
     * - `'price'` is the most common choice; it allows customization of precision and rounding of prices.
     * - `'volume'` uses abbreviation for formatting prices like `1.2K` or `12.67M`.
     * - `'percent'` uses `%` sign at the end of prices.
     */
    type: "price" | "volume" | "percent";
    /**
     * Number of digits after the decimal point.
     * If it is not set, then its value is calculated automatically based on minMove.
     *
     * @defaultValue `2` if both {@link minMove} and {@link precision} are not provided, calculated automatically based on {@link minMove} otherwise.
     */
    precision: number;
    /**
     * The minimum possible step size for price value movement. This value shouldn't have more decimal digits than the precision.
     *
     * @defaultValue `0.01`
     */
    minMove: number;
}
/**
 * Represents series value formatting options.
 */
export interface PriceFormatCustom {
    /**
     * The custom price format.
     */
    type: "custom";
    /**
     * Override price formatting behaviour. Can be used for cases that can't be covered with built-in price formats.
     */
    formatter: PriceFormatterFn;
    /**
     * The minimum possible step size for price value movement.
     *
     * @defaultValue `0.01`
     */
    minMove: number;
}
/**
 * Represents a price line options.
 */
export interface PriceLineOptions {
    /**
     * The optional ID of this price line.
     */
    id?: string;
    /**
     * Price line's value.
     *
     * @defaultValue `0`
     */
    price: number;
    /**
     * Price line's color.
     *
     * @defaultValue `''`
     */
    color: string;
    /**
     * Price line's width in pixels.
     *
     * @defaultValue `1`
     */
    lineWidth: LineWidth;
    /**
     * Price line's style.
     *
     * @defaultValue {@link LineStyle.Solid}
     */
    lineStyle: LineStyle;
    /**
     * Display line.
     *
     * @defaultValue `true`
     */
    lineVisible: boolean;
    /**
     * Display the current price value in on the price scale.
     *
     * @defaultValue `true`
     */
    axisLabelVisible: boolean;
    /**
     * Price line's on the chart pane.
     *
     * @defaultValue `''`
     */
    title: string;
    /**
     * Background color for the axis label.
     * Will default to the price line color if unspecified.
     *
     * @defaultValue `''`
     */
    axisLabelColor: string;
    /**
     * Text color for the axis label.
     *
     * @defaultValue `''`
     */
    axisLabelTextColor: string;
}
/**
 * Represents a price range.
 */
export interface PriceRange {
    /**
     * Maximum value in the range.
     */
    minValue: number;
    /**
     * Minimum value in the range.
     */
    maxValue: number;
}
/** Defines margins of the price scale. */
export interface PriceScaleMargins {
    /**
     * Top margin in percentages. Must be greater or equal to 0 and less than 1.
     */
    top: number;
    /**
     * Bottom margin in percentages. Must be greater or equal to 0 and less than 1.
     */
    bottom: number;
}
/** Structure that describes price scale options */
export interface PriceScaleOptions {
    /**
     * Autoscaling is a feature that automatically adjusts a price scale to fit the visible range of data.
     * Note that overlay price scales are always auto-scaled.
     *
     * @defaultValue `true`
     */
    autoScale: boolean;
    /**
     * Price scale mode.
     *
     * @defaultValue {@link PriceScaleMode.Normal}
     */
    mode: PriceScaleMode;
    /**
     * Invert the price scale, so that a upwards trend is shown as a downwards trend and vice versa.
     * Affects both the price scale and the data on the chart.
     *
     * @defaultValue `false`
     */
    invertScale: boolean;
    /**
     * Align price scale labels to prevent them from overlapping.
     *
     * @defaultValue `true`
     */
    alignLabels: boolean;
    /**
     * Price scale margins.
     *
     * @defaultValue `{ bottom: 0.1, top: 0.2 }`
     * @example
     * ```js
     * chart.priceScale('right').applyOptions({
     *     scaleMargins: {
     *         top: 0.8,
     *         bottom: 0,
     *     },
     * });
     * ```
     */
    scaleMargins: PriceScaleMargins;
    /**
     * Set true to draw a border between the price scale and the chart area.
     *
     * @defaultValue `true`
     */
    borderVisible: boolean;
    /**
     * Price scale border color.
     *
     * @defaultValue `'#2B2B43'`
     */
    borderColor: string;
    /**
     * Price scale text color.
     * If not provided {@link LayoutOptions.textColor} is used.
     *
     * @defaultValue `undefined`
     */
    textColor?: string;
    /**
     * Show top and bottom corner labels only if entire text is visible.
     *
     * @defaultValue `false`
     */
    entireTextOnly: boolean;
    /**
     * Indicates if this price scale visible. Ignored by overlay price scales.
     *
     * @defaultValue `true` for the right price scale and `false` for the left
     */
    visible: boolean;
    /**
     * Draw small horizontal line on price axis labels.
     *
     * @defaultValue `false`
     */
    ticksVisible: boolean;
    /**
     * Define a minimum width for the price scale.
     * Note: This value will be exceeded if the
     * price scale needs more space to display it's contents.
     *
     * Setting a minimum width could be useful for ensuring that
     * multiple charts positioned in a vertical stack each have
     * an identical price scale width, or for plugins which
     * require a bit more space within the price scale pane.
     *
     * @defaultValue 0
     */
    minimumWidth: number;
}
/**
 * Data representing the currently hovered object from the Hit test.
 */
export interface PrimitiveHoveredItem {
    /**
     * CSS cursor style as defined here: [MDN: CSS Cursor](https://developer.mozilla.org/en-US/docs/Web/CSS/cursor) or `undefined`
     * if you want the library to use the default cursor style instead.
     */
    cursorStyle?: string;
    /**
     * Hovered objects external ID. Can be used to identify the source item within a mouse subscriber event.
     */
    externalId: string;
    /**
     * The zOrder of the hovered item.
     */
    zOrder: SeriesPrimitivePaneViewZOrder;
    /**
     * Set to true if the object is rendered using `drawBackground` instead of `draw`.
     */
    isBackground?: boolean;
}
/**
 * Represents a generic range `from` one value `to` another.
 */
export interface Range<T> {
    /**
     * The from value. The start of the range.
     */
    from: T;
    /**
     * The to value. The end of the range.
     */
    to: T;
}
/**
 * Object containing references to the chart and series instances, and a requestUpdate method for triggering
 * a refresh of the chart.
 */
export interface SeriesAttachedParameter<HorzScaleItem = Time, TSeriesType extends SeriesType = keyof SeriesOptionsMap> {
    /**
     * Chart instance.
     */
    chart: IChartApiBase<HorzScaleItem>;
    /**
     * Series to which the Primitive is attached.
     */
    series: ISeriesApi<TSeriesType, HorzScaleItem>;
    /**
     * Request an update (redraw the chart)
     */
    requestUpdate: () => void;
}
// /**
//  * Represents the type of data that a series contains.
//  *
//  * For example a bar series contains {@link BarData} or {@link WhitespaceData}.
//  */
// export interface SeriesDataItemTypeMap<HorzScaleItem = Time> {
//     /**
//      * The types of bar series data.
//      */
//     Bar: BarData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
//     /**
//      * The types of candlestick series data.
//      */
//     Candlestick: CandlestickData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
//     /**
//      * The types of area series data.
//      */
//     Area: AreaData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
//     /**
//      * The types of baseline series data.
//      */
//     Baseline: BaselineData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
//     /**
//      * The types of line series data.
//      */
//     Line: LineData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
//     /**
//      * The types of histogram series data.
//      */
//     Histogram: HistogramData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
//     /**
//      * The base types of an custom series data.
//      */
//     Custom: CustomData<HorzScaleItem> | CustomSeriesWhitespaceData<HorzScaleItem>;
// }
/**
 * Represents a series marker.
 */
export interface SeriesMarker<TimeType> {
    /**
     * The time of the marker.
     */
    time: TimeType;
    /**
     * The position of the marker.
     */
    position: SeriesMarkerPosition;
    /**
     * The shape of the marker.
     */
    shape: SeriesMarkerShape;
    /**
     * The color of the marker.
     */
    color: string;
    /**
     * The ID of the marker.
     */
    id?: string;
    /**
     * The optional text of the marker.
     */
    text?: string;
    /**
     * The optional size of the marker.
     *
     * @defaultValue `1`
     */
    size?: number;
}
/**
 * Represents options common for all types of series
 */
export interface SeriesOptionsCommon {
    /**
     * Visibility of the label with the latest visible price on the price scale.
     *
     * @defaultValue `true`
     */
    lastValueVisible: boolean;
    /**
     * You can name series when adding it to a chart. This name will be displayed on the label next to the last value label.
     *
     * @defaultValue `''`
     */
    title: string;
    /**
     * Target price scale to bind new series to.
     *
     * @defaultValue `'right'` if right scale is visible and `'left'` otherwise
     */
    priceScaleId?: string;
    /**
     * Visibility of the series.
     * If the series is hidden, everything including price lines, baseline, price labels and markers, will also be hidden.
     * Please note that hiding a series is not equivalent to deleting it, since hiding does not affect the timeline at all, unlike deleting where the timeline can be changed (some points can be deleted).
     *
     * @defaultValue `true`
     */
    visible: boolean;
    /**
     * Show the price line. Price line is a horizontal line indicating the last price of the series.
     *
     * @defaultValue `true`
     */
    priceLineVisible: boolean;
    /**
     * The source to use for the value of the price line.
     *
     * @defaultValue {@link PriceLineSource.LastBar}
     */
    priceLineSource: PriceLineSource;
    /**
     * Width of the price line.
     *
     * @defaultValue `1`
     */
    priceLineWidth: LineWidth;
    /**
     * Color of the price line.
     * By default, its color is set by the last bar color (or by line color on Line and Area charts).
     *
     * @defaultValue `''`
     */
    priceLineColor: string;
    /**
     * Price line style.
     *
     * @defaultValue {@link LineStyle.Dashed}
     */
    priceLineStyle: LineStyle;
    /**
     * Price format.
     *
     * @defaultValue `{ type: 'price', precision: 2, minMove: 0.01 }`
     */
    priceFormat: PriceFormat;
    /**
     * Visibility of base line. Suitable for percentage and `IndexedTo100` scales.
     *
     * @defaultValue `true`
     */
    baseLineVisible: boolean;
    /**
     * Color of the base line in `IndexedTo100` mode.
     *
     * @defaultValue `'#B2B5BE'`
     */
    baseLineColor: string;
    /**
     * Base line width. Suitable for percentage and `IndexedTo10` scales.
     *
     * @defaultValue `1`
     */
    baseLineWidth: LineWidth;
    /**
     * Base line style. Suitable for percentage and indexedTo100 scales.
     *
     * @defaultValue {@link LineStyle.Solid}
     */
    baseLineStyle: LineStyle;
    /**
     * Override the default {@link AutoscaleInfo} provider.
     * By default, the chart scales data automatically based on visible data range.
     * However, for some reasons one could require overriding this behavior.
     *
     * @defaultValue `undefined`
     * @example Use price range from 0 to 100 regardless the current visible range
     * ```js
     * const firstSeries = chart.addLineSeries({
     *     autoscaleInfoProvider: () => ({
     *         priceRange: {
     *             minValue: 0,
     *             maxValue: 100,
     *         },
     *     }),
     * });
     * ```
     * @example Adding a small pixel margins to the price range
     * ```js
     * const firstSeries = chart.addLineSeries({
     *     autoscaleInfoProvider: () => ({
     *         priceRange: {
     *             minValue: 0,
     *             maxValue: 100,
     *         },
     *         margins: {
     *             above: 10,
     *             below: 10,
     *         },
     *     }),
     * });
     * ```
     * @example Using the default implementation to adjust the result
     * ```js
     * const firstSeries = chart.addLineSeries({
     *     autoscaleInfoProvider: original => {
     *         const res = original();
     *         if (res !== null) {
     *             res.priceRange.minValue -= 10;
     *             res.priceRange.maxValue += 10;
     *         }
     *         return res;
     *     },
     * });
     * ```
     */
    autoscaleInfoProvider?: AutoscaleInfoProvider;
}
// /**
//  * Represents the type of options for each series type.
//  *
//  * For example a bar series has options represented by {@link BarSeriesOptions}.
//  */
// export interface SeriesOptionsMap {
//     /**
//      * The type of bar series options.
//      */
//     Bar: BarSeriesOptions;
//     /**
//      * The type of candlestick series options.
//      */
//     Candlestick: CandlestickSeriesOptions;
//     /**
//      * The type of area series options.
//      */
//     Area: AreaSeriesOptions;
//     /**
//      * The type of baseline series options.
//      */
//     Baseline: BaselineSeriesOptions;
//     /**
//      * The type of line series options.
//      */
//     Line: LineSeriesOptions;
//     /**
//      * The type of histogram series options.
//      */
//     Histogram: HistogramSeriesOptions;
//     /**
//      * The type of a custom series options.
//      */
//     Custom: CustomSeriesOptions;
// }
// /**
//  * Represents the type of partial options for each series type.
//  *
//  * For example a bar series has options represented by {@link BarSeriesPartialOptions}.
//  */
// export interface SeriesPartialOptionsMap {
//     /**
//      * The type of bar series partial options.
//      */
//     Bar: BarSeriesPartialOptions;
//     /**
//      * The type of candlestick series partial options.
//      */
//     Candlestick: CandlestickSeriesPartialOptions;
//     /**
//      * The type of area series partial options.
//      */
//     Area: AreaSeriesPartialOptions;
//     /**
//      * The type of baseline series partial options.
//      */
//     Baseline: BaselineSeriesPartialOptions;
//     /**
//      * The type of line series partial options.
//      */
//     Line: LineSeriesPartialOptions;
//     /**
//      * The type of histogram series partial options.
//      */
//     Histogram: HistogramSeriesPartialOptions;
//     /**
//      * The type of a custom series partial options.
//      */
//     Custom: CustomSeriesPartialOptions;
// }
/**
 * A base interface for a data point of single-value series.
 */
export interface SingleValueData<HorzScaleItem = Time> extends WhitespaceData<HorzScaleItem> {
    /**
     * The time of the data.
     */
    time: HorzScaleItem;
    /**
     * Price value of the data.
     */
    value: number;
}
/**
 * Represents a solid color.
 */
export interface SolidColor {
    /**
     * Type of color.
     */
    type: ColorType.Solid;
    /**
     * Color.
     */
    color: string;
}
/**
 * Tick mark for the horizontal scale.
 */
export interface TickMark {
    /** Index */
    index: TimePointIndex;
    /** Time / Coordinate */
    time: InternalHorzScaleItem;
    /** Weight of the tick mark */
    weight: TickMarkWeightValue;
    /** Original value for the `time` property */
    originalTime: unknown;
}
/**
 * Options for chart with time at the horizontal scale
 */
export interface TimeChartOptions extends ChartOptionsImpl<Time> {
    /**
     * Extended time scale options with option to override tickMarkFormatter
     */
    timeScale: TimeScaleOptions;
}
/**
 * Represents a tick mark on the horizontal (time) scale.
 */
export interface TimeMark {
    /** Does time mark need to be aligned */
    needAlignCoordinate: boolean;
    /** Coordinate for the time mark */
    coord: number;
    /** Display label for the time mark */
    label: string;
    /** Weight of the time mark */
    weight: TickMarkWeightValue;
}
/**
 * Extended time scale options for time-based horizontal scale
 */
export interface TimeScaleOptions extends HorzScaleOptions {
    /**
     * Tick marks formatter can be used to customize tick marks labels on the time axis.
     *
     * @defaultValue `undefined`
     */
    tickMarkFormatter?: TickMarkFormatter;
}
/**
 * Represents a point on the time scale
 */
export interface TimeScalePoint {
    /** Weight of the point */
    readonly timeWeight: TickMarkWeightValue;
    /** Time of the point */
    readonly time: InternalHorzScaleItem;
    /** Original time for the point */
    readonly originalTime: unknown;
}
/**
 * The TouchMouseEventData interface represents events that occur due to the user interacting with a
 * pointing device (such as a mouse).
 * See {@link https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent | MouseEvent}
 */
export interface TouchMouseEventData {
    /**
     * The X coordinate of the mouse pointer in local (DOM content) coordinates.
     */
    readonly clientX: Coordinate;
    /**
     * The Y coordinate of the mouse pointer in local (DOM content) coordinates.
     */
    readonly clientY: Coordinate;
    /**
     * The X coordinate of the mouse pointer relative to the whole document.
     */
    readonly pageX: Coordinate;
    /**
     * The Y coordinate of the mouse pointer relative to the whole document.
     */
    readonly pageY: Coordinate;
    /**
     * The X coordinate of the mouse pointer in global (screen) coordinates.
     */
    readonly screenX: Coordinate;
    /**
     * The Y coordinate of the mouse pointer in global (screen) coordinates.
     */
    readonly screenY: Coordinate;
    /**
     * The X coordinate of the mouse pointer relative to the chart / price axis / time axis canvas element.
     */
    readonly localX: Coordinate;
    /**
     * The Y coordinate of the mouse pointer relative to the chart / price axis / time axis canvas element.
     */
    readonly localY: Coordinate;
    /**
     * Returns a boolean value that is true if the Ctrl key was active when the key event was generated.
     */
    readonly ctrlKey: boolean;
    /**
     * Returns a boolean value that is true if the Alt (Option or ⌥ on macOS) key was active when the
     * key event was generated.
     */
    readonly altKey: boolean;
    /**
     * Returns a boolean value that is true if the Shift key was active when the key event was generated.
     */
    readonly shiftKey: boolean;
    /**
     * Returns a boolean value that is true if the Meta key (on Mac keyboards, the ⌘ Command key; on
     * Windows keyboards, the Windows key (⊞)) was active when the key event was generated.
     */
    readonly metaKey: boolean;
}
/**
 * Represent options for the tracking mode's behavior.
 *
 * Mobile users will not have the ability to see the values/dates like they do on desktop.
 * To see it, they should enter the tracking mode. The tracking mode will deactivate the scrolling
 * and make it possible to check values and dates.
 */
export interface TrackingModeOptions {
    /** @inheritDoc TrackingModeExitMode
     *
     * @defaultValue {@link TrackingModeExitMode.OnNextTap}
     */
    exitMode: TrackingModeExitMode;
}
/**
 * Represents a vertical gradient of two colors.
 */
export interface VerticalGradientColor {
    /**
     * Type of color.
     */
    type: ColorType.VerticalGradient;
    /**
     * Top color
     */
    topColor: string;
    /**
     * Bottom color
     */
    bottomColor: string;
}
/** Watermark options. */
export interface WatermarkOptions {
    /**
     * Watermark color.
     *
     * @defaultValue `'rgba(0, 0, 0, 0)'`
     */
    color: string;
    /**
     * Display the watermark.
     *
     * @defaultValue `false`
     */
    visible: boolean;
    /**
     * Text of the watermark. Word wrapping is not supported.
     *
     * @defaultValue `''`
     */
    text: string;
    /**
     * Font size in pixels.
     *
     * @defaultValue `48`
     */
    fontSize: number;
    /**
     * Font family.
     *
     * @defaultValue `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`
     */
    fontFamily: string;
    /**
     * Font style.
     *
     * @defaultValue `''`
     */
    fontStyle: string;
    /**
     * Horizontal alignment inside the chart area.
     *
     * @defaultValue `'center'`
     */
    horzAlign: HorzAlign;
    /**
     * Vertical alignment inside the chart area.
     *
     * @defaultValue `'center'`
     */
    vertAlign: VertAlign;
}
/**
 * Represents a whitespace data item, which is a data point without a value.
 *
 * @example
 * ```js
 * const data = [
 *     { time: '2018-12-03', value: 27.02 },
 *     { time: '2018-12-04' }, // whitespace
 *     { time: '2018-12-05' }, // whitespace
 *     { time: '2018-12-06' }, // whitespace
 *     { time: '2018-12-07' }, // whitespace
 *     { time: '2018-12-08', value: 23.92 },
 *     { time: '2018-12-13', value: 30.74 },
 * ];
 * ```
 */
export interface WhitespaceData<HorzScaleItem = Time> {
    /**
     * The time of the data.
     */
    time: HorzScaleItem;
    /**
     * Additional custom values which will be ignored by the library, but
     * could be used by plugins.
     */
    customValues?: Record<string, unknown>;
}
/**
 * Represents area series options.
 */
export type AreaSeriesOptions = SeriesOptions<AreaStyleOptions>;
/**
 * Represents area series options where all properties are optional.
 */
export type AreaSeriesPartialOptions = SeriesPartialOptions<AreaStyleOptions>;
/**
 * A custom function used to get autoscale information.
 *
 * @param baseImplementation - The default implementation of autoscale algorithm, you can use it to adjust the result.
 */
export type AutoscaleInfoProvider = (baseImplementation: () => AutoscaleInfo | null) => AutoscaleInfo | null;
/**
 * Represents the background color of the chart.
 */
export type Background = SolidColor | VerticalGradientColor;
/**
 * Represents a price as a `number`.
 */
export type BarPrice = Nominal<number, "BarPrice">;
/**
 * Represents bar series options.
 */
export type BarSeriesOptions = SeriesOptions<BarStyleOptions>;
/**
 * Represents bar series options where all properties are options.
 */
export type BarSeriesPartialOptions = SeriesPartialOptions<BarStyleOptions>;
/**
 * Represents a type of a base value of baseline series type.
 */
export type BaseValueType = BaseValuePrice;
/**
 * Structure describing baseline series options.
 */
export type BaselineSeriesOptions = SeriesOptions<BaselineStyleOptions>;
/**
 * Represents baseline series options where all properties are options.
 */
export type BaselineSeriesPartialOptions = SeriesPartialOptions<BaselineStyleOptions>;
/**
 * Represents candlestick series options.
 */
export type CandlestickSeriesOptions = SeriesOptions<CandlestickStyleOptions>;
/**
 * Represents candlestick series options where all properties are optional.
 */
export type CandlestickSeriesPartialOptions = SeriesPartialOptions<CandlestickStyleOptions>;
/**
 * Structure describing options of the chart with time points at the horizontal scale. Series options are to be set separately
 */
export type ChartOptions = TimeChartOptions;
/**
 * Represents a coordiate as a `number`.
 */
export type Coordinate = Nominal<number, "Coordinate">;
/**
 * Price line options for the {@link ISeriesApi.createPriceLine} method.
 *
 * `price` is required, while the rest of the options are optional.
 */
export type CreatePriceLineOptions = Partial<PriceLineOptions> & Pick<PriceLineOptions, "price">;
/**
 * Represents a custom series options.
 */
export type CustomSeriesOptions = SeriesOptions<CustomStyleOptions>;
/**
 * Represents a custom series options where all properties are optional.
 */
export type CustomSeriesPartialOptions = SeriesPartialOptions<CustomStyleOptions>;
/**
 * Price values for the custom series. This list should include the largest, smallest, and current price values for the data point.
 * The last value in the array will be used for the current value. You shouldn't need to
 * have more than 3 values in this array since the library only needs a largest, smallest, and current value.
 *
 * Examples:
 * - For a line series, this would contain a single number representing the current value.
 * - For a candle series, this would contain the high, low, and close values. Where the last value would be the close value.
 */
export type CustomSeriesPricePlotValues = number[];
/**
 * A custom function use to handle data changed events.
 */
export type DataChangedHandler = (scope: DataChangedScope) => void;
/**
 * The extent of the data change.
 */
export type DataChangedScope = "full" | "update";
/**
 * Represents the type of data that a series contains.
 */
export type DataItem<HorzScaleItem> = SeriesDataItemTypeMap<HorzScaleItem>[SeriesType];
/**
 * Represents a type `T` where every property is optional.
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[] ? DeepPartial<U>[] : T[P] extends readonly (infer X)[] ? readonly DeepPartial<X>[] : DeepPartial<T[P]>;
};
/**
 * Represents histogram series options.
 */
export type HistogramSeriesOptions = SeriesOptions<HistogramStyleOptions>;
/**
 * Represents histogram series options where all properties are optional.
 */
export type HistogramSeriesPartialOptions = SeriesPartialOptions<HistogramStyleOptions>;
/**
 * Represents a horizontal alignment.
 */
export type HorzAlign = "left" | "center" | "right";
/**
 * Function for converting a horizontal scale item to an internal item.
 */
export type HorzScaleItemConverterToInternalObj<HorzScaleItem> = (time: HorzScaleItem) => InternalHorzScaleItem;
/**
 * Interface for series primitives. It must be implemented to add some external graphics to series.
 */
export type ISeriesPrimitive<HorzScaleItem = Time> = ISeriesPrimitiveBase<SeriesAttachedParameter<HorzScaleItem, SeriesType>>;
/**
 * Internal Horizontal Scale Item
 */
export type InternalHorzScaleItem = Nominal<unknown, "InternalHorzScaleItem">;
/**
 * Index key for a horizontal scale item.
 */
export type InternalHorzScaleItemKey = Nominal<number, "InternalHorzScaleItemKey">;
/**
 * Represents line series options.
 */
export type LineSeriesOptions = SeriesOptions<LineStyleOptions>;
/**
 * Represents line series options where all properties are optional.
 */
export type LineSeriesPartialOptions = SeriesPartialOptions<LineStyleOptions>;
/**
 * Represents the width of a line.
 */
export type LineWidth = 1 | 2 | 3 | 4;
/**
 * Represents the `to` or `from` number in a logical range.
 */
export type Logical = Nominal<number, "Logical">;
/**
 * A logical range is an object with 2 properties: `from` and `to`, which are numbers and represent logical indexes on the time scale.
 *
 * The starting point of the time scale's logical range is the first data item among all series.
 * Before that point all indexes are negative, starting from that point - positive.
 *
 * Indexes might have fractional parts, for instance 4.2, due to the time-scale being continuous rather than discrete.
 *
 * Integer part of the logical index means index of the fully visible bar.
 * Thus, if we have 5.2 as the last visible logical index (`to` field), that means that the last visible bar has index 5, but we also have partially visible (for 20%) 6th bar.
 * Half (e.g. 1.5, 3.5, 10.5) means exactly a middle of the bar.
 */
export type LogicalRange = Range<Logical>;
/**
 * A custom function used to handle changes to the time scale's logical range.
 */
export type LogicalRangeChangeEventHandler = (logicalRange: LogicalRange | null) => void;
/**
 * A custom function use to handle mouse events.
 */
export type MouseEventHandler<HorzScaleItem> = (param: MouseEventParams<HorzScaleItem>) => void;
/**
 * Removes "readonly" from all properties
 */
export type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};
/**
 * This is the generic type useful for declaring a nominal type,
 * which does not structurally matches with the base type and
 * the other types declared over the same base type
 *
 * @example
 * ```ts
 * type Index = Nominal<number, 'Index'>;
 * // let i: Index = 42; // this fails to compile
 * let i: Index = 42 as Index; // OK
 * ```
 * @example
 * ```ts
 * type TagName = Nominal<string, 'TagName'>;
 * ```
 */
export type Nominal<T, Name extends string> = T & {
    /** The 'name' or species of the nominal. */
    [Symbol.species]: Name;
};
/**
 * Represents overlay price scale options.
 */
export type OverlayPriceScaleOptions = Omit<PriceScaleOptions, "visible" | "autoScale">;
/**
 * A function used to format a percentage value as a string.
 */
export type PercentageFormatterFn = (percentageValue: number) => string;
/**
 * Represents information used to format prices.
 */
export type PriceFormat = PriceFormatBuiltIn | PriceFormatCustom;
/**
 * A function used to format a {@link BarPrice} as a string.
 */
export type PriceFormatterFn = (priceValue: BarPrice) => string;
/**
 * Converter function for changing prices into vertical coordinate values.
 *
 * This is provided as a convenience function since the series original data will most likely be defined
 * in price values, and the renderer needs to draw with coordinates. This returns the same values as
 * directly using the series' priceToCoordinate method.
 */
export type PriceToCoordinateConverter = (price: number) => Coordinate | null;
/**
 * Represents the position of a series marker relative to a bar.
 */
export type SeriesMarkerPosition = "aboveBar" | "belowBar" | "inBar";
/**
 * Represents the shape of a series marker.
 */
export type SeriesMarkerShape = "circle" | "square" | "arrowUp" | "arrowDown";
/**
 * Represents the intersection of a series type `T`'s options and common series options.
 *
 * @see {@link SeriesOptionsCommon} for common options.
 */
export type SeriesOptions<T> = T & SeriesOptionsCommon;
/**
 * Represents a {@link SeriesOptions} where every property is optional.
 */
export type SeriesPartialOptions<T> = DeepPartial<T & SeriesOptionsCommon>;
/**
 * Defines where in the visual layer stack the renderer should be executed.
 *
 * - `bottom`: Draw below everything except the background.
 * - `normal`: Draw at the same level as the series.
 * - `top`: Draw above everything (including the crosshair).
 */
export type SeriesPrimitivePaneViewZOrder = "bottom" | "normal" | "top";
/**
 * Represents a type of series.
 *
 * @see {@link SeriesOptionsMap}
 */
export type SeriesType = keyof SeriesOptionsMap;
/**
 * A custom function used to handle changes to the time scale's size.
 */
export type SizeChangeEventHandler = (width: number, height: number) => void;
/**
 * The `TickMarkFormatter` is used to customize tick mark labels on the time scale.
 *
 * This function should return `time` as a string formatted according to `tickMarkType` type (year, month, etc) and `locale`.
 *
 * Note that the returned string should be the shortest possible value and should have no more than 8 characters.
 * Otherwise, the tick marks will overlap each other.
 *
 * If the formatter function returns `null` then the default tick mark formatter will be used as a fallback.
 *
 * @example
 * ```js
 * const customFormatter = (time, tickMarkType, locale) => {
 *     // your code here
 * };
 * ```
 */
export type TickMarkFormatter = (time: Time, tickMarkType: TickMarkType, locale: string) => string | null;
/**
 * Weight of the tick mark. @see TickMarkWeight enum
 */
export type TickMarkWeightValue = Nominal<number, "TickMarkWeightValue">;
/**
 * The Time type is used to represent the time of data items.
 *
 * Values can be a {@link UTCTimestamp}, a {@link BusinessDay}, or a business day string in ISO format.
 *
 * @example
 * ```js
 * const timestamp = 1529899200; // Literal timestamp representing 2018-06-25T04:00:00.000Z
 * const businessDay = { year: 2019, month: 6, day: 1 }; // June 1, 2019
 * const businessDayString = '2021-02-03'; // Business day string literal
 * ```
 */
export type Time = UTCTimestamp | BusinessDay | string;
/**
 * A custom function used to override formatting of a time to a string.
 */
export type TimeFormatterFn<HorzScaleItem = Time> = (time: HorzScaleItem) => string;
/**
 * Index for a point on the horizontal (time) scale.
 */
export type TimePointIndex = Nominal<number, "TimePointIndex">;
/**
 * A custom function used to handle changes to the time scale's time range.
 */
export type TimeRangeChangeEventHandler<HorzScaleItem> = (timeRange: Range<HorzScaleItem> | null) => void;
/**
 * Represents a time as a UNIX timestamp.
 *
 * If your chart displays an intraday interval you should use a UNIX Timestamp.
 *
 * Note that JavaScript Date APIs like `Date.now` return a number of milliseconds but UTCTimestamp expects a number of seconds.
 *
 * Note that to prevent errors, you should cast the numeric type of the time to `UTCTimestamp` type from the package (`value as UTCTimestamp`) in TypeScript code.
 *
 * @example
 * ```ts
 * const timestamp = 1529899200 as UTCTimestamp; // Literal timestamp representing 2018-06-25T04:00:00.000Z
 * const timestamp2 = (Date.now() / 1000) as UTCTimestamp;
 * ```
 */
export type UTCTimestamp = Nominal<number, "UTCTimestamp">;
/**
 * Represents a vertical alignment.
 */
export type VertAlign = "top" | "center" | "bottom";
/**
 * Represents a visible price scale's options.
 *
 * @see {@link PriceScaleOptions}
 */
export type VisiblePriceScaleOptions = PriceScaleOptions;


/* --------------------- ----------------------- Additional Types ----------------------- ----------------------- */
//The main functions of this library, like createCandlestick Series, return some complicated types.
//Those types are defined below so even though the functions return a type of any, the assigned variable and be typed.

/* --------------------- Generic Types ----------------------- */

/**
 * Represents A Generic Series Type.
 */
export type AnySeries = CandlestickSeries | BarSeries | HistogramSeries | AreaSeries | LineSeries | BaselineSeries | CustomSeries | RoundedCandleSeries

/**
 * Represents any type of Data that could be sent to, or retrieved from, a data series
 */
export type AnySeriesData<HorzScaleItem = Time> = SingleValueData<HorzScaleItem> | OhlcData<HorzScaleItem> | CandlestickData<HorzScaleItem> | BarData<HorzScaleItem> | HistogramData<HorzScaleItem> | LineData<HorzScaleItem> | BaselineData<HorzScaleItem> | AreaData<HorzScaleItem> | CustomData<HorzScaleItem>

/**
 * Represents any type of Series Options
 */
export type AnySeriesOptions = SeriesOptionsCommon | CandlestickSeriesOptions | BarSeriesOptions | HistogramSeriesOptions | LineSeriesOptions | BaselineSeriesOptions | AreaSeriesOptions

/* --------------------- SeriesAPI Types ----------------------- */

/**
 * Represents Candlestick Series.
 */
export type CandlestickSeries = ISeriesApi<"Candlestick", Time, WhitespaceData<Time> | CandlestickData<Time>, CandlestickSeriesOptions, DeepPartial<CandlestickStyleOptions & SeriesOptionsCommon>>

/**
 * Represents a Bar Series.
 */
export type BarSeries = ISeriesApi<"Bar", Time, WhitespaceData<Time> | BarData<Time>, BarSeriesOptions, DeepPartial<BarStyleOptions & SeriesOptionsCommon>>

/**
 * Represents A Histogram Series.
 */
export type HistogramSeries = ISeriesApi<"Histogram", Time, WhitespaceData<Time> | HistogramData<Time>, HistogramSeriesOptions, DeepPartial<HistogramStyleOptions & SeriesOptionsCommon>>

/**
 * Represents a Line Series.
 */
export type LineSeries = ISeriesApi<"Line", Time, WhitespaceData<Time> | LineData<Time>, LineSeriesOptions, DeepPartial<LineStyleOptions & SeriesOptionsCommon>>

/**
 * Represents a Baseline Series.
 */
export type BaselineSeries = ISeriesApi<"Baseline", Time, WhitespaceData<Time> | BaselineData<Time>, BaselineSeriesOptions, DeepPartial<BaselineStyleOptions & SeriesOptionsCommon>>

/**
 * Represents an Area Series.
 */
export type AreaSeries = ISeriesApi<"Area", Time, WhitespaceData<Time> | AreaData<Time>, AreaSeriesOptions, DeepPartial<AreaStyleOptions & SeriesOptionsCommon>>

/**
 * Represents A Custom Series.
 */
export type CustomSeries<TData extends CustomData<Time> = CustomData<Time>> = ISeriesApi<"Custom", Time, WhitespaceData<Time> | TData, CustomSeriesOptions, DeepPartial<CustomStyleOptions & SeriesOptionsCommon>>


/**
 * Represents A Custom Series.
 */
export type RoundedCandleSeries<TData extends CustomData<Time> = CustomData<Time>> = ISeriesApi<"Rounded_Candle", Time, WhitespaceData<Time> | TData, CustomSeriesOptions, DeepPartial<CustomStyleOptions & SeriesOptionsCommon>>

/* --------------------- ----------------------- Series Interface Expantions Types ----------------------- ----------------------- */
/*
 * These Interfaces Redefine the Standard SeriesOptionsMap, SeriesDataItemTypeMap, SeriesPartialOptionsMaps that come with the Lightweight Charts Package.
 * This is done so that each interface can be expanded to include more standardized Custom Series Types
 */

/**
 * Represents the type of options for each series type.
 *
 * For example a bar series has options represented by {@link BarSeriesOptions}.
 * 
 */
export interface SeriesOptionsMap {
    /**
     * The type of bar series options.
     */
    Bar: BarSeriesOptions;
    /**
     * The type of candlestick series options.
     */
    Candlestick: CandlestickSeriesOptions;
    /**
     * The type of area series options.
     */
    Area: AreaSeriesOptions;
    /**
     * The type of baseline series options.
     */
    Baseline: BaselineSeriesOptions;
    /**
     * The type of line series options.
     */
    Line: LineSeriesOptions;
    /**
     * The type of histogram series options.
     */
    Histogram: HistogramSeriesOptions;
    /**
     * The type of a custom series options.
     */
    Rounded_Candle: CustomSeriesOptions;
    /**
     * The type of a custom series options.
     */
    Custom: CustomSeriesOptions;
}

/**
 * Represents the type of data that a series contains.
 *
 * For example a bar series contains {@link BarData} or {@link WhitespaceData}.
 */
export interface SeriesDataItemTypeMap<HorzScaleItem = Time> {
    /**
     * The types of bar series data.
     */
    Bar: BarData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
    /**
     * The types of candlestick series data.
     */
    Candlestick: CandlestickData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
    /**
     * The types of area series data.
     */
    Area: AreaData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
    /**
     * The types of baseline series data.
     */
    Baseline: BaselineData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
    /**
     * The types of line series data.
     */
    Line: LineData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
    /**
     * The types of histogram series data.
     */
    Histogram: HistogramData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
    /**
     * The type of a custom series options.
     */
    Rounded_Candle: CandlestickData<HorzScaleItem> | WhitespaceData<HorzScaleItem>;
    /**
     * The base types of an custom series data.
     */
    Custom: CustomData<HorzScaleItem> | CustomSeriesWhitespaceData<HorzScaleItem>;
}

/**
 * Represents the type of partial options for each series type.
 *
 * For example a bar series has options represented by {@link BarSeriesPartialOptions}.
 */
export interface SeriesPartialOptionsMap {
    /**
     * The type of bar series partial options.
     */
    Bar: BarSeriesPartialOptions;
    /**
     * The type of candlestick series partial options.
     */
    Candlestick: CandlestickSeriesPartialOptions;
    /**
     * The type of area series partial options.
     */
    Area: AreaSeriesPartialOptions;
    /**
     * The type of baseline series partial options.
     */
    Baseline: BaselineSeriesPartialOptions;
    /**
     * The type of line series partial options.
     */
    Line: LineSeriesPartialOptions;
    /**
     * The type of histogram series partial options.
     */
    Histogram: HistogramSeriesPartialOptions;
    /**
     * The type of a custom series options.
     */
    Rounded_Candle: CandlestickSeriesPartialOptions;
    /**
     * The type of a custom series partial options.
     */
    Custom: CustomSeriesPartialOptions;
}

/* --------------------- Custom Types ----------------------- */

/**
 * List of all the Colors defined in the lightweight charts library mapped to a Enum
 */
export enum Color {
    khaki = '#f0e68c',
    azure = '#f0ffff',
    aliceblue = '#f0f8ff',
    ghostwhite = '#f8f8ff',
    gold = '#ffd700',
    goldenrod = '#daa520',
    gainsboro = '#dcdcdc',
    gray = '#808080',
    green = '#008000',
    honeydew = '#f0fff0',
    floralwhite = '#fffaf0',
    lightblue = '#add8e6',
    lightcoral = '#f08080',
    lemonchiffon = '#fffacd',
    hotpink = '#ff69b4',
    lightyellow = '#ffffe0',
    greenyellow = '#adff2f',
    lightgoldenrodyellow = '#fafad2',
    limegreen = '#32cd32',
    linen = '#faf0e6',
    lightcyan = '#e0ffff',
    magenta = '#f0f',
    maroon = '#800000',
    olive = '#808000',
    orange = '#ffa500',
    oldlace = '#fdf5e6',
    mediumblue = '#0000cd',
    transparent = '#0000',
    lime = '#0f0',
    lightpink = '#ffb6c1',
    mistyrose = '#ffe4e1',
    moccasin = '#ffe4b5',
    midnightblue = '#191970',
    orchid = '#da70d6',
    mediumorchid = '#ba55d3',
    mediumturquoise = '#48d1cc',
    orangered = '#ff4500',
    royalblue = '#4169e1',
    powderblue = '#b0e0e6',
    red = '#f00',
    coral = '#ff7f50',
    turquoise = '#40e0d0',
    white = '#fff',
    whitesmoke = '#f5f5f5',
    wheat = '#f5deb3',
    teal = '#008080',
    steelblue = '#4682b4',
    bisque = '#ffe4c4',
    aquamarine = '#7fffd4',
    aqua = '#0ff',
    sienna = '#a0522d',
    silver = '#c0c0c0',
    springgreen = '#00ff7f',
    antiquewhite = '#faebd7',
    burlywood = '#deb887',
    brown = '#a52a2a',
    beige = '#f5f5dc',
    chocolate = '#d2691e',
    chartreuse = '#7fff00',
    cornflowerblue = '#6495ed',
    cornsilk = '#fff8dc',
    crimson = '#dc143c',
    cadetblue = '#5f9ea0',
    tomato = '#ff6347',
    fuchsia = '#f0f',
    blue = '#00f',
    salmon = '#fa8072',
    blanchedalmond = '#ffebcd',
    slateblue = '#6a5acd',
    slategray = '#708090',
    thistle = '#d8bfd8',
    tan = '#d2b48c',
    cyan = '#0ff',
    darkblue = '#00008b',
    darkcyan = '#008b8b',
    darkgoldenrod = '#b8860b',
    darkgray = '#a9a9a9',
    blueviolet = '#8a2be2',
    black = '#000',
    darkmagenta = '#8b008b',
    darkslateblue = '#483d8b',
    darkkhaki = '#bdb76b',
    darkorchid = '#9932cc',
    darkorange = '#ff8c00',
    darkgreen = '#006400',
    darkred = '#8b0000',
    dodgerblue = '#1e90ff',
    darkslategray = '#2f4f4f',
    dimgray = '#696969',
    deepskyblue = '#00bfff',
    firebrick = '#b22222',
    forestgreen = '#228b22',
    indigo = '#4b0082',
    ivory = '#fffff0',
    lavenderblush = '#fff0f5',
    feldspar = '#d19275',
    indianred = '#cd5c5c',
    lightgreen = '#90ee90',
    lightgrey = '#d3d3d3',
    lightskyblue = '#87cefa',
    lightslategray = '#789',
    lightslateblue = '#8470ff',
    snow = '#fffafa',
    lightseagreen = '#20b2aa',
    lightsalmon = '#ffa07a',
    darksalmon = '#e9967a',
    darkviolet = '#9400d3',
    mediumpurple = '#9370d8',
    mediumaquamarine = '#66cdaa',
    skyblue = '#87ceeb',
    lavender = '#e6e6fa',
    lightsteelblue = '#b0c4de',
    mediumvioletred = '#c71585',
    mintcream = '#f5fffa',
    navajowhite = '#ffdead',
    navy = '#000080',
    olivedrab = '#6b8e23',
    palevioletred = '#d87093',
    violetred = '#d02090',
    yellow = '#ff0',
    yellowgreen = '#9acd32',
    lawngreen = '#7cfc00',
    pink = '#ffc0cb',
    paleturquoise = '#afeeee',
    palegoldenrod = '#eee8aa',
    darkolivegreen = '#556b2f',
    darkseagreen = '#8fbc8f',
    darkturquoise = '#00ced1',
    peachpuff = '#ffdab9',
    deeppink = '#ff1493',
    violet = '#ee82ee',
    palegreen = '#98fb98',
    mediumseagreen = '#3cb371',
    peru = '#cd853f',
    saddlebrown = '#8b4513',
    sandybrown = '#f4a460',
    rosybrown = '#bc8f8f',
    purple = '#800080',
    seagreen = '#2e8b57',
    seashell = '#fff5ee',
    papayawhip = '#ffefd5',
    mediumslateblue = '#7b68ee',
    plum = '#dda0dd',
    mediumspringgreen = '#00fa9a'
}
export { };

