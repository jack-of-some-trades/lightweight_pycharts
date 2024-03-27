import * as lwc from "../js/pkg.mjs";
import * as u from "./util.js";
import { Container_Layouts, Orientation, Wrapper_Divs } from "./util.js";
export class Wrapper {
    constructor() {
        this.containers = [];
        this.div = document.createElement('div');
        this.div.id = 'layout_wrapper';
        this.div.classList.add('wrapper');
        document.body.appendChild(this.div);
        this.div_top = document.createElement('div');
        this.div_top.id = 'layout_top';
        this.div_top.classList.add('layout_main');
        this.div_top.style.height = `${u.LAYOUT_DIM_TOP.HEIGHT}px`;
        this.div_top.style.width = u.LAYOUT_DIM_TOP.WIDTH;
        this.div_top.style.left = `${u.LAYOUT_DIM_TOP.LEFT}px`;
        this.div_top.style.top = `${u.LAYOUT_DIM_TOP.TOP}px`;
        this.div_top.style.display = 'flex';
        this.div.appendChild(this.div_top);
        this.div_left = document.createElement('div');
        this.div_left.id = 'layout_left';
        this.div_left.classList.add('layout_main');
        this.div_left.style.height = `${u.LAYOUT_DIM_LEFT.HEIGHT}px`;
        this.div_left.style.width = `${u.LAYOUT_DIM_LEFT.WIDTH}px`;
        this.div_left.style.left = `${u.LAYOUT_DIM_LEFT.LEFT}px`;
        this.div_left.style.top = `${u.LAYOUT_DIM_LEFT.TOP}px`;
        this.div_left.style.display = 'flex';
        this.div.appendChild(this.div_left);
        this.div_right = document.createElement('div');
        this.div_right.id = 'layout_right';
        this.div_right.classList.add('layout_main');
        this.div_right.style.height = `${u.LAYOUT_DIM_RIGHT.HEIGHT}px`;
        this.div_right.style.width = `${u.LAYOUT_DIM_RIGHT.WIDTH}px`;
        this.div_right.style.right = `${u.LAYOUT_DIM_RIGHT.RIGHT}px`;
        this.div_right.style.top = `${u.LAYOUT_DIM_RIGHT.TOP}px`;
        this.div_right.style.display = 'flex';
        this.div.appendChild(this.div_right);
        this.div_bottom = document.createElement('div');
        this.div_bottom.id = 'layout_bottom';
        this.div_bottom.classList.add('layout_main');
        this.div_bottom.style.height = `${u.LAYOUT_DIM_BOTTOM.HEIGHT}px`;
        this.div_bottom.style.width = `${u.LAYOUT_DIM_BOTTOM.WIDTH}px`;
        this.div_bottom.style.left = `${u.LAYOUT_DIM_BOTTOM.LEFT}px`;
        this.div_bottom.style.bottom = `${u.LAYOUT_DIM_BOTTOM.BOTTOM}px`;
        this.div_bottom.style.display = 'flex';
        this.div.appendChild(this.div_bottom);
        this.div_center = document.createElement('div');
        this.div_center.id = 'layout_center';
        this.div_center.classList.add('layout_main');
        this.div_center.style.height = `${u.LAYOUT_DIM_CENTER.HEIGHT}px`;
        this.div_center.style.width = `${u.LAYOUT_DIM_CENTER.WIDTH}px`;
        this.div_center.style.left = `${u.LAYOUT_DIM_CENTER.LEFT}px`;
        this.div_center.style.top = `${u.LAYOUT_DIM_CENTER.TOP}px`;
        this.div_center.style.display = 'flex';
        this.div.appendChild(this.div_center);
        this.resize = this.resize.bind(this);
        this.get_div = this.get_div.bind(this);
        this.show_section = this.show_section.bind(this);
        this.hide_section = this.hide_section.bind(this);
        this.add_container = this.add_container.bind(this);
        this.resize();
        window.addEventListener('resize', this.resize);
    }
    resize() {
        let width = window.innerWidth;
        let height = window.innerHeight;
        this.div.style.width = `${width}px`;
        this.div.style.height = `${height}px`;
        let side_bar_height = height;
        let center_height = height;
        let center_width = width;
        if (this.div_top.style.display === 'flex') {
            side_bar_height -= (u.LAYOUT_DIM_TOP.HEIGHT + u.LAYOUT_MARGIN);
            center_height -= (u.LAYOUT_DIM_TOP.HEIGHT + u.LAYOUT_MARGIN);
        }
        if (this.div_left.style.display === 'flex') {
            center_width -= (u.LAYOUT_DIM_LEFT.WIDTH + u.LAYOUT_MARGIN);
        }
        if (this.div_right.style.display === 'flex') {
            center_width -= (u.LAYOUT_DIM_RIGHT.WIDTH + u.LAYOUT_MARGIN);
        }
        if (this.div_bottom.style.display === 'flex') {
            center_height -= (u.LAYOUT_DIM_BOTTOM.HEIGHT + u.LAYOUT_MARGIN);
        }
        this.div_left.style.height = `${side_bar_height}px`;
        this.div_right.style.height = `${side_bar_height}px`;
        this.div_center.style.height = `${center_height}px`;
        this.div_center.style.width = `${center_width}px`;
        this.div_bottom.style.width = `${center_width}px`;
        if (window.active_container) {
            window.active_container.resize();
        }
    }
    get_div(section) {
        switch (section) {
            case (Wrapper_Divs.CHART): return this.div_center;
            case (Wrapper_Divs.DRAW_TOOLS): return this.div_left;
            case (Wrapper_Divs.NAV_BAR): return this.div_right;
            case (Wrapper_Divs.TOP_BAR): return this.div_top;
            case (Wrapper_Divs.UTIL_BAR): return this.div_bottom;
            default: return this.div;
        }
    }
    show_section(div_loc) {
        switch (div_loc) {
            case (Wrapper_Divs.DRAW_TOOLS):
                this.div_left.style.display = 'flex';
                this.div_center.style.left = `${u.LAYOUT_DIM_CENTER.LEFT}px`;
                this.div_bottom.style.left = `${u.LAYOUT_DIM_BOTTOM.LEFT}px`;
                break;
            case (Wrapper_Divs.NAV_BAR):
                this.div_right.style.display = 'flex';
                break;
            case (Wrapper_Divs.TOP_BAR):
                this.div_top.style.display = 'flex';
                this.div_left.style.top = `${u.LAYOUT_DIM_LEFT.TOP}px`;
                this.div_right.style.top = `${u.LAYOUT_DIM_RIGHT.TOP}px`;
                this.div_center.style.top = `${u.LAYOUT_DIM_CENTER.TOP}px`;
                break;
            case (Wrapper_Divs.UTIL_BAR):
                this.div_bottom.style.display = 'flex';
        }
        this.resize();
    }
    hide_section(section) {
        switch (section) {
            case (Wrapper_Divs.DRAW_TOOLS):
                this.div_left.style.display = 'none';
                this.div_center.style.left = '0px';
                this.div_bottom.style.left = '0px';
                break;
            case (Wrapper_Divs.NAV_BAR):
                this.div_right.style.display = 'none';
                break;
            case (Wrapper_Divs.TOP_BAR):
                this.div_top.style.display = 'none';
                this.div_left.style.top = '0px';
                this.div_right.style.top = '0px';
                this.div_center.style.top = '0px';
                break;
            case (Wrapper_Divs.UTIL_BAR):
                this.div_bottom.style.display = 'none';
        }
        this.resize();
    }
    add_container(id) {
        let tmp_ref = new Container(this.get_div(Wrapper_Divs.CHART), id);
        this.containers.push(tmp_ref);
        tmp_ref.resize();
        window.active_container = tmp_ref;
        return tmp_ref;
    }
}
export class Container {
    constructor(parent_div, id) {
        this.frames = [];
        this.flex_divs = [];
        this.id = id;
        this.div = parent_div;
        this.div.style.flexWrap = `wrap`;
        this.add_frame = this.add_frame.bind(this);
        this.set_layout = this.set_layout.bind(this);
        this._create_frame = this._create_frame.bind(this);
        this._add_flex_frame = this._add_flex_frame.bind(this);
        this._add_flex_separator = this._add_flex_separator.bind(this);
    }
    resize() {
        let this_width = this.div.clientWidth;
        let this_height = this.div.clientHeight;
        this.flex_divs.forEach((flex_item) => {
            if (flex_item.isFrame) {
                flex_item.div.style.width = `${this_width * flex_item.flex_width - u.LAYOUT_CHART_MARGIN}px`;
                flex_item.div.style.height = `${this_height * flex_item.flex_height}px`;
            }
            else if (flex_item.orientation === Orientation.Vertical) {
                flex_item.div.style.width = `${u.LAYOUT_CHART_MARGIN}px`;
                flex_item.div.style.height = `${this_height * flex_item.flex_height}px`;
            }
            else if (flex_item.orientation === Orientation.Horizontal) {
                flex_item.div.style.width = `${this_width * flex_item.flex_width}px`;
                flex_item.div.style.height = `${u.LAYOUT_CHART_MARGIN}px`;
            }
        });
        this.frames.forEach((frame) => {
            frame.resize();
        });
    }
    add_frame(new_id) {
        let rtn_frame = undefined;
        this.frames.some(frame => {
            if (frame.id == '') {
                frame.id = new_id;
                rtn_frame = frame;
                return true;
            }
        });
        if (rtn_frame)
            return rtn_frame;
        console.log('create null Frame. Current Frame len:', this.frames.length);
        let null_div = document.createElement('div');
        null_div.style.display = 'none';
        let new_specs = {
            div: null_div,
            isFrame: true,
            flex_width: 0,
            flex_height: 0,
            orientation: Orientation.null
        };
        return this._create_frame(new_specs, new_id);
    }
    set_layout(layout) {
        this.flex_divs.forEach((item) => {
            this.div.removeChild(item.div);
        });
        this.flex_divs.length = 0;
        switch (layout) {
            case Container_Layouts.DOUBLE_VERT:
                {
                    this._add_flex_frame(0.5, 1);
                    this._add_flex_separator(Orientation.Vertical, 1);
                    this._add_flex_frame(0.5, 1);
                }
                break;
            case Container_Layouts.DOUBLE_HORIZ:
                {
                    this._add_flex_frame(1, 0.5);
                    this._add_flex_separator(Orientation.Horizontal, 1);
                    this._add_flex_frame(1, 0.5);
                }
                break;
            default:
                this._add_flex_frame(1, 1);
        }
        this.flex_divs.forEach((flex_item, index) => {
            if (flex_item.isFrame) {
                if (index < this.frames.length) {
                    console.log('frame reassign');
                    this.frames[index].reassign_div(flex_item.div);
                    this.frames[index].flex_width = flex_item.flex_width;
                    this.frames[index].flex_height = flex_item.flex_height;
                }
                else {
                    this._create_frame(flex_item);
                }
            }
            this.div.appendChild(flex_item.div);
        });
        this.resize();
        this.fitcontent();
    }
    _add_flex_frame(flex_width, flex_height) {
        let child_div = document.createElement('div');
        child_div.classList.add('chart_frame');
        this.flex_divs.push({
            div: child_div,
            isFrame: true,
            flex_width: flex_width,
            flex_height: flex_height,
            orientation: Orientation.null
        });
    }
    _add_flex_separator(type, size) {
        let child_div = document.createElement('div');
        child_div.classList.add('separator');
        this.flex_divs.push({
            div: child_div,
            isFrame: false,
            flex_height: (type === Orientation.Vertical ? size : 0),
            flex_width: (type === Orientation.Horizontal ? size : 0),
            orientation: type
        });
    }
    _create_frame(specs, id = '') {
        console.log('new frame id:', id);
        let new_frame = new Frame(id, specs.div, specs.flex_width, specs.flex_height);
        console.dir(new_frame);
        this.frames.push(new_frame);
        console.dir(this.frames.length);
        return new_frame;
    }
    hide() {
        this.div.style.display = 'none';
    }
    show() {
        this.div.style.display = 'flex';
    }
    fitcontent() {
        this.frames.forEach(frame => {
            frame.fitcontent();
        });
    }
}
export class Frame {
    constructor(id, div, flex_width = 1, flex_height = 1) {
        this.is_active = true;
        this.panes = [];
        this.id = id;
        this.div = div;
        this.flex_width = flex_width;
        this.flex_height = flex_height;
        console.log("div creation", div);
        this.add_pane = this.add_pane.bind(this);
    }
    reassign_div(div) {
        console.log("div reassignement", div);
        this.div = div;
        this.panes.forEach(pane => {
            this.div.appendChild(pane.div);
        });
    }
    add_pane(id = '') {
        let child_div = document.createElement('div');
        this.div.appendChild(child_div);
        console.log(`Adding Pane: ${this.div}`);
        let new_pane = new Pane(id, child_div);
        this.panes.push(new_pane);
        this.resize();
        return new_pane;
    }
    resize() {
        let this_width = this.div.clientWidth;
        let this_height = this.div.clientHeight;
        this.panes.forEach(pane => {
            pane.resize(this_width, this_height);
        });
    }
    fitcontent() {
        this.panes.forEach(pane => {
            pane.fitcontent();
        });
    }
}
export class Pane {
    constructor(id, div, flex_width = 1, flex_height = 1, chart_opts = u.DEFAULT_PYCHART_OPTS) {
        this.id = '';
        this.series = [];
        this.id = id;
        this.div = div;
        this.flex_width = flex_width;
        this.flex_height = flex_height;
        this.chart = lwc.createChart(this.div, chart_opts);
        this.resize = this.resize.bind(this);
        this.set_data = this.set_data.bind(this);
        this.add_candlestick_series = this.add_candlestick_series.bind(this);
        let data = [
            { time: '2018-12-22', open: 75.16, high: 82.84, low: 36.16, close: 45.72 },
            { time: '2018-12-23', open: 45.12, high: 53.90, low: 45.12, close: 48.09 },
            { time: '2018-12-24', open: 60.71, high: 60.71, low: 53.39, close: 59.29 },
            { time: '2018-12-25', open: 68.26, high: 68.26, low: 59.04, close: 60.50 },
            { time: '2018-12-26', open: 67.71, high: 105.85, low: 66.67, close: 91.04 },
            { time: '2018-12-27', open: 91.04, high: 121.40, low: 82.70, close: 111.40 },
            { time: '2018-12-28', open: 111.51, high: 142.83, low: 103.34, close: 131.25 },
            { time: '2018-12-29', open: 131.33, high: 151.17, low: 77.68, close: 96.43 },
            { time: '2018-12-30', open: 106.33, high: 110.20, low: 90.39, close: 98.10 },
            { time: '2018-12-31', open: 109.87, high: 114.69, low: 85.66, close: 111.26 },
        ];
        this.add_candlestick_series();
        this.set_data(this.series[0], data);
    }
    set_data(series, data) {
        if (data.length == 0) {
            series.setData([]);
            return;
        }
        let data_set = false;
        if (u.isCandlestickData(data[0])) {
            if (series.seriesType() == 'Candlestick') {
                series.setData(data);
                data_set = true;
            }
        }
        else if (u.isBarData(data[0])) {
            if (series.seriesType() == 'Bar') {
                series.setData(data);
                data_set = true;
            }
        }
        else if (u.isLineData(data[0]) || u.isAreaData(data[0])) {
            if (series.seriesType() == 'Line' || series.seriesType() == 'Area') {
                series.setData(data);
                data_set = true;
            }
        }
        else if (u.isBaselineData(data[0])) {
            if (series.seriesType() == 'Baseline') {
                series.setData(data);
                data_set = true;
            }
        }
        else if (u.isHistogramData(data[0])) {
            if (series.seriesType() == 'Histogram') {
                series.setData(data);
                data_set = true;
            }
        }
        if (!data_set) {
            if (u.isOhlcData(data[0])) {
                if (series.seriesType() == 'Candlestick' || series.seriesType() == 'Bar') {
                    series.setData(data);
                    data_set = true;
                }
            }
            else if (u.isSingleValueData(data[0])) {
                let options = ['Line', 'Area', 'Baseline', 'Histogram'];
                if (options.includes(series.seriesType())) {
                    series.setData(data);
                    data_set = true;
                }
            }
        }
        if (data_set)
            this.chart.timeScale().fitContent();
        else
            console.warn("Failed to set data on Pane.set_data() function call.");
    }
    add_candlestick_series(options) {
        this.series.push(this.chart.addCandlestickSeries(options));
    }
    resize(width, height) {
        let this_width = width * this.flex_width;
        let this_height = height * this.flex_height;
        this.div.style.width = `${this_width}px`;
        this.div.style.height = `${this_height}px`;
        this.chart.resize(this_width, this_height);
    }
    fitcontent() {
        this.chart.timeScale().fitContent();
    }
}
