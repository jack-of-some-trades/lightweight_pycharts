import { createChart } from "./lib/pkg.js";
import { RoundedCandleSeries } from "./plugins/rounded-candles-series/rounded-candles-series.js";
import * as u from "./util.js";
export class Pane {
    constructor(id, div, flex_width = 1, flex_height = 1, chart_opts = u.DEFAULT_PYCHART_OPTS) {
        this.id = '';
        this.is_focus = false;
        this.series = [];
        this.id = id;
        this.div = div;
        this.flex_width = flex_width;
        this.flex_height = flex_height;
        this.chart = createChart(this.div, chart_opts);
        this.chart_div = this.chart.chartElement();
        this.chart_div.addEventListener('mousedown', this.assign_active_pane.bind(this));
        this.main_series = this.chart.addCustomSeries(new RoundedCandleSeries());
    }
    assign_active_pane() {
        if (!window.active_pane) {
            this.is_focus = true;
            window.active_pane = this;
            window.active_pane.div.classList.add('chart_pane_active');
        }
        else if (window.active_pane.id != this.id) {
            window.active_pane.is_focus = false;
            window.active_pane.div.classList.remove('chart_pane_active');
            this.is_focus = true;
            window.active_pane = this;
            window.active_pane.div.classList.add('chart_pane_active');
        }
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
                if (dtype == 'OHLC' || dtype == 'Bar' || dtype == 'Candlestick') {
                    series.setData(data);
                    data_set = true;
                }
                break;
            case "Bar":
                if (dtype == 'OHLC' || dtype == 'Bar') {
                    series.setData(data);
                    data_set = true;
                }
                break;
            case "Line":
                if (dtype == 'SingleValueData' || dtype == 'Line' || dtype == 'LineorHistogram') {
                    series.setData(data);
                    data_set = true;
                }
                break;
            case "Histogram":
                if (dtype == 'SingleValueData' || dtype == 'Histogram' || dtype == 'LineorHistogram') {
                    series.setData(data);
                    data_set = true;
                }
                break;
            case "Area":
                if (dtype == 'SingleValueData' || dtype == 'Area') {
                    series.setData(data);
                    data_set = true;
                }
                break;
            case "Baseline":
                if (dtype == 'SingleValueData' || dtype == 'Baseline') {
                    series.setData(data);
                    data_set = true;
                }
                break;
            default:
                series.setData(data);
                data_set = true;
        }
        if (!data_set && dtype == 'WhitespaceData') {
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
    fitcontent() { this.chart.timeScale().fitContent(); }
    autoscale_time_axis() { this.chart.timeScale().resetTimeScale(); }
    set_main_series(series) { this.main_series = series; }
}
