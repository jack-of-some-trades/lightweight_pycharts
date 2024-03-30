import { Pane } from "./pane"

export class Legend {

    parent: Pane
    div: HTMLDivElement
    sources_div: HTMLDivElement

    constructor(parent: Pane) {
        this.parent = parent
        this.div = document.createElement('div')
        this.div.classList.add('legend')
        this.div.style.display = 'flex'

        //Create Main Source Div
        let main_source_div = document.createElement('div')

        this.div.appendChild(main_source_div)

        //Create Additional Sources Div
        this.sources_div = document.createElement('div')
        this.sources_div.classList.add('legend_source')
        this.sources_div.style.display = 'flex'

        this.div.appendChild(this.sources_div)

        //create Sources toggler
        let toggler_div = document.createElement('div')
        toggler_div.classList.add('legend_toggler')

        this.div.appendChild(toggler_div)

        parent.div.appendChild(this.div)
    }

}