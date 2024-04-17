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
        this.watermark_div = null;
        this.watermark_series = null;
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
            this.create_screensaver();
            return;
        }
        else if (series === undefined) {
            return;
        }
        else if (this.watermark_div) {
            this.remove_screensaver();
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
        if (this.watermark_div) {
            this.chart.resize(this_width, this_height, true);
            this.watermark_div.style.width = `${this.chart_div.clientWidth}px`;
            this.watermark_div.style.height = `${this.chart_div.clientHeight}px`;
        }
        else {
            this.chart.resize(this_width, this_height, false);
        }
    }
    add_candlestick_series(options) {
        this.series.push(this.chart.addCandlestickSeries(options));
    }
    fitcontent() { this.chart.timeScale().fitContent(); }
    autoscale_time_axis() { this.chart.timeScale().resetTimeScale(); }
    set_main_series(series) { this.main_series = series; }
    create_screensaver(white = true) {
        if (!this.watermark_div) {
            this.watermark_div = document.createElement('div');
            this.watermark_div.classList.add(white ? 'chart_watermark_white' : 'chart_watermark_black');
            this.watermark_div.style.width = `${this.chart_div.clientWidth}px`;
            this.watermark_div.style.height = `${this.chart_div.clientHeight}px`;
            this.div.appendChild(this.watermark_div);
        }
        if (!this.watermark_series) {
            this.watermark_series = this.chart.addCandlestickSeries();
            this.watermark_series.setData(u.fake_bar_data);
        }
    }
    remove_screensaver() {
        if (this.watermark_div) {
            this.div.removeChild(this.watermark_div);
            this.watermark_div = null;
        }
        if (this.watermark_series) {
            this.chart.removeSeries(this.watermark_series);
            this.watermark_series = null;
        }
    }
}
