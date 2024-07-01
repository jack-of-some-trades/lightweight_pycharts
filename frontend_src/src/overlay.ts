import { get_svg, icons } from "./icons"
import { symbol_item } from "./util_lwc"

/**
 * Interface used when creating selectable menus
 * @param label Label Text for the selectable item or separator
 * @param data any type of data. This is passed back to the menu's 'on_sel' function
 * @param icon SVG icon to represent the item
 * @param star Boolean starting state of the star. Undefined == No star, true == selected. default: false == Not-selected
 * @param star_act CallableFunction to be called when star is activated
 * @param star_deact CallableFunction to be called when str is de-activated
 * @param separator Boolean, this is the start of a new sub_menu
 * @param separator_vis boolean, this new sub_menu should be visible by default: default true.
 * @param separator_row boolean, Sub Menu Items should be listed in a Row: default false (column default).
 */
export interface switcher_item {
    label: string,
    data?: any,
    icon?: icons,
    star?: boolean | undefined,
    star_act?: CallableFunction,
    star_deact?: CallableFunction,

    separator?: boolean,
    separator_vis?: boolean,
    separator_row?: boolean
}

export enum menu_location {
    TOP_RIGHT,
    TOP_LEFT,
    BOTTOM_RIGHT,
}

/**
 * A singleton class that manages the creation of overlay selection menus
 */
export class overlay_manager {
    div: HTMLDivElement

    constructor() {
        this.div = document.createElement('div')
        this.div.id = 'overlay_manager'
        this.div.classList.add('overlay_manager')
        document.body.appendChild(this.div)

        //Global Event Listener to Remove visibility and interactivity of overlay menus
        document.addEventListener('mousedown', this.hide_all_menus.bind(this))
    }

    hide_all_menus() {
        let other_menus = this.div.querySelectorAll('.overlay_menu[active]')
        for (let i = 0; i < other_menus.length; i++) {
            //Make all other active menus inactive.
            other_menus[i].removeAttribute('active')
        }
    }

    // #region -------------------- Switcher Overlay Menus -------------------- //

    /**
     * Generate an overlay menu from the given menu_item[] interface
     * @param parent_div Div Element that should make this menu visible when clicked
     * @param items List of menu_item(s) to add to the menu
     */
    menu(parent_div: HTMLDivElement, items: switcher_item[], id: string, loc: menu_location, on_sel: CallableFunction): HTMLDivElement {
        if (items.length === 0) return document.createElement('div')//No menu to make.

        let overlay_menu = document.createElement('div')
        overlay_menu.id = id + '_menu'
        overlay_menu.classList.add('overlay_menu')

        //Event listener to toggle visibility and interactivity
        let menu_loc_func = this.menu_position_func(loc, overlay_menu, parent_div)
        parent_div.addEventListener('click', () => {
            if (overlay_menu.hasAttribute('active'))
                overlay_menu.removeAttribute('active')
            else {
                this.hide_all_menus()
                overlay_menu.setAttribute('active', '')
                menu_loc_func()
            }
        })

        //Stop the Propogation of the global mousedown event when it originates somewhere in this menu (so menu doesn't disappear)
        parent_div.addEventListener('mousedown', (event) => { event.stopPropagation() })
        overlay_menu.addEventListener('mousedown', (event) => { event.stopPropagation() })

        let sub_menu = document.createElement('div')
        sub_menu.classList.add('overlay_sub_menu')
        sub_menu.style.display = 'flex'

        //Append each of the requested items
        items.forEach((item, i) => {
            if (item.separator) {
                if (i !== 0) {
                    //sub_menu doesn't has no items => no new sub_menu needed
                    overlay_menu.appendChild(sub_menu)
                    sub_menu = document.createElement('div')
                    sub_menu.classList.add('overlay_sub_menu')
                }
                sub_menu.style.display = item.separator_vis ? 'flex' : 'none'
                overlay_menu.appendChild(this.make_section_title(sub_menu, item))
            } else {
                sub_menu.appendChild(this.make_item(item, sub_menu, overlay_menu, on_sel))
            }
        });

        //Append Last edited sub_menu
        overlay_menu.appendChild(sub_menu)
        //Add the completed menu to the document
        this.div.appendChild(overlay_menu)
        return overlay_menu
    }

