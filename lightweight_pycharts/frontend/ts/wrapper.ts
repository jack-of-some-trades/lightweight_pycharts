import { Container } from "./container.js";
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
 * Wrapper Class. Creates all the main Divs for the window and retains 
 * references to them.
 * 
 * @member containers An Array of container objects. Analogous to tabs of a window.
 */
export class Wrapper {
    loaded: boolean = false
    containers: Container[] = []

    div: HTMLDivElement
    div_top: HTMLDivElement
    div_left: HTMLDivElement
    div_right: HTMLDivElement
    div_bottom: HTMLDivElement
    div_center: HTMLDivElement
    div_title: HTMLDivElement

    private resizeTimeoutID: number | null = null;

    constructor() {
        //Create Main container
        this.div = document.createElement('div')
        this.div.id = 'layout_wrapper'
        this.div.classList.add('wrapper')
        document.body.appendChild(this.div)

        //Create & Size Top Bar
        this.div_title = document.createElement('div')
        this.div_title.id = 'layout_title'
        this.div_title.classList.add('layout_title', 'layout_flex')
        this.div_title.style.height = `${u.LAYOUT_DIM_TITLE.HEIGHT}px`
        this.div_title.style.width = u.LAYOUT_DIM_TITLE.WIDTH //Const is already string
        this.div_title.style.left = `${u.LAYOUT_DIM_TITLE.LEFT}px`
        this.div_title.style.top = `${u.LAYOUT_DIM_TITLE.TOP}px`
        this.div_title.style.display = 'flex'//Display must be set in JS to be used to control visibility
        this.div.appendChild(this.div_title)

        //Create & Size Top Bar
        this.div_top = document.createElement('div')
        this.div_top.id = 'layout_top'
        this.div_top.classList.add('layout_main', 'layout_flex')
        this.div_top.style.height = `${u.LAYOUT_DIM_TOP.HEIGHT}px`
        this.div_top.style.width = u.LAYOUT_DIM_TOP.WIDTH //Const is already string
        this.div_top.style.left = `${u.LAYOUT_DIM_TOP.LEFT}px`
        this.div_top.style.top = `${u.LAYOUT_DIM_TOP.TOP}px`
        this.div_top.style.display = 'flex'
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
        this.div_center.classList.add('layout_main')
        this.div_center.style.height = `${u.LAYOUT_DIM_CENTER.HEIGHT}px`
        this.div_center.style.width = `${u.LAYOUT_DIM_CENTER.WIDTH}px`
        this.div_center.style.left = `${u.LAYOUT_DIM_CENTER.LEFT}px`
        this.div_center.style.top = `${u.LAYOUT_DIM_CENTER.TOP}px`
        this.div_center.style.display = 'flex'
        this.div.appendChild(this.div_center)

        //Initilize Window regions and perform initial resize
        this.resize()

        //Setup resize listener
        window.addEventListener('resize', this.resize.bind(this))
        this.loaded = true;
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
        let center_height = height - u.LAYOUT_DIM_TITLE.HEIGHT
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
            case (Wrapper_Divs.TITLE_BAR): return this.div_title
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
                this.div_left.style.top = `${u.LAYOUT_DIM_TITLE.HEIGHT}px`
                this.div_right.style.top = `${u.LAYOUT_DIM_TITLE.HEIGHT}px`
                this.div_center.style.top = `${u.LAYOUT_DIM_TITLE.HEIGHT}px`
                break;
            case (Wrapper_Divs.UTIL_BAR):
                this.div_bottom.style.display = 'none'
            //Chart Hide and Show Handled by Container.
        }
        this.resize()
    }

    /**
     * Re-order container list to match Tabs list.
     * Technically the order of this list doesn't matter since that information isn't used. 
     * Better to be thorough than not though.
     */
    reorder_containers(from: number, to: number) {
        if (from < 0 || from >= this.containers.length)
            console.error(`Index, 'from=${from}', out of bounds on container reorder call. list len = ${this.containers.length}`)
        else if (to < 0 || to >= this.containers.length)
            console.error(`Index, 'to=${to}', out of bounds on container reorder call. list len = ${this.containers.length}`)
        else {
            this.containers.splice(to, 0, this.containers.splice(from, 1)[0])
            let id_list: string[] = []
            this.containers.forEach(container => { id_list.push(container.id) });
        }
    }

    /**
     * Generate a new container and makes it the window's active container 
     * Protected to indicate it should only be called from Python
     */
    protected add_container(id: string): Container {
        let tmp_ref = new Container(this.div_center, id)
        this.containers.push(tmp_ref)
        return tmp_ref
    }

    /**
     * Removes a Container, and all its subsidiaries, from the entire interface.
     * As such, It's a protected method (Should only be called from Python)
     */
    protected remove_container(id: string) {
        for (let i = 0; i < this.containers.length; i++) {
            // == Since we need to make sure it's the same object reference.
            if (this.containers[i].id === id) {
                let objs = this.containers.splice(i, 1)
                objs[0].remove()
                return
            }
        }
    }

    /**
     * Sets active_container when the current active container is deleted from the tab list.
     * Called from the TitleBar Tab's Object since that is the only element that
     * knows the tab order and what next tab is being set 
     */
    set_active_container(tab_div: HTMLDivElement) {
        for (let i = 0; i < this.containers.length; i++) {
            // == Since we need to make sure it's the same object reference.
            if (this.containers[i].tab_div == tab_div) {
                this.containers[i].assign_active_container()
                break;
            }
        }
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
            this.resizeTimeoutID = setTimeout(this.resize_debounce, 20);
        }
    }

}