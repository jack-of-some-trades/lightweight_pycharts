import { icon_manager, icons } from "./icons.js"
import { menu_item, menu_location, overlay_manager } from "./overlay.js"
import { Container_Layouts, LAYOUT_DIM_TOP, Series_Types, Wrapper_Divs, interval, layout_icon_map, series_icon_map, series_label_map, tf } from "./util.js"
import { Wrapper } from "./wrapper.js"

/**
 * Class to create and manage the TopBar of the application
 */
export class topbar {
    private parent: Wrapper
    private div: HTMLDivElement

    private left_div: HTMLDivElement | undefined
    private right_div: HTMLDivElement | undefined
    tf_select: timeframe_selector
    layout_select: layout_selector
    series_select: series_selector

    constructor(parent: Wrapper, tf: timeframe_selector, layout: layout_selector, series: series_selector) {
        this.parent = parent
        this.div = parent.get_div(Wrapper_Divs.TOP_BAR)

        this.tf_select = tf
        this.layout_select = layout
        this.series_select = series

        this.left_div = document.createElement('div')
        this.left_div.classList.add('topbar', 'topbar_left')
        this.left_div.appendChild(this.symbol_search())
        this.left_div.appendChild(this.separator())
        this.left_div.appendChild(this.tf_select.wrapper_div)
        this.left_div.appendChild(this.separator())
        this.left_div.appendChild(this.series_select.wrapper_div)
        this.left_div.appendChild(this.separator())
        this.left_div.appendChild(this.indicators_box())
        this.left_div.appendChild(this.separator())

        this.right_div = document.createElement('div')
        this.right_div.classList.add('topbar', 'topbar_right')
        this.right_div.appendChild(this.separator())
        this.right_div.appendChild(this.layout_select.wrapper_div)
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
     *  Create the Indicator's Box
     */
    indicators_box() {
        let indicator_div = document.createElement('div')
        indicator_div.id = 'indicator_topbar'
        indicator_div.classList.add('topbar', 'topbar_container')

        let template_btn = document.createElement('div')
        template_btn.classList.add('topbar', 'topbar_item', 'icon_hover')
        template_btn.style.padding = '4px'

        let search_text = document.createElement('div')
        search_text.classList.add('topbar', 'menu_text')
        search_text.innerHTML = 'Indicators'
        search_text.style.margin = '0px'

        template_btn.appendChild(icon_manager.get_svg(icons.indicator, ['icon_v_margin', 'icon_r_margin']))
        template_btn.appendChild(search_text)

        indicator_div.appendChild(template_btn)
        indicator_div.appendChild(icon_manager.get_svg(icons.indicator_template, ['icon_hover']))

        return indicator_div
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
export class timeframe_selector {
    wrapper_div: HTMLDivElement
    private json: timeframe_json
    private current_tf_div: HTMLDivElement
    private menu_button: HTMLDivElement
    private overlay_menu_div: HTMLDivElement

    constructor() {
        this.wrapper_div = document.createElement('div')
        this.wrapper_div.id = 'timeframe_switcher'
        this.wrapper_div.classList.add('topbar', 'topbar_container')

        this.json = default_timeframe_select_opts
        this.menu_button = topbar.menu_selector()
        //Current_tf_div must be created and appended before making items.
        this.current_tf_div = this.make_topbar_button(null, false)
        this.wrapper_div.appendChild(this.current_tf_div)
        this.wrapper_div.appendChild(this.menu_button)

        let items = this.make_items_list(this.json)

        this.select = this.select.bind(this) //Needs binding since it's shared via reference
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'timeframe_selector', menu_location.BOTTOM_RIGHT, this.select)
    }

    /**
     * Recreate the topbar given a formatted timeframe_json file
     */
    update_topbar(json: timeframe_json) {
        let items = this.make_items_list(json)
        this.overlay_menu_div.remove()
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'timeframe_selector', menu_location.BOTTOM_RIGHT, this.select)
    }

    get_json(): timeframe_json { return this.json }

    /**
     * Update The topbar timeframe switcher to indicate the given timeframe was selected
     * Can be called from global scope through 'wrapper.top_bar.tf_select.update_topbar()'
     */
    update_topbar_icon(data: tf) {
        let curr_tf_value = data.toValue()
        let found = false
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_tf')

        //Check if Current timeframe is already set approprately
        if (curr_tf_value === parseInt(this.current_tf_div.getAttribute('data-tf-value') ?? '-1'))
            return

        //Check if the timeframe is in the favorites list
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            if (curr_tf_value === parseInt(favorite_divs[i].getAttribute('data-tf-value') ?? '-1')) {
                //If the Timeframe is within the favorites list, highlight it.
                favorite_divs[i].classList.add('selected')
                found = true
            } else {
                //Remove Selection from all other elements
                favorite_divs[i].classList.remove('selected')
            }
        }

        let tmp_div: HTMLDivElement
        if (!found) {
            //Update the 'current_tf_div' to this timeframe
            tmp_div = this.make_topbar_button(data, false)
            tmp_div.classList.add('selected')
        } else {
            //Set the 'current_tf_div' to be an empty icon (a favorite is now highlighted)
            tmp_div = this.make_topbar_button(null, false)
        }
        this.current_tf_div.replaceWith(tmp_div)
        this.current_tf_div = tmp_div
    }

