//@ts-ignore
import { Frame } from "./frame.js";
import * as u from "./util.js";
import { Container_Layouts, Orientation, flex_div } from "./util.js";

/**
 * Main Object that holds charts and data
 * 
 * @member frame_counter The number of frames that have been made. Used as an id system
 * 
 * @member flex_divs An array of Flex_Divs. Stores all Frame and Separator Divs
 */
export class Container {
    id: string
    div: HTMLDivElement
    tab_div: HTMLDivElement
    layout: Container_Layouts | null
    frames: Frame[] = []
    flex_divs: flex_div[] = []

    constructor(parent_div: HTMLDivElement, id: string) {
        this.id = id
        this.div = document.createElement('div')
        this.div.classList.add('layout_main', 'layout_container_row')
        this.layout = null

        parent_div.appendChild(this.div)

        this.tab_div = window.titlebar.tab_manager.addTab()
        window.titlebar.tab_manager.setTabCloseEventListener(this.tab_div, id)
        this.assign_active_container()

        this.resize()
    }

    /**
     * Fit the content of all child Frames
     */
    fitcontent() {
        this.frames.forEach(frame => {
            frame.fitcontent()
        });
    }

    remove() {
        //The remove tab call will set the next active_container if necessary.
        //The Tab_manager has that responsibility since the tabs are already ordered 
        //and thus make the implementation easier.
        window.titlebar.tab_manager.removeTab(this.tab_div)
        this.div.remove()
    }

    /**
     * Update Global 'active_frame' reference to this instance. 
     */
    assign_active_container() {
        if (window.active_container) {
            window.active_container.div.removeAttribute('active')
        }

        window.active_container = this
        window.active_container.div.setAttribute('active', '')
        window.titlebar.tab_manager.setCurrentTab(this.tab_div)
        if (this.layout !== null)
            window.layout_selector.update_icon(this.layout)
        if (this.frames[0])
            this.frames[0].assign_active_frame()
        this.resize() //Non-Active Containers aren't updated
    }

    /**
     * Resize the Flex Width/Height %s of all neighboring frames & spearators
     */
    resize_flex(separator: flex_div, e: MouseEvent) {
        if (separator.orientation === Orientation.Vertical) {
            //flex total is the total percentage of the screen that the laft & Right charts occupy
            //e.g a Triple_vertical will have an initial flex_total of 0.33 + 0.33 = 0.66
            let flex_total = separator.resize_pos[0].flex_width + separator.resize_neg[0].flex_width
            let width_total = separator.resize_pos[0].div.offsetWidth + separator.resize_neg[0].div.offsetWidth

            //x position within the container
            let relative_x = e.clientX - separator.resize_pos[0].div.getBoundingClientRect().left
            let flex_size_left = (relative_x / width_total) * flex_total
            let flex_size_right = flex_total - flex_size_left

            //Limit the size of each frame to the minimum set in util.
            if (flex_size_left < u.MIN_FRAME_WIDTH) {
                flex_size_left = u.MIN_FRAME_WIDTH
                flex_size_right = flex_total - flex_size_left
            } else if (flex_size_right < u.MIN_FRAME_WIDTH) {
                flex_size_right = u.MIN_FRAME_WIDTH
                flex_size_left = flex_total - flex_size_right
            }

            separator.resize_pos.forEach(flex_div => {
                flex_div.flex_width = flex_size_left
            });
            separator.resize_neg.forEach(flex_div => {
                flex_div.flex_width = flex_size_right
            });

            this.resize()

        } else if (separator.orientation === Orientation.Horizontal) {
            let flex_total = separator.resize_pos[0].flex_height + separator.resize_neg[0].flex_height
            let height_total = separator.resize_pos[0].div.offsetHeight + separator.resize_neg[0].div.offsetHeight

            let container_y = e.clientY - separator.resize_pos[0].div.getBoundingClientRect().top
            let flex_size_top = (container_y / height_total) * flex_total
            let flex_size_bottom = flex_total - flex_size_top

            //Limit the size of each frame to the minimum set in util.
            if (flex_size_top < u.MIN_FRAME_HEIGHT) {
                flex_size_top = u.MIN_FRAME_HEIGHT
                flex_size_bottom = flex_total - flex_size_top
            } else if (flex_size_bottom < u.MIN_FRAME_HEIGHT) {
                flex_size_bottom = u.MIN_FRAME_HEIGHT
                flex_size_top = flex_total - flex_size_bottom
            }

            separator.resize_pos.forEach(flex_div => {
                flex_div.flex_height = flex_size_top
            });
            separator.resize_neg.forEach(flex_div => {
                flex_div.flex_height = flex_size_bottom
            });

            this.resize()
        }
    }