    /**
     * Make the Title Bar, with toggleable show/hide, for a menu_sub section
     */
    private make_section_title(sub_menu: HTMLDivElement, item: switcher_item): HTMLDivElement {
        let title_bar = document.createElement('div')
        title_bar.classList.add('menu_item', 'overlay_menu_separator')

        if (item.separator_row) {
            sub_menu.style.flexDirection = 'row'
        }

        //set text
        let text = document.createElement('span')
        text.classList.add('overlay_sub_menu_text')
        text.innerHTML = item.label.toUpperCase()
        title_bar.appendChild(text)

        //set inital state
        if (item.separator_vis ?? true) {
            sub_menu.style.display = 'flex'
            title_bar.appendChild(get_svg(icons.menu_arrow_ns))
        } else {
            sub_menu.style.display = 'none'
            title_bar.appendChild(get_svg(icons.menu_arrow_sn))
        }

        //Toggle visibility & icon on click
        title_bar.addEventListener('click', () => {
            let svg = title_bar.getElementsByTagName('svg')[0] as SVGSVGElement
            if (sub_menu.style.display === 'flex') {
                sub_menu.style.display = 'none'
                svg.replaceWith(get_svg(icons.menu_arrow_sn))
            } else {
                sub_menu.style.display = 'flex'
                svg.replaceWith(get_svg(icons.menu_arrow_ns))
            }
        })

        return title_bar
    }

    /**
     * Make the selectable Div for a given menu item
     */
    private make_item(item: switcher_item, sub_menu: HTMLDivElement, menu: HTMLDivElement, on_sel: CallableFunction): HTMLDivElement {
        let item_div = document.createElement('div')
        item_div.classList.add('menu_item') //Make Item Wrapper

        let sel_wrap = document.createElement('span')
        if (sub_menu.style.flexDirection === 'row')
            //When sub_menu is a flex column we dont want the items to expand
            sel_wrap.classList.add('menu_selectable')
        else
            sel_wrap.classList.add('menu_selectable_expand')

        //Set icon if needed
        if (item.icon) sel_wrap.appendChild(get_svg(item.icon))

        //Set Label
        if (item.label !== "") {
            let text = document.createElement('span')
            text.classList.add('menu_text')
            text.innerHTML = item.label
            sel_wrap.appendChild(text)
        }

        item_div.appendChild(sel_wrap)

        //Add a Toggle Star if needed
        if (item.star !== undefined) this.make_toggle_star(item_div, item)

        //Setup click behavior on the selectable wrapper
        sel_wrap.addEventListener('click', () => {
            menu.removeAttribute('active') //Remove Visibility from entire menu
            on_sel(item.data) //Call the on_select with the given data for this item.
        })

        return item_div
    }

    /**
     * Return a callable function that sets the x, y location based on where the parent element is located
     * @param overlay_menu_div
     * @param parent_div 
     * @returns 
     */
    menu_position_func(location: menu_location, overlay_menu_div: HTMLDivElement, parent_div: HTMLDivElement): CallableFunction {
        let set_menu_loc = () => { }
        switch (location) {
            case (menu_location.BOTTOM_RIGHT): {
                set_menu_loc = () => {
                    overlay_menu_div.style.top = `${Math.max(parent_div.getBoundingClientRect().bottom + 1, 0)}px`
                    let right_offset = Math.max(parent_div.getBoundingClientRect().right - 1, overlay_menu_div.getBoundingClientRect().width)
                    overlay_menu_div.style.right = `${window.innerWidth - right_offset}px`
                }
            } break;
            case (menu_location.TOP_LEFT): {
                set_menu_loc = () => {
                    overlay_menu_div.style.top = `${Math.max(parent_div.getBoundingClientRect().top, 0)}px`
                    overlay_menu_div.style.right = `${Math.max(parent_div.getBoundingClientRect().left - 1, 0)}px`
                }
            } break;
            case (menu_location.TOP_RIGHT): {
                set_menu_loc = () => {
                    overlay_menu_div.style.top = `${Math.max(parent_div.getBoundingClientRect().top, 0)}px`
                    overlay_menu_div.style.left = `${Math.max(parent_div.getBoundingClientRect().right + 1, 0)}px`
                }
            } break;
        }
        return set_menu_loc
    }

