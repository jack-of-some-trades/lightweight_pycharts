import * as lwc from "lightweight-charts";
import { DeepPartial as DP, Time } from "lightweight-charts";
import { RoundedCandleSeriesOptions } from "./plugins/rounded-candles-series/rounded-candles-series";

// #region ---------------- Enums ---------------- //
/**
 * Enum that corresponds to the different static divs of the window wrapper
*/
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
    QUAD_SQ_V,
    QUAD_SQ_H,
    QUAD_VERT,
    QUAD_HORIZ,
    QUAD_LEFT,
    QUAD_RIGHT,
    QUAD_TOP,
    QUAD_BOTTOM
}

export function num_frames(layout: Container_Layouts | null): number {
    switch (layout) {
        case (Container_Layouts.SINGLE): return 1
        case (Container_Layouts.DOUBLE_VERT): return 2
        case (Container_Layouts.DOUBLE_HORIZ): return 2
        case (Container_Layouts.TRIPLE_VERT): return 3
        case (Container_Layouts.TRIPLE_VERT_LEFT): return 3
        case (Container_Layouts.TRIPLE_VERT_RIGHT): return 3
        case (Container_Layouts.TRIPLE_HORIZ): return 3
        case (Container_Layouts.TRIPLE_HORIZ_TOP): return 3
        case (Container_Layouts.TRIPLE_HORIZ_BOTTOM): return 3
        case (Container_Layouts.QUAD_SQ_V): return 4
        case (Container_Layouts.QUAD_SQ_H): return 4
        case (Container_Layouts.QUAD_VERT): return 4
        case (Container_Layouts.QUAD_HORIZ): return 4
        case (Container_Layouts.QUAD_LEFT): return 4
        case (Container_Layouts.QUAD_RIGHT): return 4
        case (Container_Layouts.QUAD_TOP): return 4
        case (Container_Layouts.QUAD_BOTTOM): return 4
        default: return 0
    }
}

//This must match the orm.enum.SeriesType.
export enum Series_Type {
    WhitespaceData,
    SingleValueData,
    LINE,
    AREA,
    BASELINE,
    HISTOGRAM,
    OHLC,
    BAR,
    CANDLESTICK,
    // HLC_AREA,
    ROUNDED_CANDLE
}

// #endregion

// #region ---------------- Super Object Interfaces ---------------- //

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
 * Represents information about a specific symbol
 */
export interface symbol_item {
    ticker: string
    name?: string
    broker?: string
    sec_type?: Series_Type
    exchange?: string
}

/**
 * interface to wrap around a Series Data type with additional information
 */
export interface series_id {
    id: string
    expose: boolean
    series_obj: AnySeries
}

const interval_list: interval[] = ["s", "m", "h", "D", "W", "M", "Y"]
const interval_val_map = { "s": 1, "m": 60, "h": 3600, "D": 86400, "W": 604800, "M": 18396000, "Y": 220752000, "E": 1 }
export type interval = "s" | "m" | "h" | "D" | "W" | "M" | "Y" | "E"
export const interval_map = { "s": "Second", "m": "Minute", "h": "Hour", "D": "Day", "W": "Week", "M": "Month", "Y": "Year", "E": "Error" }
/**
 * An object that represents a given timeframe
 */
export class tf {
    multiplier: number
    period: interval

    constructor(mult: number, period: interval) {
        this.multiplier = Math.floor(mult)
        this.period = period
    }

    /**
     * Create a Timeframe Object from a string
     */
    static from_str(str_in: string): tf {
        let interval_str = str_in.charAt(str_in.length - 1)
        if (!interval_list.includes(interval_str as interval))
            return new tf(-1, 'E') //Signal an error

        let mult_str = str_in.split(interval_str)[0]
        let mult_num = mult_str === "" ? 1 : parseFloat(mult_str)
        return new tf(mult_num, interval_str as interval)
    }

