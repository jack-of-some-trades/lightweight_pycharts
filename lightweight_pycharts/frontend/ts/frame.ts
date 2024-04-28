import { Pane } from "./pane.js";

/**
 * @member Div: Div That Contains Pane's and pane seprators.
 */
export class Frame {
    //The class that contains all the data to be displayed
    id: string
    div: HTMLDivElement

    private panes: Pane[] = []

    constructor(id: string, div: HTMLDivElement) {
        this.id = id
        this.div = div

        //Add Active Frame Listener
        this.div.addEventListener('mousedown', this.assign_active_frame.bind(this))
    }

    /**
     * Update Global 'active_frame' reference to this instance. 
     */
    assign_active_frame() {
        if (window.active_frame)
            window.active_frame.div.removeAttribute('active')

        window.active_frame = this
        window.active_frame.div.setAttribute('active', '')
    }

    /**
     * Reassigns the Frame's Div and re-appends all the Frame's children to this Div.
     * @param div The new Div Element for the Frame
     */
    reassign_div(div: HTMLDivElement) {
        this.div = div
        this.panes.forEach(pane => {
            this.div.appendChild(pane.div)
        });

        //Update Active Frame Listener
        this.div.addEventListener('mousedown', this.assign_active_frame.bind(this))
    }

    /**
     * Adds a Pane to the Frame
     * @param id 
     * @returns 
     */
    add_pane(id: string = ''): Pane {
        let child_div = document.createElement('div')
        child_div.classList.add('chart_pane')
        this.div.appendChild(child_div)

        let new_pane = new Pane(id, child_div)
        this.panes.push(new_pane)
        this.resize()
        return new_pane
    }

    /**
     * Resize All Children Panes
     */
    resize() {
        // -2 accounts for... uhh... the chart border? idk man.
        // Without it the 'active_frame' grey chart border is hidden behind the chart
        // and the 'active_pane' accent color border
        let this_width = this.div.clientWidth - 2
        let this_height = this.div.clientHeight - 2

        this.panes.forEach(pane => {
            pane.resize(this_width, this_height)
        });
    }

    /**
     * Fit the content of all Child Panes
     */
    fitcontent() {
        this.panes.forEach(pane => {
            pane.fitcontent()
        });
    }

}