    /**
     * Makes a list of 'menu_items' from a formatted json file.
     */
    private make_items_list(json: timeframe_json): menu_item[] {
        try {
            let favorite_tfs: tf[] = []
            let items: menu_item[] = []
            let favs = json.favorites
            let sub_menus = json.menu_listings

            let populate_items = (interval: interval, values: number[]) => {
                values.forEach(value => {
                    let period = new tf(value, interval)
                    let fav = favs.includes(period.toString())
                    if (fav) favorite_tfs.push(period)
                    items.push({
                        label: period.toLabel(),
                        data: period,
                        star: fav,
                        star_act: () => this.add_favorite(period),
                        star_deact: () => this.remove_favorite(period),
                    })
                })
            }
            populate_items = populate_items.bind(this)

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
            let favorite_divs = this.wrapper_div.getElementsByClassName('fav_tf')
            for (let i = 0; i < favorite_divs.length;) { //no i++ since length is actively decreasing
                favorite_divs[i].remove()
            }
            this.json = json
            favorite_tfs.forEach(element => { this.add_favorite(element) })
            return items

        } catch (e) {
            console.warn('timeframe_switcher.make_item_list() Failed. Json Not formatted Correctly')
            console.log('Actual Error: ', e)
            return []
        }
    }

    /**
     * Make a Generic button with text representing the given timeframe.
     */
    private make_topbar_button(data: tf | null, pressable: boolean = true): HTMLDivElement {
        let wrapper = document.createElement('div')
        wrapper.classList.add('topbar')
        if (data === null) return wrapper

        wrapper.setAttribute('data-tf-value', data.toValue().toString())
        wrapper.classList.add('button_text') //Adding this after makes a blank element 0 width

        if (data.multiplier === 1 && ['D', 'W', 'M', 'Y'].includes(data.interval)) {
            wrapper.innerHTML = data.toString().replace('1', '') //Ignore the '1' on timeframes Day and up
        } else
            wrapper.innerHTML = data.toString()


        if (pressable) {
            wrapper.addEventListener('click', () => this.select(data))
            wrapper.classList.add('icon_hover', 'fav_tf') //fav_tf used as an identifier later & pressable === favorite
        } else {
            wrapper.classList.add('Text_selected')
        }
        return wrapper
    }

    private update_menu_location() {
        if (this.menu_button && this.overlay_menu_div)
            overlay_manager.menu_position_func(menu_location.BOTTOM_RIGHT, this.overlay_menu_div, this.menu_button)()
    }

    /**
     * Action to preform on a timeframe selection
     * Nothing is actually updated here for a reason. The topbar is updated once the change has
     * taken effect on a response from the python side to make sure everything stays synced.
     */
    private select(data: tf) {
        window.api.timeframe_switch(window.active_frame.id, data.multiplier, data.interval as string);
    }