    /**
     * Create a Timeframe object from the given number. This is the inverse operation of .toValue(), 
     * i.e tf.from_value(new tf(1, 'D').toValue()) === new tf(1, 'D')
     * 
     * The value given is rounded down to the nearest integer multiple timeframe. e.g. (tf.from_value(new tf(1, 'D').toValue() - 1) === new tf(23, 'h'))
     * @param val The number of seconds within the given timeframe.
     */
    static from_value(val: number): tf {
        for (let i = interval_list.length - 1; i >= 0; i--) {
            let mult = (val / interval_val_map[interval_list[i]])
            if (mult >= 1) {
                //Highest Tf interval found
                return new tf(mult, interval_list[i])
            }
        }

        return new tf(-1, 'E') //Signal an error
    }

    static is_equal(a:tf, b:tf):boolean { return a.toValue() === b.toValue()}

    //Trim_unit can be set to True when displaying the timeframe. Should be set to false when transmitting the TF as a string.
    toString(trim_unit:boolean = false): string { return `${(trim_unit && this.multiplier === 1)? '' : this.multiplier}${this.period}` }
    toLabel(): string { return `${this.multiplier} ${interval_map[this.period]}${(this.multiplier > 1) ? 's' : ''}` }
    toValue(): number { return this.multiplier * interval_val_map[this.period] }
}

//#endregion

// #region ---------------- Base Layout Dimensions ---------------- //

export const LAYOUT_MARGIN = 5
export const LAYOUT_CHART_MARGIN = 4
export const LAYOUT_CHART_SEP_BORDER = 2

//Minimum flex Widths/Heights of each frame
export const MIN_FRAME_WIDTH = 0.15
export const MIN_FRAME_HEIGHT = 0.1

// #endregion


// #region ---------------- Misc Util Functions ---------------- //

const ID_LEN = 4
/**
 * Generate a unique ID of Random characters that is not present in the given list.
 * @param prefix Optional prefix to affix at the start of the id
 * @param id_list List of ID's to check for collisions against
 * @returns The new ID. The ID is *not* automatically appended to the id_list
 */
export function makeid(id_list: string[], prefix: string = ''): string {
    let result = prefix;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < ID_LEN) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    if (id_list.includes(result))
        //Generate again if there's a collision
        return makeid(id_list, prefix)
    else {
        return result;
    }
}

//#endregion

// #region ---------------- TimeChart Options ---------------- //

/**
 * Default TimeChart Options For Lightweight PyCharts.
 */
