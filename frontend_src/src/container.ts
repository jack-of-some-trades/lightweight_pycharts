import { Accessor, Setter } from "solid-js"
import { ContainerCTX } from "../components/layout/container"
import { layout_display } from "../components/layout/layouts"
import { chart_frame } from "./charting_frame/charting_frame"
import { frame } from "./frame"
import { Container_Layouts, flex_frame, layout_switch, num_frames, Orientation, resize_sections } from "./layouts"

export type update_tab_func = (
    title?: string,
    price?: string,
    favicon?: string
) => void

/**
 * Class to hold information on a single layout and a set of Frames. Multiple instances
 * can be created, though, all instances share the same Container.tsx Element. TSX Element
 * is controlled through the Context Functions
 */
export class container{
    id: string
    layout: Container_Layouts | undefined

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
        this.update_tab = update_tab_func

        this.divRect = ContainerCTX().getSize
        this.setStyle = ContainerCTX().setStyle
        this.setDisplay = ContainerCTX().setDisplay
    }

    onShow(){
        this.setDisplay(this.display)
        if (this.layout !== undefined) window.topbar.setLayout(this.layout)
        for(let i = 0; i < num_frames(this.layout);i++) this.frames[i].onShow() 
    }
    onHide(){ for(let i = 0; i < num_frames(this.layout);i++) this.frames[i].onHide() }
    remove(){ }

    /**
     * Resize all the child Elements based on the size of the container's Div. 
     */
    resize(container_rect?:DOMRect) {
        // Calculate the new sizes of all the frames
        resize_sections(container_rect? ()=>container_rect : this.divRect, this.flex_frames)

        // Put all the resizing info into a style tag. Long-story short, putting this info into
        // a reactive 'style' tag for each JSX.Element div is a damn pain.
        let style = "", frame_num = 0
        this.flex_frames.forEach((frame, i)=>{
            style += `
            div.frame:nth-child(${i+2})${frame.style}`
        })
        this.setStyle(style)

        //The literal 1ms delay allows the setStyle() call to take effect. 
        //Without it, the frames update prematurely
        setTimeout(this.resize_frames.bind(this), 1)
    }

    private resize_frames(){
        // Resize all contents of each *visible* Frames
        for (let i = 0; i < num_frames(this.layout); i++)
            this.frames[i].resize()
    }

    /**
     * Called by Python when creating a Frame. Returns the new Frame so it can be made a global var.
     * TODO: Make this instantiate an Abstract Frame that can be transmuted into a Chart_Frame
     * Will Require a UI Element for display and Frame type Selection. Alternatively, set up a
     * add_[type]_frame method for each type of frame and don't allow frame type manipulation.
     */
    protected add_frame(new_id: string): frame {
        let new_frame = new chart_frame(new_id, this.update_tab)
        this.frames.push(new_frame)
        return new_frame
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
                    let frame = this.frames[frame_ind]
                    flex_frame.mouseDown = frame.assign_active_frame.bind(frame)

                    layout_displays.push({
                        orientation:flex_frame.orientation, 
                        mouseDown:flex_frame.mouseDown,
                        element:frame.element,
                        el_active:frame.active, 
                        el_target:frame.target
                    })
                } else throw new Error("Not Enough Frames to change to the desired layout")

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
}
