import { Pane } from "./pane.js";
import { Series_Type, tf } from "./util.js";
export class Frame {
    constructor(id, div, tab_div) {
        this.panes = [];
        this.id = id;
        this.div = div;
        this.tab_div = tab_div;
        this.symbol = { ticker: 'LWPC' };
        this.timeframe = new tf(1, 'D');
        this.series_type = Series_Type.CANDLESTICK;
        this.div.addEventListener('mousedown', this.assign_active_frame.bind(this));
    }
    assign_active_frame() {
        if (window.active_frame)
            window.active_frame.div.removeAttribute('active');
        window.active_frame = this;
        window.active_frame.div.setAttribute('active', '');
        if (this.panes[0])
            this.panes[0].assign_active_pane();
        window.topbar.series_select.update_icon(this.series_type);
        window.topbar.tf_select.update_icon(this.timeframe);
        window.topbar.set_symbol_search_text(this.symbol.ticker);
        window.titlebar.tab_manager.updateTab(this.tab_div, { title: this.symbol.ticker });
    }
    reassign_div(div) {
        this.div = div;
        this.panes.forEach(pane => {
            this.div.appendChild(pane.div);
        });
        this.div.addEventListener('mousedown', this.assign_active_frame.bind(this));
    }
    set_data(data) {
        if (this.panes[0])
            this.panes[0].set_main_data(data);
        if (this == window.active_frame) {
            window.titlebar.tab_manager.updateTab(this.tab_div, { title: this.symbol.ticker });
            window.topbar.tf_select.update_icon(this.timeframe);
        }
    }
    set_symbol(new_symbol) {
        this.symbol = new_symbol;
        window.titlebar.tab_manager.updateTab(this.tab_div, { title: this.symbol.ticker });
        if (this == window.active_frame)
            window.topbar.set_symbol_search_text(this.symbol.ticker);
    }
    set_timeframe(new_tf_str) {
        this.timeframe = tf.from_str(new_tf_str);
        if (this == window.active_frame)
            window.topbar.tf_select.update_icon(this.timeframe);
        let newOpts = { timeVisible: false, secondsVisible: false };
        if (this.timeframe.period === 's') {
            newOpts.timeVisible = true;
            newOpts.secondsVisible = true;
        }
        else if (this.timeframe.period === 'm' || this.timeframe.period === 'h') {
            newOpts.timeVisible = true;
        }
        this.panes.forEach(pane => { pane.update_timescale_opts(newOpts); });
    }
    set_series_type(new_type, data) {
        this.panes[0].set_main_series(new_type, data);
        this.series_type = new_type;
        if (this == window.active_frame)
            window.topbar.series_select.update_icon(this.series_type);
    }
    add_pane(id = '') {
        let child_div = document.createElement('div');
        child_div.classList.add('chart_pane');
        this.div.appendChild(child_div);
        let new_pane = new Pane(id, child_div);
        this.panes.push(new_pane);
        this.resize();
        return new_pane;
    }
    resize() {
        let this_width = this.div.clientWidth - 2;
        let this_height = this.div.clientHeight - 2;
        this.panes.forEach(pane => {
            pane.resize(this_width, this_height);
        });
    }
    fitcontent() {
        this.panes.forEach(pane => {
            pane.fitcontent();
        });
    }
    autoscale_content() {
        this.panes.forEach(pane => {
            pane.autoscale_time_axis();
        });
    }
}