    /**
     * Resize all the child Elements based on the size of the container's Div. 
     */
    resize() {
        let this_width = this.div.clientWidth
        let this_height = this.div.clientHeight
        if (this_width <= 0 || this_height <= 0)
            return

        //These remove the width of the frame separators, With that width removed the flexbox grows the
        //frame elements to their necessary size instead of unnecessarily wrapping the contents because they 
        //go 1 pixel over size.
        let horiz_offset = (this.div.classList.contains('layout_container_row')) ? u.LAYOUT_CHART_MARGIN : u.LAYOUT_CHART_SEP_BORDER
        let vert_offset = (this.div.classList.contains('layout_container_col')) ? u.LAYOUT_CHART_MARGIN : u.LAYOUT_CHART_SEP_BORDER

        //Resize Frame & Serparator Divs
        this.flex_divs.forEach((flex_item) => {
            if (flex_item.isFrame) {
                //Margin is subtracted from width to ensure size row wrap functions correctly
                flex_item.div.style.width = `${Math.round(this_width * flex_item.flex_width - horiz_offset)}px`
                flex_item.div.style.height = `${Math.round(this_height * flex_item.flex_height - vert_offset)}px`
            } else if (flex_item.orientation === Orientation.Vertical) {
                //vertical Separators have fixed width
                flex_item.div.style.width = `${u.LAYOUT_CHART_SEP_BORDER}px`
                flex_item.div.style.height = `${Math.round(this_height * flex_item.flex_height - vert_offset)}px`
            } else if (flex_item.orientation === Orientation.Horizontal) {
                //Horizontal Separators have fixed height
                flex_item.div.style.width = `${Math.round(this_width * flex_item.flex_width - horiz_offset)}px`
                flex_item.div.style.height = `${u.LAYOUT_CHART_SEP_BORDER}px`
            }
        })
        //Resize all contents of each *visible* Frame
        for (let i = 0; i < u.num_frames(this.layout); i++)
            this.frames[i].resize()
    }

    /**
     * Creates or assigns a Frame in the current container
     * Assignment gives a name to a currently anonomous frame
     */
    add_frame(new_id: string): Frame {
        let rtn_frame = undefined
        this.frames.some(frame => {
            //If a Frame has been generated with no name (e.g. by set_layout),
            //then assign that as the new frame, otherwise generate it
            if (frame.id == '') {
                frame.id = new_id
                rtn_frame = frame
                //return true breaks execution of 'some'.
                //Why you can't break a forEach ill never know.
                return true
            }
        });
        if (rtn_frame !== undefined)
            return rtn_frame

        //Need to actually create a new Frame
        let null_div = document.createElement('div')
        null_div.style.display = 'none'
        let new_specs: flex_div = {
            div: null_div,
            isFrame: true,
            flex_width: 0,
            flex_height: 0,
            orientation: Orientation.null,
            resize_pos: [],
            resize_neg: [],
        }

        return this._create_frame(new_specs, new_id)
    }

    /** 
     * Create and configure all the necessary frames & separators for a given layout.
     * protected => should only be called from python
     */
    protected set_layout(layout: Container_Layouts) {
        // ------------ Clear Previous Layout ------------
        this.flex_divs.forEach((item) => {
            //Remove all the divs from the document
            this.div.removeChild(item.div)
        })
        //erase all original flex_divs
        this.flex_divs.length = 0

        // ------------ Create Layout ------------
        this._layout_switch(layout)

        // ------------ Assign and Append Children ------------
        let flex_frame_ind = 0
        this.flex_divs.forEach((flex_item) => {
            if (flex_item.isFrame) {
                if (flex_frame_ind < this.frames.length) {
                    //Frames are persistent through layout changes.
                    //Update Existing Frames to new layout before creating new ones.
                    this.frames[flex_frame_ind].reassign_div(flex_item.div)
                } else {
                    //Create an unnamed frame under the assumtion
                    //Python will come in and rename the ID of this later.
                    this._create_frame(flex_item)
                }
                //flex_frame_ind tracks the equivelent frames[] index based on
                //how many chart frames have be observed in the flex_divs[] loop
                flex_frame_ind += 1
            }
            this.div.appendChild(flex_item.div)
        })
        this.layout = layout

        //If succsessful, update container variable and UI
        window.layout_selector.update_icon(layout)
        //Delay on executing this is to make it so the Frame has time to create it's Pane
        //So that too can be made active
        setTimeout(this.assign_active_container.bind(this), 50)
        this.resize()
    }

