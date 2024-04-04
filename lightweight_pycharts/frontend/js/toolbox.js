import { get_svg, icons } from "./icons.js";
import { LAYOUT_DIM_LEFT, Wrapper_Divs, overlay_menu } from "./util.js";
export class toolbox {
    constructor(parent) {
        let this_div = parent.get_div(Wrapper_Divs.DRAW_TOOLS);
        this.overlay_div = parent.div_overlay;
        this_div.style.flexDirection = 'column';
        let top_div = document.createElement('div');
        top_div.classList.add('toolbar', 'toolbar_top');
        top_div.style.width = `${LAYOUT_DIM_LEFT.WIDTH}px`;
        top_div.appendChild(this.crosshair_selector());
        top_div.appendChild(this.separator());
        let bottom_div = document.createElement('div');
        bottom_div.classList.add('toolbar', 'toolbar_bottom');
        bottom_div.style.width = `${LAYOUT_DIM_LEFT.WIDTH}px`;
        this_div.appendChild(top_div);
        this_div.appendChild(bottom_div);
    }
    menu_selector(parent) {
        let menu_sel = document.createElement('div');
        menu_sel.classList.add('toolbar_menu_button', 'icon_hover', 'icon_v_margin');
        menu_sel.style.display = 'none';
        menu_sel.appendChild(get_svg(icons.menu_arrow_ew));
        parent.addEventListener('mouseenter', () => {
            menu_sel.style.display = 'flex';
        });
        parent.addEventListener('mouseleave', () => {
            menu_sel.style.display = 'none';
        });
        return menu_sel;
    }
    crosshair_selector() {
        let selector_div = document.createElement('div');
        selector_div.classList.add('toolbar', 'toolbar_item');
        selector_div.appendChild(get_svg(icons.cursor_cross, ['icon_v_margin', 'icon_l_margin', 'icon_hover']));
        selector_div.appendChild(this.menu_selector(selector_div));
        let items = [
            { label: 'Dot', icon: icons.cursor_dot },
            { label: 'Cross', icon: icons.cursor_cross },
            { label: 'Arrow', icon: icons.cursor_arrow },
        ];
        overlay_menu(this.overlay_div, selector_div, items);
        return selector_div;
    }
    separator() {
        let new_div = document.createElement('div');
        new_div.classList.add('toolbar', 'toolbar_separator');
        new_div.style.width = `${LAYOUT_DIM_LEFT.WIDTH - 2 * LAYOUT_DIM_LEFT.H_BUFFER}px`;
        new_div.style.margin = `${LAYOUT_DIM_LEFT.V_BUFFER}px ${LAYOUT_DIM_LEFT.H_BUFFER}px`;
        return new_div;
    }
}
