import { LAYOUT_DIM_TOP } from "./util"

export class topbar {
    div: HTMLDivElement
    left_div: HTMLDivElement
    right_div: HTMLDivElement

    constructor(div: HTMLDivElement) {
        this.div = div
        this.left_div = document.createElement('div')
        this.left_div.classList.add()

        this.right_div = document.createElement('div')

        this.div.appendChild(this.left_div)
        this.div.appendChild(this.right_div)
    }

    separator(): HTMLDivElement {
        let new_div = document.createElement('div')
        new_div.classList.add('topbar_separator')
        new_div.style.height = `${LAYOUT_DIM_TOP.HEIGHT - 2 * LAYOUT_DIM_TOP.V_BUFFER}px`
        new_div.style.margin = `${LAYOUT_DIM_TOP.V_BUFFER}px ${LAYOUT_DIM_TOP.H_BUFFER}px`
        return new_div
    }

    symbol_search() { }

    timeframe_switcher() { }

    candle_switcher() { }

    indicators() { }

    layout_selector() { }

    layout_manager() { }

}