    /**
     * Creates a Flex Div for a Chart Frame. The Frame must be created seprately
     */
    private _add_flex_frame(flex_width: number, flex_height: number): flex_div {
        let child_div = document.createElement('div')
        child_div.classList.add('chart_frame')
        let new_flexdiv = {
            div: child_div,
            isFrame: true,
            flex_width: flex_width,
            flex_height: flex_height,
            orientation: Orientation.null,
            resize_pos: [],
            resize_neg: [],
        }
        this.flex_divs.push(new_flexdiv)
        return new_flexdiv
    }

    /**
     * Creates a Flex Div for use as a separator between frame elements
     */
    private _add_flex_separator(type: Orientation, size: number): flex_div {
        let child_div = document.createElement('div')
        child_div.classList.add('chart_separator')
        child_div.style.cursor = (type === Orientation.Vertical ? 'ew-resize' : 'ns-resize')

        let new_flexdiv = {
            div: child_div,
            isFrame: false,
            flex_height: (type === Orientation.Vertical ? size : 0),
            flex_width: (type === Orientation.Horizontal ? size : 0),
            orientation: type,
            resize_pos: [],
            resize_neg: []
        }
        this.flex_divs.push(new_flexdiv)

        //Ensure resize flex has appropriate args
        let resize_partial_func = this.resize_flex.bind(this, new_flexdiv)

        //Place Mouse Down on the separator object
        child_div.addEventListener('mousedown', function () {
            document.addEventListener('mousemove', resize_partial_func)
        })
        //Place the mouse up Listener on the window incase the mouse button is released
        //Off of the separator div. (like in the instance the min frame size is exceeded.)
        document.addEventListener('mouseup', function () {
            document.removeEventListener('mousemove', resize_partial_func)
        })
        return new_flexdiv
    }

    /**
     * Creates a new Frame that's tied to the DIV element given in specs.
     */
    private _create_frame(specs: flex_div, id: string = ''): Frame {
        let new_frame = new Frame(id, specs.div, this.tab_div)
        this.frames.push(new_frame)
        return new_frame
    }

    /**
     * Giant Switch Statement that creates each of the individual layouts
     * Only called by set_layout() but it's large enough to deserve its own function
     */
    private _layout_switch(layout: Container_Layouts) {
        switch (layout) {
            case Container_Layouts.DOUBLE_VERT: {
                this.div.classList.replace('layout_container_col', 'layout_container_row')
                let f1 = this._add_flex_frame(0.5, 1)
                let s1 = this._add_flex_separator(Orientation.Vertical, 1)
                let f2 = this._add_flex_frame(0.5, 1)
                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2)
            } break;

            case Container_Layouts.DOUBLE_HORIZ: {
                this.div.classList.replace('layout_container_col', 'layout_container_row')
                let f1 = this._add_flex_frame(1, 0.5)
                let s1 = this._add_flex_separator(Orientation.Horizontal, 1)
                let f2 = this._add_flex_frame(1, 0.5)
                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2)
            } break;

            case Container_Layouts.TRIPLE_VERT: {
                this.div.classList.replace('layout_container_col', 'layout_container_row')
                let f1 = this._add_flex_frame(0.333, 1)
                let s1 = this._add_flex_separator(Orientation.Vertical, 1)
                let f2 = this._add_flex_frame(0.333, 1)
                let s2 = this._add_flex_separator(Orientation.Vertical, 1)
                let f3 = this._add_flex_frame(0.333, 1)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2)

