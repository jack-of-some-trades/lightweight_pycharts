import { createStore, SetStoreFunction } from "solid-js/store"
import { render } from "solid-js/web"
import { Container } from "../components/layout/container"
import "../css/layout/container.css"
import { chart_frame, frame } from "./frame"

export type update_tab_func = (
    title?: string,
    price?: string,
    favicon?: string
) => void

/**
 * Abstract base class to define basic requirements and functionality of anything displayed in
 * the center of the app.
 */
export class container{
    id: string
    div: HTMLDivElement
    layout: Container_Layouts

    frames: frame[] = []
    flex_frames: flex_frame[] = []

    // display: Accessor<flex_frame[]>
    setDisplay: SetStoreFunction<flex_frame[]>
    // displayEls: Accessor<JSX.Element|HTMLDivElement[]>
    setDisplayEls: SetStoreFunction<frame[]>
    // displayActive: Accessor<boolean[]>
    // setDisplayActive: SetStoreFunction<boolean[]>
    // displayTarget: Accessor<boolean[]>
    // setDisplayTarget: SetStoreFunction<boolean[]>

    derender: () => void
    update_tab: update_tab_func

    constructor(
        id:string, 
        parent_div: HTMLDivElement, 
        update_tab_func:update_tab_func
    ) {
        this.id = id
        this.layout = Container_Layouts.SINGLE
        this.update_tab = update_tab_func
        this.div = document.createElement('div')
        this.div.classList.add("container")
        this.div.setAttribute("data-id", id)
        parent_div.appendChild(this.div)

        const [display, setDisplay] = createStore<flex_frame[]>([])
        // const [displayActive, setDisplayActive]  = createStore<(boolean[])>([])
        // const [displayTarget, setDisplayTarget]  = createStore<(boolean[])>([])
        const [displayElements, setDisplayElements] = createStore<frame[]>([])

        this.setDisplay = setDisplay
        this.setDisplayEls = setDisplayElements
        // this.setDisplayActive = setDisplayActive
        // this.setDisplayTarget = setDisplayTarget

        const container_props = {
            flex_displays: display,
            // active_element: displayActive,
            // target_element: displayTarget,
            display_elements: displayElements,
        }

        //Merge the Vanilla JS back into the Solid-JS Framework
        this.derender = render(()=>Container(container_props), this.div)

        this.set_layout(Container_Layouts.SINGLE)
    }

    onActivation(){}
    onDeactivation(){}

    remove(){ this.derender() }

    /**
     * Resize all the child Elements based on the size of the container's Div. 
     */
    resize() {
        // Calculate the new sizes of all the frames, Local flex_frame[] is needed since
        // 'resize_frames' can't directly update the Signal. This solution is more cleanly reusable
        resize_frames(this.div.clientWidth, this.div.clientHeight, this.flex_frames)
        this.setDisplay(this.flex_frames)

        //Resize all contents of each *visible* Frame
        // for (let i = 0; i < num_frames(this.layout); i++)
        //     this.frames[i].resize()
    }

    /**
     * Called by Python when creating a Frame. Returns either a new or an anonymous Frame.
     * 
     * *Anonymous Frames are those created by a layout change, (to fill the frame count)
     *  but have yet to be assigned a proper ID. 
     */
    protected add_frame(new_id: string): frame {
        let rtn_frame = undefined
        this.frames.some(frame => {
            if (frame.id == '') { //If Anonymous
                frame.id = new_id
                rtn_frame = frame
                return true //breaks execution of a 'some' loop
            }
        });
        if (rtn_frame !== undefined)
            return rtn_frame
        else
            return this._create_frame(new_id)
    }

