import { indicator } from "./indicator.js";
import { Legend } from "./legend.js";
import { DeepPartial as DP, DeepPartial, HorzScaleOptions, IChartApi, LineSeries, SingleValueData, TimeChartOptions, WhitespaceData, createChart } from "./lib/pkg.js";
import { TrendLine } from "./lwpc-plugins/trend-line/trend-line.js";
import * as u from "./util.js";


//The portion of a chart where things are actually drawn
export class Pane {
    static _special_id_ = 'main' // Must match Python Pane Special ID

    id: string = ''
    div: HTMLDivElement
    flex_width: number
    flex_height: number
    legend?: Legend

    chart: IChartApi
    indicators = new Map<string, indicator>()

    primitive_left: LineSeries
    primitive_right: LineSeries
    whitespace_series: LineSeries
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

        //Add Blank Series that primtives can be attached to
        this.primitive_left = this.chart.addLineSeries({ priceScaleId: 'left', visible: false, autoscaleInfoProvider: undefined })
        this.primitive_right = this.chart.addLineSeries({ priceScaleId: 'right', visible: false, autoscaleInfoProvider: undefined })
        this.whitespace_series = this.chart.addLineSeries({
            visible: false,
            priceScaleId: '',
            autoscaleInfoProvider: () => ({
                priceRange: { //Set visible range regardless of data
                    minValue: 0,
                    maxValue: 100,
                },
            })
        })

        this.assign_active_pane = this.assign_active_pane.bind(this)

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

    set_whitespace_data(data: WhitespaceData[]) {
        //We also want to set the values of a few data points so that anything attached to the Left/Right 
        //primitive display series' will be drawn appropriately (all resulting series lines are invisible and don't autoscale)
        //This is done here so that the timestamp will be guarenteed to be part of the data set given to the chart
        if (data.length > 0) {
            this.primitive_left.setData([{ time: data[0].time, value: 0 }])
            this.primitive_right.setData([{ time: data[0].time, value: 0 }])
        }

        this.whitespace_series.setData(data)
    }

    update_whitespace_data(data: WhitespaceData) {
        this.whitespace_series.update(data)
    }

    protected add_indicator(_id: string, type: string) {
        this.indicators.set(_id, new indicator(_id, type, this))
    }

    protected remove_indicator(_id: string) {
        let indicator = this.indicators.get(_id)
        if (indicator === undefined) return

        indicator.delete()
        this.indicators.delete(_id)
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

    create_line(point1: SingleValueData, point2: SingleValueData) {
        const trend = new TrendLine(point1, point2);
        this.primitive_right.attachPrimitive(trend);
    }


    fitcontent() { this.chart.timeScale().fitContent() }
    autoscale_time_axis() { this.chart.timeScale().resetTimeScale() }
    update_timescale_opts(newOpts: DeepPartial<HorzScaleOptions>) { this.chart.timeScale().applyOptions(newOpts) }
}