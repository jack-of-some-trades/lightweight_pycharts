//@ts-ignore
import { Pane } from "./pane.js";

/**
 * @member Div: Div That Contains Pane's and pane seprators.
 */
export class Frame {
    //The class that contains all the data to be displayed
    id: string
    div: HTMLDivElement
    is_active: boolean = true

    private panes: Pane[] = []

    constructor(id: string, div: HTMLDivElement) {
        this.id = id
        this.div = div

        //Bind Functions
        this.add_pane = this.add_pane.bind(this)
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
    }

    /**
     * Adds a Pane to the Frame
     * @param id 
     * @returns 
     */
    add_pane(id: string = ''): Pane {
        let child_div = document.createElement('div')
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
        let this_width = this.div.clientWidth
        let this_height = this.div.clientHeight

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