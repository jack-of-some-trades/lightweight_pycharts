//@ts-ignore
import { Container } from "./container.js";
import { toolbox } from "./toolbox.js";
import * as u from "./util.js";
import { Wrapper_Divs } from "./util.js";

/** Overall Structure:
 * Wrapper (Container (Frame[s] (Pane[s] (lwc.chart))))
 * The Wrapper contains the left side toolbar, right tool bar, tabs, etc.
 * 
 * The Wrapper can have multiple containers, one for each tab, though only one can be displayed at a time
 * 
 * Containers are the center body of the application, They can contain multiple Frames and handle chart syncing.
 * A container with multiple frames is a multi-layout chart. Because of this, the container handles the size of each frame
 *  
 * Frames contain the data of a chart and the charts themselves. Although Frames will have a single symbol, they can have multiple charts
 * The multiple charts allow for multiple panes. For example, a chart in the primary pane with an SMA overlay indicator and a
 * second frame at the bottom with an RSI Oscillator on a seprate axis.
 */

/**
 * Wrapper Class.
 * Contains all the objects and elements required for a full tradestation
 * 
 * @member containers An Array of container objects. Analogous to tabs of a window.
 */
export class Wrapper {
    containers: Container[] = []

    div: HTMLDivElement
    div_top: HTMLDivElement
    div_left: HTMLDivElement
    div_right: HTMLDivElement
    div_bottom: HTMLDivElement
    div_center: HTMLDivElement
    div_overlay: HTMLDivElement

    tool_box: toolbox

    private resizeTimeoutID: number | null = null;

    constructor() {
        //Create Main container
        this.div = document.createElement('div')
        this.div.id = 'layout_wrapper'
        this.div.classList.add('wrapper')
        document.body.appendChild(this.div)

        //Create Overlay Manager
        this.div_overlay = document.createElement('div')
        this.div_overlay.id = 'overlay_manager'
        this.div_overlay.classList.add('overlay_manager')
        document.body.appendChild(this.div_overlay)

        //Create & Size Top Bar
        this.div_top = document.createElement('div')
        this.div_top.id = 'layout_top'
        this.div_top.classList.add('layout_main', 'layout_flex')
        this.div_top.style.height = `${u.LAYOUT_DIM_TOP.HEIGHT}px`
        this.div_top.style.width = u.LAYOUT_DIM_TOP.WIDTH //Const is already string
        this.div_top.style.left = `${u.LAYOUT_DIM_TOP.LEFT}px`
        this.div_top.style.top = `${u.LAYOUT_DIM_TOP.TOP}px`
        this.div_top.style.display = 'flex'
        //Display must be set in JS to be used to control visibility
        this.div.appendChild(this.div_top)

        //Create & Size Left Bar
        this.div_left = document.createElement('div')
        this.div_left.id = 'layout_left'
        this.div_left.classList.add('layout_main', 'layout_flex')
        this.div_left.style.height = `${u.LAYOUT_DIM_LEFT.HEIGHT}px`
        this.div_left.style.width = `${u.LAYOUT_DIM_LEFT.WIDTH}px`
        this.div_left.style.left = `${u.LAYOUT_DIM_LEFT.LEFT}px`
        this.div_left.style.top = `${u.LAYOUT_DIM_LEFT.TOP}px`
        this.div_left.style.display = 'flex'
        this.div.appendChild(this.div_left)

        //Create & Size Right Bar
        this.div_right = document.createElement('div')
        this.div_right.id = 'layout_right'
        this.div_right.classList.add('layout_main', 'layout_flex')
        this.div_right.style.height = `${u.LAYOUT_DIM_RIGHT.HEIGHT}px`
        this.div_right.style.width = `${u.LAYOUT_DIM_RIGHT.WIDTH}px`
        this.div_right.style.right = `${u.LAYOUT_DIM_RIGHT.RIGHT}px`
        this.div_right.style.top = `${u.LAYOUT_DIM_RIGHT.TOP}px`
        this.div_right.style.display = 'flex'
        this.div.appendChild(this.div_right)

        //Create & Size Bottom Bar
        this.div_bottom = document.createElement('div')
        this.div_bottom.id = 'layout_bottom'
        this.div_bottom.classList.add('layout_main')
        this.div_bottom.style.height = `${u.LAYOUT_DIM_BOTTOM.HEIGHT}px`
        this.div_bottom.style.width = `${u.LAYOUT_DIM_BOTTOM.WIDTH}px`
        this.div_bottom.style.left = `${u.LAYOUT_DIM_BOTTOM.LEFT}px`
        this.div_bottom.style.bottom = `${u.LAYOUT_DIM_BOTTOM.BOTTOM}px`
        this.div_bottom.style.display = 'flex'
        this.div.appendChild(this.div_bottom)

        //Create & Size center container
        this.div_center = document.createElement('div')
        this.div_center.id = 'layout_center'
        this.div_center.classList.add('layout_main', 'layout_container_row')
        this.div_center.style.height = `${u.LAYOUT_DIM_CENTER.HEIGHT}px`
        this.div_center.style.width = `${u.LAYOUT_DIM_CENTER.WIDTH}px`
        this.div_center.style.left = `${u.LAYOUT_DIM_CENTER.LEFT}px`
        this.div_center.style.top = `${u.LAYOUT_DIM_CENTER.TOP}px`
        this.div_center.style.display = 'flex'
        this.div.appendChild(this.div_center)

        this.tool_box = new toolbox(this)

        //Bind Funcitons to ensure expected 'this' functionality
        this.resize = this.resize.bind(this)
        this.get_div = this.get_div.bind(this)
        this.show_section = this.show_section.bind(this)
        this.hide_section = this.hide_section.bind(this)
        this.add_container = this.add_container.bind(this)
        this.resize_debounce = this.resize_debounce.bind(this)

        //Initilize Window regions and perform initial resize
        this.resize()

        //Setup resize listener
        window.addEventListener('resize', this.resize)
    }