    /** 
     * Create and configure all the necessary frames & separators for a given layout.
     * protected => should only be called from python
     */
    protected set_layout(layout: Container_Layouts) {

        // ------------ Create Layout Template ------------
        this.flex_frames = layout_switch(layout, this.resize.bind(this))

        // ------------ Reorder the list of frames based on target Els ------------ //
        // Todo: query the list of targeted frames and reorder this.frames[] so that
        // those target frames are the ones that will be displayed first after the
        // layout change. 

        // ------------ Set mouseDown in each flex_frame that holds a display ------------
        let frame_ind = 0
        this.flex_frames.forEach((flex_frame) => {
            if (flex_frame.orientation === Orientation.null) { // Frame Object
                if (frame_ind < this.frames.length) {
                    //Use Existing Frame Object
                    let frame = this.frames[frame_ind]
                    flex_frame.mouseDown = frame.assign_active_frame.bind(frame)
                } else {
                    //Not Enough Frames to fill the current layout, Create Anonymous Frame
                    //Python will come in and rename the ID of this later.
                    let new_frame = this._create_frame("")
                    flex_frame.mouseDown = new_frame.assign_active_frame.bind(new_frame)
                }
                frame_ind += 1
                //frame_ind tracks the equivelent frames[] index based on
                //how many chart frames have be observed in the flex_frames[] loop
            }
        })

        // ------------ Set Display, Active, and Target Signals ------------
        // let frames_to_display = this.frames.slice(0, num_frames(layout))
        this.setDisplay(this.flex_frames)
        this.setDisplayEls(this.frames)
        // this.setDisplayActive(Array.from(frames_to_display, (frame)=>frame.active()))
        // this.setDisplayTarget(Array.from(frames_to_display, (frame)=>frame.target()))

        //Delay on executing this is to make it so the Frame has time to create it's Pane
        //So that too can be made active
        setTimeout(() => window.container_manager.set_active_container(this.id), 50)

        //Calculate the flex_frame rect sizes, and set them to the Display Signal
        this.resize()

        //If succsessful, update container variable and UI
        this.layout = layout
        window.topbar.setLayout(layout)
    }


    /**
     * Creates a new Frame that's tied to the DIV element given in specs.
     */
    private _create_frame(id: string = ''): frame {
        let new_frame = new chart_frame(id, this.update_tab)
        this.frames.push(new_frame)
        return new_frame
    }
}

//#region ----------------------- Const Definitions ----------------------- //

const RESIZE_HANDLE_WIDTH = 4

//Minimum flex Widths/Heights of each frame
const MIN_FRAME_WIDTH = 0.15
const MIN_FRAME_HEIGHT = 0.1

export enum Orientation {
    Horizontal,
    Vertical,
    null
}

interface rect {
    top:number,
    left:number,
    width:number,
    height:number
}

export interface flex_frame {
    rect: rect,
    flex_width: number,
    flex_height: number,
    resize_pos: flex_frame[],
    resize_neg: flex_frame[],
    orientation: Orientation,
    mouseDown: (e:MouseEvent) => void
}

export enum Container_Layouts {
    SINGLE,
    DOUBLE_VERT,
    DOUBLE_HORIZ,
    TRIPLE_VERT,
    TRIPLE_VERT_LEFT,
    TRIPLE_VERT_RIGHT,
    TRIPLE_HORIZ,
    TRIPLE_HORIZ_TOP,
    TRIPLE_HORIZ_BOTTOM,
    QUAD_SQ_V,
    QUAD_SQ_H,
    QUAD_VERT,
    QUAD_HORIZ,
    QUAD_LEFT,
    QUAD_RIGHT,
    QUAD_TOP,
    QUAD_BOTTOM
}

export function num_frames(layout: Container_Layouts | null): number {
    switch (layout) {
        case (Container_Layouts.SINGLE): return 1
        case (Container_Layouts.DOUBLE_VERT): return 2
        case (Container_Layouts.DOUBLE_HORIZ): return 2
        case (Container_Layouts.TRIPLE_VERT): return 3
        case (Container_Layouts.TRIPLE_VERT_LEFT): return 3
        case (Container_Layouts.TRIPLE_VERT_RIGHT): return 3
        case (Container_Layouts.TRIPLE_HORIZ): return 3
        case (Container_Layouts.TRIPLE_HORIZ_TOP): return 3
        case (Container_Layouts.TRIPLE_HORIZ_BOTTOM): return 3
        case (Container_Layouts.QUAD_SQ_V): return 4
        case (Container_Layouts.QUAD_SQ_H): return 4
        case (Container_Layouts.QUAD_VERT): return 4
        case (Container_Layouts.QUAD_HORIZ): return 4
        case (Container_Layouts.QUAD_LEFT): return 4
        case (Container_Layouts.QUAD_RIGHT): return 4
        case (Container_Layouts.QUAD_TOP): return 4
        case (Container_Layouts.QUAD_BOTTOM): return 4
        default: return 0
    }
}

