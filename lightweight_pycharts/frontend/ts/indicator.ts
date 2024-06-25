import { AnySeries, AnySeriesData, AnySeriesOptions, PriceScaleOptions } from "./lib/pkg.js";
import { PrimitiveBase } from "./lwpc-plugins/primitive-base.js";
import { primitives } from "./lwpc-plugins/primitives.js";
import { Pane } from "./pane.js";
import { RoundedCandleSeries } from "./plugins/rounded-candles-series/rounded-candles-series.js";
import * as u from "./util.js";

export class indicator {
    id: string
    type: string
    private pane: Pane

    private series = new Map<string, AnySeries>()
    private primitives_left = new Map<string, PrimitiveBase>()
    private primitives_right = new Map<string, PrimitiveBase>()
    private primitives_overlay = new Map<string, PrimitiveBase>()

    constructor(id: string, type: string, pane: Pane) {
        this.id = id
        this.pane = pane
        this.type = type
    }

    //Clear All Sub-objects
    delete() {
        this.series.forEach((ser, key) => {
            this.pane.chart.removeSeries(ser)
        })
        this.primitives_left.forEach((prim, key) => {
            this.pane.primitive_left.detachPrimitive(prim)
        })
        this.primitives_right.forEach((prim, key) => {
            this.pane.primitive_right.detachPrimitive(prim)
        })
        this.primitives_overlay.forEach((prim, key) => {
            this.pane.whitespace_series.detachPrimitive(prim)
        })
    }

    private _create_series_(series_type: u.Series_Type): AnySeries {
        switch (series_type) {
            case (u.Series_Type.LINE):
                return this.pane.chart.addLineSeries()
            case (u.Series_Type.AREA):
                return this.pane.chart.addAreaSeries()
            case (u.Series_Type.HISTOGRAM):
                return this.pane.chart.addHistogramSeries()
            case (u.Series_Type.BASELINE):
                return this.pane.chart.addBaselineSeries()
            case (u.Series_Type.BAR):
                return this.pane.chart.addBarSeries()
            case (u.Series_Type.CANDLESTICK):
                return this.pane.chart.addCandlestickSeries()
            case (u.Series_Type.ROUNDED_CANDLE):
                return this.pane.chart.addCustomSeries(new RoundedCandleSeries())
            default: //Whitespace
                return this.pane.chart.addLineSeries()
        }
    }

    get_legend() { }

    set_legend() { }

    edit_legend() { }

    protected add_series(_id: string, series_type: u.Series_Type) {
        this.series.set(_id, this._create_series_(series_type))
    }

    protected remove_series(_id: string) {
        let series = this.series.get(_id)
        if (series === undefined) return

        this.pane.chart.removeSeries(series)
        this.series.delete(_id)
    }

    protected set_series_data(_id: string, data: AnySeriesData[]) {
        let series = this.series.get(_id)
        if (series === undefined) return
        series.setData(data)
        this.pane.autoscale_time_axis()
    }

    protected update_series_data(_id: string, data: AnySeriesData) {
        let series = this.series.get(_id)
        if (series === undefined) return
        series.update(data)
    }

    /**
     * Unfortunately, change_series_type changes the draw order of the Series on screen.
     * This is the result of deleteing the old series and creating a new one. The draw order
     * appears to be determined by the order in which the series objects are added to the screen.
     * After some trial testing it appears the chart object has an 'rw' property. This is a map
     * w/ the series objects as keys. I do not know the type of the value. This 'rw' map gets
     * reordered when adding/removing series objects. I already tried to reorder this map
     * to change the display order, but that had no effect on the display. of note: it did not
     * break anything.
     */
    protected change_series_type(_id: string, series_type: u.Series_Type, data: AnySeriesData[]) {
        let series = this.series.get(_id)
        if (series === undefined) {
            //Create Series and return if it doesn't exist
            this.add_series(_id, series_type)
            this.series.get(_id)?.setData(data)
            return
        }

        let new_series = this._create_series_(series_type)
        let timescale = this.pane.chart.timeScale()
        let current_range = timescale.getVisibleRange()

        //@ts-ignore (Type Checking Done in Python, Data should already be updated if it needed to be)
        new_series.setData(data)
        this.series.set(_id, new_series)
        this.pane.chart.removeSeries(series)

        //Setting Data Changes Visible Range, set it back.
        if (current_range !== null)
            timescale.setVisibleRange(current_range)
    }

    protected update_series_opts(_id: string, opts: AnySeriesOptions) {
        let series = this.series.get(_id)
        if (series === undefined) return
        series.applyOptions(opts)
    }
    
    protected update_scale_opts(_id: string, opts: PriceScaleOptions) {
        let series = this.series.get(_id)
        if (series === undefined) return
        series.priceScale().applyOptions(opts)
    }

    protected add_primitive(_id: string, _type: string, params:any) {
        let primitive_type = primitives.get(_type)
        if (primitive_type === undefined) return
        let new_obj = new primitive_type(params)

        this.primitives_right.set(_id, new_obj)
        this.pane.primitive_right.attachPrimitive(new_obj)
    }

    protected remove_primitive(_id: string) {
        let _obj = this.primitives_right.get(_id)
        if (_obj === undefined) return

        this.pane.primitive_right.detachPrimitive(_obj) 
        this.primitives_right.delete(_id)
    }
    
    protected update_primitive(_id: string, params:any) {
        let _obj = this.primitives_right.get(_id)
        if (_obj === undefined) return
        _obj.updateData(params)
    }
}