                s2.resize_pos.push(f2)
                s2.resize_neg.push(f3)
            } break;

            case Container_Layouts.TRIPLE_VERT_LEFT: {
                this.div.classList.replace('layout_container_row', 'layout_container_col')
                let f1 = this._add_flex_frame(0.5, 1)
                let s1 = this._add_flex_separator(Orientation.Vertical, 1)
                let f2 = this._add_flex_frame(0.5, 0.5)
                let s2 = this._add_flex_separator(Orientation.Horizontal, 0.5)
                let f3 = this._add_flex_frame(0.5, 0.5)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2, f3, s2)

                s2.resize_pos.push(f2)
                s2.resize_neg.push(f3)
            } break;

            case Container_Layouts.TRIPLE_VERT_RIGHT: {
                this.div.classList.replace('layout_container_row', 'layout_container_col')
                let f1 = this._add_flex_frame(0.5, 0.5)
                let s1 = this._add_flex_separator(Orientation.Horizontal, 0.5)
                let f2 = this._add_flex_frame(0.5, 0.5)
                let s2 = this._add_flex_separator(Orientation.Vertical, 1)
                let f3 = this._add_flex_frame(0.5, 1)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2)

                s2.resize_pos.push(f1, f2, s1)
                s2.resize_neg.push(f3)
            } break;

            case Container_Layouts.TRIPLE_HORIZ: {
                this.div.classList.replace('layout_container_col', 'layout_container_row')
                let f1 = this._add_flex_frame(1, 0.333)
                let s1 = this._add_flex_separator(Orientation.Horizontal, 1)
                let f2 = this._add_flex_frame(1, 0.333)
                let s2 = this._add_flex_separator(Orientation.Horizontal, 1)
                let f3 = this._add_flex_frame(1, 0.333)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2)

                s2.resize_pos.push(f2)
                s2.resize_neg.push(f3)
            } break;

            case Container_Layouts.TRIPLE_HORIZ_TOP: {
                this.div.classList.replace('layout_container_col', 'layout_container_row')
                let f1 = this._add_flex_frame(1, 0.5)
                let s1 = this._add_flex_separator(Orientation.Horizontal, 1)
                let f2 = this._add_flex_frame(0.5, 0.5)
                let s2 = this._add_flex_separator(Orientation.Vertical, 0.5)
                let f3 = this._add_flex_frame(0.5, 0.5)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2, f3, s2)

                s2.resize_pos.push(f2)
                s2.resize_neg.push(f3)
            } break;

            case Container_Layouts.TRIPLE_HORIZ_BOTTOM: {
                this.div.classList.replace('layout_container_col', 'layout_container_row')
                let f1 = this._add_flex_frame(0.5, 0.5)
                let s1 = this._add_flex_separator(Orientation.Vertical, 0.5)
                let f2 = this._add_flex_frame(0.5, 0.5)
                let s2 = this._add_flex_separator(Orientation.Horizontal, 1)
                let f3 = this._add_flex_frame(1, 0.5)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2)

                s2.resize_pos.push(f1, f2, s1)
                s2.resize_neg.push(f3)
            } break;

            case Container_Layouts.QUAD_SQ_H: {
                this.div.classList.replace('layout_container_col', 'layout_container_row')
                let f1 = this._add_flex_frame(0.5, 0.5)
                let s1 = this._add_flex_separator(Orientation.Vertical, 0.5)
                let f2 = this._add_flex_frame(0.5, 0.5)
                let s2 = this._add_flex_separator(Orientation.Horizontal, 1)
                let f3 = this._add_flex_frame(0.5, 0.5)
                let s3 = this._add_flex_separator(Orientation.Vertical, 0.5)
                let f4 = this._add_flex_frame(0.5, 0.5)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2)

                s3.resize_pos.push(f3)
                s3.resize_neg.push(f4)

                s2.resize_pos.push(f1, f2, s1)
                s2.resize_neg.push(f3, f4, s3)
            } break;

            case Container_Layouts.QUAD_SQ_V: {
                this.div.classList.replace('layout_container_row', 'layout_container_col')
                let f1 = this._add_flex_frame(0.5, 0.5)
                let s1 = this._add_flex_separator(Orientation.Horizontal, 0.5)
                let f2 = this._add_flex_frame(0.5, 0.5)
                let s2 = this._add_flex_separator(Orientation.Vertical, 1)
                let f3 = this._add_flex_frame(0.5, 0.5)
                let s3 = this._add_flex_separator(Orientation.Horizontal, 0.5)
                let f4 = this._add_flex_frame(0.5, 0.5)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2)

                s3.resize_pos.push(f3)
                s3.resize_neg.push(f4)

                s2.resize_pos.push(f1, f2, s1)
                s2.resize_neg.push(f3, f4, s3)
            } break;


            case Container_Layouts.QUAD_VERT: {
                this.div.classList.replace('layout_container_row', 'layout_container_col')
                let f1 = this._add_flex_frame(0.25, 1)
                let s1 = this._add_flex_separator(Orientation.Vertical, 1)
                let f2 = this._add_flex_frame(0.25, 1)
                let s2 = this._add_flex_separator(Orientation.Vertical, 1)
                let f3 = this._add_flex_frame(0.25, 1)
                let s3 = this._add_flex_separator(Orientation.Vertical, 1)
                let f4 = this._add_flex_frame(0.25, 1)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2)

                s2.resize_pos.push(f2)
                s2.resize_neg.push(f3)

                s3.resize_pos.push(f3)
                s3.resize_neg.push(f4)
            } break;

            case Container_Layouts.QUAD_HORIZ: {
                this.div.classList.replace('layout_container_col', 'layout_container_row')
                let f1 = this._add_flex_frame(1, 0.25)
                let s1 = this._add_flex_separator(Orientation.Horizontal, 1)
                let f2 = this._add_flex_frame(1, 0.25)
                let s2 = this._add_flex_separator(Orientation.Horizontal, 1)
                let f3 = this._add_flex_frame(1, 0.25)
                let s3 = this._add_flex_separator(Orientation.Horizontal, 1)
                let f4 = this._add_flex_frame(1, 0.25)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2)

                s2.resize_pos.push(f2)
                s2.resize_neg.push(f3)

                s3.resize_pos.push(f3)
                s3.resize_neg.push(f4)
            } break;

            case Container_Layouts.QUAD_LEFT: {
                this.div.classList.replace('layout_container_row', 'layout_container_col')
                let f1 = this._add_flex_frame(0.5, 1)
                let s1 = this._add_flex_separator(Orientation.Vertical, 1)
                let f2 = this._add_flex_frame(0.5, 0.333)
                let s2 = this._add_flex_separator(Orientation.Horizontal, 0.5)
                let f3 = this._add_flex_frame(0.5, 0.333)
                let s3 = this._add_flex_separator(Orientation.Horizontal, 0.5)
                let f4 = this._add_flex_frame(0.5, 0.333)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2, f3, f4, s2, s3)

                s2.resize_pos.push(f2)
                s2.resize_neg.push(f3)

                s3.resize_pos.push(f3)
                s3.resize_neg.push(f4)
            } break;

            case Container_Layouts.QUAD_RIGHT: {
                this.div.classList.replace('layout_container_row', 'layout_container_col')
                let f1 = this._add_flex_frame(0.5, 0.333)
                let s1 = this._add_flex_separator(Orientation.Horizontal, 0.5)
                let f2 = this._add_flex_frame(0.5, 0.333)
                let s2 = this._add_flex_separator(Orientation.Horizontal, 0.5)
                let f3 = this._add_flex_frame(0.5, 0.333)
                let s3 = this._add_flex_separator(Orientation.Vertical, 1)
                let f4 = this._add_flex_frame(0.5, 1)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2)

                s2.resize_pos.push(f2)
                s2.resize_neg.push(f3)

                s3.resize_pos.push(f1, f2, f3, s1, s2)
                s3.resize_neg.push(f4)
            } break;

            case Container_Layouts.QUAD_TOP: {
                this.div.classList.replace('layout_container_col', 'layout_container_row')
                let f1 = this._add_flex_frame(1, 0.5)
                let s1 = this._add_flex_separator(Orientation.Horizontal, 1)
                let f2 = this._add_flex_frame(0.333, 0.5)
                let s2 = this._add_flex_separator(Orientation.Vertical, 0.5)
                let f3 = this._add_flex_frame(0.333, 0.5)
                let s3 = this._add_flex_separator(Orientation.Vertical, 0.5)
                let f4 = this._add_flex_frame(0.333, 0.5)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2, f3, f4, s2, s3)

                s2.resize_pos.push(f2)
                s2.resize_neg.push(f3)

                s3.resize_pos.push(f3)
                s3.resize_neg.push(f4)
            } break;

            case Container_Layouts.QUAD_BOTTOM: {
                this.div.classList.replace('layout_container_col', 'layout_container_row')
                let f1 = this._add_flex_frame(0.333, 0.5)
                let s1 = this._add_flex_separator(Orientation.Vertical, 0.5)
                let f2 = this._add_flex_frame(0.333, 0.5)
                let s2 = this._add_flex_separator(Orientation.Vertical, 0.5)
                let f3 = this._add_flex_frame(0.333, 0.5)
                let s3 = this._add_flex_separator(Orientation.Horizontal, 1)
                let f4 = this._add_flex_frame(1, 0.5)

                s1.resize_pos.push(f1)
                s1.resize_neg.push(f2)

                s2.resize_pos.push(f2)
                s2.resize_neg.push(f3)

                s3.resize_pos.push(f1, f2, f3, s1, s2)
                s3.resize_neg.push(f4)
            } break;

            default:
                //Default Case is a single chart.
                this._add_flex_frame(1, 1)
        }
    }
}
