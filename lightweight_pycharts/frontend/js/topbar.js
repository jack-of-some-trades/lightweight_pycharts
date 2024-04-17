import { icon_manager, icons } from "./icons.js";
import { menu_location, overlay_manager } from "./overlay.js";
import { Container_Layouts, LAYOUT_DIM_TOP, Series_Types, Wrapper_Divs, layout_icon_map, series_icon_map, series_label_map, tf } from "./util.js";
export class topbar {
    constructor(parent, tf, layout, series) {
        this.parent = parent;
        this.div = parent.get_div(Wrapper_Divs.TOP_BAR);
        this.tf_select = tf;
        this.layout_select = layout;
        this.series_select = series;
        this.left_div = document.createElement('div');
        this.left_div.classList.add('topbar', 'topbar_left');
        this.left_div.appendChild(this.symbol_search());
        this.left_div.appendChild(this.separator());
        this.left_div.appendChild(this.tf_select.wrapper_div);
        this.left_div.appendChild(this.separator());
        this.left_div.appendChild(this.series_select.wrapper_div);
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
                favorite_divs[i].classList.add('selected');
                found = true;
            }
            else {
                favorite_divs[i].classList.remove('selected');
            }
        }
        let tmp_div;
        if (!found) {
            tmp_div = this.make_topbar_button(data, false);
            tmp_div.classList.add('selected');
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
        if (pressable) {
            wrapper.addEventListener('click', () => this.select(data));
            wrapper.classList.add('icon_hover', 'fav_tf');
        }
        else {
            wrapper.classList.add('Text_selected');
        }
        return wrapper;
    }
    update_menu_location() {
        if (this.menu_button && this.overlay_menu_div)
            overlay_manager.menu_position_func(menu_location.BOTTOM_RIGHT, this.overlay_menu_div, this.menu_button)();
    }
    select(data) { console.log(`selected ${data.toString()}`); this.update_topbar_icon(data); }
    add_favorite(data) {
        var _a, _b, _c, _d;
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
                if (curr_tf_value === parseInt((_c = this.current_tf_div.getAttribute('data-tf-value')) !== null && _c !== void 0 ? _c : '-1')) {
                    let tmp_div = this.make_topbar_button(new tf(-1, 'E'), false, true);
                    this.current_tf_div.replaceWith(tmp_div);
                    this.current_tf_div = tmp_div;
                    this.update_topbar_icon(data);
                }
                this.update_menu_location();
                return;
            }
        }
        this.current_tf_div.after(this.make_topbar_button(data));
        if (this.json.favorites.indexOf(data.toString()) === -1)
            this.json.favorites.push(data.toString());
        if (curr_tf_value === parseInt((_d = this.current_tf_div.getAttribute('data-tf-value')) !== null && _d !== void 0 ? _d : '-1')) {
            let tmp_div = this.make_topbar_button(new tf(-1, 'E'), false, true);
            this.current_tf_div.replaceWith(tmp_div);
            this.current_tf_div = tmp_div;
            this.update_topbar_icon(data);
        }
        this.update_menu_location();
    }
    remove_favorite(data) {
        var _a;
        let curr_tf_value = data.toValue();
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_tf');
        for (let i = 0; i < favorite_divs.length; i++) {
            if (curr_tf_value === parseInt((_a = favorite_divs[i].getAttribute('data-tf-value')) !== null && _a !== void 0 ? _a : '-1')) {
                if (favorite_divs[i].classList.contains('selected')) {
                    favorite_divs[i].remove();
                    this.update_topbar_icon(data);
                }
                else {
                    favorite_divs[i].remove();
                }
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
        this.json = default_layout_select_opts;
        this.menu_button = topbar.menu_selector();
        this.current_layout_div = this.make_topbar_button(null, false);
        this.wrapper_div.appendChild(this.current_layout_div);
        this.wrapper_div.appendChild(this.menu_button);
        let items = this.make_items_list(this.json);
        this.select = this.select.bind(this);
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'layout_selector', menu_location.BOTTOM_RIGHT, this.select);
    }
    update_topbar(json) {
        let items = this.make_items_list(json);
        this.overlay_menu_div.remove();
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'layout_selector', menu_location.BOTTOM_RIGHT, this.select);
        if (window.active_container && window.active_container.layout !== null) {
            this.update_topbar_icon(window.active_container.layout);
        }
    }
    get_json() { return this.json; }
    update_topbar_icon(data) {
        var _a, _b;
        let curr_layout_value = data.valueOf();
        let found = false;
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_layout');
        if (curr_layout_value === parseInt((_a = this.current_layout_div.getAttribute('data-layout-value')) !== null && _a !== void 0 ? _a : '-1'))
            return;
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            let icon_svg = favorite_divs[i].firstChild;
            if (curr_layout_value === parseInt((_b = favorite_divs[i].getAttribute('data-layout-value')) !== null && _b !== void 0 ? _b : '-1')) {
                icon_svg.classList.add('selected');
                found = true;
            }
            else {
                icon_svg.classList.remove('selected');
            }
        }
        let tmp_div;
        if (!found) {
            tmp_div = this.make_topbar_button(data, false);
            let icon_svg = tmp_div.firstChild;
            icon_svg.classList.add('selected');
        }
        else {
            tmp_div = this.make_topbar_button(null, false);
        }
        this.current_layout_div.replaceWith(tmp_div);
        this.current_layout_div = tmp_div;
    }
    make_items_list(json) {
        try {
            let items = [];
            let favs = json.favorites;
            let populate_items = (layouts) => {
                layouts.forEach(layout => {
                    items.push({
                        label: "",
                        data: layout,
                        icon: layout_icon_map[layout],
                        star: favs.includes(layout),
                        star_act: () => this.add_favorite(layout),
                        star_deact: () => this.remove_favorite(layout),
                    });
                });
            };
            populate_items = populate_items.bind(this);
            items.push({ label: 'Basic', separator: true, separator_row: true });
            populate_items([
                Container_Layouts.SINGLE,
                Container_Layouts.DOUBLE_VERT,
                Container_Layouts.DOUBLE_HORIZ,
            ]);
            items.push({ label: 'Triple', separator: true, separator_vis: false, separator_row: true });
            populate_items([
                Container_Layouts.TRIPLE_HORIZ,
                Container_Layouts.TRIPLE_HORIZ_TOP,
                Container_Layouts.TRIPLE_HORIZ_BOTTOM,
                Container_Layouts.TRIPLE_VERT,
                Container_Layouts.TRIPLE_VERT_LEFT,
                Container_Layouts.TRIPLE_VERT_RIGHT,
            ]);
            items.push({ label: 'Quad', separator: true, separator_vis: false, separator_row: true });
            populate_items([
                Container_Layouts.QUAD_VERT,
                Container_Layouts.QUAD_HORIZ,
                Container_Layouts.QUAD_TOP,
                Container_Layouts.QUAD_LEFT,
                Container_Layouts.QUAD_RIGHT,
                Container_Layouts.QUAD_BOTTOM,
            ]);
            let favorite_divs = this.wrapper_div.getElementsByClassName('fav_layout');
            for (let i = 0; i < favorite_divs.length;) {
                favorite_divs[i].remove();
            }
            this.json = json;
            favs.forEach(element => { this.add_favorite(element); });
            return items;
        }
        catch (e) {
            console.warn('layout_switcher.make_item_list() Failed. Json Not formatted Correctly');
            console.log('Actual Error: ', e);
            return [];
        }
    }
    make_topbar_button(data, pressable = true) {
        var _a;
        let wrapper = document.createElement('div');
        wrapper.classList.add('topbar');
        if (data === null)
            return wrapper;
        wrapper.setAttribute('data-layout-value', (_a = data.valueOf().toString()) !== null && _a !== void 0 ? _a : '-1');
        wrapper.appendChild(icon_manager.get_svg(layout_icon_map[data]));
        if (pressable) {
            wrapper.addEventListener('click', () => this.select(data));
            wrapper.classList.add('icon_hover', 'fav_layout');
        }
        else {
            let icon_svg = wrapper.firstChild;
            icon_svg.classList.add('selected');
        }
        return wrapper;
    }
    update_menu_location() {
        if (this.menu_button && this.overlay_menu_div)
            overlay_manager.menu_position_func(menu_location.BOTTOM_RIGHT, this.overlay_menu_div, this.menu_button)();
    }
    select(data) { console.log(`selected ${data.toString()}`); this.update_topbar_icon(data); }
    add_favorite(data) {
        var _a, _b, _c, _d;
        let curr_layout_value = data.valueOf();
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_layout');
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            let element = favorite_divs[i];
            if (curr_layout_value === parseInt((_a = element.getAttribute('data-layout-value')) !== null && _a !== void 0 ? _a : '1')) {
                return;
            }
            else if (curr_layout_value > parseInt((_b = element.getAttribute('data-layout-value')) !== null && _b !== void 0 ? _b : '-1')) {
                element.after(this.make_topbar_button(data));
                if (this.json.favorites.indexOf(data) === -1)
                    this.json.favorites.push(data);
                if (curr_layout_value === parseInt((_c = this.current_layout_div.getAttribute('data-layout-value')) !== null && _c !== void 0 ? _c : '-1')) {
                    let tmp_div = this.make_topbar_button(null, false);
                    this.current_layout_div.replaceWith(tmp_div);
                    this.current_layout_div = tmp_div;
                    this.update_topbar_icon(data);
                }
                return;
            }
        }
        this.current_layout_div.after(this.make_topbar_button(data));
        if (this.json.favorites.indexOf(data) === -1)
            this.json.favorites.push(data);
        if (curr_layout_value === parseInt((_d = this.current_layout_div.getAttribute('data-layout-value')) !== null && _d !== void 0 ? _d : '-1')) {
            let tmp_div = this.make_topbar_button(null, false);
            this.current_layout_div.replaceWith(tmp_div);
            this.current_layout_div = tmp_div;
            this.update_topbar_icon(data);
        }
    }
    remove_favorite(data) {
        var _a;
        let curr_layout_value = data.valueOf();
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_layout');
        for (let i = 0; i < favorite_divs.length; i++) {
            if (curr_layout_value === parseInt((_a = favorite_divs[i].getAttribute('data-layout-value')) !== null && _a !== void 0 ? _a : '-1')) {
                let icon = favorite_divs[i].firstChild;
                if (icon.classList.contains('selected')) {
                    favorite_divs[i].remove();
                    this.update_topbar_icon(data);
                }
                else {
                    favorite_divs[i].remove();
                }
                let fav_index = this.json.favorites.indexOf(data);
                if (fav_index !== -1) {
                    this.json.favorites.splice(fav_index, 1);
                }
            }
        }
    }
}
export class series_selector {
    constructor() {
        this.wrapper_div = document.createElement('div');
        this.wrapper_div.id = 'series_switcher';
        this.wrapper_div.classList.add('topbar', 'topbar_container');
        this.json = default_series_select_opts;
        this.menu_button = topbar.menu_selector();
        this.current_series_div = this.make_topbar_button(null, false);
        this.wrapper_div.appendChild(this.current_series_div);
        this.wrapper_div.appendChild(this.menu_button);
        let items = this.make_items_list(this.json);
        this.select = this.select.bind(this);
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'series_selector', menu_location.BOTTOM_RIGHT, this.select);
    }
    update_topbar(json) {
        let items = this.make_items_list(json);
        this.overlay_menu_div.remove();
        this.overlay_menu_div = overlay_manager.menu(this.menu_button, items, 'series_selector', menu_location.BOTTOM_RIGHT, this.select);
    }
    get_json() { return this.json; }
    update_topbar_icon(data) {
        var _a, _b;
        let curr_series_value = data.valueOf();
        let found = false;
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_series');
        if (curr_series_value === parseInt((_a = this.current_series_div.getAttribute('data-series-value')) !== null && _a !== void 0 ? _a : '-1'))
            return;
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            let icon_svg = favorite_divs[i].firstChild;
            if (curr_series_value === parseInt((_b = favorite_divs[i].getAttribute('data-series-value')) !== null && _b !== void 0 ? _b : '-1')) {
                icon_svg.classList.add('selected');
                found = true;
            }
            else {
                icon_svg.classList.remove('selected');
            }
        }
        let tmp_div;
        if (!found) {
            tmp_div = this.make_topbar_button(data, false);
            let icon_svg = tmp_div.firstChild;
            icon_svg.classList.add('selected');
        }
        else {
            tmp_div = this.make_topbar_button(null, false);
        }
        this.current_series_div.replaceWith(tmp_div);
        this.current_series_div = tmp_div;
    }
    make_items_list(json) {
        try {
            let items = [];
            let favs = json.favorites;
            let populate_items = (series) => {
                series.forEach(type => {
                    items.push({
                        label: series_label_map[type],
                        data: type,
                        icon: series_icon_map[type],
                        star: favs.includes(type),
                        star_act: () => this.add_favorite(type),
                        star_deact: () => this.remove_favorite(type),
                    });
                });
            };
            populate_items = populate_items.bind(this);
            populate_items([
                Series_Types.BAR,
                Series_Types.CANDLESTICK,
                Series_Types.ROUNDED_CANDLE,
                Series_Types.LINE,
                Series_Types.AREA,
                Series_Types.HISTOGRAM,
                Series_Types.BASELINE,
                Series_Types.HLC_AREA,
            ]);
            let favorite_divs = this.wrapper_div.getElementsByClassName('fav_series');
            for (let i = 0; i < favorite_divs.length;) {
                favorite_divs[i].remove();
            }
            this.json = json;
            favs.forEach(element => { this.add_favorite(element); });
            return items;
        }
        catch (e) {
            console.warn('series_switcher.make_item_list() Failed. Json Not formatted Correctly');
            console.log('Actual Error: ', e);
            return [];
        }
    }
    make_topbar_button(data, pressable = true) {
        var _a;
        let wrapper = document.createElement('div');
        wrapper.classList.add('topbar');
        if (data === null)
            return wrapper;
        wrapper.setAttribute('data-series-value', (_a = data.valueOf().toString()) !== null && _a !== void 0 ? _a : '-1');
        wrapper.appendChild(icon_manager.get_svg(series_icon_map[data]));
        if (pressable) {
            wrapper.addEventListener('click', () => this.select(data));
            wrapper.classList.add('icon_hover', 'fav_series');
        }
        else {
            let icon_svg = wrapper.firstChild;
            icon_svg.classList.add('selected');
        }
        return wrapper;
    }
    update_menu_location() {
        if (this.menu_button && this.overlay_menu_div)
            overlay_manager.menu_position_func(menu_location.BOTTOM_RIGHT, this.overlay_menu_div, this.menu_button)();
    }
    select(data) { console.log(`selected ${data.toString()}`); this.update_topbar_icon(data); }
    add_favorite(data) {
        var _a, _b, _c, _d;
        let curr_series_value = data.valueOf();
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_series');
        for (let i = favorite_divs.length - 1; i >= 0; i--) {
            let element = favorite_divs[i];
            if (curr_series_value === parseInt((_a = element.getAttribute('data-series-value')) !== null && _a !== void 0 ? _a : '1')) {
                return;
            }
            else if (curr_series_value > parseInt((_b = element.getAttribute('data-series-value')) !== null && _b !== void 0 ? _b : '-1')) {
                element.after(this.make_topbar_button(data));
                if (this.json.favorites.indexOf(data) === -1)
                    this.json.favorites.push(data);
                if (curr_series_value === parseInt((_c = this.current_series_div.getAttribute('data-series-value')) !== null && _c !== void 0 ? _c : '-1')) {
                    let tmp_div = this.make_topbar_button(null, false);
                    this.current_series_div.replaceWith(tmp_div);
                    this.current_series_div = tmp_div;
                    this.update_topbar_icon(data);
                }
                this.update_menu_location();
                return;
            }
        }
        this.current_series_div.after(this.make_topbar_button(data));
        if (this.json.favorites.indexOf(data) === -1)
            this.json.favorites.push(data);
        if (curr_series_value === parseInt((_d = this.current_series_div.getAttribute('data-series-value')) !== null && _d !== void 0 ? _d : '-1')) {
            let tmp_div = this.make_topbar_button(null, false);
            this.current_series_div.replaceWith(tmp_div);
            this.current_series_div = tmp_div;
            this.update_topbar_icon(data);
        }
        this.update_menu_location();
    }
    remove_favorite(data) {
        var _a;
        let curr_series_value = data.valueOf();
        let favorite_divs = this.wrapper_div.getElementsByClassName('fav_series');
        for (let i = 0; i < favorite_divs.length; i++) {
            if (curr_series_value === parseInt((_a = favorite_divs[i].getAttribute('data-series-value')) !== null && _a !== void 0 ? _a : '-1')) {
                let icon = favorite_divs[i].firstChild;
                if (icon.classList.contains('selected')) {
                    favorite_divs[i].remove();
                    this.update_topbar_icon(data);
                }
                else {
                    favorite_divs[i].remove();
                }
                this.update_menu_location();
                let fav_index = this.json.favorites.indexOf(data);
                if (fav_index !== -1) {
                    this.json.favorites.splice(fav_index, 1);
                }
            }
        }
    }
}
const default_series_select_opts = {
    favorites: [
        Series_Types.ROUNDED_CANDLE
    ]
};
const default_layout_select_opts = {
    favorites: [
        Container_Layouts.SINGLE,
        Container_Layouts.DOUBLE_VERT,
        Container_Layouts.DOUBLE_HORIZ
    ]
};
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