    /**
     * Create a Toggleable star for the given menu item.
     */
    private make_toggle_star(parent_div: HTMLDivElement, item: switcher_item) {
        let wrapper = document.createElement('div')
        wrapper.classList.add('menu_item_star')
        let icon: SVGSVGElement
        if (item.star) {
            icon = get_svg(icons.star_filled, ["icon_hover"])
            icon.setAttribute('active-star', '')
        } else {
            icon = get_svg(icons.star, ["icon_hover"])
            icon.style.visibility = 'hidden'
        }
        wrapper.appendChild(icon)

        //Listeners to make star visible only on mouse over
        parent_div.addEventListener('mouseenter', () => { (wrapper.firstChild as SVGSVGElement).style.visibility = 'visible' })
        parent_div.addEventListener('mouseleave', () => {
            let icon = wrapper.firstChild as SVGSVGElement
            if (!icon.hasAttribute('active-star')) {
                icon.style.visibility = 'hidden'
            }
        })

        //Listeners to activate/deactivate the star 
        wrapper.addEventListener('mousedown', (event) => { event.stopPropagation() })
        wrapper.addEventListener('click', () => {
            let icon = wrapper.firstChild as SVGSVGElement
            if (icon.hasAttribute('active-star')) {
                icon.replaceWith(get_svg(icons.star, ["icon_hover"]))
                icon = wrapper.firstChild as SVGSVGElement
                icon.style.visibility = 'hidden'

                if (item.star_deact) item.star_deact()
            } else {
                let new_icon = get_svg(icons.star_filled, ["icon_hover"])
                new_icon.setAttribute('active-star', '')
                icon.replaceWith(new_icon)
                icon = wrapper.firstChild as SVGSVGElement

                if (item.star_act) item.star_act()
            }
        })

        parent_div.appendChild(wrapper)
    }
    // #endregion

    // #region -------------------- Symbol Search -------------------- //
    symbol_search(): HTMLDivElement {
        let search_div = document.createElement('div')
        search_div.id = "symbol_search_menu"
        search_div.classList.add('overlay_menu', 'overlay_menu_large', 'menu_text')
        //Stop Event from propogating to document level, menu items will handle close functionality
        search_div.addEventListener('mousedown', (event) => { event.stopPropagation() })

        search_div.innerHTML = symbol_search_menu_template

        //Append Search Icon to the title bar
        let search_icon = search_div.querySelector('#search_icon') as HTMLDivElement
        let search_svg = get_svg(icons.menu_search)
        search_svg.setAttribute('width', '28')
        search_svg.setAttribute('height', '28')
        search_icon.appendChild(search_svg)

        //Append Close Button to the title bar
        let close_icon = search_div.querySelector('#close_icon') as HTMLDivElement
        let close_svg = get_svg(icons.close, ['icon_hover'])
        search_svg.setAttribute('width', '28')
        search_svg.setAttribute('height', '28')
        close_icon.appendChild(close_svg)
        close_icon.addEventListener('click', this.hide_all_menus.bind(this))

        //Input Callback listener
        let input = search_div.querySelector('#symbol_search_input') as HTMLInputElement
        input.addEventListener('input', () => this.on_symbol_search())

        let submit = search_div.querySelector('#symbol_search_submit') as HTMLInputElement
        submit.addEventListener('mousedown', () => this.on_symbol_search(true))


        //Set initial bubble state, div needs to be appended first.
        this.div.appendChild(search_div)
        this.populate_bubbles('exchange', [])
        this.populate_bubbles('broker', [])
        this.populate_bubbles('type', [])

        return search_div
    }

    protected populate_symbol_list(items: symbol_item[]) {
        let search_menu_list = this.div.querySelector("#symbols_table tbody") as HTMLDivElement
        search_menu_list.replaceChildren()

        let list_item
        items.forEach(item => {
            list_item = document.createElement('tr')
            list_item.classList.add('symbol_list_item')
            list_item.innerHTML = symbol_search_item_template;

            (list_item.querySelector('#ticker_symbol') as HTMLTableCellElement).innerText = item.ticker;
            (list_item.querySelector('#ticker_name') as HTMLTableCellElement).innerText = item.name ?? "-";
            (list_item.querySelector('#ticker_exchange') as HTMLTableCellElement).innerText = item.exchange ?? "-";
            (list_item.querySelector('#ticker_type') as HTMLTableCellElement).innerText = item.sec_type?.toString() ?? "-";
            (list_item.querySelector('#ticker_broker') as HTMLTableCellElement).innerText = item.broker ?? "-";

            list_item.addEventListener('click', () => {
                if (window.active_frame)
                    window.api.data_request(
                        window.active_container.id,
                        window.active_frame.id,
                        item,
                        window.active_frame.timeframe.multiplier,
                        window.active_frame.timeframe.period
                    )
                else
                    console.warn("Data Request Called, but Active_frame is null")
                this.hide_all_menus()
            })

            search_menu_list.appendChild(list_item)
        });
    }

