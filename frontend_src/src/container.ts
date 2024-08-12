import { Accessor, Setter } from "solid-js"
import { ContainerCTX, layout_display } from "../components/layout/container"
import "../css/layout/container.css"
import { chart_frame, frame } from "./frame"
import { Container_Layouts, flex_frame, layout_switch, num_frames, Orientation, resize_frames } from "./layouts"

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
    layout: Container_Layouts

    frames: frame[] = []
    display: layout_display[] = []
    flex_frames: flex_frame[] = []

    divRect: Accessor<DOMRect>
    setStyle: Setter<string>
    setDisplay: Setter<layout_display[]>

    update_tab: update_tab_func

    constructor(
        id:string, 
        update_tab_func:update_tab_func
    ) {
        this.id = id
        this.layout = Container_Layouts.SINGLE
        this.update_tab = update_tab_func

        this.divRect = ContainerCTX().getSize
        this.setStyle = ContainerCTX().setStyle
        this.setDisplay = ContainerCTX().setDisplay

        this.set_layout(Container_Layouts.SINGLE)
    }

    onShow(){
        this.setDisplay(this.display)
        window.topbar.setLayout(this.layout)
        for(let i = 0; i < num_frames(this.layout);i++) this.frames[i].onShow() 
    }
    onHide(){ for(let i = 0; i < num_frames(this.layout);i++) this.frames[i].onHide() }
    remove(){ }

    /**
     * Resize all the child Elements based on the size of the container's Div. 
     */
    resize() {
        // Calculate the new sizes of all the frames
        resize_frames(this.divRect, this.flex_frames)

        // Put all the resizing info into a style tag. Long-story short, putting this info into
        // a reactive 'style' tag for each JSX.Element div is a damn pain.
        let style = ""
        this.flex_frames.forEach((frame, i)=>{
            style += `
            div.container div.frame:nth-child(${i+2})
            ${frame.style}`
        })
        this.setStyle(style)

        // Resize all contents of each *visible* Frames
        for (let i = 0; i < num_frames(this.layout); i++)
            this.frames[i].resize()
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
        this.flex_frames = layout_switch(layout, this.divRect, this.resize.bind(this))
        let layout_displays:layout_display[] = []

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

                    layout_displays.push({
                        orientation:flex_frame.orientation, 
                        mouseDown:flex_frame.mouseDown,
                        element:frame.element,
                        el_active:frame.active, 
                        el_target:frame.target
                    })
                } else {
                    //Not Enough Frames to fill the current layout, Create Anonymous Frame
                    //Python will come in and rename the ID of this later.
                    let new_frame = this._create_frame("")
                    flex_frame.mouseDown = new_frame.assign_active_frame.bind(new_frame)

                    layout_displays.push({
                        orientation:flex_frame.orientation, 
                        mouseDown:flex_frame.mouseDown,
                        element:new_frame.element,
                        el_active:new_frame.active, 
                        el_target:new_frame.target
                    })
                }
                frame_ind += 1
                //frame_ind tracks the equivelent frames[] index based on
                //how many chart frames have be observed in the flex_frames[] loop
            } else {                                            // Separator Object

                layout_displays.push({
                    orientation:flex_frame.orientation,
                    mouseDown:flex_frame.mouseDown,
                    element:undefined,
                    el_active:()=>false, 
                    el_target:()=>false
                })
            }
        })
        
        // ------------ Apply the new Display to the <Container/> ------------
        this.setDisplay(layout_displays)
        this.display = layout_displays
        this.layout = layout

        //Delay on executing this is to make it so the Frame has time to create it's Pane
        //So that too can be made active
        setTimeout(() => window.container_manager.set_active_container(this.id), 50)

        //Calculate the flex_frame rect sizes, and set them to the Display Signal
        this.resize()

        //If succsessful, update container variable and UI
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
