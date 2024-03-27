import * as lwc from "../js/pkg.mjs";
import * as u from "./util.js";
export class Pane {
    constructor(id, div, flex_width = 1, flex_height = 1, chart_opts = u.DEFAULT_PYCHART_OPTS) {
        this.id = '';
        this.series = [];
        this.id = id;
        this.div = div;
        this.flex_width = flex_width;
        this.flex_height = flex_height;
        this.chart = lwc.createChart(this.div, chart_opts);
        this.resize = this.resize.bind(this);
        this.set_data = this.set_data.bind(this);
        this.add_candlestick_series = this.add_candlestick_series.bind(this);
        let data = [
            { time: '2018-12-22', open: 75.16, high: 82.84, low: 36.16, close: 45.72 },
            { time: '2018-12-23', open: 45.12, high: 53.90, low: 45.12, close: 48.09 },
            { time: '2018-12-24', open: 60.71, high: 60.71, low: 53.39, close: 59.29 },
            { time: '2018-12-25', open: 68.26, high: 68.26, low: 59.04, close: 60.50 },
            { time: '2018-12-26', open: 67.71, high: 105.85, low: 66.67, close: 91.04 },
            { time: '2018-12-27', open: 91.04, high: 121.40, low: 82.70, close: 111.40 },
            { time: '2018-12-28', open: 111.51, high: 142.83, low: 103.34, close: 131.25 },
            { time: '2018-12-29', open: 131.33, high: 151.17, low: 77.68, close: 96.43 },
            { time: '2018-12-30', open: 106.33, high: 110.20, low: 90.39, close: 98.10 },
            { time: '2018-12-31', open: 109.87, high: 114.69, low: 85.66, close: 111.26 },
        ];
        this.add_candlestick_series();
        this.set_data(this.series[0], data);
    }
    set_data(series, data) {
        if (data.length == 0) {
            series.setData([]);
            return;
        }
        let data_set = false;
        if (u.isCandlestickData(data[0])) {
            if (series.seriesType() == 'Candlestick') {
                series.setData(data);
                data_set = true;
            }
        }
        else if (u.isBarData(data[0])) {
            if (series.seriesType() == 'Bar') {
                series.setData(data);
                data_set = true;
            }
        }
        else if (u.isLineData(data[0]) || u.isAreaData(data[0])) {
            if (series.seriesType() == 'Line' || series.seriesType() == 'Area') {
                series.setData(data);
                data_set = true;
            }
        }
        else if (u.isBaselineData(data[0])) {
            if (series.seriesType() == 'Baseline') {
                series.setData(data);
                data_set = true;
            }
        }
        else if (u.isHistogramData(data[0])) {
            if (series.seriesType() == 'Histogram') {
                series.setData(data);
                data_set = true;
            }
        }
        if (!data_set) {
            if (u.isOhlcData(data[0])) {
                if (series.seriesType() == 'Candlestick' || series.seriesType() == 'Bar') {
                    series.setData(data);
                    data_set = true;
                }
            }
            else if (u.isSingleValueData(data[0])) {
                let options = ['Line', 'Area', 'Baseline', 'Histogram'];
                if (options.includes(series.seriesType())) {
                    series.setData(data);
                    data_set = true;
                }
            }
        }
        if (data_set)
            this.chart.timeScale().fitContent();
        else
            console.warn("Failed to set data on Pane.set_data() function call.");
    }
    add_candlestick_series(options) {
        this.series.push(this.chart.addCandlestickSeries(options));
    }
    resize(width, height) {
        let this_width = width * this.flex_width;
        let this_height = height * this.flex_height;
        this.div.style.width = `${this_width}px`;
        this.div.style.height = `${this_height}px`;
        this.chart.resize(this_width, this_height);
    }
    fitcontent() {
        this.chart.timeScale().fitContent();
    }
}