    /**
     * Adds a favorite timeframe to the window topbar and the json representation
     * @param data Timeframe to remove
     */
    private add_favorite(data: tf) {
        let curr_tf_value = data.toValue()
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_tf')
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            let element = favorite_divs[i]
            if (curr_tf_value === parseInt(element.getAttribute('data-tf-value') ?? '1')) {
                return //This favorite is already present
            }
            else if (curr_tf_value > parseInt(element.getAttribute('data-tf-value') ?? '-1')) {
                //Add favorite 'icon'
                element.after(this.make_topbar_button(data))
                //Add to favoites if not already there
                if (this.json.favorites.indexOf(data.toString()) === -1)
                    this.json.favorites.push(data.toString())
                //Update topbar Icon if this is the timeframe currently selected
                if (curr_tf_value === parseInt(this.current_tf_div.getAttribute('data-tf-value') ?? '-1')) {
                    let tmp_div = this.make_topbar_button(null, false)
                    this.current_tf_div.replaceWith(tmp_div)
                    this.current_tf_div = tmp_div
                    this.update_topbar_icon(data)
                }
                this.update_menu_location()
                return
            }
        }
        //This code is only reached when for loop doesn't return
        //First Favorite, and a new lowest value favorite will trigger this.
        this.current_tf_div.after(this.make_topbar_button(data))
        //Add to favoites if not already there
        if (this.json.favorites.indexOf(data.toString()) === -1)
            this.json.favorites.push(data.toString())

