import * as u from "./util.js";
import { Container_Layouts, Orientation } from "./util.js";
import { Frame } from "./frame.js";
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
        let flex_frame_ind = 0;
        this.flex_divs.forEach((flex_item) => {
            if (flex_item.isFrame) {
                if (flex_frame_ind < this.frames.length) {
                    this.frames[flex_frame_ind].reassign_div(flex_item.div);
                    this.frames[flex_frame_ind].flex_width = flex_item.flex_width;
                    this.frames[flex_frame_ind].flex_height = flex_item.flex_height;
                }
                else {
                    this._create_frame(flex_item);
                }
                flex_frame_ind += 1;
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
        let new_frame = new Frame(id, specs.div, specs.flex_width, specs.flex_height);
        this.frames.push(new_frame);
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
