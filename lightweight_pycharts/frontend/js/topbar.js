import { icon_manager, icons } from "./icons.js";
import { LAYOUT_DIM_TOP, Wrapper_Divs, menu_location, overlay_menu } from "./util.js";
export class topbar {
    constructor(parent) {
        let this_div = parent.get_div(Wrapper_Divs.TOP_BAR);
        this.overlay_div = parent.div_overlay;
        let left_div = document.createElement('div');
        left_div.classList.add('topbar', 'topbar_left');
        left_div.appendChild(this.symbol_search());
        left_div.appendChild(this.separator());
        left_div.appendChild(this.timeframe_switcher());
        let right_div = document.createElement('div');
        right_div.classList.add('topbar', 'topbar_right');
        right_div.appendChild(this.separator());
        right_div.appendChild(this.panel_toggle(parent, icons.panel_left));
        right_div.appendChild(this.panel_toggle(parent, icons.panel_right, false));
        right_div.appendChild(this.panel_toggle(parent, icons.panel_bottom, false));
        this_div.appendChild(left_div);
        this_div.appendChild(right_div);
    }
    menu_selector() {
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
    timeframe_switcher() {
        let switcher_div = document.createElement('div');
        switcher_div.id = 'timeframe_switcher';
        switcher_div.classList.add('topbar', 'topbar_container');
        let menu_button = this.menu_selector();
        let items = [
            { label: '5 Minute', icon_str: '5m', star: true },
            { label: '15 Minute', icon_str: '15m', star: true },
            { label: '30 Minute', icon_str: '30m', star: true },
        ];
        overlay_menu(this.overlay_div, menu_button, items, false, 'timeframe_selector', menu_location.BOTTOM_RIGHT);
        switcher_div.appendChild(menu_button);
        return switcher_div;
    }
    candle_switcher() { }
    indicators() { }
    layout_selector() { }
    layout_manager() { }
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
                btn.addEventListener('click', () => { window.api.callback(`button ${icon} pressed!`); });
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