export const DEFAULT_PYCHART_OPTS: DP<lwc.TimeChartOptions> = {
    layout: {                   // ---- Layout Options ----
        background: {
            type: lwc.ColorType.VerticalGradient,
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
        mode: lwc.PriceScaleMode.Logarithmic,
        // borderColor: '#161a25',
    },
    crosshair: {                // ---- Crosshair Options ---- 
        mode: lwc.CrosshairMode.Normal,
    },
    kineticScroll: {            // ---- Kinetic Scroll ---- 
        touch: true
    },
    timeScale: {
        shiftVisibleRangeOnNewBar: true,
        allowShiftVisibleRangeOnWhitespaceReplacement: true,
        rightBarStaysOnScroll: true,
        rightOffset: 20
    }
}



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
export type AnySeriesData<HorzScaleItem = Time> = lwc.SingleValueData<HorzScaleItem> | lwc.OhlcData<HorzScaleItem> | lwc.CandlestickData<HorzScaleItem> | lwc.BarData<HorzScaleItem> | lwc.HistogramData<HorzScaleItem> | lwc.LineData<HorzScaleItem> | lwc.BaselineData<HorzScaleItem> | lwc.AreaData<HorzScaleItem> | lwc.CustomData<HorzScaleItem>

/**
 * Represents any type of Series Options
 */
export type AnySeriesOptions = lwc.SeriesOptionsCommon | lwc.CandlestickSeriesOptions | lwc.BarSeriesOptions | lwc.HistogramSeriesOptions | lwc.LineSeriesOptions | lwc.BaselineSeriesOptions | lwc.AreaSeriesOptions

/* --------------------- SeriesAPI Types ----------------------- */

/**
 * Represents Candlestick Series.
 */
export type CandlestickSeries = lwc.ISeriesApi<"Candlestick", Time, lwc.WhitespaceData<Time> | lwc.CandlestickData<Time>, lwc.CandlestickSeriesOptions, DP<lwc.CandlestickStyleOptions & lwc.SeriesOptionsCommon>>

/**
 * Represents a Bar Series.
 */
export type BarSeries = lwc.ISeriesApi<"Bar", Time, lwc.WhitespaceData<Time> | lwc.BarData<Time>, lwc.BarSeriesOptions, DP<lwc.BarStyleOptions & lwc.SeriesOptionsCommon>>

/**
 * Represents A Histogram Series.
 */
export type HistogramSeries = lwc.ISeriesApi<"Histogram", Time, lwc.WhitespaceData<Time> | lwc.HistogramData<Time>, lwc.HistogramSeriesOptions, DP<lwc.HistogramStyleOptions & lwc.SeriesOptionsCommon>>

/**
 * Represents a Line Series.
 */
export type LineSeries = lwc.ISeriesApi<"Line", Time, lwc.WhitespaceData<Time> | lwc.LineData<Time>, lwc.LineSeriesOptions, DP<lwc.LineStyleOptions & lwc.SeriesOptionsCommon>>

/**
 * Represents a Baseline Series.
 */
export type BaselineSeries = lwc.ISeriesApi<"Baseline", Time, lwc.WhitespaceData<Time> | lwc.BaselineData<Time>, lwc.BaselineSeriesOptions, DP<lwc.BaselineStyleOptions & lwc.SeriesOptionsCommon>>

/**
 * Represents an Area Series.
 */
export type AreaSeries = lwc.ISeriesApi<"Area", Time, lwc.WhitespaceData<Time> | lwc.AreaData<Time>, lwc.AreaSeriesOptions, DP<lwc.AreaStyleOptions & lwc.SeriesOptionsCommon>>

/**
 * Represents A Custom Series.
 */
export type CustomSeries<TData extends lwc.CustomData<Time> = lwc.CustomData<Time>> = lwc.ISeriesApi<"Custom", Time, lwc.WhitespaceData<Time> | TData, lwc.CustomSeriesOptions, DP<lwc.CustomStyleOptions & lwc.SeriesOptionsCommon>>


/**
 * Represents A Custom Rounded Candle Series.
 */
export type RoundedCandleSeries<TData extends lwc.CustomData<Time> = lwc.CustomData<Time>> = lwc.ISeriesApi<"Custom", Time, lwc.WhitespaceData<Time> | TData, lwc.CustomSeriesOptions, DP<lwc.CustomStyleOptions & lwc.SeriesOptionsCommon>>

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
export interface SeriesOptionsMap extends lwc.SeriesOptionsMap {
    /**
     * The type of a custom series options.
     */
    Rounded_Candle: RoundedCandleSeriesOptions;
}

/**
 * Represents the type of data that a series contains.
 *
 * For example a bar series contains {@link BarData} or {@link WhitespaceData}.
 */
export interface SeriesDataItemTypeMap<HorzScaleItem = lwc.Time> extends lwc.SeriesDataItemTypeMap {
    /**
     * The type of a custom series options.
     */
    Rounded_Candle: lwc.CandlestickData<HorzScaleItem> | lwc.WhitespaceData<HorzScaleItem>;
}

/**
 * Represents the type of partial options for each series type.
 *
 * For example a bar series has options represented by {@link BarSeriesPartialOptions}.
 */
export interface SeriesPartialOptionsMap extends lwc.SeriesPartialOptionsMap {
    /**
     * The type of a custom series options.
     */
    Rounded_Candle: lwc.CandlestickSeriesPartialOptions;
}