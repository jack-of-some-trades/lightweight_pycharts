// Class and Enum defining all the available icons uhh... "borrowed"... from Tradingview

/**
 * Singleton Class to manage loading of the svg icons from a sing SVG file.
 */
export class icon_manager {
    private static instance: icon_manager

    static loaded: boolean = false
    static svg_doc: Document | null
    static replace_list: SVGSVGElement[] = []

    constructor() {
        if (icon_manager.instance) {
            //Instance already created
            return icon_manager.instance
        }

        //This method of loading SVGs works pretty well, but it is a little slow
        //Something about fetch() causes a small delay. You could use the <svg><use href=></svg>
        //method, but that has it's own, far more cubursome, issue of needing to hardcode
        //the viewport, width, and height sizing of the <svg> tag.
        fetch('./svg-defs.svg').then((resp) => resp.text().then(
            (svg_file_text) => {
                //After loading, parse the .svg into a document object
                let parser = new DOMParser()
                icon_manager.svg_doc = parser.parseFromString(svg_file_text, "text/html")
            })).then(() => setTimeout(
                //Once the Document is loaded, update all svgs. Delay is added to avoid race conditions
                //between updating svgs and a get_svg() function call placing a 'replace' SVG tag in the document.
                icon_manager.update_svgs,
                20
            ))

        icon_manager.svg_doc = null
        icon_manager.instance = this
        return this
    }

    /**
     * Replaces all the empty SVGs the got requested before the SVG_Doc was able to load
     */
    static update_svgs() {
        icon_manager.replace_list.forEach(svg => {
            let new_svg = get_svg(svg.id as icons)

            let attrs = svg.attributes
            for (let i = 0; i < attrs.length; i++)
                new_svg.setAttribute(attrs[i].name, attrs[i].value)

            svg.replaceWith(new_svg)
        });
        icon_manager.replace_list = []
        icon_manager.loaded = true
    }
}

/**
 * Get's an SVG from the loaded SVG reference document. If the document isn't loaded, a temporary icon is returned instead
 * @param icon The icon to be loaded
 * @param css_classes a list of classes that should be applied to the SVG Element
 * @returns SVGSVGElement
 */
export function get_svg(icon: icons, css_classes: string[] = []): SVGSVGElement {
    if (icon_manager.svg_doc) {
        let icon_svg = icon_manager.svg_doc.querySelector(`#${icon}`) as SVGSVGElement
        //Ensure a clone of the element is edited and returned, not a reference
        icon_svg = icon_svg.cloneNode(true) as SVGSVGElement

        icon_svg.classList.add('icon')
        css_classes.forEach(class_name => { icon_svg.classList.add(class_name) });
        return icon_svg
    } else {
        let tmp_icon_svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        tmp_icon_svg.id = icon
        icon_manager.replace_list.push(tmp_icon_svg) //SVG_doc not loaded, store reference so this can be updated later

        tmp_icon_svg.classList.add('icon') 
        css_classes.forEach(class_name => { tmp_icon_svg.classList.add(class_name) });
        return tmp_icon_svg
    }
}

export enum icons {
    menu = 'menu',
    menu_add = 'menu_add',
    menu_ext = "menu_ext",
    menu_ext_small = "menu_ext_small",
    menu_search = 'menu_search',
    menu_search_quick = "menu_search_quick",
    menu_arrow_ew = 'menu_arrow_ew',
    menu_arrow_ns = 'menu_arrow_ns',
    menu_arrow_sn = 'menu_arrow_sn',
    menu_arrow_up_down = "menu_arrow_up_down",
    menu_dragable = "menu_dragable",

    panel_top = "panel_top",
    panel_left = "panel_left",
    panel_right = "panel_right",
    panel_bottom = "panel_bottom",

    cursor_cross = "cursor_cross",
    cursor_dot = "cursor_dot",
    cursor_arrow = "cursor_arrow",
    cursor_erase = "cursor_erase",

    candle_heiken_ashi = "candle_heiken_ashi",
    candle_regular = "candle_regular",
    candle_bar = "candle_bar",
    candle_hollow = "candle_hollow",
    candle_volume = "candle_volume",
    candle_rounded = "candle_rounded",

    series_line = "series_line",
    series_line_markers = "series_line_markers",
    series_step_line = "series_step_line",
    series_area = "series_area",
    series_baseline = "series_baseline",
    series_histogram = "series_histogram",

    indicator = "indicator",
    indicator_template = "indicator_template",
    indicator_on_stratagy = "indicator_on_stratagy",
    eye_normal = "eye_normal",
    eye_crossed = "eye_crossed",
    eye_loading = "eye_loading",
    eye_loading_animated = "eye_loading_animated",

    undo = "undo",
    redo = "redo",
    copy = "copy",
    edit = "edit",
    close = "close",
    reset = "reset",
    close_small = "close_small",
    settings = "settings",
    settings_small = "settings_small",
    add_section = "add_section",
    maximize = "maximize",
    minimize = "minimize",
    restore = "restore",
    window_add = "window_add",

    fib_retrace = "fib_retrace",
    fib_extend = "fib_extend",
    trend_line = "trend_line",
    trend_ray = "trend_ray",
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
    anchored_vwap = "anchored_vwap",

    link = "link",
    star = "star",
    star_filled = "star_filled",
    trash = "trash",
    snapshot = "snapshot",
    text_note = "text_note",
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

    watchlist = "watchlist",
    data_window = "data_window",
    calendar = "calendar",
    calendar_to_date = "calendar_to_date",
    alert = "alert",
    alert_large = "alert_large",
    alert_add = "alert_add",
    alert_notification = "alert_notification",
    replay = "replay",
    object_tree = "object_tree",
    hotlist = "hotlist",
    light_bulb_off = "light_bulb_off",
    light_bulb_on = "light_bulb_on",
    question_mark = "question_mark",
    pie_chart = "pie_chart",

    box_fullscreen = "box_fullscreen",

    layout_single = "layout_single",
    layout_double_vert = "layout_double_vert",
    layout_double_horiz = "layout_double_horiz",
    layout_triple_horiz = "layout_triple_horiz",
    layout_triple_top = 'layout_triple_top',
    layout_triple_vert = "layout_triple_vert",
    layout_triple_left = "layout_triple_left",
    layout_triple_right = "layout_triple_right",
    layout_triple_bottom = "layout_triple_bottom",
    layout_quad_sq_v = "layout_quad_v",
    layout_quad_sq_h = "layout_quad_h",
    layout_quad_vert = "layout_quad_vert",
    layout_quad_horiz = "layout_quad_horiz",
    layout_quad_top = "layout_quad_top",
    layout_quad_left = "layout_quad_left",
    layout_quad_right = "layout_quad_right",
    layout_quad_bottom = "layout_quad_bottom",
}