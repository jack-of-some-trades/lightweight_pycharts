import { icon_manager, icons } from "./icons.js";
import { menu_location, overlay_manager } from "./overlay.js";
import { LAYOUT_DIM_TOP, Wrapper_Divs, tf } from "./util.js";
export class topbar {
    constructor(parent, tf_select, layout_select) {
        this.parent = parent;
        this.div = parent.get_div(Wrapper_Divs.TOP_BAR);
        this.tf_select = tf_select;
        this.layout_select = layout_select;
        this.left_div = document.createElement('div');
        this.left_div.classList.add('topbar', 'topbar_left');
        this.left_div.appendChild(this.symbol_search());
        this.left_div.appendChild(this.separator());
        this.left_div.appendChild(this.tf_select.wrapper_div);
        this.left_div.appendChild(this.separator());
        this.right_div = document.createElement('div');
        this.right_div.classList.add('topbar', 'topbar_right');
        this.right_div.appendChild(this.layout_select.wrapper_div);
        this.right_div.appendChild(this.separator());
        this.right_div.appendChild(this.panel_toggle(this.parent, icons.panel_left));
        this.div.appendChild(this.left_div);
        this.div.appendChild(this.right_div);
    }
    static menu_selector() {
        let menu_sel = document.createElement('div');
        menu_sel.classList.add('topbar_menu_button', 'icon_hover', 'icon_v_margin');
        menu_sel.appendChild(icon_manager.get_svg(icons.menu_arrow_ns));
        return menu_sel;
    }
    symbol_search() {
        let search_div = document.createElement('div');
        search_div.id = 'symbol_search_topbar';
        search_div.classList.add('topbar', 'topbar_container');
        let search_button = document.createElement('div');
        search_button.classList.add('topbar', 'topbar_item', 'icon_hover');
        search_button.style.padding = '4px';
        let search_text = document.createElement('div');
        search_text.classList.add('topbar', 'icon_text');
        search_text.innerHTML = 'LWPC';
        search_text.style.marginRight = '4px';
        search_button.appendChild(icon_manager.get_svg(icons.menu_search, ['icon_v_margin', 'icon_h_margin']));
        search_button.appendChild(search_text);
        search_div.appendChild(search_button);
        search_div.appendChild(icon_manager.get_svg(icons.menu_add, ['icon_hover']));
        return search_div;
    }
    panel_toggle(parent, icon, active_start = true) {
        let toggle_btn = document.createElement('div');
        toggle_btn.classList.add('topbar_menu_button');
        let wrap_div;
        switch (icon) {
            case icons.panel_right:
                wrap_div = Wrapper_Divs.NAV_BAR;
                break;
            case icons.panel_bottom:
                wrap_div = Wrapper_Divs.UTIL_BAR;
                break;
            default:
                icon = icons.panel_left;
                wrap_div = Wrapper_Divs.DRAW_TOOLS;
        }
        let svg = icon_manager.get_svg(icon, ['icon_hover']);
        if (active_start) {
            svg.classList.add('icon_active');
            parent.show_section(wrap_div);
        }
        else {
            parent.hide_section(wrap_div);
        }
        toggle_btn.appendChild(svg);
        toggle_btn.addEventListener('click', () => {
            if (toggle_btn.firstElementChild)
                if (toggle_btn.firstElementChild.classList.contains('icon_active')) {
                    toggle_btn.firstElementChild.classList.remove('icon_active');
                    parent.hide_section(wrap_div);
                }
                else {
                    toggle_btn.firstElementChild.classList.add('icon_active');
                    parent.show_section(wrap_div);
                }
        });
        return toggle_btn;
    }
    button(icon) {
        let btn = document.createElement('div');
        btn.appendChild(icon_manager.get_svg(icon, ['icon_hover']));
        btn.classList.add('topbar_menu_button');
        btn.style.margin = '4px';
        switch (icon) {
            case icons.close:
                btn.addEventListener('click', () => { window.api.close(); });
                break;
            case icons.minimize:
                btn.addEventListener('click', () => { window.api.minimize(); });
                break;
            case icons.maximize:
                btn.addEventListener('click', () => { window.api.maximize(); });
                break;
            default:
                btn.addEventListener('click', () => { console.log(`button ${icon} pressed!`); });
        }
        return btn;
    }
    separator() {
        let new_div = document.createElement('div');
        new_div.classList.add('topbar_separator');
        new_div.style.height = `${LAYOUT_DIM_TOP.HEIGHT - 2 * LAYOUT_DIM_TOP.V_BUFFER}px`;
        new_div.style.margin = `${LAYOUT_DIM_TOP.V_BUFFER}px ${LAYOUT_DIM_TOP.H_BUFFER}px`;
        return new_div;
    }
}
topbar.loaded = false;
export class timeframe_selector {
    constructor() {
        this.wrapper_div = document.createElement('div');
        this.wrapper_div.id = 'timeframe_switcher';
        this.wrapper_div.classList.add('topbar', 'topbar_container');
        this.json = default_timeframe_select_opts;
        this.menu_button = topbar.menu_selector();
        this.current_tf_div = this.make_topbar_button(new tf(-1, 's'), false, true);
        this.wrapper_div.appendChild(this.current_tf_div);
        this.wrapper_div.appendChild(this.menu_button);
        let items = this.make_items_list(this.json);
        this.select = this.select.bind(this);
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'timeframe_selector', menu_location.BOTTOM_RIGHT, this.select);
    }
    update_topbar(json) {
        let items = this.make_items_list(json);
        this.overlay_menu_div.remove();
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'timeframe_selector', menu_location.BOTTOM_RIGHT, this.select);
    }
    get_json() { return this.json; }
    update_topbar_icon(data) {
        var _a, _b;
        let curr_tf_value = data.toValue();
        let found = false;
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_tf');
        if (curr_tf_value === parseInt((_a = this.current_tf_div.getAttribute('data-tf-value')) !== null && _a !== void 0 ? _a : '-1'))
            return;
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            if (curr_tf_value === parseInt((_b = favorite_divs[i].getAttribute('data-tf-value')) !== null && _b !== void 0 ? _b : '-1')) {
                favorite_divs[i].classList.add('text_selected');
                found = true;
            }
            else {
                favorite_divs[i].classList.remove('text_selected');
            }
        }
        let tmp_div;
        if (!found) {
            tmp_div = this.make_topbar_button(data, false);
            tmp_div.classList.add('text_selected');
        }
        else {
            tmp_div = this.make_topbar_button(new tf(-1, 's'), false, true);
        }
        this.current_tf_div.replaceWith(tmp_div);
        this.current_tf_div = tmp_div;
    }
    make_items_list(json) {
        try {
            let favorite_tfs = [];
            let items = [];
            let favs = json.favorites;
            let sub_menus = json.menu_listings;
            let populate_items = (interval, values) => {
                values.forEach(value => {
                    let period = new tf(value, interval);
                    let fav = favs.includes(period.toString());
                    if (fav)
                        favorite_tfs.push(period);
                    items.push({
                        label: period.toLabel(),
                        data: period,
                        star: fav,
                        star_act: () => this.add_favorite(period),
                        star_deact: () => this.remove_favorite(period),
                    });
                });
            };
            populate_items = populate_items.bind(this);
            if (sub_menus.s) {
                items.push({ label: "Seconds", separator: true, separator_vis: false });
                populate_items('s', sub_menus.s);
            }
            if (sub_menus.m) {
                items.push({ label: "Minutes", separator: true });
                populate_items('m', sub_menus.m);
            }
            if (sub_menus.h) {
                items.push({ label: "Hours", separator: true });
                populate_items('h', sub_menus.h);
            }
            if (sub_menus.D) {
                items.push({ label: "Days", separator: true });
                populate_items('D', sub_menus.D);
            }
            if (sub_menus.W) {
                items.push({ label: "Weeks", separator: true, separator_vis: false });
                populate_items('W', sub_menus.W);
            }
            if (sub_menus.M) {
                items.push({ label: "Months", separator: true, separator_vis: false });
                populate_items('M', sub_menus.M);
            }
            if (sub_menus.Y) {
                items.push({ label: "Years", separator: true, separator_vis: false });
                populate_items('Y', sub_menus.Y);
            }
            let favorite_divs = this.wrapper_div.getElementsByClassName('fav_tf');
            for (let i = 0; i < favorite_divs.length;) {
                favorite_divs[i].remove();
            }
            this.json = json;
            favorite_tfs.forEach(element => { this.add_favorite(element); });
            return items;
        }
        catch (e) {
            console.warn('timeframe_switcher.make_item_list() Failed. Json Not formatted Correctly');
            console.log('Actual Error: ', e);
            return [];
        }
    }
    make_topbar_button(data, pressable = true, blank_element = false) {
        let wrapper = document.createElement('div');
        wrapper.classList.add('topbar', 'button_text');
        wrapper.setAttribute('data-tf-value', data.toValue().toString());
        if (blank_element)
            return wrapper;
        if (data.multiplier === 1 && ['D', 'W', 'M', 'Y'].includes(data.interval)) {
            wrapper.innerHTML = data.toString().replace('1', '');
        }
        else
            wrapper.innerHTML = data.toString();
        wrapper.classList.add('Text_selected');
        if (pressable) {
            wrapper.addEventListener('click', () => this.select(data));
            wrapper.classList.add('icon_hover', 'fav_tf');
        }
        return wrapper;
    }
    update_menu_location() {
        if (this.menu_button && this.overlay_menu_div)
            overlay_manager.menu_position_func(menu_location.BOTTOM_RIGHT, this.overlay_menu_div, this.menu_button)();
    }
    select(data) { console.log(`selected ${data.toString()}`); this.update_topbar_icon(data); }
    add_favorite(data) {
        var _a, _b;
        let curr_tf_value = data.toValue();
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_tf');
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            let element = favorite_divs[i];
            if (curr_tf_value === parseInt((_a = element.getAttribute('data-tf-value')) !== null && _a !== void 0 ? _a : '1')) {
                return;
            }
            else if (curr_tf_value > parseInt((_b = element.getAttribute('data-tf-value')) !== null && _b !== void 0 ? _b : '-1')) {
                element.after(this.make_topbar_button(data));
                if (this.json.favorites.indexOf(data.toString()) === -1)
                    this.json.favorites.push(data.toString());
                this.update_menu_location();
                return;
            }
        }
        this.current_tf_div.after(this.make_topbar_button(data));
        this.update_menu_location();
        if (this.json.favorites.indexOf(data.toString()) === -1)
            this.json.favorites.push(data.toString());
    }
    remove_favorite(data) {
        var _a;
        let curr_tf_value = data.toValue();
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_tf');
        for (let i = 0; i < favorite_divs.length; i++) {
            if (curr_tf_value === parseInt((_a = favorite_divs[i].getAttribute('data-tf-value')) !== null && _a !== void 0 ? _a : '-1')) {
                favorite_divs[i].remove();
                this.update_menu_location();
                let fav_index = this.json.favorites.indexOf(data.toString());
                if (fav_index !== -1) {
                    this.json.favorites.splice(fav_index, 1);
                }
            }
        }
    }
}
export class layout_selector {
    constructor() {
        this.wrapper_div = document.createElement('div');
        this.wrapper_div.id = 'layout_switcher';
        this.wrapper_div.classList.add('topbar', 'topbar_container');
        this.current_layout_div = document.createElement('div');
        this.favorites_divs = [];
        let items = [
            { label: '5 Minute', data: '5m', star: true },
            { label: '15 Minute', data: '15m', star: true },
            { label: '30 Minute', data: '30m', star: true },
        ];
        let menu_button = topbar.menu_selector();
        overlay_manager.menu(menu_button, items, 'layout_selector', menu_location.BOTTOM_RIGHT, this.select);
        this.wrapper_div.appendChild(this.current_layout_div);
        this.wrapper_div.appendChild(menu_button);
    }
    select() { }
    star_act() { }
    star_deact() { }
}
const default_layout_select_opts = {};
const default_timeframe_select_opts = {
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
};
