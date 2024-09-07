import * as lwc from "lightweight-charts";
import { RoundedCandleSeries, RoundedCandleSeriesData, RoundedCandleSeriesOptions, RoundedCandleSeriesPartialOptions } from "./rounded-candles-series/rounded-candles-series";


/* This must match the orm.enum.SeriesType. The value, [0-9], is what is actually compared*/
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

/**
 * This class is a thin shell wrapper around lightweight-charts' ISeriesApi.
 * The wrapper serves to add a couple parameters and functions that are closely tied
 * with the series objects. Most Notable, this object contains functions that reach
 * into the SeriesAPI minified object to manipulate instance variables that aren't
 * normally exposed by the lightweight-charts library.
 * 
 * This would have been an extension of the lightweight charts' SeriesAPI Class, but that
 * class isn't exported, only it's interface ISeriesAPI is.
 * 
 * This is a sister class to the PrimitiveBase class defined by this module.
 * 
 * Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi
 */
export class SeriesBase<T extends Exclude<keyof SeriesOptionsMap_EXT, 'Custom'>> {
    _chart: lwc.IChartApi
    _series: lwc.ISeriesApi<lwc.SeriesType>

    _id: string
    Name: string | undefined
    Type: Series_Type

    constructor(_id:string, _name:string | undefined, _type:Series_Type, _chart:lwc.IChartApi){
        this._id = _id
        this.Name = _name
        this.Type = _type
        this._chart = _chart
        this._series = this._create_series(_type)
    }
    
    private _create_series(series_type: Series_Type): lwc.ISeriesApi<lwc.SeriesType> {
        switch (series_type) {
            // ---- Base Series Types ---- //
            case (Series_Type.LINE):
                return this._chart.addLineSeries()
            case (Series_Type.AREA):
                return this._chart.addAreaSeries()
            case (Series_Type.HISTOGRAM):
                return this._chart.addHistogramSeries()
            case (Series_Type.BASELINE):
                return this._chart.addBaselineSeries()
            case (Series_Type.BAR):
                return this._chart.addBarSeries()
            case (Series_Type.OHLC):
            case (Series_Type.CANDLESTICK):
                return this._chart.addCandlestickSeries()
            // ---- Custom Series Types ---- //
            case (Series_Type.ROUNDED_CANDLE):
                //Ideally custom series objects will get baked directly into the TS Code like this
                //So accomodations don't need to be made on the Python side
                return this._chart.addCustomSeries(new RoundedCandleSeries())
            default: //Catch-all, primarily reached by WhitespaceSeries'
                return this._chart.addLineSeries()
        }
    }

    /**
     * Removes this series and all it's sub components from the chart. This process is not reversible and the object becomes useless.
     */
    remove(){ this._chart.removeSeries(this._series)}

    // #region -------- lightweight-chart ISeriesAPI functions --------

    priceScale(): lwc.IPriceScaleApi {return this._series.priceScale()}

    applyOptions(options: SeriesPartialOptionsMap_EXT[T]) {this._series.applyOptions(options)}
    options(): Readonly<SeriesOptionsMap_EXT[T]> {return this._series.options() as SeriesOptionsMap_EXT[T]}

    // data() may not work as intended. Its possible that extra parameters of custom
    // data types are deleted when applied to the series object.. need to test that at somepoint
    data(): readonly SeriesDataTypeMap_EXT[T][] {return this._series.data()} 
    update(bar: SeriesDataTypeMap_EXT[T]) {this._series.update(bar)}
    setData(data: SeriesDataTypeMap_EXT[T][]) {this._series.setData(data)}

    markers(): lwc.SeriesMarker<lwc.Time>[] {return this._series.markers()}
    setMarkers(data: lwc.SeriesMarker<lwc.Time>[]){this._series.setMarkers(data)}

    removePriceLine(line: lwc.IPriceLine){this._series.removePriceLine(line)}
    createPriceLine(options: lwc.CreatePriceLineOptions): lwc.IPriceLine {return this._series.createPriceLine(options)}

