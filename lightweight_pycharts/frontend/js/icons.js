export class icon_manager {
    constructor() {
        if (icon_manager.instance) {
            return icon_manager.instance;
        }
        fetch('./css/svg-defs.svg').then((resp) => resp.text().then((svg_file_text) => {
            let parser = new DOMParser();
            icon_manager.svg_doc = parser.parseFromString(svg_file_text, "text/html");
        })).then(() => setTimeout(icon_manager.update_svgs, 20));
        icon_manager.svg_doc = null;
        icon_manager.instance = this;
        return this;
    }
    static update_svgs() {
        let svgs = document.querySelectorAll("svg.replace");
        svgs.forEach(svg => {
            svg.classList.remove('replace');
            if (svg.classList.length > 0)
                svg.replaceWith(icon_manager.get_svg(svg.id, svg.classList.toString().split(' ')));
            else
                svg.replaceWith(icon_manager.get_svg(svg.id));
        });
        icon_manager.loaded = true;
    }
    static get_svg(icon, css_classes = []) {
        if (icon_manager.svg_doc) {
            let icon_svg = icon_manager.svg_doc.querySelector(`#${icon}`);
            icon_svg = icon_svg.cloneNode(true);
            icon_svg.classList.add('icon');
            css_classes.forEach(class_name => { icon_svg.classList.add(class_name); });
            return icon_svg;
        }
        else {
            let tmp_icon_svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            tmp_icon_svg.id = icon;
            tmp_icon_svg.classList.add('replace');
            css_classes.forEach(class_name => { tmp_icon_svg.classList.add(class_name); });
            return tmp_icon_svg;
        }
    }
}
icon_manager.loaded = false;
export var icons;
(function (icons) {
    icons["menu"] = "menu";
    icons["menu_add"] = "menu_add";
    icons["menu_ext"] = "menu_ext";
    icons["menu_ext_small"] = "menu_ext_small";
    icons["menu_search"] = "menu_search";
    icons["menu_search_quick"] = "menu_search_quick";
    icons["menu_arrow_ew"] = "menu_arrow_ew";
    icons["menu_arrow_ns"] = "menu_arrow_ns";
    icons["menu_arrow_sn"] = "menu_arrow_sn";
    icons["menu_arrow_up_down"] = "menu_arrow_up_down";
    icons["panel_left"] = "panel_left";
    icons["panel_right"] = "panel_right";
    icons["panel_bottom"] = "panel_bottom";
    icons["cursor_cross"] = "cursor_cross";
    icons["cursor_dot"] = "cursor_dot";
    icons["cursor_arrow"] = "cursor_arrow";
    icons["cursor_erase"] = "cursor_erase";
    icons["candle_heiken_ashi"] = "candle_heiken_ashi";
    icons["candle_regular"] = "candle_regular";
    icons["candle_bar"] = "candle_bar";
    icons["candle_hollow"] = "candle_hollow";
    icons["candle_volume"] = "candle_volume";
    icons["series_line"] = "series_line";
    icons["series_line_markers"] = "series_line_markers";
    icons["series_step_line"] = "series_step_line";
    icons["series_area"] = "series_area";
    icons["series_baseline"] = "series_baseline";
    icons["series_histogram"] = "series_histogram";
    icons["indicator"] = "indicator";
    icons["indicator_template"] = "indicator_template";
    icons["indicator_on_stratagy"] = "indicator_on_stratagy";
    icons["eye_normal"] = "eye_normal";
    icons["eye_crossed"] = "eye_crossed";
    icons["eye_loading"] = "eye_loading";
    icons["eye_loading_animated"] = "eye_loading_animated";
    icons["undo"] = "undo";
    icons["redo"] = "redo";
    icons["copy"] = "copy";
    icons["edit"] = "edit";
    icons["close"] = "close";
    icons["reset"] = "reset";
    icons["close_small"] = "close_small";
    icons["settings"] = "settings";
    icons["settings_small"] = "settings_small";
    icons["add_section"] = "add_section";
    icons["maximize"] = "maximize";
    icons["minimize"] = "minimize";
    icons["fib_retrace"] = "fib_retrace";
    icons["fib_extend"] = "fib_extend";
    icons["trend_line"] = "trend_line";
    icons["trend_ray"] = "trend_ray";
    icons["trend_extended"] = "trend_extended";
    icons["horiz_line"] = "horiz_line";
    icons["horiz_ray"] = "horiz_ray";
    icons["vert_line"] = "vert_line";
    icons["channel_parallel"] = "channel_parallel";
    icons["channel_disjoint"] = "channel_disjoint";
    icons["brush"] = "brush";
    icons["highlighter"] = "highlighter";
    icons["polyline"] = "polyline";
    icons["magnet"] = "magnet";
    icons["magnet_strong"] = "magnet_strong";
    icons["anchored_vwap"] = "anchored_vwap";
    icons["link"] = "link";
    icons["star"] = "star";
    icons["star_filled"] = "star_filled";
    icons["trash"] = "trash";
    icons["snapshot"] = "snapshot";
    icons["text_note"] = "text_note";
    icons["lock_unlocked"] = "lock_unlocked";
    icons["lock_locked"] = "lock_locked";
    icons["ruler"] = "ruler";
    icons["bar_pattern"] = "bar_pattern";
    icons["bar_ghost_feed"] = "bar_ghost_feed";
    icons["vol_profile_fixed"] = "vol_profile_fixed";
    icons["vol_profile_anchored"] = "vol_profile_anchored";
    icons["range_price"] = "range_price";
    icons["range_date"] = "range_date";
    icons["range_price_date"] = "range_price_date";
    icons["watchlist"] = "watchlist";
    icons["data_window"] = "data_window";
    icons["calendar"] = "calendar";
    icons["calendar_to_date"] = "calendar_to_date";
    icons["alert"] = "alert";
    icons["alert_large"] = "alert_large";
    icons["alert_add"] = "alert_add";
    icons["alert_notification"] = "alert_notification";
    icons["replay"] = "replay";
    icons["object_tree"] = "object_tree";
    icons["hotlist"] = "hotlist";
    icons["light_bulb_off"] = "light_bulb_off";
    icons["light_bulb_on"] = "light_bulb_on";
    icons["question_mark"] = "question_mark";
    icons["pie_chart"] = "pie_chart";
    icons["box_fullscreen"] = "box_fullscreen";
    icons["layout_single"] = "layout_single";
    icons["layout_double_vert"] = "layout_double_vert";
    icons["layout_double_horiz"] = "layout_double_horiz";
    icons["layout_triple_horiz"] = "layout_triple_horiz";
    icons["layout_triple_vert"] = "layout_triple_vert";
    icons["layout_triple_left"] = "layout_triple_left";
    icons["layout_triple_right"] = "layout_triple_right";
    icons["layout_triple_bottom"] = "layout_triple_bottom";
    icons["layout_quad"] = "layout_quad";
    icons["layout_quad_top"] = "layout_quad_top";
    icons["layout_quad_left"] = "layout_quad_left";
    icons["layout_quad_vert"] = "layout_quad_vert";
    icons["layout_quad_horiz"] = "layout_quad_horiz";
})(icons || (icons = {}));
