import { icon_manager, icons } from "./icons.js"
import { menu_item, menu_location, overlay_manager } from "./overlay.js"
import { LAYOUT_DIM_TOP, Wrapper_Divs } from "./util.js"
import { Wrapper } from "./wrapper.js"

export class topbar {
    static loaded: boolean = false
    static instance: topbar                 //@ts-ignore *Ignoring div not created error
    private parent: Wrapper                 //@ts-ignore *Happens b/c of "return topbor.instance"
    private div: HTMLDivElement

    private left_div: HTMLDivElement | undefined
    private right_div: HTMLDivElement | undefined

    constructor(parent: Wrapper) {
        if (topbar.instance) {
            //Return Instance already created
            return topbar.instance
        }
        this.parent = parent
        this.div = parent.get_div(Wrapper_Divs.TOP_BAR)
        this.create_topbar()
        topbar.loaded = true

        // fetch('./fmt/topbar.json')
        //     .then((resp) => resp.json())
        //     .then((json_fmt) => {
        //         this.create_topbar(json_fmt) 
        //         topbar.loaded = true
        //     })
    }

    create_topbar() {
        if (this.left_div) this.left_div.remove()
        if (this.right_div) this.right_div.remove()

        this.left_div = document.createElement('div')
        this.left_div.classList.add('topbar', 'topbar_left')
        this.left_div.appendChild(this.symbol_search())
        this.left_div.appendChild(this.separator())
        this.left_div.appendChild(this.timeframe_switcher())

        this.right_div = document.createElement('div')
        this.right_div.classList.add('topbar', 'topbar_right')
        this.right_div.appendChild(this.separator())
        this.right_div.appendChild(this.panel_toggle(this.parent, icons.panel_left))
        // Will uncomment other panel_toggle buttons once they have functionality.
        // this.right_div.appendChild(this.panel_toggle(this.parent, icons.panel_right, false))
        // this.right_div.appendChild(this.panel_toggle(this.parent, icons.panel_bottom, false))

        this.div.appendChild(this.left_div)
        this.div.appendChild(this.right_div)
    }

    /**
     * Make a Generic Div Element that indicates a menu can be opened when clicked
     * @returns HTMLDivElement Containing an ew arrow, that has yet to be added to the document 
     */
    menu_selector(): HTMLDivElement {
        let menu_sel = document.createElement('div')
        menu_sel.classList.add('topbar_menu_button', 'icon_hover', 'icon_v_margin')
        menu_sel.appendChild(icon_manager.get_svg(icons.menu_arrow_ns))

        return menu_sel
    }

    /**
     *  Create the Symbol Search Box
     */
    symbol_search() {
        let search_div = document.createElement('div')
        search_div.id = 'symbol_search_topbar'
        search_div.classList.add('topbar', 'topbar_container')

        let search_button = document.createElement('div')
        search_button.classList.add('topbar', 'topbar_item', 'icon_hover')
        search_button.style.padding = '4px'
        let search_text = document.createElement('div')
        search_text.classList.add('topbar', 'icon_text')
        search_text.innerHTML = 'LWPC'
        search_text.style.marginRight = '4px'

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

        let menu_button = this.menu_selector()

        let items = [
            { label: '5 Minute', data: '5m', star: true, star_act: this.tf_star_act.bind(this, '5m'), star_deact: this.tf_star_deact.bind(this, '5m') },
            { label: '15 Minute', data: '15m', star: true },
            { label: 'Single Layouts', separator: true },
            { label: '30 Minute', data: '30m', star: true },
        ]

        overlay_manager.menu(menu_button, items, false, 'timeframe_selector', menu_location.BOTTOM_RIGHT, this.tf_sel)

        switcher_div.appendChild(menu_button)
        return switcher_div
    }

    tf_sel(arg: any) { console.log(`selected ${arg}`) }
    tf_star_act(data: string) { console.log(`Activated ${data}`) }
    tf_star_deact(data: string) { console.log(`Deactivated ${data}`) }

    layout_switcher(): HTMLDivElement {
        let switcher_div = document.createElement('div')
        switcher_div.id = 'layout_switcher'
        switcher_div.classList.add('topbar', 'topbar_container')
        let menu_button = this.menu_selector()

        let items: menu_item[] = [
            { label: 'Single Layouts', separator: true },
            { label: '5 Minute', data: '5m', star: true },
            { label: '15 Minute', data: '15m', star: true },
            { label: '30 Minute', data: '30m', star: true },
        ]
        overlay_manager.menu(menu_button, items, false, 'layout_selector', menu_location.BOTTOM_RIGHT, this.layout_sel)

        switcher_div.appendChild(menu_button)
        return switcher_div
    }
    layout_sel() { }
    layout_star_act() { }
    layout_star_deact() { }

    /**
     * Create a Topbar Toggleable div that shows/hides a layout panel
     * @param icon Valid args: icons.panel_left, icons.panel_right, icons.panel_bottom
     * @param active_start initial state of the panel, true === shown
     */
    panel_toggle(parent: Wrapper, icon: icons, active_start: boolean = true): HTMLDivElement {
        let toggle_btn = document.createElement('div')
        toggle_btn.classList.add('topbar_menu_button')

        let wrap_div: Wrapper_Divs
        switch (icon) {
            case icons.panel_right:
                wrap_div = Wrapper_Divs.NAV_BAR
                break;
            case icons.panel_bottom:
                wrap_div = Wrapper_Divs.UTIL_BAR
                break;
            default:
                icon = icons.panel_left
                wrap_div = Wrapper_Divs.DRAW_TOOLS
        }

        let svg = icon_manager.get_svg(icon, ['icon_hover'])
        if (active_start) {
            svg.classList.add('icon_active')
            parent.show_section(wrap_div)
        } else {
            parent.hide_section(wrap_div)
        }
        toggle_btn.appendChild(svg)

        toggle_btn.addEventListener('click', () => {
            if (toggle_btn.firstElementChild)
                if (toggle_btn.firstElementChild.classList.contains('icon_active')) {
                    toggle_btn.firstElementChild.classList.remove('icon_active')
                    parent.hide_section(wrap_div)
                } else {
                    toggle_btn.firstElementChild.classList.add('icon_active')
                    parent.show_section(wrap_div)
                }
        })

        return toggle_btn
    }

    /**
     * Create A pre-defined clickable button.
     */
    button(icon: icons): HTMLDivElement {
        let btn = document.createElement('div')
        btn.appendChild(icon_manager.get_svg(icon, ['icon_hover']))
        btn.classList.add('topbar_menu_button')
        btn.style.margin = '4px'
        switch (icon) {
            case icons.close:
                btn.addEventListener('click', () => { window.api.close() }); break;
            case icons.minimize:
                btn.addEventListener('click', () => { window.api.minimize() }); break;
            case icons.maximize:
                btn.addEventListener('click', () => { window.api.maximize() }); break;
            default:
                btn.addEventListener('click', () => { console.log(`button ${icon} pressed!`) })
        }
        return btn
    }

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