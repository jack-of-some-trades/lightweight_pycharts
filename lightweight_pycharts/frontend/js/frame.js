import { Pane } from "./pane.js";
import { Series_Type, tf } from "./util.js";
export class Frame {
    constructor(id, div, tab_div) {
        this.panes = [];
        this.main_pane = undefined;
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
        if (this.main_pane !== undefined)
            this.div.appendChild(this.main_pane.div);
        this.panes.forEach(pane => {
            this.div.appendChild(pane.div);
        });
        this.div.addEventListener('mousedown', this.assign_active_frame.bind(this));
    }
    set_whitespace_data(data, Primitive_data) {
        var _a;
        if (Primitive_data === undefined)
            Primitive_data = { time: '1970-01-01', value: 0 };
        (_a = this.main_pane) === null || _a === void 0 ? void 0 : _a.set_whitespace_data(data, Primitive_data);
        this.panes.forEach(pane => { pane.set_whitespace_data(data, Primitive_data); });
    }
    update_whitespace_data(data, Primitive_data) {
        var _a;
        (_a = this.main_pane) === null || _a === void 0 ? void 0 : _a.update_whitespace_data(data, Primitive_data);
        this.panes.forEach(pane => { pane.update_whitespace_data(data, Primitive_data); });
    }
    set_symbol(new_symbol) {
        this.symbol = new_symbol;
        window.titlebar.tab_manager.updateTab(this.tab_div, { title: this.symbol.ticker });
        if (this == window.active_frame)
            window.topbar.set_symbol_search_text(this.symbol.ticker);
    }
    set_timeframe(new_tf_str) {
        var _a;
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
        (_a = this.main_pane) === null || _a === void 0 ? void 0 : _a.update_timescale_opts(newOpts);
        this.panes.forEach(pane => { pane.update_timescale_opts(newOpts); });
    }
    set_series_type(new_type) {
        this.series_type = new_type;
        if (this == window.active_frame)
            window.topbar.series_select.update_icon(this.series_type);
    }
    add_pane(id) {
        let child_div = document.createElement('div');
        child_div.classList.add('chart_pane');
        this.div.appendChild(child_div);
        let new_pane = new Pane(id, child_div);
        if (this.main_pane === undefined)
            this.main_pane = new_pane;
        else
            this.panes.push(new_pane);
        this.resize();
        return new_pane;
    }
    resize() {
        var _a;
        let this_width = this.div.clientWidth - 2;
        let this_height = this.div.clientHeight - 2;
        (_a = this.main_pane) === null || _a === void 0 ? void 0 : _a.resize(this_width, this_height);
        this.panes.forEach(pane => {
            pane.resize(this_width, this_height);
        });
    }
    fitcontent() {
        var _a;
        (_a = this.main_pane) === null || _a === void 0 ? void 0 : _a.fitcontent();
        this.panes.forEach(pane => {
            pane.fitcontent();
        });
    }
    autoscale_content() {
        var _a;
        (_a = this.main_pane) === null || _a === void 0 ? void 0 : _a.autoscale_time_axis();
        this.panes.forEach(pane => {
            pane.autoscale_time_axis();
        });
    }
}
