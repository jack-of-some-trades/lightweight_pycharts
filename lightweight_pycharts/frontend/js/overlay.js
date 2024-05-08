import { icon_manager, icons } from "./icons.js";
export var menu_location;
(function (menu_location) {
    menu_location[menu_location["TOP_RIGHT"] = 0] = "TOP_RIGHT";
    menu_location[menu_location["TOP_LEFT"] = 1] = "TOP_LEFT";
    menu_location[menu_location["BOTTOM_RIGHT"] = 2] = "BOTTOM_RIGHT";
})(menu_location || (menu_location = {}));
export class overlay_manager {
    constructor() {
        this.div = document.createElement('div');
        this.div.id = 'overlay_manager';
        this.div.classList.add('overlay_manager');
        document.body.appendChild(this.div);
        document.addEventListener('mousedown', this.hide_all_menus.bind(this));
    }
    hide_all_menus() {
        let other_menus = this.div.querySelectorAll('.overlay_menu[active]');
        for (let i = 0; i < other_menus.length; i++) {
            other_menus[i].removeAttribute('active');
        }
    }
    menu(parent_div, items, id, loc, on_sel) {
        if (items.length === 0)
            return document.createElement('div');
        let overlay_menu = document.createElement('div');
        overlay_menu.id = id + '_menu';
        overlay_menu.classList.add('overlay_menu');
        let menu_loc_func = this.menu_position_func(loc, overlay_menu, parent_div);
        parent_div.addEventListener('click', () => {
            if (overlay_menu.hasAttribute('active'))
                overlay_menu.removeAttribute('active');
            else {
                this.hide_all_menus();
                overlay_menu.setAttribute('active', '');
                menu_loc_func();
            }
        });
        parent_div.addEventListener('mousedown', (event) => { event.stopPropagation(); });
        overlay_menu.addEventListener('mousedown', (event) => { event.stopPropagation(); });
        let sub_menu = document.createElement('div');
        sub_menu.classList.add('overlay_sub_menu');
        sub_menu.style.display = 'flex';
        items.forEach((item, i) => {
            if (item.separator) {
                if (i !== 0) {
                    overlay_menu.appendChild(sub_menu);
                    sub_menu = document.createElement('div');
                    sub_menu.classList.add('overlay_sub_menu');
                }
                sub_menu.style.display = item.separator_vis ? 'flex' : 'none';
                overlay_menu.appendChild(this.make_section_title(sub_menu, item));
            }
            else {
                sub_menu.appendChild(this.make_item(item, sub_menu, overlay_menu, on_sel));
            }
        });
        overlay_menu.appendChild(sub_menu);
        this.div.appendChild(overlay_menu);
        return overlay_menu;
    }
    make_section_title(sub_menu, item) {
        var _a;
        let title_bar = document.createElement('div');
        title_bar.classList.add('menu_item', 'overlay_menu_separator');
        if (item.separator_row) {
            sub_menu.style.flexDirection = 'row';
        }
        let text = document.createElement('span');
        text.classList.add('overlay_sub_menu_text');
        text.innerHTML = item.label.toUpperCase();
        title_bar.appendChild(text);
        if ((_a = item.separator_vis) !== null && _a !== void 0 ? _a : true) {
            sub_menu.style.display = 'flex';
            title_bar.appendChild(icon_manager.get_svg(icons.menu_arrow_ns));
        }
        else {
            sub_menu.style.display = 'none';
            title_bar.appendChild(icon_manager.get_svg(icons.menu_arrow_sn));
        }
        title_bar.addEventListener('click', () => {
            let svg = title_bar.getElementsByTagName('svg')[0];
            if (sub_menu.style.display === 'flex') {
                sub_menu.style.display = 'none';
                svg.replaceWith(icon_manager.get_svg(icons.menu_arrow_sn));
            }
            else {
                sub_menu.style.display = 'flex';
                svg.replaceWith(icon_manager.get_svg(icons.menu_arrow_ns));
            }
        });
        return title_bar;
    }
    make_item(item, sub_menu, menu, on_sel) {
        let item_div = document.createElement('div');
        item_div.classList.add('menu_item');
        let sel_wrap = document.createElement('span');
        if (sub_menu.style.flexDirection === 'row')
            sel_wrap.classList.add('menu_selectable');
        else
            sel_wrap.classList.add('menu_selectable_expand');
        if (item.icon)
            sel_wrap.appendChild(icon_manager.get_svg(item.icon));
        if (item.label !== "") {
            let text = document.createElement('span');
            text.classList.add('menu_text');
            text.innerHTML = item.label;
            sel_wrap.appendChild(text);
        }
        item_div.appendChild(sel_wrap);
        if (item.star !== undefined)
            this.make_toggle_star(item_div, item);
        sel_wrap.addEventListener('click', () => {
            menu.removeAttribute('active');
            on_sel(item.data);
        });
        return item_div;
    }
    menu_position_func(location, overlay_menu_div, parent_div) {
        let set_menu_loc = () => { };
        switch (location) {
            case (menu_location.BOTTOM_RIGHT):
                {
                    set_menu_loc = () => {
                        overlay_menu_div.style.top = `${Math.max(parent_div.getBoundingClientRect().bottom + 1, 0)}px`;
                        let right_offset = Math.max(parent_div.getBoundingClientRect().right - 1, overlay_menu_div.getBoundingClientRect().width);
                        overlay_menu_div.style.right = `${window.innerWidth - right_offset}px`;
                    };
                }
                break;
            case (menu_location.TOP_LEFT):
                {
                    set_menu_loc = () => {
                        overlay_menu_div.style.top = `${Math.max(parent_div.getBoundingClientRect().top, 0)}px`;
                        overlay_menu_div.style.right = `${Math.max(parent_div.getBoundingClientRect().left - 1, 0)}px`;
                    };
                }
                break;
            case (menu_location.TOP_RIGHT):
                {
                    set_menu_loc = () => {
                        overlay_menu_div.style.top = `${Math.max(parent_div.getBoundingClientRect().top, 0)}px`;
                        overlay_menu_div.style.left = `${Math.max(parent_div.getBoundingClientRect().right + 1, 0)}px`;
                    };
                }
                break;
        }
        return set_menu_loc;
    }
    make_toggle_star(parent_div, item) {
        let wrapper = document.createElement('div');
        wrapper.classList.add('menu_item_star');
        let icon;
        if (item.star) {
            icon = icon_manager.get_svg(icons.star_filled, ["icon_hover"]);
            icon.setAttribute('active-star', '');
        }
        else {
            icon = icon_manager.get_svg(icons.star, ["icon_hover"]);
            icon.style.visibility = 'hidden';
        }
        wrapper.appendChild(icon);
        parent_div.addEventListener('mouseenter', () => { wrapper.firstChild.style.visibility = 'visible'; });
        parent_div.addEventListener('mouseleave', () => {
            let icon = wrapper.firstChild;
            if (!icon.hasAttribute('active-star')) {
                icon.style.visibility = 'hidden';
            }
        });
        wrapper.addEventListener('mousedown', (event) => { event.stopPropagation(); });
        wrapper.addEventListener('click', () => {
            let icon = wrapper.firstChild;
            if (icon.hasAttribute('active-star')) {
                icon.replaceWith(icon_manager.get_svg(icons.star, ["icon_hover"]));
                icon = wrapper.firstChild;
                icon.style.visibility = 'hidden';
                if (item.star_deact)
                    item.star_deact();
            }
            else {
                let new_icon = icon_manager.get_svg(icons.star_filled, ["icon_hover"]);
                new_icon.setAttribute('active-star', '');
                icon.replaceWith(new_icon);
                icon = wrapper.firstChild;
                if (item.star_act)
                    item.star_act();
            }
        });
        parent_div.appendChild(wrapper);
    }
    symbol_search() {
        let search_div = document.createElement('div');
        search_div.id = "symbol_search_menu";
        search_div.classList.add('overlay_menu', 'overlay_menu_large', 'menu_text');
        search_div.addEventListener('mousedown', (event) => { event.stopPropagation(); });
        search_div.innerHTML = symbol_search_menu_template;
        let search_icon = search_div.querySelector('#search_icon');
        let search_svg = icon_manager.get_svg(icons.menu_search);
        search_svg.setAttribute('width', '28');
        search_svg.setAttribute('height', '28');
        search_icon.appendChild(search_svg);
        let close_icon = search_div.querySelector('#close_icon');
        let close_svg = icon_manager.get_svg(icons.close, ['icon_hover']);
        search_svg.setAttribute('width', '28');
        search_svg.setAttribute('height', '28');
        close_icon.appendChild(close_svg);
        close_icon.addEventListener('click', this.hide_all_menus.bind(this));
        let input = search_div.querySelector('#symbol_search_input');
        input.addEventListener('input', () => this.on_symbol_search());
        let submit = search_div.querySelector('#symbol_search_submit');
        submit.addEventListener('mousedown', () => this.on_symbol_search(true));
        this.div.appendChild(search_div);
        this.populate_bubbles('exchange', []);
        this.populate_bubbles('broker', []);
        this.populate_bubbles('type', []);
        return search_div;
    }
    populate_symbol_list(items) {
        let search_menu_list = this.div.querySelector("#symbols_table tbody");
        search_menu_list.replaceChildren();
        let list_item;
        items.forEach(item => {
            var _a, _b, _c, _d, _e;
            list_item = document.createElement('tr');
            list_item.classList.add('symbol_list_item');
            list_item.innerHTML = symbol_search_item_template;
            list_item.querySelector('#ticker_symbol').innerText = item.ticker;
            list_item.querySelector('#ticker_name').innerText = (_a = item.name) !== null && _a !== void 0 ? _a : "-";
            list_item.querySelector('#ticker_exchange').innerText = (_b = item.exchange) !== null && _b !== void 0 ? _b : "-";
            list_item.querySelector('#ticker_type').innerText = (_d = (_c = item.sec_type) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : "-";
            list_item.querySelector('#ticker_broker').innerText = (_e = item.broker) !== null && _e !== void 0 ? _e : "-";
            list_item.addEventListener('click', () => {
                if (window.active_frame)
                    window.api.data_request(window.active_container.id, window.active_frame.id, item, window.active_frame.timeframe.multiplier, window.active_frame.timeframe.period);
                else
                    console.warn("Data Request Called, but Active_frame is null");
                this.hide_all_menus();
            });
            search_menu_list.appendChild(list_item);
        });
    }
    populate_bubbles(category, types) {
        let search_menu = this.div.querySelector('#symbol_search_menu');
        let old_search_menu = search_menu.querySelector(`#${category}_bubbles`);
        let new_search_menu = document.createElement('div');
        new_search_menu.classList.add('sel_bubbles');
        new_search_menu.id = `${category}_bubbles`;
        switch (category) {
            case 'type':
                new_search_menu.innerText = 'Security Type:';
                break;
            case 'broker':
                new_search_menu.innerText = 'Data Broker:';
                break;
            case 'exchange':
                new_search_menu.innerText = 'Exchange:';
                break;
        }
        let bubble_item;
        bubble_item = document.createElement('div');
        bubble_item.classList.add('bubble_item');
        bubble_item.id = 'any';
        bubble_item.innerText = 'Any';
        bubble_item.setAttribute('active', '');
        bubble_item.addEventListener('click', (e) => {
            var _a;
            let target = e.target;
            let bubbles = (_a = target.parentElement) === null || _a === void 0 ? void 0 : _a.querySelectorAll('.bubble_item[active]');
            for (let i = 0; i < (bubbles === null || bubbles === void 0 ? void 0 : bubbles.length); i++)
                bubbles[i].removeAttribute('active');
            target.setAttribute('active', '');
            this.on_symbol_search();
        });
        new_search_menu.appendChild(bubble_item);
        let active_toggle = (e) => {
            var _a, _b, _c, _d;
            let target = e.target;
            if (target.hasAttribute('active')) {
                target.removeAttribute('active');
                if (((_a = target.parentElement) === null || _a === void 0 ? void 0 : _a.querySelectorAll('.bubble_item[active]').length) === 0)
                    (_b = target.parentElement.querySelector('#any')) === null || _b === void 0 ? void 0 : _b.setAttribute('active', '');
            }
            else {
                if (((_c = target.parentElement) === null || _c === void 0 ? void 0 : _c.querySelectorAll('#any[active]').length) === 1)
                    (_d = target.parentElement.querySelector('#any')) === null || _d === void 0 ? void 0 : _d.removeAttribute('active');
                target.setAttribute('active', '');
            }
            this.on_symbol_search();
        };
        types.forEach(type => {
            bubble_item = document.createElement('div');
            bubble_item.classList.add('bubble_item');
            bubble_item.innerText = type;
            bubble_item.addEventListener('click', active_toggle);
            new_search_menu.appendChild(bubble_item);
        });
        if (old_search_menu !== null)
            old_search_menu.replaceWith(new_search_menu);
        else
            search_menu.appendChild(new_search_menu);
    }
    on_symbol_search(confirmed = false) {
        let search_menu = this.div.querySelector('#symbol_search_menu');
        let input = search_menu.querySelector('#symbol_search_input');
        let types = search_menu.querySelectorAll('#type_bubbles .bubble_item[active]');
        let brokers = search_menu.querySelectorAll('#broker_bubbles .bubble_item[active]');
        let exchanges = search_menu.querySelectorAll('#exchange_bubbles .bubble_item[active]');
        let type_strings = [];
        for (let i = 0; i < types.length; i++)
            type_strings.push(types[i].innerText);
        let broker_strings = [];
        for (let i = 0; i < brokers.length; i++)
            broker_strings.push(brokers[i].innerText);
        let exchange_strings = [];
        for (let i = 0; i < exchanges.length; i++)
            exchange_strings.push(exchanges[i].innerText);
        window.api.symbol_search(input.value, type_strings, broker_strings, exchange_strings, confirmed);
    }
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
`;
const symbol_search_item_template = `
    <td id="ticker_symbol"></td>
    <td id="ticker_name"></td>
    <td id="ticker_exchange"></td>
    <td id="ticker_type"></td>
    <td id="ticker_broker"></td>
`;