        //Update topbar Icon if this is the timeframe currently selected
        if (curr_tf_value === parseInt(this.current_tf_div.getAttribute('data-tf-value') ?? '-1')) {
            let tmp_div = this.make_topbar_button(null, false)
            this.current_tf_div.replaceWith(tmp_div)
            this.current_tf_div = tmp_div
            this.update_topbar_icon(data)
        }
        this.update_menu_location()
    }

    /**
     * Removes a favorite timeframe from the window's topbar and the json representation
     * @param data Timeframe to remove
     */
    private remove_favorite(data: tf) {
        let curr_tf_value = data.toValue()
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_tf')

        for (let i = 0; i < favorite_divs.length; i++) {
            if (curr_tf_value === parseInt(favorite_divs[i].getAttribute('data-tf-value') ?? '-1')) {
                //Check if this was the selected element
                if (favorite_divs[i].classList.contains('selected')) {
                    //Remove then update the topbar
                    favorite_divs[i].remove()
                    this.update_topbar_icon(data)
                } else {
                    //Remove visual element
                    favorite_divs[i].remove()
                }
                this.update_menu_location()

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
export class layout_selector {
    wrapper_div: HTMLDivElement
    private json: layout_json
    private menu_button: HTMLDivElement
    private overlay_menu_div: HTMLDivElement
    private current_layout_div: HTMLDivElement

    constructor() {
        this.wrapper_div = document.createElement('div')
        this.wrapper_div.id = 'layout_switcher'
        this.wrapper_div.classList.add('topbar', 'topbar_container')

        this.json = default_layout_select_opts
        this.menu_button = topbar.menu_selector()
        this.current_layout_div = this.make_topbar_button(null, false)
        this.wrapper_div.appendChild(this.current_layout_div)
        this.wrapper_div.appendChild(this.menu_button)

        let items = this.make_items_list(this.json)

        this.select = this.select.bind(this) //Needs binding since it's shared via reference
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'layout_selector', menu_location.BOTTOM_RIGHT, this.select)

    }

    /**
    * Recreate the topbar given a formatted layout_json file
    */
    update_topbar(json: layout_json) {
        let items = this.make_items_list(json)
        this.overlay_menu_div.remove()
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'layout_selector', menu_location.BOTTOM_RIGHT, this.select)

        if (window.active_container && window.active_container.layout !== null) {
            //if there is a valid container & layout has been set update the icon
            this.update_topbar_icon(window.active_container.layout)
        }
    }

    get_json(): layout_json { return this.json }

    /**
     * Update The topbar layout switcher to indicate the given layout was selected
     * Can be called from global scope through 'wrapper.top_bar.tf_select.update_topbar()'
     */
    update_topbar_icon(data: Container_Layouts) {
        let curr_layout_value = data.valueOf()
        let found = false
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_layout')

        //Check if Current layout is already set approprately
        if (curr_layout_value === parseInt(this.current_layout_div.getAttribute('data-layout-value') ?? '-1'))
            return

        //Check if the layout is in the favorites list
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            let icon_svg = favorite_divs[i].firstChild as SVGSVGElement
            if (curr_layout_value === parseInt(favorite_divs[i].getAttribute('data-layout-value') ?? '-1')) {
                //If the Timeframe is within the favorites list, highlight it.
                icon_svg.classList.add('selected')
                found = true
            } else {
                //Remove Selection from all other elements
                icon_svg.classList.remove('selected')
            }
        }

        let tmp_div: HTMLDivElement
        if (!found) {
            //Update the 'current_tf_div' to this layout
            tmp_div = this.make_topbar_button(data, false)
            let icon_svg = tmp_div.firstChild as SVGSVGElement
            icon_svg.classList.add('selected')
        } else {
            //Set the 'current_tf_div' to be an empty icon (a favorite is now highlighted)
            tmp_div = this.make_topbar_button(null, false)
        }
        this.current_layout_div.replaceWith(tmp_div)
        this.current_layout_div = tmp_div
    }

    /**
     * Makes a list of 'menu_items' from a formatted json file.
     */
    private make_items_list(json: layout_json): menu_item[] {
        try {
            let items: menu_item[] = []
            let favs = json.favorites

            let populate_items = (layouts: Container_Layouts[]) => {
                layouts.forEach(layout => {
                    items.push({
                        label: "",
                        data: layout,
                        icon: layout_icon_map[layout],
                        star: favs.includes(layout),
                        star_act: () => this.add_favorite(layout),
                        star_deact: () => this.remove_favorite(layout),
                    })
                })
            }
            populate_items = populate_items.bind(this)

            items.push({ label: 'Basic', separator: true, separator_row: true })
            populate_items([
                Container_Layouts.SINGLE,
                Container_Layouts.DOUBLE_VERT,
                Container_Layouts.DOUBLE_HORIZ,
            ])
            items.push({ label: 'Triple', separator: true, separator_vis: false, separator_row: true })
            populate_items([
                Container_Layouts.TRIPLE_VERT,
                Container_Layouts.TRIPLE_HORIZ,
                Container_Layouts.TRIPLE_VERT_LEFT,
                Container_Layouts.TRIPLE_VERT_RIGHT,
                Container_Layouts.TRIPLE_HORIZ_TOP,
                Container_Layouts.TRIPLE_HORIZ_BOTTOM,
            ])
            items.push({ label: 'Quad', separator: true, separator_vis: false, separator_row: true })
            populate_items([
                Container_Layouts.QUAD_SQ_V,
                Container_Layouts.QUAD_SQ_H,
                Container_Layouts.QUAD_VERT,
                Container_Layouts.QUAD_HORIZ,
                Container_Layouts.QUAD_LEFT,
                Container_Layouts.QUAD_RIGHT,
                Container_Layouts.QUAD_TOP,
                Container_Layouts.QUAD_BOTTOM,
            ])


            //only once successfully done with makeing the icon list are the following updated
            //Done to prevent a poorly format json from deleting data
            let favorite_divs = this.wrapper_div.getElementsByClassName('fav_layout')
            for (let i = 0; i < favorite_divs.length;) { //no i++ since length is actively decreasing
                favorite_divs[i].remove()
            }
            this.json = json
            favs.forEach(element => { this.add_favorite(element) })
            return items

        } catch (e) {
            console.warn('layout_switcher.make_item_list() Failed. Json Not formatted Correctly')
            console.log('Actual Error: ', e)
            return []
        }
    }

    /**
     * Make a Generic button with text representing the given layout.
     */
    private make_topbar_button(data: Container_Layouts | null, pressable: boolean = true): HTMLDivElement {
        let wrapper = document.createElement('div')
        wrapper.classList.add('topbar')
        if (data === null) return wrapper

        wrapper.setAttribute('data-layout-value', data.valueOf().toString() ?? '-1')
        wrapper.appendChild(icon_manager.get_svg(layout_icon_map[data]))

        if (pressable) {
            wrapper.addEventListener('click', () => this.select(data))
            wrapper.classList.add('icon_hover', 'fav_layout') //fav_layout used as an identifier later & pressable === favorite
        } else {
            let icon_svg = wrapper.firstChild as SVGSVGElement
            icon_svg.classList.add('selected')
        }
        return wrapper
    }

    private update_menu_location() {
        if (this.menu_button && this.overlay_menu_div)
            overlay_manager.menu_position_func(menu_location.BOTTOM_RIGHT, this.overlay_menu_div, this.menu_button)()
    }

    /**
     * Action to preform on a layout selection
     * Topbar is not updated until response from python is executed to ensure JS & Python are synced.
     */
    private select(data: Container_Layouts) { window.api.layout_change(window.active_container.id, data) }

    /**
     * Adds a favorite Layout to the window topbar and the json representation
     * @param data Timeframe to remove
     */
    private add_favorite(data: Container_Layouts) {
        let curr_layout_value = data.valueOf()
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_layout')
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            let element = favorite_divs[i]
            if (curr_layout_value === parseInt(element.getAttribute('data-layout-value') ?? '1')) {
                return //This favorite is already present
            }
            else if (curr_layout_value > parseInt(element.getAttribute('data-layout-value') ?? '-1')) {
                //Add favorite 'icon'
                element.after(this.make_topbar_button(data))
                //Add to favoites if not already there
                if (this.json.favorites.indexOf(data) === -1)
                    this.json.favorites.push(data)
                //Update topbar Icon if this is the layout currently selected
                if (curr_layout_value === parseInt(this.current_layout_div.getAttribute('data-layout-value') ?? '-1')) {
                    let tmp_div = this.make_topbar_button(null, false)
                    this.current_layout_div.replaceWith(tmp_div)
                    this.current_layout_div = tmp_div
                    this.update_topbar_icon(data)
                }
                return
            }
        }
        //This code is only reached when for loop doesn't return
        //Either this is the First Favorite, or a new lowest value favorite.
        this.current_layout_div.after(this.make_topbar_button(data))
        //Add to favoites if not already there
        if (this.json.favorites.indexOf(data) === -1)
            this.json.favorites.push(data)

        //Update Icon in case the active layout was just added to favorites.
        if (curr_layout_value === parseInt(this.current_layout_div.getAttribute('data-layout-value') ?? '-1')) {
            let tmp_div = this.make_topbar_button(null, false)
            this.current_layout_div.replaceWith(tmp_div)//Replace old selected element
            this.current_layout_div = tmp_div
            this.update_topbar_icon(data) //Highlight the current favorite 
        }
    }

    /**
     * Removes a favorite layout from the window's topbar and the json representation
     * @param data Timeframe to remove
     */
    private remove_favorite(data: Container_Layouts) {
        let curr_layout_value = data.valueOf()
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_layout')

        for (let i = 0; i < favorite_divs.length; i++) {
            if (curr_layout_value === parseInt(favorite_divs[i].getAttribute('data-layout-value') ?? '-1')) {
                let icon = favorite_divs[i].firstChild as SVGSVGElement
                if (icon.classList.contains('selected')) {
                    //Remove then update the topbar
                    favorite_divs[i].remove()
                    this.update_topbar_icon(data)
                } else {
                    //Remove visual element
                    favorite_divs[i].remove()
                }

                //remove the element from favoites if it is in the list.
                let fav_index = this.json.favorites.indexOf(data)
                if (fav_index !== -1) {
                    this.json.favorites.splice(fav_index, 1)
                }
            }
        }
    }
}

