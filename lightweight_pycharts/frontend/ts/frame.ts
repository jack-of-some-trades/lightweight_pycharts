import { WhitespaceData } from "./lib/pkg.js";
import { Pane } from "./pane.js";
import { Series_Type, symbol_item, tf } from "./util.js";

/**
 * @member Div: Div That Contains Pane's and pane seprators.
 */
export class Frame {
    //The class that contains all the data to be displayed
    id: string
    div: HTMLDivElement
    tab_div: HTMLDivElement

    timeframe: tf
    symbol: symbol_item
    series_type: Series_Type

    private panes: Pane[] = []
    private main_pane: Pane | undefined = undefined

    constructor(id: string, div: HTMLDivElement, tab_div: HTMLDivElement) {
        this.id = id
        this.div = div
        this.tab_div = tab_div

        // The following 3 variables are actually properties of a frame's primary Series(Indicator) obj.
        // While these really should be owned by an indicator and not a frame, this is how the 
        // implementation will stay until when/if indicator sub-types have their own classes in typescript.
        this.symbol = { ticker: 'LWPC' }
        this.timeframe = new tf(1, 'D')
        this.series_type = Series_Type.CANDLESTICK

        //Add Active Frame Listener
        this.div.addEventListener('mousedown', this.assign_active_frame.bind(this))
    }

    /**
     * Update Global 'active_frame' reference to this instance. 
     */
    assign_active_frame() {
        if (window.active_frame)
            window.active_frame.div.removeAttribute('active')

        //Set Attributes
        window.active_frame = this
        window.active_frame.div.setAttribute('active', '')
        if (this.panes[0])
            this.panes[0].assign_active_pane()

        //Update Window Elements
        window.topbar.series_select.update_icon(this.series_type)
        window.topbar.tf_select.update_icon(this.timeframe)
        window.topbar.set_symbol_search_text(this.symbol.ticker)
        window.titlebar.tab_manager.updateTab(this.tab_div, { title: this.symbol.ticker })
    }

    /**
     * Reassigns the Frame's Div and re-appends all the Frame's children to this Div.
     * @param div The new Div Element for the Frame
     */
    reassign_div(div: HTMLDivElement) {
        this.div = div
        if (this.main_pane !== undefined)
            this.div.appendChild(this.main_pane.div)
        this.panes.forEach(pane => {
            this.div.appendChild(pane.div)
        });

        //Update Active Frame Listener
        this.div.addEventListener('mousedown', this.assign_active_frame.bind(this))
    }

    // #region -------------- Python API Functions ------------------ //

    protected set_whitespace_data(data: WhitespaceData[]) {
        this.main_pane?.set_whitespace_data(data)
        this.panes.forEach(pane => { pane.set_whitespace_data(data) })
    }

    protected update_whitespace_data(data: WhitespaceData) {
        this.main_pane?.update_whitespace_data(data)
        this.panes.forEach(pane => { pane.update_whitespace_data(data) })
    }

    protected set_symbol(new_symbol: symbol_item) {
        this.symbol = new_symbol
        window.titlebar.tab_manager.updateTab(this.tab_div, { title: this.symbol.ticker })
        if (this == window.active_frame)
            window.topbar.set_symbol_search_text(this.symbol.ticker)
    }

    protected set_timeframe(new_tf_str: string) {
        this.timeframe = tf.from_str(new_tf_str)
        if (this == window.active_frame)
            window.topbar.tf_select.update_icon(this.timeframe)

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
            window.topbar.series_select.update_icon(this.series_type)
    }

    protected add_pane(id: string): Pane {
        let child_div = document.createElement('div')
        child_div.classList.add('chart_pane')
        this.div.appendChild(child_div)

        let new_pane = new Pane(id, child_div)

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
        let this_width = this.div.clientWidth - 2
        let this_height = this.div.clientHeight - 2

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