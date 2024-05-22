import { Legend } from "./legend.js";
import { AnySeries, AnySeriesData, CandlestickData, CandlestickSeriesOptions, DeepPartial as DP, DeepPartial, HorzScaleOptions, IChartApi, LineSeries, TimeChartOptions, WhitespaceData, createChart } from "./lib/pkg.js";
import { TrendLine } from "./lwpc-plugins/trend-line/trend-line.js";
import { RoundedCandleSeries } from "./plugins/rounded-candles-series/rounded-candles-series.js";
import * as u from "./util.js";

//The portion of a chart where things are actually drawn
export class Pane {
    id: string = ''
    div: HTMLDivElement
    flex_width: number
    flex_height: number
    legend?: Legend
    main_series: AnySeries
    whitespace_series: LineSeries
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

        this.assign_active_pane = this.assign_active_pane.bind(this)

        this.main_series = this.chart.addCandlestickSeries()
        this.whitespace_series = this.chart.addLineSeries()

        // Without these listeners, chart cannot be moved in a replay like mode
        this.chart_div.addEventListener('mousedown', () => {
            this.assign_active_pane()
            this.chart.timeScale().applyOptions({
                'shiftVisibleRangeOnNewBar': false,
                'allowShiftVisibleRangeOnWhitespaceReplacement': false,
                'rightBarStaysOnScroll': false
            })
        })
        window.document.addEventListener('mouseup', () => {
            this.chart.timeScale().applyOptions({
                'shiftVisibleRangeOnNewBar': true,
                'allowShiftVisibleRangeOnWhitespaceReplacement': true,
                'rightBarStaysOnScroll': true
            })
        })
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

    set_main_series(series_type: u.Series_Type, data: AnySeriesData[]) {
        let new_series: AnySeries
        switch (series_type) {
            case (u.Series_Type.LINE):
                new_series = this.chart.addLineSeries(); break;
            case (u.Series_Type.AREA):
                new_series = this.chart.addAreaSeries(); break;
            case (u.Series_Type.HISTOGRAM):
                new_series = this.chart.addHistogramSeries(); break;
            case (u.Series_Type.BASELINE):
                new_series = this.chart.addBaselineSeries(); break;
            case (u.Series_Type.BAR):
                new_series = this.chart.addBarSeries(); break;
            case (u.Series_Type.CANDLESTICK):
                new_series = this.chart.addCandlestickSeries(); break;
            case (u.Series_Type.ROUNDED_CANDLE):
                new_series = this.chart.addCustomSeries(new RoundedCandleSeries()); break;
            default:
                return // Whitespace
        }
        let timescale = this.chart.timeScale()
        let current_range = timescale.getVisibleRange()

        //@ts-ignore (Type Checking Done in Python, Data should already be updated if it needed to be)
        new_series.setData(data)
        this.chart.removeSeries(this.main_series)
        this.main_series = new_series

        if (current_range !== null)
            timescale.setVisibleRange(current_range)
    }

    /**
     * Sets The Data of a Series to the data list given.
     * @param data The List of Data. Type Checking presumed to have been done in Python
     */
    set_main_data(data: AnySeriesData[], ws_data: AnySeriesData[]) {
        if (this.main_series === undefined) return
        this.main_series.setData(data)
        this.whitespace_series.setData(ws_data)
        this.autoscale_time_axis()
    }

    /**
     * Sets The Data of a Series to the data list given.
     * @param data The List of Data. Type Checking presumed to have been done in Python
     */
    update_main_data(data: AnySeriesData) {
        if (this.main_series === undefined) return
        this.main_series.update(data)
    }

    set_whitespace_data(data: WhitespaceData[]) {
        this.whitespace_series.setData(data)
    }

    update_whitespace_data(data: WhitespaceData) {
        this.whitespace_series.update(data)
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
    update_timescale_opts(newOpts: DeepPartial<HorzScaleOptions>) { this.chart.timeScale().applyOptions(newOpts) }
}