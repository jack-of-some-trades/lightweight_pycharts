import * as lwc from "../js/pkg.mjs";
import { Color, ColorType } from "./pkg.js";
const LAYOUT_MARGIN = 5;
const LAYOUT_DIM_TOP = {
    WIDTH: `100vw`,
    HEIGHT: 38,
    LEFT: 0,
    TOP: 0
};
const LAYOUT_DIM_LEFT = {
    WIDTH: 52,
    HEIGHT: -1,
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    LEFT: 0
};
const LAYOUT_DIM_RIGHT = {
    WIDTH: 52,
    HEIGHT: -1,
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    RIGHT: 0
};
const LAYOUT_DIM_BOTTOM = {
    WIDTH: -1,
    HEIGHT: 38,
    BOTTOM: 0,
    LEFT: LAYOUT_DIM_LEFT.WIDTH + LAYOUT_MARGIN
};
const LAYOUT_DIM_CENTER = {
    WIDTH: -1,
    HEIGHT: -1,
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    LEFT: LAYOUT_DIM_LEFT.WIDTH + LAYOUT_MARGIN
};
var Wrapper_Divs;
(function (Wrapper_Divs) {
    Wrapper_Divs["TOP_BAR"] = "div_top";
    Wrapper_Divs["DRAWINGS"] = "div_left";
    Wrapper_Divs["NAV_BAR"] = "div_right";
    Wrapper_Divs["UTIL_BAR"] = "div_bottom";
    Wrapper_Divs["CHART"] = "div_center";
})(Wrapper_Divs || (Wrapper_Divs = {}));
var Container_Layouts;
(function (Container_Layouts) {
    Container_Layouts[Container_Layouts["SINGLE"] = 0] = "SINGLE";
    Container_Layouts[Container_Layouts["DOUBLE_VERT"] = 1] = "DOUBLE_VERT";
    Container_Layouts[Container_Layouts["DOUBLE_HORIZ"] = 2] = "DOUBLE_HORIZ";
})(Container_Layouts || (Container_Layouts = {}));
export class Wrapper {
    constructor() {
        this.div = document.createElement('div');
        this.div.id = 'layout_wrapper';
        this.div.classList.add('wrapper');
        document.body.appendChild(this.div);
        this.div_top = document.createElement('div');
        this.div_top.id = 'layout_top';
        this.div_top.classList.add('layout_main');
        this.div_top.style.height = `${LAYOUT_DIM_TOP.HEIGHT}px`;
        this.div_top.style.width = LAYOUT_DIM_TOP.WIDTH;
        this.div_top.style.left = `${LAYOUT_DIM_TOP.LEFT}px`;
        this.div_top.style.top = `${LAYOUT_DIM_TOP.TOP}px`;
        this.div.appendChild(this.div_top);
        this.div_left = document.createElement('div');
        this.div_left.id = 'layout_left';
        this.div_left.classList.add('layout_main');
        this.div_left.style.height = `${LAYOUT_DIM_LEFT.HEIGHT}px`;
        this.div_left.style.width = `${LAYOUT_DIM_LEFT.WIDTH}px`;
        this.div_left.style.left = `${LAYOUT_DIM_LEFT.LEFT}px`;
        this.div_left.style.top = `${LAYOUT_DIM_LEFT.TOP}px`;
        this.div.appendChild(this.div_left);
        this.div_right = document.createElement('div');
        this.div_right.id = 'layout_right';
        this.div_right.classList.add('layout_main');
        this.div_right.style.height = `${LAYOUT_DIM_RIGHT.HEIGHT}px`;
        this.div_right.style.width = `${LAYOUT_DIM_RIGHT.WIDTH}px`;
        this.div_right.style.right = `${LAYOUT_DIM_RIGHT.RIGHT}px`;
        this.div_right.style.top = `${LAYOUT_DIM_RIGHT.TOP}px`;
        this.div.appendChild(this.div_right);
        this.div_bottom = document.createElement('div');
        this.div_bottom.id = 'layout_bottom';
        this.div_bottom.classList.add('layout_main');
        this.div_bottom.style.height = `${LAYOUT_DIM_BOTTOM.HEIGHT}px`;
        this.div_bottom.style.width = `${LAYOUT_DIM_BOTTOM.WIDTH}px`;
        this.div_bottom.style.left = `${LAYOUT_DIM_BOTTOM.LEFT}px`;
        this.div_bottom.style.bottom = `${LAYOUT_DIM_BOTTOM.BOTTOM}px`;
        this.div.appendChild(this.div_bottom);
        this.div_center = document.createElement('div');
        this.div_center.id = 'layout_center';
        this.div_center.classList.add('layout_main');
        this.div_center.style.height = `${LAYOUT_DIM_CENTER.HEIGHT}px`;
        this.div_center.style.width = `${LAYOUT_DIM_CENTER.WIDTH}px`;
        this.div_center.style.left = `${LAYOUT_DIM_CENTER.LEFT}px`;
        this.div_center.style.top = `${LAYOUT_DIM_CENTER.TOP}px`;
        this.div.appendChild(this.div_center);
        this.resize = this.resize.bind(this);
        this.get_div = this.get_div.bind(this);
        this.add_container = this.add_container.bind(this);
        this.container = new Container(this);
        window.active_container = this.container;
        this.resize();
        window.addEventListener('resize', this.resize);
    }
    resize() {
        let width = window.innerWidth;
        let height = window.innerHeight;
        this.div.style.width = `${width}px`;
        this.div.style.height = `${height}px`;
        this.div_left.style.height = `${height - LAYOUT_DIM_LEFT.TOP}px`;
        this.div_right.style.height = `${height - LAYOUT_DIM_RIGHT.TOP}px`;
        this.div_bottom.style.width = `${width - LAYOUT_DIM_LEFT.WIDTH - LAYOUT_DIM_RIGHT.WIDTH - 2 * LAYOUT_MARGIN}px`;
        this.div_center.style.width = `${width - LAYOUT_DIM_LEFT.WIDTH - LAYOUT_DIM_RIGHT.WIDTH - 2 * LAYOUT_MARGIN}px`;
        this.div_center.style.height = `${height - LAYOUT_DIM_CENTER.TOP - LAYOUT_DIM_BOTTOM.HEIGHT - LAYOUT_MARGIN}px`;
        window.active_container.resize();
    }
    get_div(div_loc) {
        switch (div_loc) {
            case (Wrapper_Divs.CHART): return this.div_center;
            case (Wrapper_Divs.DRAWINGS): return this.div_left;
            case (Wrapper_Divs.NAV_BAR): return this.div_right;
            case (Wrapper_Divs.TOP_BAR): return this.div_top;
            case (Wrapper_Divs.UTIL_BAR): return this.div_bottom;
            default: return this.div;
        }
    }
    add_container() { }
}
export class Container {
    constructor(parent_wrapper) {
        this.frames = [];
        this.flex_divs = [];
        this.div = parent_wrapper.get_div(Wrapper_Divs.CHART);
        this.div.style.flexWrap = `wrap`;
        this.set_layout = this.set_layout.bind(this);
        this._add_frame = this._add_frame.bind(this);
        this._add_flex_frame = this._add_flex_frame.bind(this);
        this._add_flex_separator = this._add_flex_separator.bind(this);
        this.set_layout(Container_Layouts.DOUBLE_HORIZ);
    }
    resize() {
        let this_width = this.div.clientWidth;
        let this_height = this.div.clientHeight;
        this.frames.forEach((frame) => {
            frame.resize(this_width, this_height);
        });
    }
    set_layout(layout = Container_Layouts.SINGLE) {
        this.flex_divs.forEach((item) => {
            this.div.removeChild(item.div);
        });
        this.flex_divs.length = 0;
        switch (layout) {
            case Container_Layouts.DOUBLE_VERT:
                {
                    this._add_flex_frame(0.5, 1);
                    this._add_flex_separator(true, 1);
                    this._add_flex_frame(0.5, 1);
                }
                break;
            case Container_Layouts.DOUBLE_HORIZ:
                {
                    this._add_flex_frame(1, 0.5);
                    this._add_flex_separator(false, 1);
                    this._add_flex_frame(1, 0.5);
                }
                break;
            default:
                this._add_flex_frame(1, 1);
        }
        this.flex_divs.forEach((flex_item, index) => {
            if (flex_item.isFrame) {
                if (index < this.frames.length) {
                    this.frames[index].div = flex_item.div;
                    this.frames[index].flex_width = flex_item.flex_width;
                    this.frames[index].flex_height = flex_item.flex_height;
                }
                else {
                    this._add_frame(flex_item);
                }
            }
            this.div.appendChild(flex_item.div);
        });
    }
    _add_flex_frame(flex_width, flex_height) {
        let child_div = document.createElement('div');
        child_div.classList.add('chart_frame');
        this.flex_divs.push({
            div: child_div,
            isFrame: true,
            flex_width: flex_width,
            flex_height: flex_height
        });
    }
    _add_flex_separator(vertical, size) {
        let child_div = document.createElement('div');
        if (vertical) {
            child_div.classList.add('separator_vert');
        }
        else {
            child_div.classList.add('separator_horiz');
        }
        this.flex_divs.push({
            div: document.createElement('div'),
            isFrame: false,
            flex_height: (vertical ? size : 0),
            flex_width: (vertical ? 0 : size),
        });
    }
    _add_frame(specs) {
        if (specs.isFrame) {
            this.frames.push(new Frame(specs.div, specs.flex_width, specs.flex_height));
        }
    }
    sync_charts() {
    }
    hide() {
        this.div.style.display = 'none';
    }
    show() {
        this.div.style.display = 'flex';
    }
}
export class Frame {
    constructor(div, flex_width = 1, flex_height = 1) {
        this.is_active = true;
        this.panes = [];
        this.div = div;
        this.flex_width = flex_width;
        this.flex_height = flex_height;
        this.add_pane = this.add_pane.bind(this);
        this.add_pane();
    }
    reassign_div(div) {
        this.div = div;
    }
    add_pane() {
        if (this.div) {
            let child_div = document.createElement('div');
            this.div.appendChild(child_div);
            this.panes.push(new Pane(child_div));
        }
    }
    resize(width, height) {
        let this_width = width * this.flex_width;
        let this_height = height * this.flex_height;
        this.div.style.width = `${this_width}px`;
        this.div.style.height = `${this_height}px`;
        this.panes.forEach(pane => {
            pane.resize(this_width, this_height);
        });
    }
}
export class Pane {
    constructor(div, flex_width = 1, flex_height = 1) {
        this.div = div;
        this.flex_width = flex_width;
        this.flex_height = flex_height;
        let layoutopts = {
            textColor: 'white',
            background: {
                type: ColorType.Solid,
                color: Color.black
            }
        };
        let chartOpts = {
            height: this.div.clientHeight,
            layout: layoutopts,
            rightPriceScale: { visible: true }
        };
        this.chart = lwc.createChart(this.div, chartOpts);
        const candles_series = this.chart.addCandlestickSeries({
            upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
            wickUpColor: '#26a69a', wickDownColor: '#ef5350',
        });
        candles_series.setData([
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
        ]);
        this.chart.timeScale().fitContent();
    }
    resize(width, height) {
        let this_width = width * this.flex_width;
        let this_height = height * this.flex_height;
        this.div.style.width = `${this_width}px`;
        this.div.style.height = `${this_height}px`;
        this.chart.resize(this_width, this_height);
    }
}
