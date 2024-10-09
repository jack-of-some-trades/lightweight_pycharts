/**
 * File that defines types and Interfaces associated with the Series Objects used in lightweight-charts
 * This also defines a class that wraps around the SeriesAPI instances created to extend their behavior.
 */
import * as lwc from "lightweight-charts";
import { Accessor, createSignal, Setter } from "solid-js";
import { pane } from "../pane";
import { PrimitiveBase } from "../primitive-plugins/primitive-base";
import { RoundedCandleSeries, RoundedCandleSeriesData, RoundedCandleSeriesOptions, RoundedCandleSeriesPartialOptions } from "./rounded-candles-series/rounded-candles-series";


// #region --------------------- Type Definitions & Interface Extensions ----------------------- */

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

const SERIES_NAME_MAP = new Map<Series_Type, string>([
    [Series_Type.WhitespaceData,'Whitespace'],
    [Series_Type.SingleValueData,'Single-Value'],
    [Series_Type.LINE,'Line'],
    [Series_Type.AREA,'Area'],
    [Series_Type.BASELINE,'Baseline'],
    [Series_Type.HISTOGRAM,'Histogram'],
    [Series_Type.OHLC,'OHLC'],
    [Series_Type.BAR,'Bar'],
    [Series_Type.CANDLESTICK,'Candlestick'],
    // [Series_Type.HLC_AREA:'High-Low Area'],
    [Series_Type.ROUNDED_CANDLE,'Rounded-Candle']
])

export type BarSeries = SeriesBase<'Bar'>
export type LineSeries = SeriesBase<"Line">
export type AreaSeries = SeriesBase<"Area">
export type BaselineSeries = SeriesBase<"Baseline">
export type HistogramSeries = SeriesBase<'Histogram'>
export type CandleStickSeriesBase = SeriesBase<'Candlestick'>
export type RoundedCandleSeriesBase = SeriesBase<"Rounded_Candle">
export type SeriesBase_T = SeriesBase<Exclude<keyof SeriesOptionsMap_EXT, 'Custom'>>

// Meant to represent the 'Series' in lwc that isn't exported. (the class owned by 'SeriesApi')
export type Series = lwc.ISeriesApi<keyof lwc.SeriesOptionsMap>
// Meant to represent the 'SeriesApi' in lwc that isn't exported. (the class that implements 'ISeriesApi')
export type SeriesApi = lwc.ISeriesApi<keyof lwc.SeriesOptionsMap>

/* --------------------- Generic Types ----------------------- */

type ValueOf<T> = T[keyof T];

/* Represents any type of Data that could be sent to, or retrieved from, a series */
export type SeriesData = ValueOf<SeriesDataTypeMap_EXT>
/* Represents any type of Series Options */
export type SeriesOptions = ValueOf<SeriesOptionsMap_EXT>


/* ----------------------- Series Interface Expansions ----------------------- */

/*
 * These Interfaces / Types extend the Standard Options & Data Type Maps that come with the Lightweight Charts Package.
 * This is done so that each interface can be expanded to include more standardized Custom Series Types for this module.
 * As a result, the 'Custom' Type has been excluded since custom types should be explicitly defined here.
 */

/* Represents the type of options for each series type. */
export interface SeriesOptionsMap_EXT extends Exclude<lwc.SeriesOptionsMap, 'Custom'> {
    Rounded_Candle: RoundedCandleSeriesOptions;
}

/* Represents the type of data that a series contains. */
export interface SeriesDataTypeMap_EXT<HorzScaleItem = lwc.Time> extends Exclude<lwc.SeriesDataItemTypeMap, 'Custom'> {
    Rounded_Candle: RoundedCandleSeriesData | lwc.WhitespaceData<HorzScaleItem>;
}

/* Represents the type of partial options for each series type. */
export interface SeriesPartialOptionsMap_EXT extends Exclude<lwc.SeriesPartialOptionsMap, 'Custom'>  {
    Rounded_Candle: RoundedCandleSeriesPartialOptions;
}


//#endregion


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
 * This generic class also serves to remove the 'Custom' Series Type. Instead any series types that
 * would have been defined as custom should be explicit extensions of this class's type parameter.
 * Thus should be added to the Options, Partial_Options, and Data Type Maps below.
 * 
 * Docs: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi
 */
