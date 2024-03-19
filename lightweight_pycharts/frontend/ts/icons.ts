// Function and Enum defining all the available icons uhh... "borrowed"... from Tradingview

export function get_svg(icon: icons, css_class?: string, scale?: number) {
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    let use = document.createElementNS("http://www.w3.org/2000/svg", "use")
    use.setAttribute("href", "css/svg-defs.svg#" + icon)

    //Define CSS Class to inherit styling from
    if (css_class) {
        use.setAttribute("class", css_class)
    } else {
        use.setAttribute("class", "icon")
    }

    //Scale as desired, Default svg sizes are mostly 28px x 28px
    if (scale) {
        use.setAttribute("transform", `scale(${scale})`)
        svg.setAttribute("width", `${28 * scale}`)
        svg.setAttribute("height", `${28 * scale}`)
    } else {
        svg.setAttribute("width", "28")
        svg.setAttribute("height", "28")
    }

    svg.appendChild(use)
    return svg
}

export enum icons {
    menu = 'menu',
    menu_add = 'menu_add',
    menu_ext = "menu_ext",
    menu_search = 'menu_search',
    menu_search_quick = "search_quick",

    candle_heiken_ashi = "candle_heiken_ashi",
    candle_regular = "candle_regular",
    candle_bar = "candle_bar",
    candle_hollow = "candle_hollow",

    indicator = "indicator",
    indicator_template = "indicator_template",

    undo = "undo",
    redo = "redo",
    copy = "copy",
    edit = "edit",
    add_section = "add_section",

    cursor_cross = "cursor_cross",
    cursor_dot = "cursor_dot",
    cursor_arrow = "cursor_arrow",
    cursor_erase = "cursor_erase",

    fib_retrace = "fib_retrace",
    fib_extend = "fib_extend",
    trend_line = "trend_line",
    trend_ray = "trend_ray",
    trend_arrow = "trend_arrow",
    trend_extended = "trend_extended",
    horiz_line = "horiz_line",
    horiz_ray = "horiz_ray",
    vert_line = "vert_line",
    channel_parallel = "channel_parallel",
    channel_disjoint = "channel_disjoint",
    brush = "brush",
    highlighter = "highlighter",
    polyline = "polyline",
    magnet = "magnet",
    magnet_strong = "magnet_strong",

    star = "star",
    trash = "trash",
    close = "close",
    snapshot = "snapshot",
    lock_unlocked = "lock_unlocked",
    lock_locked = "lock_locked",
    ruler = "ruler",
    bar_pattern = "bar_pattern",
    bar_ghost_feed = "bar_ghost_feed",
    vol_profile_fixed = "vol_profile_fixed",
    vol_profile_anchored = "vol_profile_anchored",
    range_price = "range_price",
    range_date = "range_date",
    range_price_date = "range_price_date",
    settings = "settings",

    eye_normal = "eye_normal",
    eye_crossed = "eye_crossed",
    eye_loading = "eye_loading",
    eye_loading_animated = "eye_loading_animated",

    watchlist = "watchlist",
    calendar = "calendar",
    calendar_to_date = "calendar_to_date",
    alert = "alert",
    alert_add = "alert_add",
    alert_notification = "alert_notification",
    replay = "replay",
    object_tree = "object_tree",
    hotlist = "hotlist",
    light_bulb_off = "light_bulb_off",
    light_bulb_on = "light_bulb_on",
    question_mark = "question_mark",
    pie_chart = "pie_chart",

    box = "box",
    box_open = "box_open",
    box_fullscreen = "box_fullscreen",
    box_maximize = "box_maximize",
}