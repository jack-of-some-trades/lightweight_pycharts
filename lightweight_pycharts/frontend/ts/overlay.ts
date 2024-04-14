import { icon_manager, icons } from "./icons.js"

/**
 * Interface used when creating selectable menus
 * @param label Label Text for the selectable item or separator
 * @param icon SVG icon to represent the item
 * @param icon_str Text that could be used in place of the SVG icon
 * @param func CallableFunction that gets called when menu item is selected
 * @param star Boolean to represent if the item should have a toggleable 'favorites' star
 * @param star_selected Boolean starting state of the star. true == selected. default: false
 * @param star_act CallableFunction to be called when star is activated
 * @param star_deact CallableFunction to be called when str is de-activated
 * @param separator Boolean, this is the start of a new sub_menu
 * @param separator_vis boolean, this new sub_menu should be visible by default: default true.
 */
export interface menu_item {
    label: string,
    icon?: icons,
    icon_str?: string,
    func?: CallableFunction,
    star?: boolean,
    star_selected?: boolean,
    star_act?: CallableFunction,
    star_deact?: CallableFunction,
    separator?: boolean,
    separator_vis?: boolean,
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
    static instance: overlay_manager
    div: HTMLDivElement

    constructor() {
        if (overlay_manager.instance) {
            this.div = document.createElement('div')
            return overlay_manager.instance
        }
        this.div = document.createElement('div')
        this.div.id = 'overlay_manager'
        this.div.classList.add('overlay_manager')
        document.body.appendChild(this.div)

        overlay_manager.instance = this
    }