//#endregion


//#region ----------------------- Resize Functions ----------------------- //


/**
 * Creates a flex_frame for a Frame Widget. Widget Created Seprately
 */
function frame_section(flex_width: number, flex_height: number): flex_frame {
    let new_section:flex_frame = {
        rect:{top:0, left:0, width:0, height:0},
        mouseDown: () => {},
        flex_width: flex_width,
        flex_height: flex_height,
        orientation: Orientation.null,
        resize_pos: [],
        resize_neg: [],
    }
    return new_section
}

/**
 * Creates a flex_frame for use as a separator between frame elements
 */
function separator_section(type: Orientation, size: number, resize: ()=>void): flex_frame {
    let new_section:flex_frame = {
        rect:{top:0, left:0, width:0, height:0},
        mouseDown: () => {},
        flex_height: (type === Orientation.Vertical ? size : 0),
        flex_width: (type === Orientation.Horizontal ? size : 0),
        orientation: type,
        resize_pos: [],
        resize_neg: [],
    }

    //Bind Resize Args
    let resize_partial_func;
    if (type === Orientation.Vertical)
        //A vertically oriented separator resizes in the horizontal direction and vise-vera
        resize_partial_func = resize_flex_horizontal.bind(undefined, resize, new_section)
    else
        resize_partial_func = resize_flex_vertical.bind(undefined, resize, new_section)

    const mouseup = () => {
        document.removeEventListener('mousemove', resize_partial_func)
        document.removeEventListener('mouseup', mouseup)
    }

    //Should be Added to the element when mounted
    new_section.mouseDown = () => {
        document.addEventListener('mousemove', resize_partial_func)
        document.addEventListener('mouseup', mouseup)
    }

    return new_section
}

/**
 * Resize the Flex Width %s of all neighboring frames & separators 
 * This only changes the %. The call to resize it what resizes everything
 */
function resize_flex_horizontal(resize: ()=>void, separator: flex_frame, e: MouseEvent) {
    //flex total is the total percentage of the screen that the left & Right frames occupy
    //e.g a Triple_vertical will have an initial flex_total of 0.33 + 0.33 = 0.66
    let flex_total = separator.resize_pos[0].flex_width + separator.resize_neg[0].flex_width
    let width_total = separator.resize_pos[0].rect.width + separator.resize_neg[0].rect.width
    //By definition resize_pos[0] and resize_neg[0] will always be valid

    //x position relative to the left most fixed boundary (fixed compared to the elements being resized)
    let relative_x = e.clientX - separator.resize_pos[0].rect.left
    let flex_size_left = (relative_x / width_total) * flex_total
    let flex_size_right = flex_total - flex_size_left

    //Limit the size of each frame to the minimum.
    if (flex_size_left < MIN_FRAME_WIDTH) {
        flex_size_left = MIN_FRAME_WIDTH
        flex_size_right = flex_total - flex_size_left
    } else if (flex_size_right < MIN_FRAME_WIDTH) {
        flex_size_right = MIN_FRAME_WIDTH
        flex_size_left = flex_total - flex_size_right
    }

    separator.resize_pos.forEach(section => {
        section.flex_width = flex_size_left
    });
    separator.resize_neg.forEach(section => {
        section.flex_width = flex_size_right
    });

    resize()
}

/**
 * Resize the Flex Height %s of all neighboring frames & separators 
 * This only changes the %. The call to resize it what resizes everything
 */
function resize_flex_vertical(resize: ()=>void, separator: flex_frame, e: MouseEvent) {
    let flex_total = separator.resize_pos[0].flex_height + separator.resize_neg[0].flex_height
    let height_total = separator.resize_pos[0].rect.height + separator.resize_neg[0].rect.height

    let container_y = e.clientY - separator.resize_pos[0].rect.top
    let flex_size_top = (container_y / height_total) * flex_total
    let flex_size_bottom = flex_total - flex_size_top

    //Limit the size of each frame to the minimum.
    if (flex_size_top < MIN_FRAME_HEIGHT) {
        flex_size_top = MIN_FRAME_HEIGHT
        flex_size_bottom = flex_total - flex_size_top
    } else if (flex_size_bottom < MIN_FRAME_HEIGHT) {
        flex_size_bottom = MIN_FRAME_HEIGHT
        flex_size_top = flex_total - flex_size_bottom
    }

    separator.resize_pos.forEach(section => {
        section.flex_height = flex_size_top
    });
    separator.resize_neg.forEach(section => {
        section.flex_height = flex_size_bottom
    });

    resize()
}



