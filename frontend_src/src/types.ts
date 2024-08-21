import * as lwc from "lightweight-charts";
import { DeepPartial as DP, Time } from "lightweight-charts";
import { RoundedCandleSeriesOptions } from "./plugins/rounded-candles-series/rounded-candles-series";

// #region ---------------- Enums & Interfaces ---------------- //

/* This must match the orm.enum.SeriesType. */
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

/* Represents information about a specific symbol */
export interface symbol_item {
    ticker: string
    name?: string
    broker?: string
    sec_type?: Series_Type
    exchange?: string
}
// #endregion

// #region ---------------- Timeframe Object ---------------- //

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


// #region ---------------- Util Functions ---------------- //

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

/**
 * Simple Binary Search
 * @param arr Array of any time
 * @param el Element to Search for
 * @param compare_fn Comparison Function that should return a number.
 * @returns Index of the found element, or when negative, the index where the element should be inserted at.
 */
export function binarySearch(arr:Array<any>, el:any, compare_fn:(a:any, b:any) => number) {
    let m = 0;
    let n = arr.length - 1;
    while (m <= n) {
        let k = (n + m) >> 1;
        let cmp = compare_fn(el, arr[k]);

        if (cmp > 0) m = k + 1
        else if(cmp < 0) n = k - 1
        else return k
    }
    return ~m;
}

//#endregion


// #region --------------------- Additional Lightweight Chart Types ----------------------- */

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


//#endregion