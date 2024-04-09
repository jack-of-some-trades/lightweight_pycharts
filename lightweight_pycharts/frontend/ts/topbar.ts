import { icon_manager, icons } from "./icons.js"
import { LAYOUT_DIM_TOP, Wrapper_Divs, menu_location, overlay_menu } from "./util.js"
import { Wrapper } from "./wrapper.js"

export class topbar {
    overlay_div: HTMLDivElement

    constructor(parent: Wrapper) {
        let this_div = parent.get_div(Wrapper_Divs.TOP_BAR)
        this.overlay_div = parent.div_overlay

        let left_div = document.createElement('div')
        left_div.classList.add('topbar', 'topbar_left')
        left_div.appendChild(this.symbol_search())
        left_div.appendChild(this.separator())
        left_div.appendChild(this.timeframe_switcher())

        let right_div = document.createElement('div')
        right_div.classList.add('topbar', 'topbar_right')
        right_div.appendChild(this.separator())

        this_div.appendChild(left_div)
        this_div.appendChild(right_div)
    }

    /**
     * Make a Generic Div Element that indicates a menu can be opened when clicked
     * @param parent Parent this element will be attached to so a hide/show event listener can be added
     * @returns HTMLDivElement Containing an ew arrow
     */
    menu_selector(): HTMLDivElement {
        let menu_sel = document.createElement('div')
        menu_sel.classList.add('topbar_menu_button', 'icon_hover', 'icon_v_margin')
        menu_sel.appendChild(icon_manager.get_svg(icons.menu_arrow_ns))

        return menu_sel
    }

    symbol_search() {
        let search_div = document.createElement('div')
        search_div.id = 'symbol_search_topbar'
        search_div.classList.add('topbar', 'topbar_container')

        let search_button = document.createElement('div')
        // search_button.style.width = '75px'
        search_button.style.padding = '4px'
        search_button.classList.add('topbar', 'topbar_item', 'icon_hover')
        let search_text = document.createElement('div')
        search_text.classList.add('topbar', 'icon_text')
        search_text.innerHTML = 'LWPC'

        search_button.appendChild(icon_manager.get_svg(icons.menu_search, ['icon_v_margin', 'icon_h_margin']))
        search_button.appendChild(search_text)

        search_div.appendChild(search_button)
        search_div.appendChild(icon_manager.get_svg(icons.menu_add, ['icon_hover']))

        return search_div
    }

    timeframe_switcher(): HTMLDivElement {
        let switcher_div = document.createElement('div')
        switcher_div.id = 'timeframe_switcher'
        switcher_div.classList.add('topbar', 'topbar_container')

        let menu = this.menu_selector()

        let items = [
            { label: '5 Minute', icon_str: '5m', star: true },
            { label: '15 Minute', icon_str: '15m', star: true },
            { label: '30 Minute', icon_str: '30m', star: true },
        ]

        overlay_menu(this.overlay_div, switcher_div, items, false, 'timeframe_selector', menu_location.BOTTOM_RIGHT)

        switcher_div.appendChild(menu)
        return switcher_div
    }

    candle_switcher() { }

    indicators() { }

    layout_selector() { }

    layout_manager() { }

    /**
     * Create a Vertical Separator Div 
     */
    separator(): HTMLDivElement {
        let new_div = document.createElement('div')
        new_div.classList.add('topbar_separator')
        new_div.style.height = `${LAYOUT_DIM_TOP.HEIGHT - 2 * LAYOUT_DIM_TOP.V_BUFFER}px`
        new_div.style.margin = `${LAYOUT_DIM_TOP.V_BUFFER}px ${LAYOUT_DIM_TOP.H_BUFFER}px`
        return new_div
    }
}