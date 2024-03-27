//@ts-ignore
import * as u from "./util.js";
import { Container_Layouts, Orientation, flex_div } from "./util.js";

import { Frame } from "./frame.js";

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
    frames: Frame[] = []
    flex_divs: flex_div[] = []

    constructor(parent_div: HTMLDivElement, id: string) {
        this.id = id
        this.div = parent_div
        this.div.style.flexWrap = `wrap`    //Flex-Wrap used to position layouts

        //Bind Funcitons to ensure expected 'this' functionality
        this.add_frame = this.add_frame.bind(this)
        this.set_layout = this.set_layout.bind(this)
        this._create_frame = this._create_frame.bind(this)
        this._add_flex_frame = this._add_flex_frame.bind(this)
        this._add_flex_separator = this._add_flex_separator.bind(this)
    }

    /**
     * Resize all the child Elements based on the size of the container's Div. 
     */
    resize() {
        let this_width = this.div.clientWidth
        let this_height = this.div.clientHeight

        //Resize Frame & Serparator Divs
        this.flex_divs.forEach((flex_item) => {
            if (flex_item.isFrame) {
                //Margin is subtracted from width to ensure size row wrap functions correctly
                flex_item.div.style.width = `${this_width * flex_item.flex_width - u.LAYOUT_CHART_MARGIN}px`
                flex_item.div.style.height = `${this_height * flex_item.flex_height}px`
            } else if (flex_item.orientation === Orientation.Vertical) {
                //vertical Separators have fixed width
                flex_item.div.style.width = `${u.LAYOUT_CHART_MARGIN}px`
                flex_item.div.style.height = `${this_height * flex_item.flex_height}px`
            } else if (flex_item.orientation === Orientation.Horizontal) {
                //Horizontal Separators have fixed height
                flex_item.div.style.width = `${this_width * flex_item.flex_width}px`
                flex_item.div.style.height = `${u.LAYOUT_CHART_MARGIN}px`
            }
        })

        //Resize all contents of each Frame
        this.frames.forEach((frame) => {
            frame.resize()
        });
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
                //Why you can break a forEach ill never know.
                return true
            }
        });
        if (rtn_frame)
            return rtn_frame

        //Need to actually create a new Frame
        //This is kinda temporary, later this should actually create a frame
        //and just adjust the flex size of this element and another.
        let null_div = document.createElement('div')
        null_div.style.display = 'none'
        let new_specs: flex_div = {
            div: null_div,
            isFrame: true,
            flex_width: 0,
            flex_height: 0,
            orientation: Orientation.null
        }
        return this._create_frame(new_specs, new_id)
    }

    /** 
     * Create and configure all the necessary frames & separators for a given layout.
     */
    set_layout(layout: Container_Layouts) {
        // ------------ Clear Previous Layout ------------
        this.flex_divs.forEach((item) => {
            //Remove all the divs from the document
            this.div.removeChild(item.div)
        })
        //erase all original flex_divs
        this.flex_divs.length = 0

        // ------------ Create Layout ------------
        switch (layout) {
            case Container_Layouts.DOUBLE_VERT: {
                this._add_flex_frame(0.5, 1)
                this._add_flex_separator(Orientation.Vertical, 1)
                this._add_flex_frame(0.5, 1)
            } break;
            case Container_Layouts.DOUBLE_HORIZ: {
                this._add_flex_frame(1, 0.5)
                this._add_flex_separator(Orientation.Horizontal, 1)
                this._add_flex_frame(1, 0.5)
            } break;
            default:
                //Default Case is a single chart.
                this._add_flex_frame(1, 1)
        }

        // ------------ Assign and Append Children ------------
        let flex_frame_ind = 0
        this.flex_divs.forEach((flex_item) => {
            if (flex_item.isFrame) {
                if (flex_frame_ind < this.frames.length) {
                    //Frames are persistent through layout changes.
                    //Update Existing Frames to new layout before creating new ones.
                    this.frames[flex_frame_ind].reassign_div(flex_item.div)
                    this.frames[flex_frame_ind].flex_width = flex_item.flex_width
                    this.frames[flex_frame_ind].flex_height = flex_item.flex_height
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
        this.resize()
        this.fitcontent()
    }

    /**
     * Creates a Flex Div for a Chart Frame. The Frame must be created seprately
     */
    _add_flex_frame(flex_width: number, flex_height: number) {
        let child_div = document.createElement('div')
        child_div.classList.add('chart_frame')
        this.flex_divs.push({
            div: child_div,
            isFrame: true,
            flex_width: flex_width,
            flex_height: flex_height,
            orientation: Orientation.null
        })
    }

    /**
     * Creates a Flex Div for use as a separator between elements
     */
    _add_flex_separator(type: Orientation, size: number) {
        let child_div = document.createElement('div')
        child_div.classList.add('separator')

        this.flex_divs.push({
            div: child_div,
            isFrame: false,
            flex_height: (type === Orientation.Vertical ? size : 0),
            flex_width: (type === Orientation.Horizontal ? size : 0),
            orientation: type
        })
    }

    /**
     * Creates a new Frame that's tied to the given DIV element in specs.
     */
    _create_frame(specs: flex_div, id: string = ''): Frame {
        let new_frame = new Frame(id, specs.div, specs.flex_width, specs.flex_height)
        this.frames.push(new_frame)
        return new_frame
    }

    hide() {
        this.div.style.display = 'none'
    }

    show() {
        this.div.style.display = 'flex'
    }

    /**
     * Fit the content of all child Frames
     */
    fitcontent() {
        this.frames.forEach(frame => {
            frame.fitcontent()
        });
    }
}
