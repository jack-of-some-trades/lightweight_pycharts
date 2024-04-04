export function get_svg(icon, css_class, scale = 1) {
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    let use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "css/svg-defs.svg#" + icon);
    svg.classList.add("icon");
    if (css_class) {
        css_class.forEach(item => {
            svg.classList.add(item);
        });
    }
    size(use, svg, icon, scale);
    svg.appendChild(use);
    return svg;
}
export function get_url(icon) {
    return "css/svg-defs.svg#" + icon;
}
function size(use, svg, icon, scale) {
    let width = 29;
    let height = 29;
    let view_width = 29;
    let view_height = 29;
    switch (icon) {
        case (icons.menu_arrow_ew):
            {
                width = 8;
                height = 10;
                view_width = 10;
                view_height = 18;
            }
            break;
    }
    use.setAttribute("transform", `scale(${scale})`);
    svg.setAttribute("viewBox", `0 0 ${view_width * scale} ${view_height * scale}`);
    svg.setAttribute("width", `${width * scale}`);
    svg.setAttribute("height", `${height * scale}`);
}
export var icons;
(function (icons) {
    icons["menu"] = "menu";
    icons["menu_add"] = "menu_add";
    icons["menu_ext"] = "menu_ext";
    icons["menu_search"] = "menu_search";
    icons["menu_search_quick"] = "search_quick";
    icons["menu_arrow_ew"] = "menu_arrow_ew";
    icons["candle_heiken_ashi"] = "candle_heiken_ashi";
    icons["candle_regular"] = "candle_regular";
    icons["candle_bar"] = "candle_bar";
    icons["candle_hollow"] = "candle_hollow";
    icons["indicator"] = "indicator";
    icons["indicator_template"] = "indicator_template";
    icons["undo"] = "undo";
    icons["redo"] = "redo";
    icons["copy"] = "copy";
    icons["edit"] = "edit";
    icons["add_section"] = "add_section";
    icons["cursor_cross"] = "cursor_cross";
    icons["cursor_dot"] = "cursor_dot";
    icons["cursor_arrow"] = "cursor_arrow";
    icons["cursor_erase"] = "cursor_erase";
    icons["fib_retrace"] = "fib_retrace";
    icons["fib_extend"] = "fib_extend";
    icons["trend_line"] = "trend_line";
    icons["trend_ray"] = "trend_ray";
    icons["trend_arrow"] = "trend_arrow";
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
    icons["star"] = "star";
    icons["trash"] = "trash";
    icons["close"] = "close";
    icons["snapshot"] = "snapshot";
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
    icons["settings"] = "settings";
    icons["eye_normal"] = "eye_normal";
    icons["eye_crossed"] = "eye_crossed";
    icons["eye_loading"] = "eye_loading";
    icons["eye_loading_animated"] = "eye_loading_animated";
    icons["watchlist"] = "watchlist";
    icons["calendar"] = "calendar";
    icons["calendar_to_date"] = "calendar_to_date";
    icons["alert"] = "alert";
    icons["alert_add"] = "alert_add";
    icons["alert_notification"] = "alert_notification";
    icons["replay"] = "replay";
    icons["object_tree"] = "object_tree";
    icons["hotlist"] = "hotlist";
    icons["light_bulb_off"] = "light_bulb_off";
    icons["light_bulb_on"] = "light_bulb_on";
    icons["question_mark"] = "question_mark";
    icons["pie_chart"] = "pie_chart";
    icons["box"] = "box";
    icons["box_open"] = "box_open";
    icons["box_fullscreen"] = "box_fullscreen";
    icons["box_maximize"] = "box_maximize";
    icons["layout_single"] = "layout_single";
    icons["layout_double_vert"] = "layout_double_vert";
    icons["layout_double_horiz"] = "layout_double_horiz";
})(icons || (icons = {}));
