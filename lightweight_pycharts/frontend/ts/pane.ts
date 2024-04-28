import { Legend } from "./legend.js";
import { AnySeries, AnySeriesData, CandlestickData, CandlestickSeriesOptions, DeepPartial as DP, IChartApi, TimeChartOptions, createChart } from "./lib/pkg.js";
import { TrendLine } from "./lwpc-plugins/trend-line/trend-line.js";
import * as u from "./util.js";

//The portion of a chart where things are actually drawn
export class Pane {
    id: string = ''
    div: HTMLDivElement
    flex_width: number
    flex_height: number
    legend?: Legend
    main_series: AnySeries
    series: AnySeries[] = []

    private chart: IChartApi
    private chart_div: HTMLDivElement

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
        this.chart = createChart(this.div, chart_opts);
        this.chart_div = this.chart.chartElement()

        this.chart_div.addEventListener('mousedown', this.assign_active_pane.bind(this))

        this.main_series = this.chart.addCandlestickSeries()
        // this.main_series = this.chart.addCustomSeries(new RoundedCandleSeries())
    }

    /**
     * Update Global 'active_pane' reference to this instance. 
     */
    assign_active_pane() {
        if (window.active_pane)
            window.active_pane.div.removeAttribute('active')

        window.active_pane = this
        window.active_pane.div.setAttribute('active', '')
    }

    /**
     * Sets The Data of a Series to the data list given.
     * @param dtype The type of data Series given
     * @param data The List of Data. It is trusted that this data actually matches the dtype given
     * @param series The Data Series to be updated. Can be any of the base SeriesAPI types
     */
    set_data(dtype: string, data: AnySeriesData[], series: AnySeries = this.main_series) {
        if (data.length === 0) {
            //Delete Present Data if none was given.
            series.setData([])
            return
        } else if (series === undefined) {
            return
        }

        let data_set: boolean = false
        switch (series.seriesType()) {
            case "Candlestick":
                //The input dtype is used instead of the 'util.is*dataype*()' functions since
                //the dtype input originates from pandas where the whole list is checked, not just the first element
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
            default: //Custom Datatype
                //Can't type check this so it will just blindly be applied. gl.
                series.setData(data)
                data_set = true
        }
        if (!data_set && dtype == 'WhitespaceData') {
            series.setData(data)
            data_set = true
        }

        if (!data_set)
            console.warn("Failed to set data on Pane.set_data() function call.")
        else {
            this.assign_active_pane()
            this.autoscale_time_axis()
        }
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
        this.chart.resize(this_width, this_height, false)
    }


    add_candlestick_series(options?: DP<CandlestickSeriesOptions>) {
        this.series.push(this.chart.addCandlestickSeries(options))
    }

    create_line() {
        const data = this.main_series.data() as CandlestickData[]
        const dataLength = data.length
        console.log(data[0].time)
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

    fitcontent() { this.chart.timeScale().fitContent() }
    autoscale_time_axis() { this.chart.timeScale().resetTimeScale() }
    set_main_series(series: AnySeries) { this.main_series = series }
}