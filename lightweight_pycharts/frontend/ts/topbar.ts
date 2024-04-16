import { icon_manager, icons } from "./icons.js"
import { menu_item, menu_location, overlay_manager } from "./overlay.js"
import { LAYOUT_DIM_TOP, Wrapper_Divs, interval, tf } from "./util.js"
import { Wrapper } from "./wrapper.js"

export class topbar {
    static loaded: boolean = false
    static instance: topbar                 //@ts-ignore *Ignoring div not created error
    private parent: Wrapper                 //@ts-ignore *Happens b/c of "return topbor.instance"
    private div: HTMLDivElement

    private left_div: HTMLDivElement | undefined
    private right_div: HTMLDivElement | undefined
    private tf_select: timeframe_selector | undefined
    private layout_select: layout_selector | undefined

    constructor(parent: Wrapper) {
        if (topbar.instance) {
            //Return Instance already created
            return topbar.instance
        }
        this.parent = parent
        this.div = parent.get_div(Wrapper_Divs.TOP_BAR)
        topbar.instance = this

        this.create_topbar(default_topbar_json)
        topbar.loaded = true
        // fetch('./fmt/topbar.json')           // May implement this later so settings can be loaded w/ window.
        //     .then((resp) => resp.json())     // Holding back because it adds a little bit of delay to loading/ maybe not worth.
        //     .then((json_fmt) => { topbar.instance.create_topbar(json_fmt); topbar.loaded = true })
    }

    create_topbar(json: topbar_json) {
        if (this.left_div) this.left_div.remove()
        if (this.right_div) this.right_div.remove()

        this.tf_select = new timeframe_selector(json.timeframe)
        this.layout_select = new layout_selector()

        this.left_div = document.createElement('div')
        this.left_div.classList.add('topbar', 'topbar_left')
        this.left_div.appendChild(this.symbol_search())
        this.left_div.appendChild(this.separator())
        this.left_div.appendChild(this.tf_select.wrapper_div)
        this.left_div.appendChild(this.separator())

        this.right_div = document.createElement('div')
        this.right_div.classList.add('topbar', 'topbar_right')
        this.right_div.appendChild(this.layout_select.wrapper_div)
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
    static menu_selector(): HTMLDivElement {
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

// #region ---------------- Helper Sub Classes ---------------- //

/**
 * Class to create and Manage The Timeframe selector Options.
 */
class timeframe_selector {
    static instance: timeframe_selector
    //@ts-ignore
    wrapper_div: HTMLDivElement                 //@ts-ignore Ignores needed to silence lack of instance variable
    private json: timeframe_json                //@ts-ignore instantiation when calling constructor after singleton
    private current_tf_div: HTMLDivElement      //@ts-ignore is already created
    private menu_button: HTMLDivElement         //@ts-ignore
    private overlay_menu_div: HTMLDivElement

    constructor(json: timeframe_json) {
        if (timeframe_selector.instance) return timeframe_selector.instance
        timeframe_selector.instance = this

        this.wrapper_div = document.createElement('div')
        this.wrapper_div.id = 'timeframe_switcher'
        this.wrapper_div.classList.add('topbar', 'topbar_container')

        this.json = default_timeframe_select_opts
        this.menu_button = topbar.menu_selector()
        this.current_tf_div = timeframe_selector.make_topbar_button(new tf(-1, 's'), false, true)
        this.wrapper_div.appendChild(this.current_tf_div)
        this.wrapper_div.appendChild(this.menu_button)

        let items = timeframe_selector.make_items_list(json)

        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'timeframe_selector', menu_location.BOTTOM_RIGHT, this.select)
    }

    /**
     * Recreate the topbar given a formatted timeframe_json file
     */
    public update_topbar(json: timeframe_json) {
        let items = timeframe_selector.make_items_list(json)
        this.overlay_menu_div.remove()
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'timeframe_selector', menu_location.BOTTOM_RIGHT, this.select)
    }

    public get_json(): timeframe_json { return this.json }

    /**
     * Update The topbar timeframe switcher to indicate the given timeframe was selected
     * Can be called from global scope through 'wrapper.top_bar.tf_select.update_topbar()'
     */
    public static update_topbar_icon(data: tf) {
        let curr_tf_value = data.toValue()
        let found = false
        let favorite_divs = timeframe_selector.instance.wrapper_div.getElementsByClassName('fav_tf')

        //Check if Current timeframe is already set approprately
        if (curr_tf_value === parseInt(timeframe_selector.instance.current_tf_div.getAttribute('data-tf-value') ?? '-1'))
            return

        //Check if the timeframe is in the favorites list
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            if (curr_tf_value === parseInt(favorite_divs[i].getAttribute('data-tf-value') ?? '-1')) {
                //If the Timeframe is within the favorites list, highlight it.
                favorite_divs[i].classList.add('text_selected')
                found = true
            } else {
                //Remove Selection from all other elements
                favorite_divs[i].classList.remove('text_selected')
            }
        }

        let tmp_div: HTMLDivElement
        if (!found) {
            //Update the 'current_tf_div' to this timeframe
            tmp_div = this.make_topbar_button(data, false)
            tmp_div.classList.add('text_selected')
        } else {
            //Set the 'current_tf_div' to be an empty icon (a favorite is now highlighted)
            tmp_div = timeframe_selector.make_topbar_button(new tf(-1, 's'), false, true)
        }
        timeframe_selector.instance.current_tf_div.replaceWith(tmp_div)
        timeframe_selector.instance.current_tf_div = tmp_div
    }

