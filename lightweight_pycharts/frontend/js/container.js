import { Frame } from "./frame.js";
import * as u from "./util.js";
import { Container_Layouts, Orientation } from "./util.js";
export class Container {
    constructor(parent_div, id) {
        this.frames = [];
        this.flex_divs = [];
        this.id = id;
        this.div = parent_div;
        this.div.style.flexWrap = `wrap`;
        this.layout = null;
    }
    resize_flex(separator, e) {
        if (separator.orientation === Orientation.Vertical) {
            let flex_total = separator.resize_pos[0].flex_width + separator.resize_neg[0].flex_width;
            let width_total = separator.resize_pos[0].div.offsetWidth + separator.resize_neg[0].div.offsetWidth;
            let container_x = e.clientX - separator.resize_pos[0].div.offsetLeft - this.div.offsetLeft;
            let flex_size_left = (container_x / width_total) * flex_total;
            let flex_size_right = flex_total - flex_size_left;
            if (flex_size_left < u.MIN_FRAME_WIDTH) {
                flex_size_left = u.MIN_FRAME_WIDTH;
                flex_size_right = flex_total - flex_size_left;
            }
            else if (flex_size_right < u.MIN_FRAME_WIDTH) {
                flex_size_right = u.MIN_FRAME_WIDTH;
                flex_size_left = flex_total - flex_size_right;
            }
            separator.resize_pos.forEach(flex_div => {
                flex_div.flex_width = flex_size_left;
            });
            separator.resize_neg.forEach(flex_div => {
                flex_div.flex_width = flex_size_right;
            });
            this.resize();
        }
        else if (separator.orientation === Orientation.Horizontal) {
            let flex_total = separator.resize_pos[0].flex_height + separator.resize_neg[0].flex_height;
            let height_total = separator.resize_pos[0].div.offsetHeight + separator.resize_neg[0].div.offsetHeight;
            let container_y = e.clientY - separator.resize_pos[0].div.offsetTop - this.div.offsetTop;
            let flex_size_top = (container_y / height_total) * flex_total;
            let flex_size_bottom = flex_total - flex_size_top;
            if (flex_size_top < u.MIN_FRAME_HEIGHT) {
                flex_size_top = u.MIN_FRAME_HEIGHT;
                flex_size_bottom = flex_total - flex_size_top;
            }
            else if (flex_size_bottom < u.MIN_FRAME_HEIGHT) {
                flex_size_bottom = u.MIN_FRAME_HEIGHT;
                flex_size_top = flex_total - flex_size_bottom;
            }
            separator.resize_pos.forEach(flex_div => {
                flex_div.flex_height = flex_size_top;
            });
            separator.resize_neg.forEach(flex_div => {
                flex_div.flex_height = flex_size_bottom;
            });
            this.resize();
        }
    }
    resize() {
        let this_width = this.div.clientWidth;
        let this_height = this.div.clientHeight;
        let horiz_offset = (this.div.classList.contains('layout_container_row')) ? u.LAYOUT_CHART_MARGIN : u.LAYOUT_CHART_SEP_BORDER;
        let vert_offset = (this.div.classList.contains('layout_container_col')) ? u.LAYOUT_CHART_MARGIN : u.LAYOUT_CHART_SEP_BORDER;
        this.flex_divs.forEach((flex_item) => {
            if (flex_item.isFrame) {
                flex_item.div.style.width = `${this_width * flex_item.flex_width - horiz_offset}px`;
                flex_item.div.style.height = `${this_height * flex_item.flex_height - vert_offset}px`;
            }
            else if (flex_item.orientation === Orientation.Vertical) {
                flex_item.div.style.width = `${u.LAYOUT_CHART_SEP_BORDER}px`;
                flex_item.div.style.height = `${this_height * flex_item.flex_height - vert_offset}px`;
            }
            else if (flex_item.orientation === Orientation.Horizontal) {
                flex_item.div.style.width = `${this_width * flex_item.flex_width - horiz_offset}px`;
                flex_item.div.style.height = `${u.LAYOUT_CHART_SEP_BORDER}px`;
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
            orientation: Orientation.null,
            resize_pos: [],
            resize_neg: [],
        };
        return this._create_frame(new_specs, new_id);
    }
    set_layout(layout) {
        this.flex_divs.forEach((item) => {
            this.div.removeChild(item.div);
        });
        this.flex_divs.length = 0;
        this._layout_switch(layout);
        let flex_frame_ind = 0;
        this.flex_divs.forEach((flex_item) => {
            if (flex_item.isFrame) {
                if (flex_frame_ind < this.frames.length) {
                    this.frames[flex_frame_ind].reassign_div(flex_item.div);
                }
                else {
                    this._create_frame(flex_item);
                }
                flex_frame_ind += 1;
            }
            this.div.appendChild(flex_item.div);
        });
        this.resize();
        this.layout = layout;
        window.layout_selector.update_topbar_icon(layout);
    }
    _add_flex_frame(flex_width, flex_height) {
        let child_div = document.createElement('div');
        child_div.classList.add('chart_frame');
        let new_flexdiv = {
            div: child_div,
            isFrame: true,
            flex_width: flex_width,
            flex_height: flex_height,
            orientation: Orientation.null,
            resize_pos: [],
            resize_neg: [],
        };
        this.flex_divs.push(new_flexdiv);
        return new_flexdiv;
    }
    _add_flex_separator(type, size) {
        let child_div = document.createElement('div');
        child_div.classList.add('chart_separator');
        child_div.style.cursor = (type === Orientation.Vertical ? 'ew-resize' : 'ns-resize');
        let new_flexdiv = {
            div: child_div,
            isFrame: false,
            flex_height: (type === Orientation.Vertical ? size : 0),
            flex_width: (type === Orientation.Horizontal ? size : 0),
            orientation: type,
            resize_pos: [],
            resize_neg: []
        };
        this.flex_divs.push(new_flexdiv);
        let resize_partial_func = this.resize_flex.bind(this, new_flexdiv);
        child_div.addEventListener('mousedown', function () {
            document.addEventListener('mousemove', resize_partial_func);
        });
        document.addEventListener('mouseup', function () {
            document.removeEventListener('mousemove', resize_partial_func);
        });
        return new_flexdiv;
    }
    _create_frame(specs, id = '') {
        let new_frame = new Frame(id, specs.div);
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
    _layout_switch(layout) {
        switch (layout) {
            case Container_Layouts.DOUBLE_VERT:
                {
                    this.div.classList.replace('layout_container_col', 'layout_container_row');
                    let f1 = this._add_flex_frame(0.5, 1);
                    let s1 = this._add_flex_separator(Orientation.Vertical, 1);
                    let f2 = this._add_flex_frame(0.5, 1);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2);
                }
                break;
            case Container_Layouts.DOUBLE_HORIZ:
                {
                    this.div.classList.replace('layout_container_col', 'layout_container_row');
                    let f1 = this._add_flex_frame(1, 0.5);
                    let s1 = this._add_flex_separator(Orientation.Horizontal, 1);
                    let f2 = this._add_flex_frame(1, 0.5);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2);
                }
                break;
            case Container_Layouts.TRIPLE_VERT:
                {
                    this.div.classList.replace('layout_container_col', 'layout_container_row');
                    let f1 = this._add_flex_frame(0.333, 1);
                    let s1 = this._add_flex_separator(Orientation.Vertical, 1);
                    let f2 = this._add_flex_frame(0.333, 1);
                    let s2 = this._add_flex_separator(Orientation.Vertical, 1);
                    let f3 = this._add_flex_frame(0.333, 1);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2);
                    s2.resize_pos.push(f2);
                    s2.resize_neg.push(f3);
                }
                break;
            case Container_Layouts.TRIPLE_VERT_LEFT:
                {
                    this.div.classList.replace('layout_container_row', 'layout_container_col');
                    let f1 = this._add_flex_frame(0.5, 1);
                    let s1 = this._add_flex_separator(Orientation.Vertical, 1);
                    let f2 = this._add_flex_frame(0.5, 0.5);
                    let s2 = this._add_flex_separator(Orientation.Horizontal, 0.5);
                    let f3 = this._add_flex_frame(0.5, 0.5);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2, f3, s2);
                    s2.resize_pos.push(f2);
                    s2.resize_neg.push(f3);
                }
                break;
            case Container_Layouts.TRIPLE_VERT_RIGHT:
                {
                    this.div.classList.replace('layout_container_row', 'layout_container_col');
                    let f1 = this._add_flex_frame(0.5, 0.5);
                    let s1 = this._add_flex_separator(Orientation.Horizontal, 0.5);
                    let f2 = this._add_flex_frame(0.5, 0.5);
                    let s2 = this._add_flex_separator(Orientation.Vertical, 1);
                    let f3 = this._add_flex_frame(0.5, 1);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2);
                    s2.resize_pos.push(f1, f2, s1);
                    s2.resize_neg.push(f3);
                }
                break;
            case Container_Layouts.TRIPLE_HORIZ:
                {
                    this.div.classList.replace('layout_container_col', 'layout_container_row');
                    let f1 = this._add_flex_frame(1, 0.333);
                    let s1 = this._add_flex_separator(Orientation.Horizontal, 1);
                    let f2 = this._add_flex_frame(1, 0.333);
                    let s2 = this._add_flex_separator(Orientation.Horizontal, 1);
                    let f3 = this._add_flex_frame(1, 0.333);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2);
                    s2.resize_pos.push(f2);
                    s2.resize_neg.push(f3);
                }
                break;
            case Container_Layouts.TRIPLE_HORIZ_TOP:
                {
                    this.div.classList.replace('layout_container_col', 'layout_container_row');
                    let f1 = this._add_flex_frame(1, 0.5);
                    let s1 = this._add_flex_separator(Orientation.Horizontal, 1);
                    let f2 = this._add_flex_frame(0.5, 0.5);
                    let s2 = this._add_flex_separator(Orientation.Vertical, 0.5);
                    let f3 = this._add_flex_frame(0.5, 0.5);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2, f3, s2);
                    s2.resize_pos.push(f2);
                    s2.resize_neg.push(f3);
                }
                break;
            case Container_Layouts.TRIPLE_HORIZ_BOTTOM:
                {
                    this.div.classList.replace('layout_container_col', 'layout_container_row');
                    let f1 = this._add_flex_frame(0.5, 0.5);
                    let s1 = this._add_flex_separator(Orientation.Vertical, 0.5);
                    let f2 = this._add_flex_frame(0.5, 0.5);
                    let s2 = this._add_flex_separator(Orientation.Horizontal, 1);
                    let f3 = this._add_flex_frame(1, 0.5);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2);
                    s2.resize_pos.push(f1, f2, s1);
                    s2.resize_neg.push(f3);
                }
                break;
            case Container_Layouts.QUAD_HORIZ:
                {
                    this.div.classList.replace('layout_container_col', 'layout_container_row');
                    let f1 = this._add_flex_frame(0.5, 0.5);
                    let s1 = this._add_flex_separator(Orientation.Vertical, 0.5);
                    let f2 = this._add_flex_frame(0.5, 0.5);
                    let s2 = this._add_flex_separator(Orientation.Horizontal, 1);
                    let f3 = this._add_flex_frame(0.5, 0.5);
                    let s3 = this._add_flex_separator(Orientation.Vertical, 0.5);
                    let f4 = this._add_flex_frame(0.5, 0.5);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2);
                    s3.resize_pos.push(f3);
                    s3.resize_neg.push(f4);
                    s2.resize_pos.push(f1, f2, s1);
                    s2.resize_neg.push(f3, f4, s3);
                }
                break;
            case Container_Layouts.QUAD_VERT:
                {
                    this.div.classList.replace('layout_container_row', 'layout_container_col');
                    let f1 = this._add_flex_frame(0.5, 0.5);
                    let s1 = this._add_flex_separator(Orientation.Horizontal, 0.5);
                    let f2 = this._add_flex_frame(0.5, 0.5);
                    let s2 = this._add_flex_separator(Orientation.Vertical, 1);
                    let f3 = this._add_flex_frame(0.5, 0.5);
                    let s3 = this._add_flex_separator(Orientation.Horizontal, 0.5);
                    let f4 = this._add_flex_frame(0.5, 0.5);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2);
                    s3.resize_pos.push(f3);
                    s3.resize_neg.push(f4);
                    s2.resize_pos.push(f1, f2, s1);
                    s2.resize_neg.push(f3, f4, s3);
                }
                break;
            case Container_Layouts.QUAD_LEFT:
                {
                    this.div.classList.replace('layout_container_row', 'layout_container_col');
                    let f1 = this._add_flex_frame(0.5, 1);
                    let s1 = this._add_flex_separator(Orientation.Vertical, 1);
                    let f2 = this._add_flex_frame(0.5, 0.333);
                    let s2 = this._add_flex_separator(Orientation.Horizontal, 0.5);
                    let f3 = this._add_flex_frame(0.5, 0.333);
                    let s3 = this._add_flex_separator(Orientation.Horizontal, 0.5);
                    let f4 = this._add_flex_frame(0.5, 0.333);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2, f3, f4, s2, s3);
                    s2.resize_pos.push(f2);
                    s2.resize_neg.push(f3);
                    s3.resize_pos.push(f3);
                    s3.resize_neg.push(f4);
                }
                break;
            case Container_Layouts.QUAD_RIGHT:
                {
                    this.div.classList.replace('layout_container_row', 'layout_container_col');
                    let f1 = this._add_flex_frame(0.5, 0.333);
                    let s1 = this._add_flex_separator(Orientation.Horizontal, 0.5);
                    let f2 = this._add_flex_frame(0.5, 0.333);
                    let s2 = this._add_flex_separator(Orientation.Horizontal, 0.5);
                    let f3 = this._add_flex_frame(0.5, 0.333);
                    let s3 = this._add_flex_separator(Orientation.Vertical, 1);
                    let f4 = this._add_flex_frame(0.5, 1);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2);
                    s2.resize_pos.push(f2);
                    s2.resize_neg.push(f3);
                    s3.resize_pos.push(f1, f2, f3, s1, s2);
                    s3.resize_neg.push(f4);
                }
                break;
            case Container_Layouts.QUAD_TOP:
                {
                    this.div.classList.replace('layout_container_col', 'layout_container_row');
                    let f1 = this._add_flex_frame(1, 0.5);
                    let s1 = this._add_flex_separator(Orientation.Horizontal, 1);
                    let f2 = this._add_flex_frame(0.333, 0.5);
                    let s2 = this._add_flex_separator(Orientation.Vertical, 0.5);
                    let f3 = this._add_flex_frame(0.333, 0.5);
                    let s3 = this._add_flex_separator(Orientation.Vertical, 0.5);
                    let f4 = this._add_flex_frame(0.333, 0.5);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2, f3, f4, s2, s3);
                    s2.resize_pos.push(f2);
                    s2.resize_neg.push(f3);
                    s3.resize_pos.push(f3);
                    s3.resize_neg.push(f4);
                }
                break;
            case Container_Layouts.QUAD_BOTTOM:
                {
                    this.div.classList.replace('layout_container_col', 'layout_container_row');
                    let f1 = this._add_flex_frame(0.333, 0.5);
                    let s1 = this._add_flex_separator(Orientation.Vertical, 0.5);
                    let f2 = this._add_flex_frame(0.333, 0.5);
                    let s2 = this._add_flex_separator(Orientation.Vertical, 0.5);
                    let f3 = this._add_flex_frame(0.333, 0.5);
                    let s3 = this._add_flex_separator(Orientation.Horizontal, 1);
                    let f4 = this._add_flex_frame(1, 0.5);
                    s1.resize_pos.push(f1);
                    s1.resize_neg.push(f2);
                    s2.resize_pos.push(f2);
                    s2.resize_neg.push(f3);
                    s3.resize_pos.push(f1, f2, f3, s1, s2);
                    s3.resize_neg.push(f4);
                }
                break;
            default:
                this._add_flex_frame(1, 1);
        }
    }
}