export class SeriesBase<T extends Exclude<keyof SeriesOptionsMap_EXT, 'Custom'>> {
    _pane: pane
    _series: lwc.ISeriesApi<lwc.SeriesType>

    _id: string
    primitiveIds: Accessor<string[]>
    setPrimitiveIds: Setter<string[]>
    _parent_name: string | undefined
    _name: string | undefined
    s_type: Series_Type

    constructor(
        _id:string, 
        _name:string | undefined,
        _parent_name: string | undefined,
        _type:Series_Type, 
        _pane:pane
    ){
        this._id = _id
        this._name = _name
        this._parent_name = _parent_name
        this.s_type = _type
        this._pane = _pane
        this._series = this._create_series(_type)

        const sig = createSignal<string[]>([])
        this.primitiveIds = sig[0]; this.setPrimitiveIds = sig[1]; 

        //Having seriesBase Objs populate a map owned by the pane they are attached
        //to IS stupid. I don't like it. Thing is, this is the only way to keep _create_series
        //in SeriesBase where it should be.
        this._pane.series_map.set(this._series, this)
    }
    
    private _create_series(series_type: Series_Type): lwc.ISeriesApi<lwc.SeriesType> {
        switch (series_type) {
            // ---- Base Series Types ---- //
            case (Series_Type.LINE):
                return this._pane.chart.addLineSeries()
            case (Series_Type.AREA):
                return this._pane.chart.addAreaSeries()
            case (Series_Type.HISTOGRAM):
                return this._pane.chart.addHistogramSeries()
            case (Series_Type.BASELINE):
                return this._pane.chart.addBaselineSeries()
            case (Series_Type.BAR):
                return this._pane.chart.addBarSeries()
            case (Series_Type.OHLC):
            case (Series_Type.CANDLESTICK):
                return this._pane.chart.addCandlestickSeries()
            // ---- Custom Series Types ---- //
            case (Series_Type.ROUNDED_CANDLE):
                //Ideally custom series objects will get baked directly into the TS Code like this
                //So accomodations don't need to be made on the Python side
                return this._pane.chart.addCustomSeries(new RoundedCandleSeries())
            default: //Catch-all, primarily reached by WhitespaceSeries'
                return this._pane.chart.addLineSeries()
        }
    }

    get id(): string {return this._id}
    get name():string { 
        let display_name = this._parent_name? this._parent_name + ' : ' : ''
        display_name += this._name? this._name : SERIES_NAME_MAP.get(this.s_type)
        return display_name
    }

    reorderPrimitives(from:number, to:number){ 
        this.primitiveWrapperArray.splice(to, 0, ...this.primitiveWrapperArray.splice(from, 1))
        //Update the order of Primitive IDs to propogate the Update Back to the Object Tree
        this.setPrimitiveIds(Array.from(this.primitives, (prim) => prim.id))
    }

    /* Removes this series and all it's sub components from the chart. This is irreversible */
    remove(){ 
        this._pane.series_map.delete(this._series)
        this._pane.chart.removeSeries(this._series)
    }

    /* Changes the type of series that is displayed. Data must be given since the DataType may change */
    change_series_type(series_type:Series_Type, data:SeriesData[]){
        if (series_type === this.s_type) return

        const current_zindex = this._pane.get_series_index(this._series)
        const current_range = this._pane.chart.timeScale().getVisibleRange()
        
        this.remove()
        this._series = this._create_series(series_type)
        this._series.setData(data) // Type Checking presumed to have been done in python
        this.s_type = series_type
        this._pane.series_map.set(this._series, this)

        //Reset the draw order to what is was before the change.
        this._pane.reorder_series(-1, current_zindex, false)

        //Setting Data Changes Visible Range, set it back.
        if (current_range !== null)
            this._pane.chart.timeScale().setVisibleRange(current_range)
    }

    // TODO: Implement
    move_to_pane(pane:pane){}

    // #region -------- lightweight-chart ISeriesAPI functions --------

    priceScale(): lwc.IPriceScaleApi {return this._series.priceScale()}

    applyOptions(options: SeriesPartialOptionsMap_EXT[T]) {this._series.applyOptions(options)}
    options(): Readonly<SeriesOptionsMap_EXT[T]> {return this._series.options() as SeriesOptionsMap_EXT[T]}

