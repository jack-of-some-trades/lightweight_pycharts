import * as lwc from "lightweight-charts";
import { createChart, DeepPartial as DP, IChartApi, SingleValueData, WhitespaceData } from "lightweight-charts";
import { Accessor, createSignal, JSX, Setter } from "solid-js";
import { ChartPane } from "../../components/charting_frame/chart_elements";
import * as u from "../types";
import { indicator } from "./indicator";
import { PrimitiveBase } from "./lwpc-plugins/primitive-base";
import { primitives } from "./lwpc-plugins/primitives";


//The portion of a chart where things are actually drawn
export class pane {
    static _special_id_ = 'main' // Must match Python Pane Special ID

    id: string = ''
    element: JSX.Element
    div: Accessor<HTMLDivElement>

    active: Accessor<boolean>
    setActive: Setter<boolean>

    chart: IChartApi
    private primitives_left = new Map<string, PrimitiveBase>()
    private primitives_right = new Map<string, PrimitiveBase>()
    private primitives_overlay = new Map<string, PrimitiveBase>()

    primitive_left: u.LineSeries
    primitive_right: u.LineSeries
    primitive_overlay: u.LineSeries
    whitespace_series: u.LineSeries
    private chart_div: HTMLDivElement

    // Reference to Indicators on the Pane used to construct the Pane's Legend
    private indicators: Accessor<indicator[]>
    private setIndicators: Setter<indicator[]>