    /**
     * Resize the Wrapper and its visible contents 
     */
    resize() {
        let width = window.innerWidth
        let height = window.innerHeight

        this.div.style.width = `${width}px`
        this.div.style.height = `${height}px`

        let side_bar_height = height
        let center_height = height
        let center_width = width

        if (this.div_top.style.display === 'flex') { //Top Visible? 
            side_bar_height -= (u.LAYOUT_DIM_TOP.HEIGHT + u.LAYOUT_MARGIN)
            center_height -= (u.LAYOUT_DIM_TOP.HEIGHT + u.LAYOUT_MARGIN)
        }
        if (this.div_left.style.display === 'flex') { //Left Visible?
            center_width -= (u.LAYOUT_DIM_LEFT.WIDTH + u.LAYOUT_MARGIN)
        }
        if (this.div_right.style.display === 'flex') { //Right Visible?
            center_width -= (u.LAYOUT_DIM_RIGHT.WIDTH + u.LAYOUT_MARGIN)
        }
        if (this.div_bottom.style.display === 'flex') { //Bottom Visible?
            center_height -= (u.LAYOUT_DIM_BOTTOM.HEIGHT + u.LAYOUT_MARGIN)
        }

        //Top Bar automatically resizes, no adjustment needed
        this.div_left.style.height = `${side_bar_height}px`
        this.div_right.style.height = `${side_bar_height}px`
        this.div_center.style.height = `${center_height}px`
        this.div_center.style.width = `${center_width}px`
        this.div_bottom.style.width = `${center_width}px`

        //Resize Active Charting window (Ensures proper resize execution)
        if (window.active_container) {
            window.active_container.resize()
        }
    }

    /**
     * Get the HTML Div Object of the given Section of the chart
     * @param Section Wrapper_Div Enum
     * @returns Reference to the given HTML Div
     */
    get_div(section: Wrapper_Divs): HTMLDivElement {
        switch (section) {
            case (Wrapper_Divs.CHART): return this.div_center
            case (Wrapper_Divs.DRAW_TOOLS): return this.div_left
            case (Wrapper_Divs.NAV_BAR): return this.div_right
            case (Wrapper_Divs.TOP_BAR): return this.div_top
            case (Wrapper_Divs.UTIL_BAR): return this.div_bottom
            default: return this.div
        }
    }

    /**
     * Show a section of Wrapper's window. 
     * 
     * @param div_loc The portion of the wrapper, excluding the chart, to show.
     */
    show_section(div_loc: Wrapper_Divs) {
        switch (div_loc) {
            case (Wrapper_Divs.DRAW_TOOLS):
                this.div_left.style.display = 'flex'
                this.div_center.style.left = `${u.LAYOUT_DIM_CENTER.LEFT}px`
                this.div_bottom.style.left = `${u.LAYOUT_DIM_BOTTOM.LEFT}px`
                break;
            case (Wrapper_Divs.NAV_BAR):
                this.div_right.style.display = 'flex'
                break;
            case (Wrapper_Divs.TOP_BAR):
                this.div_top.style.display = 'flex'
                this.div_left.style.top = `${u.LAYOUT_DIM_LEFT.TOP}px`
                this.div_right.style.top = `${u.LAYOUT_DIM_RIGHT.TOP}px`
                this.div_center.style.top = `${u.LAYOUT_DIM_CENTER.TOP}px`
                break;
            case (Wrapper_Divs.UTIL_BAR):
                this.div_bottom.style.display = 'flex'
            //Chart Hide and Show Handled by Container.
        }
        this.resize()
    }

    /**
     * Hide a section of Wrapper's window. 
     * 
     * @param div_loc The portion of the wrapper, excluding the chart, to hide.
     */
    hide_section(section: Wrapper_Divs) {
        switch (section) {
            case (Wrapper_Divs.DRAW_TOOLS):
                this.div_left.style.display = 'none'
                this.div_center.style.left = '0px'
                this.div_bottom.style.left = '0px'
                break;
            case (Wrapper_Divs.NAV_BAR):
                this.div_right.style.display = 'none'
                break;
            case (Wrapper_Divs.TOP_BAR):
                this.div_top.style.display = 'none'
                this.div_left.style.top = '0px'
                this.div_right.style.top = '0px'
                this.div_center.style.top = '0px'
                break;
            case (Wrapper_Divs.UTIL_BAR):
                this.div_bottom.style.display = 'none'
            //Chart Hide and Show Handled by Container.
        }
        this.resize()
    }


    /**
     * Generate a new container and makes it the window's active container 
     */
    add_container(id: string): Container {
        let tmp_ref = new Container(this.get_div(Wrapper_Divs.CHART), id)
        this.containers.push(tmp_ref)
        tmp_ref.resize()
        window.active_container = tmp_ref
        return tmp_ref
    }

    /**
     * Ran into an issue where the chart wasn't repainting correctly. Issue was elsewhere, so this is
     * deprecated. Leaving it just in case
     */
    resize_debounce() {
        if (this.resizeTimeoutID !== null) {
            clearTimeout(this.resizeTimeoutID)
            this.resizeTimeoutID = null
            this.resize()
        }
        else {
            this.resizeTimeoutID = setTimeout(this.resize_debounce, 1000);
        }
    }

}