    /**
     * Generate an overlay menu from the given menu_item[] interface
     * @param parent_div Div Element that should make this menu visible when clicked
     * @param items List of menu_item(s) to add to the menu
     */
    static menu(parent_div: HTMLDivElement, items: menu_item[], update_icon: boolean, id: string, loc: menu_location) {
        if (items.length === 0) return //bc fuck bugs.

        let overlay_menu = document.createElement('div')
        overlay_menu.id = id + '_menu'
        overlay_menu.classList.add('overlay_menu')

        //Event listener to toggle visibility and interactivity
        let menu_loc_func = overlay_manager.menu_position_func(loc, overlay_menu, parent_div)
        parent_div.addEventListener('click', () => {
            if (overlay_menu.classList.contains('overlay_menu_active'))
                overlay_menu.classList.remove('overlay_menu_active')
            else {
                overlay_menu.classList.add('overlay_menu_active')
                menu_loc_func()
            }
        })

        //Global Event Listener to Remove visibility and interactivity
        document.addEventListener('mousedown', () => {
            overlay_menu.classList.remove('overlay_menu_active')
        })
        //Stop the Propogation of the global mousedown event when it originates somewhere in this menu
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
                overlay_menu.appendChild(overlay_manager.make_separator(sub_menu, item))
            } else {
                sub_menu.appendChild(overlay_manager.make_item(item, overlay_menu, parent_div, update_icon))
            }
        });

        //Append Last edited sub_menu
        overlay_menu.appendChild(sub_menu)
        //Add the completed menu to the document
        overlay_manager.instance.div.appendChild(overlay_menu)
    }

    private static make_separator(sub_menu: HTMLDivElement, item: menu_item): HTMLDivElement {
        let title_bar = document.createElement('div')
        title_bar.classList.add('menu_item', 'overlay_menu_separator')

        //set text
        let text = document.createElement('span')
        text.classList.add('overlay_sub_menu_text')
        text.innerHTML = item.label.toUpperCase()
        title_bar.appendChild(text)

        //set inital state
        if (item.separator_vis ?? true) {
            sub_menu.style.display = 'flex'
            title_bar.appendChild(icon_manager.get_svg(icons.menu_arrow_ns))
        } else {
            sub_menu.style.display = 'none'
            title_bar.appendChild(icon_manager.get_svg(icons.menu_arrow_sn))
        }

        //Toggle visibility & icon on click
        title_bar.addEventListener('click', () => {
            let svg = title_bar.getElementsByTagName('svg')[0] as SVGSVGElement
            if (sub_menu.style.display === 'flex') {
                sub_menu.style.display = 'none'
                svg.replaceWith(icon_manager.get_svg(icons.menu_arrow_sn))
            } else {
                sub_menu.style.display = 'flex'
                svg.replaceWith(icon_manager.get_svg(icons.menu_arrow_ns))
            }
        })

        return title_bar
    }

    private static make_item(item: menu_item, menu: HTMLDivElement, parent_div: HTMLDivElement, update_icon: boolean): HTMLDivElement {
        let item_div = document.createElement('div')
        item_div.classList.add('menu_item') //Make Item Wrapper

        let sel_wrap = document.createElement('span')
        sel_wrap.classList.add('menu_selectable')

        //Set icon if needed
        if (item.icon) sel_wrap.appendChild(icon_manager.get_svg(item.icon))

        //Set Label
        let text = document.createElement('span')
        text.classList.add('menu_text')
        text.innerHTML = item.label
        sel_wrap.appendChild(text)
        item_div.appendChild(sel_wrap)

        //Add a Toggle Star if needed
        if (item.star) this.make_toggle_star(item_div, item)

        //Setup click behavior on the selectable wrapper
        sel_wrap.addEventListener('click', () => {
            menu.classList.remove('overlay_menu_active') //Remove Visibility from entire menu

            //update host icon if needed.
            if (update_icon) {
                if (item.icon) {
                    //Update SVG Icon retaining Classes from the previous icon
                    let old_icon = parent_div.firstElementChild as SVGSVGElement
                    old_icon.replaceWith(icon_manager.get_svg(item.icon, old_icon.classList.toString().split(" ")))
                } else {
                    //Update Text Icon (e.g. The Timeframe indicator is a text icon)
                }
            }

            if (item.func) //Call Icon's activate Function
                item.func()
        })

        return item_div
    }

    /**
     * Return a callable function that sets the x, y location based on where the parent element is located
     * @param overlay_menu_div
     * @param parent_div 
     * @returns 
     */
    static menu_position_func(location: menu_location, overlay_menu_div: HTMLDivElement, parent_div: HTMLDivElement): CallableFunction {
        let set_menu_loc = () => { }
        switch (location) {
            case (menu_location.BOTTOM_RIGHT): {
                set_menu_loc = () => {
                    overlay_menu_div.style.top = `${Math.max(parent_div.getBoundingClientRect().bottom + 1, 0)}px`
                    overlay_menu_div.style.left = `${Math.max(parent_div.getBoundingClientRect().right - overlay_menu_div.getBoundingClientRect().width, 0)}px`
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
     * Create a Toggleable star for the given menu item if it is needed.
     */
    static make_toggle_star(parent_div: HTMLDivElement, item: menu_item) {
        let wrapper = document.createElement('div')
        wrapper.classList.add('menu_item_star')
        let icon = icon_manager.get_svg(icons.star, ["icon_hover", "icon_hidden"])
        if (item.star_selected)
            icon.classList.add('star_active')
        wrapper.appendChild(icon)

        //Listeners to make star visible only on mouse over
        parent_div.addEventListener('mouseenter', () => { (wrapper.firstChild as SVGSVGElement).style.visibility = 'visible' })
        parent_div.addEventListener('mouseleave', () => {
            let icon = wrapper.firstChild as SVGSVGElement
            if (!icon.classList.contains('star_active')) {
                icon.style.visibility = 'hidden'
            }
        })

        //Listeners to activate/deactivate the star 
        wrapper.addEventListener('mousedown', (event) => { event.stopPropagation() })
        wrapper.addEventListener('click', () => {
            let icon = wrapper.firstChild as SVGSVGElement
            if (icon.classList.contains('star_active')) {
                icon.replaceWith(icon_manager.get_svg(icons.star, ["icon_hover"]))
                icon = wrapper.firstChild as SVGSVGElement
                icon.style.visibility = 'hidden'

                if (item.star_deact)
                    item.star_deact()
            } else {
                icon.replaceWith(icon_manager.get_svg(icons.star_filled, ["star_active", "icon_hover"]))
                icon = wrapper.firstChild as SVGSVGElement
                icon.style.color = 'var(--star-active-color)'

                if (item.star_act)
                    item.star_act()
            }
        })

        parent_div.appendChild(wrapper)
    }
}