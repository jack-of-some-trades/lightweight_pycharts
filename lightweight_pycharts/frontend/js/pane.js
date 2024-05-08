import { createChart } from "./lib/pkg.js";
import { TrendLine } from "./lwpc-plugins/trend-line/trend-line.js";
import * as u from "./util.js";
export class Pane {
    constructor(id, div, flex_width = 1, flex_height = 1, chart_opts = u.DEFAULT_PYCHART_OPTS) {
        this.id = '';
        this.series = [];
        this.id = id;
        this.div = div;
        this.flex_width = flex_width;
        this.flex_height = flex_height;
        this.chart = createChart(this.div, chart_opts);
        this.chart_div = this.chart.chartElement();
        this.chart_div.addEventListener('mousedown', this.assign_active_pane.bind(this));
        this.main_series = this.chart.addCandlestickSeries();
    }
    assign_active_pane() {
        if (window.active_pane)
            window.active_pane.div.removeAttribute('active');
        window.active_pane = this;
        window.active_pane.div.setAttribute('active', '');
    }
    set_data(dtype, data, series = this.main_series) {
        if (data.length === 0) {
            series.setData([]);
            return;
        }
        else if (series === undefined) {
            return;
        }
        let data_set = false;
        switch (series.seriesType()) {
            case "Candlestick":
                if (dtype == u.Series_Type.OHLC || dtype == u.Series_Type.BAR || dtype == u.Series_Type.CANDLESTICK) {
                    series.setData(data);
                    data_set = true;
                }
                break;
            case "Bar":
                if (dtype == u.Series_Type.OHLC || dtype == u.Series_Type.BAR) {
                    series.setData(data);
                    data_set = true;
                }
                break;
            case "Line":
                if (dtype == u.Series_Type.SingleValueData || u.Series_Type.LINE || u.Series_Type.HISTOGRAM) {
                    series.setData(data);
                    data_set = true;
                }
                break;
            case "Histogram":
                if (dtype == u.Series_Type.SingleValueData || u.Series_Type.HISTOGRAM || u.Series_Type.LINE) {
                    series.setData(data);
                    data_set = true;
                }
                break;
            case "Area":
                if (dtype == u.Series_Type.SingleValueData || dtype == u.Series_Type.AREA) {
                    series.setData(data);
                    data_set = true;
                }
                break;
            case "Baseline":
                if (dtype == u.Series_Type.SingleValueData || dtype == u.Series_Type.BASELINE) {
                    series.setData(data);
                    data_set = true;
                }
                break;
            default:
                series.setData(data);
                data_set = true;
        }
        if (!data_set && dtype == u.Series_Type.WhitespaceData) {
            series.setData(data);
            data_set = true;
        }
        if (!data_set)
            console.warn("Failed to set data on Pane.set_data() function call.");
        else {
            this.assign_active_pane();
            this.autoscale_time_axis();
        }
    }
    resize(width, height) {
        let this_width = width * this.flex_width;
        let this_height = height * this.flex_height;
        this.div.style.width = `${this_width}px`;
        this.div.style.height = `${this_height}px`;
        this.chart.resize(this_width, this_height, false);
    }
    add_candlestick_series(options) {
        this.series.push(this.chart.addCandlestickSeries(options));
    }
    create_line() {
        const data = this.main_series.data();
        const dataLength = data.length;
        console.log(data[0].time);
        const point1 = {
            time: data[dataLength - 50].time,
            value: data[dataLength - 50].close * 0.9,
        };
        const point2 = {
            time: data[dataLength - 5].time,
            value: data[dataLength - 5].close * 1.1,
        };
        const trend = new TrendLine(point1, point2);
        this.main_series.attachPrimitive(trend);
    }
    fitcontent() { this.chart.timeScale().fitContent(); }
    autoscale_time_axis() { this.chart.timeScale().resetTimeScale(); }
    set_main_series(series) { this.main_series = series; }
    update_timescale_opts(newOpts) { this.chart.timeScale().applyOptions(newOpts); }
}
