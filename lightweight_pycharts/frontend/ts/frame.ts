import { AnySeriesData } from "./lib/pkg.js";
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

    constructor(id: string, div: HTMLDivElement, tab_div: HTMLDivElement) {
        this.id = id
        this.div = div
        this.tab_div = tab_div

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
        this.panes.forEach(pane => {
            this.div.appendChild(pane.div)
        });

        //Update Active Frame Listener
        this.div.addEventListener('mousedown', this.assign_active_frame.bind(this))
    }

    // #region -------------- Python API Functions ------------------ //

    protected set_data(data: AnySeriesData[]) {
        if (this.panes[0])
            this.panes[0].set_main_data(data)
        if (this == window.active_frame) {
            window.titlebar.tab_manager.updateTab(this.tab_div, { title: this.symbol.ticker })
            window.topbar.tf_select.update_icon(this.timeframe)
        }
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
        this.panes.forEach(pane => { pane.update_timescale_opts(newOpts) });
    }

    protected set_series_type(new_type: Series_Type, data: AnySeriesData) {
        //Type Checking and Error Prevention done in python, blindly follow directions
        this.panes[0].set_main_series(new_type, data)

        this.series_type = new_type
        if (this == window.active_frame)
            window.topbar.series_select.update_icon(this.series_type)
    }

    protected add_pane(id: string = ''): Pane {
        let child_div = document.createElement('div')
        child_div.classList.add('chart_pane')
        this.div.appendChild(child_div)

        let new_pane = new Pane(id, child_div)
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

        this.panes.forEach(pane => {
            pane.resize(this_width, this_height)
        });
    }

    fitcontent() {
        this.panes.forEach(pane => {
            pane.fitcontent()
        });
    }

    autoscale_content() {
        this.panes.forEach(pane => {
            pane.autoscale_time_axis()
        });
    }

}