    /**
     * Makes a list of 'menu_items' from a formatted json file.
     */
    private static make_items_list(json: timeframe_json): menu_item[] {
        try {
            let instance = timeframe_selector.instance
            let favorite_tfs: tf[] = []
            let items: menu_item[] = []
            let favs = json.favorites
            let sub_menus = json.menu_listings

            function populate_items(interval: interval, values: number[]) {
                values.forEach(value => {
                    let period = new tf(value, interval)
                    let fav = favs.includes(period.toString())
                    if (fav) favorite_tfs.push(period)
                    items.push({
                        label: period.toLabel(),
                        data: period,
                        star: fav,
                        star_act: () => instance.add_favorite(period),
                        star_deact: () => instance.remove_favorite(period),
                    })
                })
            }

            if (sub_menus.s) {
                items.push({ label: "Seconds", separator: true, separator_vis: false })
                populate_items('s', sub_menus.s)
            }
            if (sub_menus.m) {
                items.push({ label: "Minutes", separator: true })
                populate_items('m', sub_menus.m)
            }
            if (sub_menus.h) {
                items.push({ label: "Hours", separator: true })
                populate_items('h', sub_menus.h)
            }
            if (sub_menus.D) {
                items.push({ label: "Days", separator: true })
                populate_items('D', sub_menus.D)
            }
            if (sub_menus.W) {
                items.push({ label: "Weeks", separator: true, separator_vis: false })
                populate_items('W', sub_menus.W)
            }
            if (sub_menus.M) {
                items.push({ label: "Months", separator: true, separator_vis: false })
                populate_items('M', sub_menus.M)
            }
            if (sub_menus.Y) {
                items.push({ label: "Years", separator: true, separator_vis: false })
                populate_items('Y', sub_menus.Y)
            }

            //only once successfully done with makeing the icon list are the following updated
            //Done to prevent a poorly format json from deleting data
            let favorite_divs = instance.wrapper_div.getElementsByClassName('fav_tf')
            for (let i = 0; i < favorite_divs.length;) { //no i++ since length is actively decreasing
                favorite_divs[i].remove()
            }
            instance.json = json
            favorite_tfs.forEach(element => { instance.add_favorite(element) })
            return items

        } catch {
            console.warn('timeframe_switcher.make_item_list() Failed. Json Not formatted Correctly')
            return []
        }
    }

    /**
     * Make a Generic button with text representing the given timeframe.
     */
    private static make_topbar_button(data: tf, pressable: boolean = true, blank_element: boolean = false): HTMLDivElement {
        let wrapper = document.createElement('div')
        wrapper.classList.add('topbar', 'button_text')
        wrapper.setAttribute('data-tf-value', data.toValue().toString())
        if (blank_element) return wrapper

        if (data.multiplier === 1 && ['D', 'W', 'M', 'Y'].includes(data.interval)) {
            wrapper.innerHTML = data.toString().replace('1', '') //Ignore the '1' on timeframes Day and up
        } else
            wrapper.innerHTML = data.toString()
        wrapper.classList.add('Text_selected')

        if (pressable) {
            wrapper.addEventListener('click', () => timeframe_selector.instance.select(data))
            wrapper.classList.add('icon_hover', 'fav_tf') //fav_tf used as an identifier later & pressable === favorite
        }
        return wrapper
    }

