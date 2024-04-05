//@ts-ignore
import * as lwc from "../js/pkg.mjs";
import { Legend } from "./legend.js";
import { AnySeries, AnySeriesData, CandlestickSeriesOptions, DeepPartial as DP, IChartApi, TimeChartOptions } from "./pkg.js";
import * as u from "./util.js";


//The portion of a chart where things are actually drawn
export class Pane {
    id: string = ''
    div: HTMLDivElement
    flex_width: number
    flex_height: number
    legend?: Legend
    series: AnySeries[] = []

    private chart_div: HTMLDivElement
    private chart: IChartApi

    private watermark_div: HTMLDivElement | null
    private watermark_series: AnySeries | null

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
        //Next line grabs the Div that the lightweight charts API generates
        this.chart_div = this.div.getElementsByTagName('td')[1].firstChild as HTMLDivElement

        //Bind Funcitons to ensure expected 'this' functionality
        this.resize = this.resize.bind(this)
        this.set_data = this.set_data.bind(this)
        this.add_candlestick_series = this.add_candlestick_series.bind(this)
        // this. = this..bind(this)

        this.watermark_div = null
        this.watermark_series = null
        //This is only temporary
        this.create_screensaver()
    }

    /**
     * Sets The Data of a Series to the data list given.
     * @param dtype The type of data Series given
     * @param data The List of Data. It is trusted that this data actually matches the dtype given
     * @param series The Data Series to be updated. Can be any of the base SeriesAPI types
     */
    set_data(dtype: string, data: AnySeriesData[], series: AnySeries = this.series[0]) {
        if (data.length === 0) {
            //Delete Present Data if none was given.
            series.setData([])
            this.create_screensaver()
            return
        } else if (series === undefined) {
            return
        } else if (this.watermark_div) {
            this.remove_screensaver()
        }

        let data_set: boolean = false
        switch (series.seriesType()) {
            case "Candlestick":
                if (dtype == 'OHLC' || dtype == 'Bar' || dtype == 'Candlestick') {
                    series.setData(data)
                    data_set = true
                }
                break;
            case "Bar":
                if (dtype == 'OHLC' || dtype == 'Bar') {
                    series.setData(data)
                    data_set = true
                }
                break;
            case "Line":
                if (dtype == 'SingleValueData' || dtype == 'Line' || dtype == 'LineorHistogram') {
                    series.setData(data)
                    data_set = true
                }
                break;
            case "Histogram":
                if (dtype == 'SingleValueData' || dtype == 'Histogram' || dtype == 'LineorHistogram') {
                    series.setData(data)
                    data_set = true
                }
                break;
            case "Area":
                if (dtype == 'SingleValueData' || dtype == 'Area') {
                    series.setData(data)
                    data_set = true
                }
                break;
            case "Baseline":
                if (dtype == 'SingleValueData' || dtype == 'Baseline') {
                    series.setData(data)
                    data_set = true
                }
                break;
        }
        if (dtype == 'WhitespaceData') {
            series.setData(data)
            data_set = true
        }

        if (!data_set)
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
        this.chart.resize(this_width, this_height, true)

        if (this.watermark_div) {
            this.watermark_div.style.width = `${this.chart_div.clientWidth}px`
            this.watermark_div.style.height = `${this.chart_div.clientHeight}px`
        }
    }

    fitcontent() {
        this.chart.timeScale().fitContent()
    }

    create_screensaver(white: boolean = true) {
        if (!this.watermark_div) {
            this.watermark_div = document.createElement('div')
            this.watermark_div.classList.add(white ? 'chart_watermark_white' : 'chart_watermark_black')
            this.watermark_div.style.width = `${this.chart_div.clientWidth}px`
            this.watermark_div.style.height = `${this.chart_div.clientHeight}px`
            this.div.appendChild(this.watermark_div)
        }
        if (!this.watermark_series) {
            this.watermark_series = this.chart.addCandlestickSeries()
            this.watermark_series.setData(u.fake_bar_data)
        }
    }

    remove_screensaver() {
        if (this.watermark_div) {
            this.div.removeChild(this.watermark_div)
            this.watermark_div = null
        }
        if (this.watermark_series) {
            this.chart.removeSeries(this.watermark_series)
            this.watermark_series = null
        }
    }
}