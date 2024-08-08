import * as lwc from "lightweight-charts";
import { DeepPartial as DP, DeepPartial, HorzScaleOptions, IChartApi, SingleValueData, TimeChartOptions, WhitespaceData, createChart } from "lightweight-charts";
import { createSignal } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import { render } from "solid-js/web";
import { PaneLegend } from "../components/frame_widgets/chart_frames/pane_legend";
import { indicator } from "./indicator";
import { PrimitiveBase } from "./lwpc-plugins/primitive-base";
import { primitives } from "./lwpc-plugins/primitives";
import { TrendLine } from "./lwpc-plugins/trend-line/trend-line";
import * as u from "./types";


//The portion of a chart where things are actually drawn
export class pane {
    static _special_id_ = 'main' // Must match Python Pane Special ID

    id: string = ''
    div: HTMLDivElement

    chart: IChartApi
    indicators = new Map<string, indicator>()
    private primitives_left = new Map<string, PrimitiveBase>()
    private primitives_right = new Map<string, PrimitiveBase>()
    private primitives_overlay = new Map<string, PrimitiveBase>()

    primitive_left: u.LineSeries
    primitive_right: u.LineSeries
    primitive_overlay: u.LineSeries
    whitespace_series: u.LineSeries
    private chart_div: HTMLDivElement

    // TSX Element vars
    private setIndicatorIds: SetStoreFunction<string[]>
    private derender_legend: () => void

    constructor(
        id: string,
        div: HTMLDivElement,
        chart_opts: DP<TimeChartOptions> = DEFAULT_PYCHART_OPTS
    ) {
        this.id = id
        this.div = div

        //Only One Chart per pane, so this is the only definition needed
        this.chart = createChart(this.div, chart_opts);
        this.chart_div = this.chart.chartElement()

        const [indicatorIds, setIndicatorIds] = createSignal<string[]>([])
        this.setIndicatorIds = setIndicatorIds
        //Add Legend
        const legend_props = {
            parent_pane:this,
            indicators_list:indicatorIds
        }
        this.derender_legend = render(() => PaneLegend(legend_props), this.div)

        this.whitespace_series = this.chart.addLineSeries()
        //Add Blank Series that primtives can be attached to
        this.primitive_left = this.chart.addLineSeries({ priceScaleId: 'left', visible: false, autoscaleInfoProvider: undefined })
        this.primitive_right = this.chart.addLineSeries({ priceScaleId: 'right', visible: false, autoscaleInfoProvider: undefined })
        this.primitive_overlay = this.chart.addLineSeries({
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

        // These listeners allow smooth chart dragging in a replay like mode
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

    set_whitespace_data(data: WhitespaceData[], primitive_data:SingleValueData) {
        this.whitespace_series.setData(data)
        this.primitive_left.setData([primitive_data])
        this.primitive_right.setData([primitive_data])
        this.primitive_overlay.setData([primitive_data])
    }

    update_whitespace_data(data: WhitespaceData, primitive_data:SingleValueData) {
        this.whitespace_series.update(data)
        this.primitive_left.setData([primitive_data])
        this.primitive_right.setData([primitive_data])
        this.primitive_overlay.setData([primitive_data])
    }

    protected add_indicator(_id: string, type: string, menu_struct={}, options={}) {
        this.indicators.set(_id, new indicator(_id, type, this, menu_struct, options))
        this.setIndicatorIds([...this.indicators.keys()])
    }

    protected remove_indicator(_id: string) {
        let indicator = this.indicators.get(_id)
        if (indicator === undefined) return

        indicator.delete()
        this.indicators.delete(_id)
        this.setIndicatorIds([...this.indicators.keys()])
    }

    protected add_primitive(_id: string, _type: string, params:object) {
        let primitive_type = primitives.get(_type)
        if (primitive_type === undefined) return
        let new_obj = new primitive_type(params)

        this.primitives_right.set(_id, new_obj)
        this.primitive_right.attachPrimitive(new_obj)
    }

    protected remove_primitive(_id: string) {
        let _obj = this.primitives_right.get(_id)
        if (_obj === undefined) return

        this.primitive_right.detachPrimitive(_obj) 
        this.primitives_right.delete(_id)
    }

    protected update_primitive(_id: string, params:object) {
        let _obj = this.primitives_right.get(_id)
        if (_obj === undefined) return
        _obj.updateData(params)
    }

    resize() {
        this.chart.resize(this.div.clientWidth, this.div.clientHeight, false)
    }

    create_line(point1: SingleValueData, point2: SingleValueData) {
        const trend = new TrendLine({p1:point1, p2:point2});
        this.primitive_right.attachPrimitive(trend);
    }

    fitcontent() { this.chart.timeScale().fitContent() }
    autoscale_time_axis() { this.chart.timeScale().resetTimeScale() }
    update_timescale_opts(newOpts: DeepPartial<HorzScaleOptions>) { this.chart.timeScale().applyOptions(newOpts) }
}


/** Important Note about the Primitive [Left / Right / Overlay] Series
 * 
 * These are blank series that only contain Primitives as the name would imply. For them to display anything
 * they need at least 1 data-point with a value and a time that is either on screen or in the future. 
 * If they are only whitespace then they are not rendered. Similarly, if their only data is off screen *in the 
 * past* then they are not rendered. Because of this they each carry 1 data-point the is {time: ****, value:0}
 * where the time is always the Current bar time of the main series. Any further in the past and things may
 * de-render. Any further in the Future and it will mess up auto-scroll on new data.
 */


/* Default TimeChart Options. */
const DEFAULT_PYCHART_OPTS: DP<lwc.TimeChartOptions> = {
    layout: {                   // ---- Layout Options ----
        background: {
            type: lwc.ColorType.VerticalGradient,
            topColor: '#171c27',
            bottomColor: '#131722'
        },
        textColor: '#b2b5be',
    },
    grid: {
        vertLines: {
            color: '#222631'
        },
        horzLines: {
            color: '#222631'
        }
    },
    rightPriceScale: {          // ---- VisiblePriceScaleOptions ---- 
        mode: lwc.PriceScaleMode.Logarithmic,
        // borderColor: '#161a25',
    },
    crosshair: {                // ---- Crosshair Options ---- 
        mode: lwc.CrosshairMode.Normal,
    },
    kineticScroll: {            // ---- Kinetic Scroll ---- 
        touch: true
    },
    timeScale: {
        shiftVisibleRangeOnNewBar: true,
        allowShiftVisibleRangeOnWhitespaceReplacement: true,
        rightBarStaysOnScroll: true,
        rightOffset: 20
    }
}