/**
 * Class to create an Manage The Series Selector.
 * This is almost a direct copy of the layout selector. Only difference is the Enum used has been changed.
 * If there were any more than these two selectors it would have been worth making an ABS.
 */
export class series_selector {
    wrapper_div: HTMLDivElement
    private json: series_json
    private menu_button: HTMLDivElement
    private overlay_menu_div: HTMLDivElement
    private current_series_div: HTMLDivElement

    constructor() {
        this.wrapper_div = document.createElement('div')
        this.wrapper_div.id = 'series_switcher'
        this.wrapper_div.classList.add('topbar', 'topbar_container')

        this.json = default_series_select_opts
        this.menu_button = topbar.menu_selector()
        this.current_series_div = this.make_topbar_button(null, false)
        this.wrapper_div.appendChild(this.current_series_div)
        this.wrapper_div.appendChild(this.menu_button)

        let items = this.make_items_list(this.json)

        this.select = this.select.bind(this) //Needs binding since it's shared via reference
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'series_selector', menu_location.BOTTOM_RIGHT, this.select)

    }

    /**
    * Recreate the topbar given a formatted series_json file
    */
    update_topbar(json: series_json) {
        let items = this.make_items_list(json)
        this.overlay_menu_div.remove()
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'series_selector', menu_location.BOTTOM_RIGHT, this.select)
    }

    get_json(): series_json { return this.json }

    /**
     * Update The topbar series switcher to indicate the given series was selected
     * Can be called from global scope through 'wrapper.top_bar.tf_select.update_topbar()'
     */
    update_topbar_icon(data: Series_Types) {
        let curr_series_value = data.valueOf()
        let found = false
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_series')

        //Check if Current series is already set approprately
        if (curr_series_value === parseInt(this.current_series_div.getAttribute('data-series-value') ?? '-1'))
            return

        //Check if the series is in the favorites list
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            let icon_svg = favorite_divs[i].firstChild as SVGSVGElement
            if (curr_series_value === parseInt(favorite_divs[i].getAttribute('data-series-value') ?? '-1')) {
                //If the Timeframe is within the favorites list, highlight it.
                icon_svg.classList.add('selected')
                found = true
            } else {
                //Remove Selection from all other elements
                icon_svg.classList.remove('selected')
            }
        }

        let tmp_div: HTMLDivElement
        if (!found) {
            //Update the 'current_tf_div' to this series
            tmp_div = this.make_topbar_button(data, false)
            let icon_svg = tmp_div.firstChild as SVGSVGElement
            icon_svg.classList.add('selected')
        } else {
            //Set the 'current_tf_div' to be an empty icon (a favorite is now highlighted)
            tmp_div = this.make_topbar_button(null, false)
        }
        this.current_series_div.replaceWith(tmp_div)
        this.current_series_div = tmp_div
    }

    /**
     * Makes a list of 'menu_items' from a formatted json file.
     */
    private make_items_list(json: series_json): menu_item[] {
        try {
            let items: menu_item[] = []
            let favs = json.favorites

            let populate_items = (series: Series_Types[]) => {
                series.forEach(type => {
                    items.push({
                        label: series_label_map[type],
                        data: type,
                        icon: series_icon_map[type],
                        star: favs.includes(type),
                        star_act: () => this.add_favorite(type),
                        star_deact: () => this.remove_favorite(type),
                    })
                })
            }
            populate_items = populate_items.bind(this)

            populate_items([
                Series_Types.BAR,
                Series_Types.CANDLESTICK,
                Series_Types.ROUNDED_CANDLE,
                Series_Types.LINE,
                Series_Types.AREA,
                Series_Types.HISTOGRAM,
                Series_Types.BASELINE,
                Series_Types.HLC_AREA,
            ])


            //only once successfully done with makeing the icon list are the following updated
            //Done to prevent a poorly format json from deleting data
            let favorite_divs = this.wrapper_div.getElementsByClassName('fav_series')
            for (let i = 0; i < favorite_divs.length;) { //no i++ since length is actively decreasing
                favorite_divs[i].remove()
            }
            this.json = json
            favs.forEach(element => { this.add_favorite(element) })
            return items

        } catch (e) {
            console.warn('series_switcher.make_item_list() Failed. Json Not formatted Correctly')
            console.log('Actual Error: ', e)
            return []
        }
    }

    /**
     * Make a Generic button with text representing the given series.
     */
    private make_topbar_button(data: Series_Types | null, pressable: boolean = true): HTMLDivElement {
        let wrapper = document.createElement('div')
        wrapper.classList.add('topbar')
        if (data === null) return wrapper

        wrapper.setAttribute('data-series-value', data.valueOf().toString() ?? '-1')
        wrapper.appendChild(icon_manager.get_svg(series_icon_map[data]))

        if (pressable) {
            wrapper.addEventListener('click', () => this.select(data))
            wrapper.classList.add('icon_hover', 'fav_series') //fav_series used as an identifier later & pressable === favorite
        } else {
            let icon_svg = wrapper.firstChild as SVGSVGElement
            icon_svg.classList.add('selected')
        }
        return wrapper
    }

    private update_menu_location() {
        if (this.menu_button && this.overlay_menu_div)
            overlay_manager.menu_position_func(menu_location.BOTTOM_RIGHT, this.overlay_menu_div, this.menu_button)()
    }

    /**
     * Action to preform on a series selection
     */
    private select(data: Series_Types) { console.log(`selected ${data.toString()}`); this.update_topbar_icon(data) }

    /**
     * Adds a favorite Layout to the window topbar and the json representation
     * @param data Timeframe to remove
     */
    private add_favorite(data: Series_Types) {
        let curr_series_value = data.valueOf()
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_series')
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            let element = favorite_divs[i]
            if (curr_series_value === parseInt(element.getAttribute('data-series-value') ?? '1')) {
                return //This favorite is already present
            }
            else if (curr_series_value > parseInt(element.getAttribute('data-series-value') ?? '-1')) {
                //Add favorite 'icon'
                element.after(this.make_topbar_button(data))
                //Add to favoites if not already there
                if (this.json.favorites.indexOf(data) === -1)
                    this.json.favorites.push(data)
                //Update topbar Icon if this is the series currently selected
                if (curr_series_value === parseInt(this.current_series_div.getAttribute('data-series-value') ?? '-1')) {
                    let tmp_div = this.make_topbar_button(null, false)
                    this.current_series_div.replaceWith(tmp_div)
                    this.current_series_div = tmp_div
                    this.update_topbar_icon(data)
                }
                this.update_menu_location()
                return
            }
        }
        //This code is only reached when for loop doesn't return
        //Either this is the First Favorite, or a new lowest value favorite.
        this.current_series_div.after(this.make_topbar_button(data))
        //Add to favoites if not already there
        if (this.json.favorites.indexOf(data) === -1)
            this.json.favorites.push(data)

        //Update Icon in case the active series was just added to favorites.
        if (curr_series_value === parseInt(this.current_series_div.getAttribute('data-series-value') ?? '-1')) {
            let tmp_div = this.make_topbar_button(null, false)
            this.current_series_div.replaceWith(tmp_div)//Replace old selected element
            this.current_series_div = tmp_div
            this.update_topbar_icon(data) //Highlight the current favorite 
        }
        this.update_menu_location()
    }

    /**
     * Removes a favorite series from the window's topbar and the json representation
     * @param data Timeframe to remove
     */
    private remove_favorite(data: Series_Types) {
        let curr_series_value = data.valueOf()
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_series')

        for (let i = 0; i < favorite_divs.length; i++) {
            if (curr_series_value === parseInt(favorite_divs[i].getAttribute('data-series-value') ?? '-1')) {
                let icon = favorite_divs[i].firstChild as SVGSVGElement
                if (icon.classList.contains('selected')) {
                    //Remove then update the topbar
                    favorite_divs[i].remove()
                    this.update_topbar_icon(data)
                } else {
                    //Remove visual element
                    favorite_divs[i].remove()
                }
                this.update_menu_location()

                //remove the element from favoites if it is in the list.
                let fav_index = this.json.favorites.indexOf(data)
                if (fav_index !== -1) {
                    this.json.favorites.splice(fav_index, 1)
                }
            }
        }
    }
}

// #endregion

// #region ---------------- JSON Interfaces ---------------- //


interface series_json {
    favorites: Series_Types[]
}

interface layout_json {
    favorites: Container_Layouts[]
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

const default_series_select_opts: series_json = {
    favorites: [
        Series_Types.ROUNDED_CANDLE
    ]
}

const default_layout_select_opts: layout_json = {
    favorites: [
        Container_Layouts.SINGLE,
        Container_Layouts.DOUBLE_VERT,
        Container_Layouts.DOUBLE_HORIZ
    ]
}

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

// #endregion