    attachPrimitive(primitive: lwc.ISeriesPrimitive<lwc.Time>) {this._series.attachPrimitive(primitive)}
    detachPrimitive(primitive: lwc.ISeriesPrimitive<lwc.Time>) {this._series.detachPrimitive(primitive)}

    /* 
     * These can be uncommented to be used. Currently they are commented out since they are 
     * not SeriesAPI features that are used, or planned to be used, by this module currently
     */
    // priceFormatter(): lwc.IPriceFormatter {return this._series.priceFormatter()}
    // priceToCoordinate(price: number): lwc.Coordinate | null {return this._series.priceToCoordinate(price)}
    // coordinateToPrice(coordinate: number): lwc.BarPrice | null {return this._series.coordinateToPrice(coordinate)}
    // barsInLogicalRange(range: lwc.Range<number>): lwc.BarsInfo<lwc.Time> | null {return this._series.barsInLogicalRange(range)}
    // dataByIndex(logicalIndex: number, mismatchDirection?: lwc.MismatchDirection): SeriesDataTypeMap_EXT[T] | null {return this._series.dataByIndex(logicalIndex, mismatchDirection)}
    // subscribeDataChanged(handler: lwc.DataChangedHandler) {this._series.subscribeDataChanged(handler)}
    // unsubscribeDataChanged(handler: lwc.DataChangedHandler) {this._series.unsubscribeDataChanged(handler)}
    // #endregion
}


// #region --------------------- Lightweight Chart Type / Interface extensions ----------------------- */

export type BarSeries = SeriesBase<'Bar'>
export type LineSeries = SeriesBase<"Line">
export type AreaSeries = SeriesBase<"Area">
export type BaselineSeries = SeriesBase<"Baseline">
export type HistogramSeries = SeriesBase<'Histogram'>
export type CandleStickSeriesBase = SeriesBase<'Candlestick'>
export type RoundedCandleSeriesBase = SeriesBase<"Rounded_Candle">
export type SeriesBase_T = SeriesBase<Exclude<keyof SeriesOptionsMap_EXT, 'Custom'>>

/*
 * These Interfaces / Types extend the Standard Options & Data Type Maps that come with the Lightweight Charts Package.
 * This is done so that each interface can be expanded to include more standardized Custom Series Types for this module
 */

/* --------------------- Generic Types ----------------------- */

type ValueOf<T> = T[keyof T];

/**
 * Represents any type of Data that could be sent to, or retrieved from, a series
 */
export type SeriesData = ValueOf<SeriesDataTypeMap_EXT>

/**
 * Represents any type of Series Options
 */
export type SeriesOptions = ValueOf<SeriesOptionsMap_EXT>


/* ----------------------- Series Interface Expansions ----------------------- */

/**
 * Represents the type of options for each series type.
 *
 * For example a bar series has options represented by {@link BarSeriesOptions}.
 * 
 */
export interface SeriesOptionsMap_EXT extends Exclude<lwc.SeriesOptionsMap, 'Custom'> {

    Rounded_Candle: RoundedCandleSeriesOptions;
}

/**
 * Represents the type of data that a series contains.
 *
 * For example a bar series contains {@link BarData} or {@link WhitespaceData}.
 */
export interface SeriesDataTypeMap_EXT<HorzScaleItem = lwc.Time> extends Exclude<lwc.SeriesDataItemTypeMap, 'Custom'> {

    Rounded_Candle: RoundedCandleSeriesData | lwc.WhitespaceData<HorzScaleItem>;
}

/**
 * Represents the type of partial options for each series type.
 *
 * For example a bar series has options represented by {@link BarSeriesPartialOptions}.
 */
export interface SeriesPartialOptionsMap_EXT extends Exclude<lwc.SeriesPartialOptionsMap, 'Custom'>  {

    Rounded_Candle: RoundedCandleSeriesPartialOptions;
}


//#endregion