//@ts-ignore
import * as lwc from "../js/pkg.mjs";
import { CandlestickSeriesOptions, DeepPartial as DP, IChartApi, Series, SeriesData, TimeChartOptions } from "./pkg.js";
import * as u from "./util.js";


//The portion of a chart where things are actually drawn
export class Pane {
    id: string = ''
    div: HTMLDivElement
    flex_width: number
    flex_height: number

    private chart: IChartApi
    private series: Series[] = []

    constructor(
        id: string,
        div: HTMLDivElement,
        flex_width: number = 1,
        flex_height: number = 1,
        chart_opts: DP<TimeChartOptions> = u.DEFAULT_PYCHART_OPTS
    ) {
        this.id = id
        this.div = div
        this.flex_width = flex_width
        this.flex_height = flex_height

        //Only One Chart per pane, so this is the only definition needed
        this.chart = lwc.createChart(this.div, chart_opts);

        //Bind Funcitons to ensure expected 'this' functionality
        this.resize = this.resize.bind(this)
        this.set_data = this.set_data.bind(this)
        this.add_candlestick_series = this.add_candlestick_series.bind(this)
        // this. = this..bind(this)


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
        ]

        this.add_candlestick_series()
        this.set_data(this.series[0], data)
    }

    /**
     * Sets The Data of a Series to the data list given.
     * @param series The Data Series to be updated. Can be any of the base SeriesAPI types 
     * @param data List of Data, The type of **\*the first data point\*** should match the series type. There is some type checking, but not extensive
     * 
     * This function will ensure the data type matches the given series only up to OHLC vs Single Value. Beyond that it will not catch a mis-match of data type.
     * 
     * i.e. if the first data point is of generic Single Value, but the second data point is Baseline Data then the function will blindly
     * set the given Baseline Data to an Area, Line, Baseline, or Histogram Series. The Effect is that the specific color params given are ignored.
     * 
     * The only way around this would be to check every data point and that level of extensive type checking isn't necessary since the additional
     * values are just ignored anyway.
     * 
     */
    set_data(series: Series, data: SeriesData[]) {
        if (data.length == 0) {
            //Delete Present Data if none was given.
            series.setData([])
            return
        }
        let data_set: boolean = false

        //Check Against Most Restrictive Data/Series Types
        if (u.isCandlestickData(data[0])) {
            if (series.seriesType() == 'Candlestick') {
                //Data and Series Type match so set the data
                series.setData(data)
                data_set = true
            }
        } else if (u.isBarData(data[0])) {
            if (series.seriesType() == 'Bar') {
                //Data and Series Type match so set the data
                series.setData(data)
                data_set = true
            }
        } else if (u.isLineData(data[0]) || u.isAreaData(data[0])) {
            //Area and Line Data are identical in structure
            if (series.seriesType() == 'Line' || series.seriesType() == 'Area') {
                //Data and Series Type match so set the data
                series.setData(data)
                data_set = true
            }
        } else if (u.isBaselineData(data[0])) {
            if (series.seriesType() == 'Baseline') {
                //Data and Series Type match so set the data
                series.setData(data)
                data_set = true
            }
        } else if (u.isHistogramData(data[0])) {
            if (series.seriesType() == 'Histogram') {
                //Data and Series Type match so set the data
                series.setData(data)
                data_set = true
            }
        }

        //If not already set, Check against more basic data types
        if (!data_set) {
            if (u.isOhlcData(data[0])) {
                if (series.seriesType() == 'Candlestick' || series.seriesType() == 'Bar') {
                    series.setData(data)
                    data_set = true
                }

            } else if (u.isSingleValueData(data[0])) {
                let options = ['Line', 'Area', 'Baseline', 'Histogram']
                if (options.includes(series.seriesType())) {
                    series.setData(data)
                    data_set = true
                }
            }

        }

        if (data_set)
            //Implies that the series given was part of this chart, though that may not actually be the case.
            this.chart.timeScale().fitContent()
        else
            console.warn("Failed to set data on Pane.set_data() function call.")
    }

    add_candlestick_series(options?: DP<CandlestickSeriesOptions>) {
        this.series.push(this.chart.addCandlestickSeries(options))
    }

    /**
     * Resize the Pane given the Pane's flex size
     * @param width Total Frame Width in px
     * @param height Total Frame Height in px
     */
    resize(width: number, height: number) {
        let this_width = width * this.flex_width
        let this_height = height * this.flex_height

        this.div.style.width = `${this_width}px`
        this.div.style.height = `${this_height}px`
        this.chart.resize(this_width, this_height)
    }

    /**
     * Auto Fit the content of the Pane
     */
    fitcontent() {
        this.chart.timeScale().fitContent()
    }
}