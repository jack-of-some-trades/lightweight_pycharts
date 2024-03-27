//@ts-ignore
import { Pane } from "./pane.js";
import { SeriesData } from "./pkg.js";

/**
 * @member Div: Div That Contains Pane's and pane seprators. Can be Null since 
 */
export class Frame {
    //The class that contains all the data to be displayed
    id: string
    div: HTMLDivElement
    is_active: boolean = true
    flex_width: number
    flex_height: number

    // symbol: string   ???
    // data: number[]   ???

    private panes: Pane[] = []

    constructor(id: string, div: HTMLDivElement, flex_width: number = 1, flex_height: number = 1) {
        this.id = id
        this.div = div
        this.flex_width = flex_width
        this.flex_height = flex_height

        //Bind Functions
        this.add_pane = this.add_pane.bind(this)
    }

    reassign_div(div: HTMLDivElement) {
        this.div = div
        this.panes.forEach(pane => {
            this.div.appendChild(pane.div)
        });
    }

    add_pane(id: string = ''): Pane {
        let child_div = document.createElement('div')
        this.div.appendChild(child_div)

        let new_pane = new Pane(id, child_div)
        this.panes.push(new_pane)
        this.resize()
        return new_pane
    }

    set_data(dtype: string, data: SeriesData[]) {
        this.panes[0].set_data(dtype, data)
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