    /**
     * Method to populate the Search Options Selectable Bubbles
     * @param category simple string, can be 'type', 'broker', or 'exchange'
     * @param types List of strings to be added. These, plus 'Any', will be returned verbatim when a search is called
     */
    protected populate_bubbles(category: 'type' | 'broker' | 'exchange', types: string[]) {
        let search_menu = this.div.querySelector('#symbol_search_menu') as HTMLDivElement
        let old_search_menu = search_menu.querySelector(`#${category}_bubbles`)

        let new_search_menu = document.createElement('div') as HTMLDivElement
        new_search_menu.classList.add('sel_bubbles')
        new_search_menu.id = `${category}_bubbles`

        switch (category) {
            case 'type':
                new_search_menu.innerText = 'Security Type:'; break;
            case 'broker':
                new_search_menu.innerText = 'Data Broker:'; break;
            case 'exchange':
                new_search_menu.innerText = 'Exchange:'; break;
        }

        //Create Static 'Any' Button Option
        let bubble_item
        bubble_item = document.createElement('div')
        bubble_item.classList.add('bubble_item')
        bubble_item.id = 'any'
        bubble_item.innerText = 'Any';
        bubble_item.setAttribute('active', '')
        bubble_item.addEventListener('click', (e) => {
            let target = e.target as HTMLDivElement
            //clear all Active bubbles
            let bubbles = target.parentElement?.querySelectorAll('.bubble_item[active]') as NodeList
            for (let i = 0; i < bubbles?.length; i++)
                (bubbles[i] as HTMLDivElement).removeAttribute('active')

            target.setAttribute('active', '')
            this.on_symbol_search()
        })
        new_search_menu.appendChild(bubble_item)


        //Create Remaining Items
        let active_toggle = (e: MouseEvent) => {
            let target = e.target as HTMLDivElement
            if (target.hasAttribute('active')) {
                target.removeAttribute('active')
                //Check if 'Any' needs to be reset
                if (target.parentElement?.querySelectorAll('.bubble_item[active]').length === 0)
                    target.parentElement.querySelector('#any')?.setAttribute('active', '')
            }
            else {
                //Check if 'Any' needs to be cleared
                if (target.parentElement?.querySelectorAll('#any[active]').length === 1)
                    target.parentElement.querySelector('#any')?.removeAttribute('active')
                target.setAttribute('active', '')
            }
            this.on_symbol_search()
        }
        types.forEach(type => {
            bubble_item = document.createElement('div')
            bubble_item.classList.add('bubble_item')
            bubble_item.innerText = type;
            bubble_item.addEventListener('click', active_toggle)

            new_search_menu.appendChild(bubble_item)
        });

        if (old_search_menu !== null)
            old_search_menu.replaceWith(new_search_menu)
        else
            search_menu.appendChild(new_search_menu)
    }

    /**
     * Collect the input text and selected modifiers. Ship this information back to python.
     * Confirmed = false means text or a setting was changed, Confirmed = true means search button was pressed.
     */
    private on_symbol_search(confirmed = false) {
        let search_menu = this.div.querySelector('#symbol_search_menu') as HTMLDivElement
        let input = search_menu.querySelector('#symbol_search_input') as HTMLInputElement
        let types = search_menu.querySelectorAll('#type_bubbles .bubble_item[active]')
        let brokers = search_menu.querySelectorAll('#broker_bubbles .bubble_item[active]')
        let exchanges = search_menu.querySelectorAll('#exchange_bubbles .bubble_item[active]')

        let type_strings = []
        for (let i = 0; i < types.length; i++)
            type_strings.push((types[i] as HTMLDivElement).innerText)

        let broker_strings = []
        for (let i = 0; i < brokers.length; i++)
            broker_strings.push((brokers[i] as HTMLDivElement).innerText)

        let exchange_strings = []
        for (let i = 0; i < exchanges.length; i++)
            exchange_strings.push((exchanges[i] as HTMLDivElement).innerText)

        window.api.symbol_search(input.value, type_strings, broker_strings, exchange_strings, confirmed)
    }
    // #endregion
}

const symbol_search_menu_template = `
    <div id="title" class="overlay_title_bar menu_text">
        <div id="search_icon"></div>
        <div id="text" class="text"><h1 style="margin: 5px 20px">Symbol Search</h1></div>
        <div style="flex-grow: 1;"></div>
        <div id="close_icon"></div>
    </div>
    <div id="text_input" class='symbol_text_input'>
        <input id="symbol_search_input" class='search_input text' type='text'/>
        <input id="symbol_search_submit" class='search_submit text' type='submit' value="Search"/>
    </div>
    <div id="symbols_list" class='symbol_list'>
        <table id="symbols_table">
            <thead><tr class="symbol_list_item">
                <th>Symbol</th>
                <th>Name</th>
                <th>Exchange</th>
                <th>Type</th>
                <th>Data Broker</th>
            </tr></thead>
            <tbody></tbody>
        </table>
    </div>
`

const symbol_search_item_template = `
    <td id="ticker_symbol"></td>
    <td id="ticker_name"></td>
    <td id="ticker_exchange"></td>
    <td id="ticker_type"></td>
    <td id="ticker_broker"></td>
`