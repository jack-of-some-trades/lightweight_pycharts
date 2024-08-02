import { SingleValueData, WhitespaceData } from "lightweight-charts";
import { Accessor, createSignal, JSX, Setter } from "solid-js";
import { update_tab_func } from "./container";
import { pane } from "./pane";
import { Series_Type, symbol_item, tf } from "./types";

export abstract class frame {
    id: string
    update_tab: update_tab_func
    element: HTMLDivElement | JSX.Element | undefined

    active: Accessor<boolean>
    setActive: Setter<boolean>
    target: Accessor<boolean>
    setTarget: Setter<boolean>

    timeframe: tf | undefined = undefined
    symbol: symbol_item | undefined = undefined

    constructor(id: string, tab_update_func: update_tab_func) {
        this.id = id
        this.update_tab = tab_update_func

        //Used to Control Active & Target Attributes
        const [target, setTarget] = createSignal<boolean>(false)
        this.target = target; this.setTarget = setTarget
        const [active, setActive] = createSignal<boolean>(false)
        this.active = active; this.setActive = setActive
    }

    resize(){}
    onShow(){}//{console.log(`Show ${this.id}`)}
    onHide(){}//{console.log(`Hide ${this.id}`)}
    onActivation(){}//{console.log(`Activate ${this.id}`)}
    onDeactivation(){}//{console.log(`Deactivate ${this.id}`)}

    /**
     * Update Global 'active_frame' reference to this instance. 
     */
    assign_active_frame() {
        if (window.active_frame === this) return
        //Deactive old Window
        if (window.active_frame){
            window.active_frame.setActive(false)
            window.active_frame.onDeactivation()
        }

        //Activate new Window
        window.active_frame = this
        this.setActive(true)
        this.onActivation()
    }
}


export class chart_frame extends frame {
    element: HTMLDivElement

    timeframe: tf
    symbol: symbol_item
    series_type: Series_Type

    private panes: pane[] = []
    private main_pane: pane | undefined = undefined

    constructor(id: string, tab_update_func: update_tab_func) {
        super(id, tab_update_func)
        this.element = document.createElement('div')
        this.element.classList.add("chart_frame")

        // The following 3 variables are actually properties of a frame's primary Series(Indicator) obj.
        // While these really should be owned by an indicator and not a frame, this is how the 
        // implementation will stay until when/if indicator sub-types have their own classes in typescript.
        this.symbol = { ticker: 'LWPC' }
        this.timeframe = new tf(1, 'D')
        this.series_type = Series_Type.CANDLESTICK
    }

    onActivation() {
        if (this.panes[0])
            this.panes[0].assign_active_pane()

        //Update Window Elements
        this.update_tab(this.symbol.ticker)
        window.topbar.setSeries(this.series_type)
        window.topbar.setTimeframe(this.timeframe)
        window.topbar.setTicker(this.symbol.ticker)
    }

    // #region -------------- Python API Functions ------------------ //

    protected set_whitespace_data(data: WhitespaceData[], Primitive_data:SingleValueData) {
        if (Primitive_data === undefined) Primitive_data = {time:'1970-01-01', value:0}
        this.main_pane?.set_whitespace_data(data, Primitive_data)
        this.panes.forEach(pane => { pane.set_whitespace_data(data, Primitive_data) })
    }

    protected update_whitespace_data(data: WhitespaceData, Primitive_data:SingleValueData) {
        this.main_pane?.update_whitespace_data(data, Primitive_data)
        this.panes.forEach(pane => { pane.update_whitespace_data(data, Primitive_data) })
    }

    protected set_symbol(new_symbol: symbol_item) {
        this.symbol = new_symbol
        this.update_tab(this.symbol.ticker)
        if (this == window.active_frame)
            window.topbar.setTicker(this.symbol.ticker)
    }

    protected set_timeframe(new_tf_str: string) {
        this.timeframe = tf.from_str(new_tf_str)
        if (this == window.active_frame)
            window.topbar.setTimeframe(this.timeframe)

        //Update the Timeaxis to Show/Hide relevant timestamp
        let newOpts = { timeVisible: false, secondsVisible: false }
        if (this.timeframe.period === 's') {
            newOpts.timeVisible = true
            newOpts.secondsVisible = true
        } else if (this.timeframe.period === 'm' || this.timeframe.period === 'h') {
            newOpts.timeVisible = true
        }

        this.main_pane?.update_timescale_opts(newOpts)
        this.panes.forEach(pane => { pane.update_timescale_opts(newOpts) });
    }

    protected set_series_type(new_type: Series_Type) {
        this.series_type = new_type
        if (this == window.active_frame)
            window.topbar.setSeries(this.series_type)
    }

    protected add_pane(id: string): pane {
        let child_div = document.createElement('div')
        child_div.classList.add('chart_pane')
        this.element.appendChild(child_div)

        let new_pane = new pane(id, child_div)

        if (this.main_pane === undefined)
            //This should be the pane w/ ID '*_p_main'
            //Assuming this.main_pane is never overwritten or deleted, it will be.
            this.main_pane = new_pane
        else
            this.panes.push(new_pane)

        this.resize()
        return new_pane
    }

    // #endregion

    resize() {
        // -2 accounts for... uhh... the chart border? idk man.
        // Without it the 'active_frame' grey chart border is hidden behind the chart
        // and the 'active_pane' accent color border
        let this_width = this.element.clientWidth - 2
        let this_height = this.element.clientHeight - 2

        this.main_pane?.resize(this_width, this_height)
        this.panes.forEach(pane => {
            pane.resize(this_width, this_height)
        });
    }

    fitcontent() {
        this.main_pane?.fitcontent()
        this.panes.forEach(pane => {
            pane.fitcontent()
        });
    }

    autoscale_content() {
        this.main_pane?.autoscale_time_axis()
        this.panes.forEach(pane => {
            pane.autoscale_time_axis()
        });
    }

}