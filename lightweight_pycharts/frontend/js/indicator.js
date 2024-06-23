import { primitives } from "./lwpc-plugins/primitives.js";
import { RoundedCandleSeries } from "./plugins/rounded-candles-series/rounded-candles-series.js";
import * as u from "./util.js";
export class indicator {
    constructor(id, type, pane) {
        this.series = new Map();
        this.primitives_left = new Map();
        this.primitives_right = new Map();
        this.primitives_overlay = new Map();
        this.id = id;
        this.pane = pane;
        this.type = type;
    }
    delete() {
        this.series.forEach((ser, key) => {
            this.pane.chart.removeSeries(ser);
        });
        this.primitives_left.forEach((prim, key) => {
            this.pane.primitive_left.detachPrimitive(prim);
        });
        this.primitives_right.forEach((prim, key) => {
            this.pane.primitive_right.detachPrimitive(prim);
        });
        this.primitives_overlay.forEach((prim, key) => {
            this.pane.whitespace_series.detachPrimitive(prim);
        });
    }
    _create_series_(series_type) {
        switch (series_type) {
            case (u.Series_Type.LINE):
                return this.pane.chart.addLineSeries();
            case (u.Series_Type.AREA):
                return this.pane.chart.addAreaSeries();
            case (u.Series_Type.HISTOGRAM):
                return this.pane.chart.addHistogramSeries();
            case (u.Series_Type.BASELINE):
                return this.pane.chart.addBaselineSeries();
            case (u.Series_Type.BAR):
                return this.pane.chart.addBarSeries();
            case (u.Series_Type.CANDLESTICK):
                return this.pane.chart.addCandlestickSeries();
            case (u.Series_Type.ROUNDED_CANDLE):
                return this.pane.chart.addCustomSeries(new RoundedCandleSeries());
            default:
                return this.pane.chart.addLineSeries();
        }
    }
    get_legend() { }
    set_legend() { }
    edit_legend() { }
    add_series(_id, series_type) {
        this.series.set(_id, this._create_series_(series_type));
    }
    remove_series(_id) {
        let series = this.series.get(_id);
        if (series === undefined)
            return;
        this.pane.chart.removeSeries(series);
        this.series.delete(_id);
    }
    set_series_data(_id, data) {
        let series = this.series.get(_id);
        if (series === undefined)
            return;
        series.setData(data);
        this.pane.autoscale_time_axis();
    }
    update_series_data(_id, data) {
        let series = this.series.get(_id);
        if (series === undefined)
            return;
        series.update(data);
    }
    change_series_type(_id, series_type, data) {
        var _a;
        let series = this.series.get(_id);
        if (series === undefined) {
            this.add_series(_id, series_type);
            (_a = this.series.get(_id)) === null || _a === void 0 ? void 0 : _a.setData(data);
            return;
        }
        let new_series = this._create_series_(series_type);
        let timescale = this.pane.chart.timeScale();
        let current_range = timescale.getVisibleRange();
        new_series.setData(data);
        this.series.set(_id, new_series);
        this.pane.chart.removeSeries(series);
        if (current_range !== null)
            timescale.setVisibleRange(current_range);
    }
    update_series_opts(_id, opts) {
        let series = this.series.get(_id);
        if (series === undefined)
            return;
        series.applyOptions(opts);
    }
    update_scale_opts(_id, opts) {
        let series = this.series.get(_id);
        if (series === undefined)
            return;
        series.priceScale().applyOptions(opts);
    }
    add_primitive(_id, _type, params) {
        let primitive_type = primitives.get(_type);
        if (primitive_type === undefined)
            return;
        let new_obj = new primitive_type(params);
        this.primitives_right.set(_id, new_obj);
        this.pane.primitive_right.attachPrimitive(new_obj);
    }
    remove_primitive(_id) {
        let _obj = this.primitives_right.get(_id);
        if (_obj === undefined)
            return;
        this.pane.primitive_right.detachPrimitive(_obj);
        this.primitives_right.delete(_id);
    }
}