/**
 * Resize all the flex_frame sections based on the given total container dimensions
 */
function resize_frames(width:number, height:number, frames:flex_frame[]) {
    if (width <= 0 || height <= 0) return

    //Resize Frame & Separator sections Based soley on flex size
    frames.forEach((section, i) => {
        let new_rect: rect, top, left;
        if (section.orientation === Orientation.Vertical) {             //Vertical Separators 
            let ref_rect = section.resize_pos[0]?.rect
            top = ref_rect?.top
            left = ref_rect?.left + ref_rect?.width
            new_rect= {
                top: top ?? 0,
                left: left ?? 0,
                width: RESIZE_HANDLE_WIDTH,
                height: Math.round(height * section.flex_height),
            }

        } else if (section.orientation === Orientation.Horizontal) {    //Horizontal Separators
            let ref_rect = section.resize_pos[0]?.rect
            top = ref_rect?.top + ref_rect?.height
            left = ref_rect?.left
            new_rect= {
                top: top ?? 0,
                left: left ?? 0,
                width: Math.round(width * section.flex_width),
                height: RESIZE_HANDLE_WIDTH,
            }

        } else {                                                        //Frame Widget
            if (section.resize_pos[0]?.orientation === Orientation.Horizontal){
                top = section.resize_pos[0]?.rect.top
                left = section.resize_pos[1]?.rect.left
            } else {
                top = section.resize_pos[1]?.rect.top
                left = section.resize_pos[0]?.rect.left
            }

            new_rect = {
                top: top ?? 0,
                left: left ?? 0,
                width: Math.round(width * section.flex_width),
                height: Math.round(height * section.flex_height),
            }
        }
        //Commit the new sizing to the object
        frames[i].rect = new_rect
    })
}

/**
 * Giant Switch Statement that creates each of the individual layouts
 * Only called by set_layout() but it's large enough to deserve its own function
 */