    // data() may not work as intended. Extra parameters of data that don't match the series type are deleted
    // e.g. High/Low/Close/Open values are deleted when the struct is applied to a single_value series type
    data(): readonly SeriesDataTypeMap_EXT[T][] {return this._series.data()} 
    update(bar: SeriesDataTypeMap_EXT[T]) {this._series.update(bar)}
    setData(data: SeriesDataTypeMap_EXT[T][]) {this._series.setData(data)}

    markers(): lwc.SeriesMarker<lwc.Time>[] {return this._series.markers()}
    setMarkers(data: lwc.SeriesMarker<lwc.Time>[]){this._series.setMarkers(data)}

    removePriceLine(line: lwc.IPriceLine){this._series.removePriceLine(line)}
    createPriceLine(options: lwc.CreatePriceLineOptions): lwc.IPriceLine {return this._series.createPriceLine(options)}
    
    //@ts-ignore: _series.Ls.jl === seriesAPI.serieses._primitives array for Lightweight-Charts v4.2.0
    get primitiveWrapperArray(): PrimitiveBase[] { return this._series.Ls.jl }
    //@ts-ignore: _series.Ls.jl[].Dl === seriesAPI.serieses._primitives[].PrimitiveBase Array for Lightweight-Charts v4.2.0
    get primitives(): PrimitiveBase[] { return Array.from(this.primitiveWrapperArray, (wrap) => wrap.Dl)}

    attachPrimitive(primitive: PrimitiveBase) {
        this._series.attachPrimitive(primitive)
        this.setPrimitiveIds([...this.primitiveIds(), primitive._id])
    }
    detachPrimitive(primitive: PrimitiveBase) {
        this._series.detachPrimitive(primitive)
        this.setPrimitiveIds(this.primitiveIds().filter(prim_id => prim_id !== primitive._id))
    }

    /* 
     * These can be uncommented to be used. Currently they are commented out since they are 
     * not SeriesAPI features that are used, or planned to be used, by this module currently
     */
    // priceFormatter(): lwc.IPriceFormatter {return this._series.priceFormatter()}
    priceToCoordinate(price: number): lwc.Coordinate | null {return this._series.priceToCoordinate(price)}
    coordinateToPrice(coordinate: number): lwc.BarPrice | null {return this._series.coordinateToPrice(coordinate)}
    // barsInLogicalRange(range: lwc.Range<number>): lwc.BarsInfo<lwc.Time> | null {return this._series.barsInLogicalRange(range)}
    // dataByIndex(logicalIndex: number, mismatchDirection?: lwc.MismatchDirection): SeriesDataTypeMap_EXT[T] | null {return this._series.dataByIndex(logicalIndex, mismatchDirection)}
    // subscribeDataChanged(handler: lwc.DataChangedHandler) {this._series.subscribeDataChanged(handler)}
    // unsubscribeDataChanged(handler: lwc.DataChangedHandler) {this._series.unsubscribeDataChanged(handler)}
    // #endregion
}


/**
 * Dead Notes on Draw order of Series and Primitive objects for the Lightweight-Charts Library
 * 
 * To reorder Series (after applying them to the screen) you need to change the _zOrder:number 
 * within some/all of the series applied to the lwc 'Pane' (not this lib's pane) which displays 
 * the series objects. To get a reference to this pane's series objects call 
 * chart._chartWidget._model._panes[0]._dataSources: (chart.lw.$i.kc[0].vo)** for lwc v4.2.0
 * 
 * With this array, you can set _dataSources[i]._zOrder to the desired value. (chart.lw.$i.kc[0].vo[i].Zi)**
 * The _zOrder value can be a duplicate, negative, and have gaps between other series values.
 * From here the pane._cachedOrderedSources needs to be set to null (chart.lw.$i.kc[0].po = null)** 
 * Then a redraw of the chart invoked. chart._chartWidget._model.lightUpdate() ( chart.lw.$i.$h() )**
 * 
 * To Re-order primitives you need to re-order the series' _primitives array That's Part of the Series Object.
 * chart._chartWidget._model._serieses[i]._primitives (chart.lw.$i.yc[i].jl)
 */