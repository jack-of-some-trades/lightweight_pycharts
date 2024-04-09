import { icon_manager, icons } from "./icons.js"
import { LAYOUT_DIM_LEFT, Wrapper_Divs, menu_location, overlay_menu } from "./util.js"
import { Wrapper } from "./wrapper.js"

export class toolbox {
    overlay_div: HTMLDivElement

    constructor(parent: Wrapper) {
        let this_div = parent.get_div(Wrapper_Divs.DRAW_TOOLS)
        this.overlay_div = parent.div_overlay
        this_div.style.flexDirection = 'column'

        let top_div = document.createElement('div')
        top_div.classList.add('toolbar', 'toolbar_top')
        top_div.style.width = `${LAYOUT_DIM_LEFT.WIDTH}px`

        top_div.appendChild(this.crosshair_selector())
        top_div.appendChild(this.separator())

        let bottom_div = document.createElement('div')
        bottom_div.classList.add('toolbar', 'toolbar_bottom')
        bottom_div.style.width = `${LAYOUT_DIM_LEFT.WIDTH}px`

        this_div.appendChild(top_div)
        this_div.appendChild(bottom_div)
    }

    /**
     * Make a Generic Div Element that indicates a menu can be opened when clicked
     * @param parent Parent this element will be attached to so a hide/show event listener can be added
     * @returns HTMLDivElement Containing an ew arrow
     */
    menu_selector(parent: HTMLDivElement): HTMLDivElement {
        let menu_sel = document.createElement('div')
        menu_sel.classList.add('toolbar_menu_button', 'icon_hover', 'icon_v_margin')
        menu_sel.style.display = 'none'
        menu_sel.appendChild(icon_manager.get_svg(icons.menu_arrow_ew))

        //Menu Visibility Listeners
        parent.addEventListener('mouseenter', () => {
            menu_sel.style.display = 'flex'
        })
        parent.addEventListener('mouseleave', () => {
            menu_sel.style.display = 'none'
        })

        return menu_sel
    }

    /**
     * Makes a Menu for switching crosshairs
     * @returns HTMLDivElement Containting the switcher, Selection menu already placed in overlay manager
     */
    crosshair_selector(): HTMLDivElement {
        let selector_div = document.createElement('div')
        selector_div.id = 'crosshair_selector'
        selector_div.classList.add('toolbar', 'toolbar_item')

        selector_div.appendChild(icon_manager.get_svg(icons.cursor_cross, ['icon_v_margin', 'icon_l_margin', 'icon_hover']))
        selector_div.appendChild(this.menu_selector(selector_div))

        let items = [
            { label: 'Dot', icon: icons.cursor_dot },
            { label: 'Cross', icon: icons.cursor_cross },
            { label: 'Arrow', icon: icons.cursor_arrow },
        ]

        //Create Selection Menu
        overlay_menu(this.overlay_div, selector_div, items, true, 'crosshair_selector', menu_location.TOP_RIGHT)

        return selector_div
    }

    /**
     * Create a Horizontal Separator Div 
     */
    separator(): HTMLDivElement {
        let new_div = document.createElement('div')
        new_div.classList.add('toolbar_separator')
        new_div.style.width = `${LAYOUT_DIM_LEFT.WIDTH - 2 * LAYOUT_DIM_LEFT.H_BUFFER}px`
        new_div.style.margin = `${LAYOUT_DIM_LEFT.V_BUFFER}px ${LAYOUT_DIM_LEFT.H_BUFFER}px`
        return new_div
    }
}