    private static update_menu_location() {
        let instance = timeframe_selector.instance
        if (instance.menu_button && instance.overlay_menu_div)
            overlay_manager.menu_position_func(menu_location.BOTTOM_RIGHT, instance.overlay_menu_div, instance.menu_button)()
    }

    /**
     * Action to preform on a timeframe selection
     */
    select(data: tf) { console.log(`selected ${data.toString()}`); timeframe_selector.update_topbar_icon(data) }

    /**
     * Adds a favorite timeframe to the window topbar and the singleton's json representation
     * @param data Timeframe to remove
     */
    add_favorite(data: tf) {
        let curr_tf_value = data.toValue()
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_tf')
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            let element = favorite_divs[i]
            if (curr_tf_value === parseInt(element.getAttribute('data-tf-value') ?? '1')) {
                return //This favorite is already present
            }
            else if (curr_tf_value > parseInt(element.getAttribute('data-tf-value') ?? '-1')) {
                //Add favorite 'icon'
                element.after(timeframe_selector.make_topbar_button(data))
                //Add to favoites if not already there
                if (this.json.favorites.indexOf(data.toString()) === -1)
                    this.json.favorites.push(data.toString())
                timeframe_selector.update_menu_location()
                return
            }
        }
        //This code is only reached when for loop doesn't return
        //First Favorite, and a new lowest value favorite will trigger this.
        this.current_tf_div.after(timeframe_selector.make_topbar_button(data))
        timeframe_selector.update_menu_location()
        //Add to favoites if not already there
        if (this.json.favorites.indexOf(data.toString()) === -1)
            this.json.favorites.push(data.toString())
    }

    /**
     * Removes a favorite timeframe from the window's topbar and the singleton's json representation
     * @param data Timeframe to remove
     */
    remove_favorite(data: tf) {
        let curr_tf_value = data.toValue()
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_tf')

        for (let i = 0; i < favorite_divs.length; i++) {
            if (curr_tf_value === parseInt(favorite_divs[i].getAttribute('data-tf-value') ?? '-1')) {
                //Remove visual element
                favorite_divs[i].remove()
                timeframe_selector.update_menu_location()

                //remove the element from favoites if it is in the list.
                let fav_index = this.json.favorites.indexOf(data.toString())
                if (fav_index !== -1) {
                    this.json.favorites.splice(fav_index, 1)
                }
            }
        }
    }


}

/**
 * Class to create an Manage The Layout Selector.
 */
class layout_selector {
    wrapper_div: HTMLDivElement
    private current_layout_div: HTMLDivElement
    private favorites_divs: HTMLDivElement[]

    constructor() {
        this.wrapper_div = document.createElement('div')
        this.wrapper_div.id = 'layout_switcher'
        this.wrapper_div.classList.add('topbar', 'topbar_container')

        this.current_layout_div = document.createElement('div')
        this.favorites_divs = []

        let items: menu_item[] = [
            { label: '5 Minute', data: '5m', star: true },
            { label: '15 Minute', data: '15m', star: true },
            { label: '30 Minute', data: '30m', star: true },
        ]

        let menu_button = topbar.menu_selector()
        overlay_manager.menu(menu_button, items, 'layout_selector', menu_location.BOTTOM_RIGHT, this.select)

        this.wrapper_div.appendChild(this.current_layout_div)
        this.wrapper_div.appendChild(menu_button)
    }
    select() { }
    star_act() { }
    star_deact() { }
}

// #endregion

// #region ---------------- JSON Interfaces ---------------- //

interface topbar_json {
    layout: layout_json
    timeframe: timeframe_json
}
interface timeframe_json {
    menu_listings: {
        "s"?: number[]
        "m"?: number[]
        "h"?: number[]
        "D"?: number[]
        "W"?: number[]
        "M"?: number[]
        "Y"?: number[]
    },
    favorites: string[]
}

interface layout_json { }

const default_layout_select_opts: layout_json = {}

const default_timeframe_select_opts: timeframe_json = {
    "menu_listings": {
        "s": [1, 2, 5, 15, 30],
        "m": [1, 2, 5, 15, 30],
        "h": [1, 2, 4],
        "D": [1],
        "W": [1]
    },
    "favorites": [
        "1D"
    ]
}

const default_topbar_json = {
    layout: default_layout_select_opts,
    timeframe: default_timeframe_select_opts
}

// #endregion