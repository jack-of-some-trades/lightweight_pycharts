import { SingleValueData, WhitespaceData } from "lightweight-charts";
import { Accessor, createSignal, JSX, Setter } from "solid-js";
import { ChartFrame } from "../components/frame_widgets/chart_frames/chart_elements";
import { layout_display } from "../components/layout/layouts";
import { update_tab_func } from "./container";
import { indicator } from "./indicator";
import { Container_Layouts, flex_frame, layout_switch, num_frames, Orientation, resize_sections } from "./layouts";
import { pane } from "./pane";
import { Series_Type, symbol_item, tf } from "./types";

export abstract class frame {
    id: string
    update_tab: update_tab_func
    element: HTMLDivElement | JSX.Element | undefined
    // While you can use a Vanilla JS Div Element, you probably don't want to.
    // Reactivity w/ Signals and Effects defined in the original render tree will break.

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


export interface data_src {
    indicator:indicator
    function_name:string
    source_type:string
}

export class chart_frame extends frame {
    div: Accessor<HTMLDivElement>
    element: JSX.Element

    timeframe: tf
    symbol: symbol_item
    series_type: Series_Type
    indicators = new Map<string, indicator>()
    sources: Accessor<data_src[]>
    setSources: Setter<data_src[]>

    style_sel: string
    layout: Container_Layouts | undefined
    
    //Multi-Pane Layout Controls
    setStyle: Setter<string>
    setDisplays: Setter<layout_display[]>

    private panes: pane[] = []
    private flex_panes: flex_frame[] = []

    constructor(id: string, tab_update_func: update_tab_func) {
        super(id, tab_update_func)
        
        const [style, setStyle] = createSignal<string>('')
        const [displays, setDisplays] = createSignal<layout_display[]>([])
        const [div, setDiv] = createSignal<HTMLDivElement>(document.createElement('div'))

        const sourceSignal = createSignal<data_src[]>([])
        this.sources = sourceSignal[0]
        this.setSources = sourceSignal[1]

        this.div = div
        this.setStyle = setStyle
        this.setDisplays = setDisplays

        this.style_sel = id.substring(7) + "_pane"
        this.element = ChartFrame({
            ref:setDiv,
            innerStyle: style,
            displays: displays,
            style_sel:this.style_sel,
        })

        // The following 3 variables are actually properties of a frame's primary Series(Indicator) obj.
        // While these really should be owned by that Series indicator and not a frame, this is how the 
        // implementation will stay until when/if indicator sub-types have their own classes in typescript.
        this.symbol = { ticker: 'LWPC' }
        this.timeframe = new tf(1, 'D')
        this.series_type = Series_Type.CANDLESTICK
    }

    onActivation() {
        //Update Window Elements
        this.update_tab(this.symbol.ticker)
        window.topbar.setSeries(this.series_type)
        window.topbar.setTimeframe(this.timeframe)
        window.topbar.setTicker(this.symbol.ticker)
    }

    // #region -------------- Python API Functions ------------------ //

    protected set_whitespace_data(data: WhitespaceData[], Primitive_data:SingleValueData) {
        if (Primitive_data === undefined) Primitive_data = {time:'1970-01-01', value:0}
        this.panes.forEach(pane => { pane.set_whitespace_data(data, Primitive_data) })
    }

    protected update_whitespace_data(data: WhitespaceData, Primitive_data:SingleValueData) {
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

        this.panes.forEach(pane => { pane.update_timescale_opts(newOpts) });
    }

    protected set_series_type(new_type: Series_Type) {
        this.series_type = new_type
        if (this == window.active_frame)
            window.topbar.setSeries(this.series_type)
    }

    protected add_pane(id: string): pane {
        let new_pane = new pane(id)
        this.panes.push(new_pane)
        if (this.layout === undefined) this.set_layout(Container_Layouts.SINGLE)
        return new_pane
    }

    
    protected create_indicator(
        _id: string, 
        outputs:{[key:string]:string}, 
        type: string, 
        name: string, 
        pane:pane
    ) {
        let new_indicator = new indicator(_id, type, name, this.sources, pane)
        this.indicators.set(_id, new_indicator)

        // Push all the sources from this indicator onto the sources list
        let tmp_array = []
        for (const [key, value] of Object.entries(outputs))
            tmp_array.push({
                indicator:new_indicator,
                function_name:key,
                source_type:value
            })
        this.setSources([...this.sources(), ...tmp_array])
    }

    protected delete_indicator(_id: string) {
        let indicator = this.indicators.get(_id)
        if (indicator === undefined) return

        indicator.delete()
        this.indicators.delete(_id)
        //Remove all the linkable sources from this indicator
        this.setSources(this.sources().filter((src) => src.indicator !== indicator ))
    }


    // #endregion


    // #region -------------- Layout Control and Resize Functions ------------------ //

    // TODO: Find some way to call this so the layout can actually change
    protected set_layout(layout: Container_Layouts) {
        this.flex_panes = layout_switch(layout, ()=>this.div().getBoundingClientRect(), this.resize.bind(this))
        let layout_displays:layout_display[] = []
        let pane_ind = 0

        this.flex_panes.forEach((flex_pane) => {
            if (flex_pane.orientation === Orientation.null) { // Frame Object
                if (pane_ind < this.panes.length) {
                    let pane = this.panes[pane_ind]
                    layout_displays.push({
                        orientation: flex_pane.orientation, 
                        mouseDown: pane.assign_active_pane.bind(pane),
                        element:pane.element,
                        el_active:pane.active, 
                        el_target:()=>false
                    })
                } else throw new Error("Not Enough Panes to change to the desired layout")
                pane_ind += 1
                //frame_ind tracks the equivelent frames[] index based on
                //how many chart frames have be observed in the flex_frames[] loop
            } else {                                            // Separator Object
                layout_displays.push({
                    orientation:flex_pane.orientation,
                    mouseDown:flex_pane.mouseDown,
                    element:undefined,
                    el_active:()=>false, 
                    el_target:()=>false
                })
            }
        })

        this.layout = layout
        this.setDisplays(layout_displays)

        //Calculate the flex_frame rect sizes, and set them to the Display Signal
        this.resize()
    }

    resize() {
        // Calculate the new sizes of all the frames
        resize_sections(()=>this.div().getBoundingClientRect(), this.flex_panes)

        // Put all the resizing info into a style tag. Long-story short, putting this info into
        // a reactive 'style' tag for each JSX.Element div is a damn pain.
        let style = ""
        this.flex_panes.forEach((pane, i)=>{
            style += `
            div.${this.style_sel}:nth-child(${i+2})${pane.style}`
        })
        this.setStyle(style)

        // Resize all contents of each *visible* Frames
        for (let i = 0; i < num_frames(this.layout); i++)
            this.panes[i].resize()
    }

    // #endregion

    fitcontent() {
        this.panes[0]?.fitcontent()
        this.panes.forEach(pane => {
            pane.fitcontent()
        });
    }

    autoscale_content() {
        this.panes[0]?.autoscale_time_axis()
        this.panes.forEach(pane => {
            pane.autoscale_time_axis()
        });
    }

}