function layout_switch(layout: Container_Layouts, resize: ()=>void): flex_frame[] {
    switch (layout) {
        case Container_Layouts.DOUBLE_VERT: {
            let f1 = frame_section(0.5, 1)
            let s1 = separator_section(Orientation.Vertical, 1, resize)
            let f2 = frame_section(0.5, 1)

            // For Separators, resize_pos/neg hold frames. 
            // pos frames move directly correlated with the separator movement, 
            // neg frames move indirectly
            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2)

            // For Frames, resize_pos hold separators. At most one Horizontal and one Vertical.
            // These separators are the top (from a Vertical Separator) & left (from a Horizontal Separator)
            // of the respective frame. If a frame doesn't have a Vertical or Horizontal Separator Attached
            // then the respective top or left are considered 0.
            f2.resize_pos.push(s1)

            // Display locations are updated in the order of the list below. 
            // f1 has no dependents => first, 
            // s1.left depends on f1.width => Second, 
            // f2.left depends on s1.left => last
            return [f1, s1, f2]
        }

        case Container_Layouts.DOUBLE_HORIZ: {
            let f1 = frame_section(1, 0.5)
            let s1 = separator_section(Orientation.Horizontal, 1, resize)
            let f2 = frame_section(1, 0.5)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2)

            f2.resize_pos.push(s1)

            return [f1, s1, f2]
        } 

        case Container_Layouts.TRIPLE_VERT: {
            let f1 = frame_section(0.333, 1)
            let s1 = separator_section(Orientation.Vertical, 1, resize)
            let f2 = frame_section(0.333, 1)
            let s2 = separator_section(Orientation.Vertical, 1, resize)
            let f3 = frame_section(0.333, 1)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2)

            s2.resize_pos.push(f2)
            s2.resize_neg.push(f3)

            return [f1, f2, f3, s1, s2]
        }

        case Container_Layouts.TRIPLE_VERT_LEFT: {
            let f1 = frame_section(0.5, 1)
            let s1 = separator_section(Orientation.Vertical, 1, resize)
            let f2 = frame_section(0.5, 0.5)
            let s2 = separator_section(Orientation.Horizontal, 0.5, resize)
            let f3 = frame_section(0.5, 0.5)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2, f3, s2)

            s2.resize_pos.push(f2)
            s2.resize_neg.push(f3)

            return [f1, f2, f3, s1, s2]
        } 

        case Container_Layouts.TRIPLE_VERT_RIGHT: {
            let f1 = frame_section(0.5, 0.5)
            let s1 = separator_section(Orientation.Horizontal, 0.5, resize)
            let f2 = frame_section(0.5, 0.5)
            let s2 = separator_section(Orientation.Vertical, 1, resize)
            let f3 = frame_section(0.5, 1)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2)

            s2.resize_pos.push(f1, f2, s1)
            s2.resize_neg.push(f3)
            
            return [f1, f2, f3, s1, s2]
        }

        case Container_Layouts.TRIPLE_HORIZ: {
            let f1 = frame_section(1, 0.333)
            let s1 = separator_section(Orientation.Horizontal, 1, resize)
            let f2 = frame_section(1, 0.333)
            let s2 = separator_section(Orientation.Horizontal, 1, resize)
            let f3 = frame_section(1, 0.333)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2)

            s2.resize_pos.push(f2)
            s2.resize_neg.push(f3)
            
            return [f1, f2, f3, s1, s2]
        }

        case Container_Layouts.TRIPLE_HORIZ_TOP: {
            let f1 = frame_section(1, 0.5)
            let s1 = separator_section(Orientation.Horizontal, 1, resize)
            let f2 = frame_section(0.5, 0.5)
            let s2 = separator_section(Orientation.Vertical, 0.5, resize)
            let f3 = frame_section(0.5, 0.5)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2, f3, s2)

            s2.resize_pos.push(f2)
            s2.resize_neg.push(f3)
            
            return [f1, f2, f3, s1, s2]
        }

        case Container_Layouts.TRIPLE_HORIZ_BOTTOM: {
            let f1 = frame_section(0.5, 0.5)
            let s1 = separator_section(Orientation.Vertical, 0.5, resize)
            let f2 = frame_section(0.5, 0.5)
            let s2 = separator_section(Orientation.Horizontal, 1, resize)
            let f3 = frame_section(1, 0.5)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2)

            s2.resize_pos.push(f1, f2, s1)
            s2.resize_neg.push(f3)

            
            return [f1, f2, f3, s1, s2]
        }

        case Container_Layouts.QUAD_SQ_H: {
            let f1 = frame_section(0.5, 0.5)
            let s1 = separator_section(Orientation.Vertical, 0.5, resize)
            let f2 = frame_section(0.5, 0.5)
            let s2 = separator_section(Orientation.Horizontal, 1, resize)
            let f3 = frame_section(0.5, 0.5)
            let s3 = separator_section(Orientation.Vertical, 0.5, resize)
            let f4 = frame_section(0.5, 0.5)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2)

            s3.resize_pos.push(f3)
            s3.resize_neg.push(f4)

            s2.resize_pos.push(f1, f2, s1)
            s2.resize_neg.push(f3, f4, s3)
            
            return [f1, f2, f3, f4, s1, s2, s3]
        }

        case Container_Layouts.QUAD_SQ_V: {
            let f1 = frame_section(0.5, 0.5)
            let s1 = separator_section(Orientation.Horizontal, 0.5, resize)
            let f2 = frame_section(0.5, 0.5)
            let s2 = separator_section(Orientation.Vertical, 1, resize)
            let f3 = frame_section(0.5, 0.5)
            let s3 = separator_section(Orientation.Horizontal, 0.5, resize)
            let f4 = frame_section(0.5, 0.5)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2)

            s3.resize_pos.push(f3)
            s3.resize_neg.push(f4)

            s2.resize_pos.push(f1, f2, s1)
            s2.resize_neg.push(f3, f4, s3)
            
            return [f1, f2, f3, f4, s1, s2, s3]
        }

        case Container_Layouts.QUAD_VERT: {
            let f1 = frame_section(0.25, 1)
            let s1 = separator_section(Orientation.Vertical, 1, resize)
            let f2 = frame_section(0.25, 1)
            let s2 = separator_section(Orientation.Vertical, 1, resize)
            let f3 = frame_section(0.25, 1)
            let s3 = separator_section(Orientation.Vertical, 1, resize)
            let f4 = frame_section(0.25, 1)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2)

            s2.resize_pos.push(f2)
            s2.resize_neg.push(f3)

            s3.resize_pos.push(f3)
            s3.resize_neg.push(f4)
            
            return [f1, f2, f3, f4, s1, s2, s3]
        }

        case Container_Layouts.QUAD_HORIZ: {
            let f1 = frame_section(1, 0.25)
            let s1 = separator_section(Orientation.Horizontal, 1, resize)
            let f2 = frame_section(1, 0.25)
            let s2 = separator_section(Orientation.Horizontal, 1, resize)
            let f3 = frame_section(1, 0.25)
            let s3 = separator_section(Orientation.Horizontal, 1, resize)
            let f4 = frame_section(1, 0.25)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2)

            s2.resize_pos.push(f2)
            s2.resize_neg.push(f3)

            s3.resize_pos.push(f3)
            s3.resize_neg.push(f4)
            
            return [f1, f2, f3, f4, s1, s2, s3]
        }

        case Container_Layouts.QUAD_LEFT: {
            let f1 = frame_section(0.5, 1)
            let s1 = separator_section(Orientation.Vertical, 1, resize)
            let f2 = frame_section(0.5, 0.333)
            let s2 = separator_section(Orientation.Horizontal, 0.5, resize)
            let f3 = frame_section(0.5, 0.333)
            let s3 = separator_section(Orientation.Horizontal, 0.5, resize)
            let f4 = frame_section(0.5, 0.333)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2, f3, f4, s2, s3)

            s2.resize_pos.push(f2)
            s2.resize_neg.push(f3)

            s3.resize_pos.push(f3)
            s3.resize_neg.push(f4)
            
            return [f1, f2, f3, f4, s1, s2, s3]
        }

        case Container_Layouts.QUAD_RIGHT: {
            let f1 = frame_section(0.5, 0.333)
            let s1 = separator_section(Orientation.Horizontal, 0.5, resize)
            let f2 = frame_section(0.5, 0.333)
            let s2 = separator_section(Orientation.Horizontal, 0.5, resize)
            let f3 = frame_section(0.5, 0.333)
            let s3 = separator_section(Orientation.Vertical, 1, resize)
            let f4 = frame_section(0.5, 1)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2)

            s2.resize_pos.push(f2)
            s2.resize_neg.push(f3)

            s3.resize_pos.push(f1, f2, f3, s1, s2)
            s3.resize_neg.push(f4)
            
            return [f1, f2, f3, f4, s1, s2, s3]
        }

        case Container_Layouts.QUAD_TOP: {
            let f1 = frame_section(1, 0.5)
            let s1 = separator_section(Orientation.Horizontal, 1, resize)
            let f2 = frame_section(0.333, 0.5)
            let s2 = separator_section(Orientation.Vertical, 0.5, resize)
            let f3 = frame_section(0.333, 0.5)
            let s3 = separator_section(Orientation.Vertical, 0.5, resize)
            let f4 = frame_section(0.333, 0.5)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2, f3, f4, s2, s3)

            s2.resize_pos.push(f2)
            s2.resize_neg.push(f3)

            s3.resize_pos.push(f3)
            s3.resize_neg.push(f4)
            
            return [f1, f2, f3, f4, s1, s2, s3]
        }

        case Container_Layouts.QUAD_BOTTOM: {
            let f1 = frame_section(0.333, 0.5)
            let s1 = separator_section(Orientation.Vertical, 0.5, resize)
            let f2 = frame_section(0.333, 0.5)
            let s2 = separator_section(Orientation.Vertical, 0.5, resize)
            let f3 = frame_section(0.333, 0.5)
            let s3 = separator_section(Orientation.Horizontal, 1, resize)
            let f4 = frame_section(1, 0.5)

            s1.resize_pos.push(f1)
            s1.resize_neg.push(f2)

            s2.resize_pos.push(f2)
            s2.resize_neg.push(f3)

            s3.resize_pos.push(f1, f2, f3, s1, s2)
            s3.resize_neg.push(f4)
            
            return [f1, f2, f3, f4, s1, s2, s3]
        }

        default:
            //Default Case is a single chart.
            return [frame_section(1, 1)]
    }
}