    constructor(id: string) {
        this.id = id

        const [active, setActive] = createSignal<boolean>(false)
        this.active = active; this.setActive = setActive

        const [div, setDiv] = createSignal<HTMLDivElement>(document.createElement('div'))
        this.div = div

        let tmp_div = document.createElement('div')
        //Only One Chart per pane, so this is the only definition needed
        const OPTS = DEFAULT_PYCHART_OPTS()
        this.chart = createChart(tmp_div, OPTS);
        this.chart_div = this.chart.chartElement()

        //A List of Ids is redundant, but it genereates a reactive update to be used by the pane Legend
        const indicatorSignal = createSignal<indicator[]>([])
        this.indicators = indicatorSignal[0]
        this.setIndicators = indicatorSignal[1]
        
        const legend_props = {
            parent_pane:this,
            indicators_list:this.indicators
        }
        this.element = ChartPane({
            ref:setDiv,
            chart_el:this.chart_div,
            legend_props:legend_props
        })


        //Create Logscale Toggle Button
        // const Box = this.chart_div.querySelector("table > tr:nth-child(2) > td:nth-child(3) > div") as HTMLDivElement
        // if (this.chart.options().rightPriceScale.visible){
        //     const showLogBtn = createSignal<boolean>(false)
        //     const logScale = createSignal<number>(OPTS.rightPriceScale?.mode ?? 0)
        //     createEffect(() => {this.update_opts({rightPriceScale:{mode:logScale[0]()}})})

        //     this.derender_logButton = render(() => scale_toggle({
        //         class:"scale_toggle_right", show:showLogBtn[0], scale:logScale
        //     }), this.div)
        //     Box.addEventListener('mouseenter', ()=>showLogBtn[1](true))
        //     Box.addEventListener('mouseleave', ()=>showLogBtn[1](false))
        //     Box.addEventListener('click', (e) => {if(e.button === 0) logScale[1](logScale[0]() == 1? 0 : 1)})
        // }

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
            window.active_pane.setActive(false)

        window.active_pane = this
        this.setActive(true)
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

    attach_indicator_to_legend(indicator:indicator) {
        if (!this.indicators().includes(indicator)) 
            this.setIndicators([...this.indicators(), indicator])
    }

    detach_indicator_from_legend(indicator:indicator) {
        this.setIndicators(
            this.indicators().filter((a_ind) => a_ind !== indicator)
        )
    }

    /* Create then add a primitive from known object parameters */
    protected add_primitive(_id: string, _type: string, params:object) {
        let primitive_type = primitives.get(_type)
        if (primitive_type === undefined) return
        let new_obj = new primitive_type(_id, params)

        new_obj._pane = this
        this.primitives_right.set(_id, new_obj)
        this.primitive_right.attachPrimitive(new_obj)
    }

    protected update_primitive(_id: string, params:object) {
        let _obj = this.primitives_right.get(_id)
        if (_obj === undefined) return
        _obj.updateData(params)
    }

    /* Attach a primitive that is already constructed. */
    attach_primitive(obj:PrimitiveBase){
        const primitive_ids = Object.keys(this.primitives_right)
        const new_id = u.makeid(primitive_ids, 'p_')

        // TODO : Reassess the fact that the js_id is not constant here. This is the only location (currently)
        // where it isn't constant. That breaks an unspoken rule to allow primitives to easily transfer
        // from one series to another avoiding collisions. That should probably change and instead an entirely
        // new Primititive with the same options should be created
        obj._id = new_id
        obj._pane = this
        this.primitives_right.set(new_id, obj)
        this.primitive_right.attachPrimitive(obj)
    }

    remove_primitive(_id: string) {
        let _obj = this.primitives_right.get(_id)
        if (_obj === undefined) return

        this.primitive_right.detachPrimitive(_obj) 
        this.primitives_right.delete(_id)
    }

    resize(){this.chart.resize(Math.max(this.div().clientWidth-2, 0), Math.max(this.div().clientHeight-2, 0), false)}

    fitcontent() { this.chart.timeScale().fitContent() }
    autoscale_time_axis() { this.chart.timeScale().resetTimeScale() }
    update_opts(newOpts: DP<lwc.TimeChartOptions>) { this.chart.applyOptions(newOpts) }
    update_timescale_opts(newOpts: DP<lwc.HorzScaleOptions>) { this.chart.timeScale().applyOptions(newOpts) }
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


/* Default TimeChart Options. It's a Function so the style is Evaluated at pane construction */
function DEFAULT_PYCHART_OPTS(){
    const style = getComputedStyle(document.documentElement)
    console.log(style.getPropertyValue("--chart-tv-logo"))
    const OPTS: DP<lwc.TimeChartOptions> = {
        layout: {                   // ---- Layout Options ----
            background: {
                type: lwc.ColorType.VerticalGradient,
                topColor: style.getPropertyValue("--chart-bg-color-top"),
                bottomColor: style.getPropertyValue("--chart-bg-color-bottom")
            },
            textColor: style.getPropertyValue("--chart-text-color"),
            attributionLogo: style.getPropertyValue("--chart-tv-logo") === 'true'
        },
        grid: {
            vertLines: {
                color: style.getPropertyValue("--chart-grid")
            },
            horzLines: {
                color: style.getPropertyValue("--chart-grid")
            }
        },
        leftPriceScale: {          // ---- VisiblePriceScaleOptions ---- 
            mode: parseInt(style.getPropertyValue("--chart-scale-mode-left")),
            // borderColor: style.getPropertyValue("--chart-axis-border"),
        },
        rightPriceScale: {          // ---- VisiblePriceScaleOptions ---- 
            mode: parseInt(style.getPropertyValue("--chart-scale-mode-right")),
            // borderColor: style.getPropertyValue("--chart-axis-border"),
        },
        crosshair: {                // ---- Crosshair Options ---- 
            mode: parseInt(style.getPropertyValue("--chart-xhair-mode")),
        },
        kineticScroll: {            // ---- Kinetic Scroll ---- 
            touch: true
        },
        timeScale: {
            shiftVisibleRangeOnNewBar: true,
            allowShiftVisibleRangeOnWhitespaceReplacement: true,
            rightBarStaysOnScroll: true,
            rightOffset: parseInt(style.getPropertyValue("--chart-right-offset"))
        }
    }
    return OPTS
}
