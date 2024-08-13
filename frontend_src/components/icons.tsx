import { createEffect, createResource, JSX, mergeProps, splitProps } from "solid-js";
import "../css/icon.css";

//This method of loading in an entirely new doc of just SVGs and query selecting works pretty well
//There's a small delay that requires <Icon/> to be loaded on an effect, but it allows the attrs 
//(viewport, width, height, etc) to be hardcoded into the loaded doc and not in this file.

const [SVG_DOC] = createResource(async () => await fetch('./svg-defs.svg').then(
    (resp) => resp.text().then((svg_file_text) => {
        //After loading, parse the .svg into a document object that is stored.
        let parser = new DOMParser()
        return parser.parseFromString(svg_file_text, "text/html")
    }
)))

export interface icon_props extends JSX.SvgSVGAttributes<SVGSVGElement> {
    icon: string,
    hover?:boolean,
    activated?: boolean
    force_reload?: boolean
}

const DEFAULT_PROPS:icon_props = {
    icon: "close_small",
    hover:true,
    activated: undefined,
    force_reload: false
}

export function Icon(props:icon_props){
    let icon_el:SVGSVGElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    const merged = mergeProps(DEFAULT_PROPS, props)
    merged.classList = {icon:merged.hover, icon_no_hover:!merged.hover, ...merged.classList}
    //If a "Cannot set property of classList" Error has lead you here it is because there is a 
    //reactive Signal in a classList that feeds props.classList. tl:dw Don't use Signals in classlist,
    //use reactive attributes instead. Reactive classList signals cannot be merged.

    const [iconProps, svgProps] = splitProps(merged, ["icon", 'hover', 'activated', "force_reload"]);
    //propKeys is the list of keys set by the user (and this function).
    let propKeys = (Object.keys({...svgProps, "class":'', "active":''}))

    //When SVG_DOC is loaded or icon is changed, Copy reference SVG into Window
    function update(){
        let svg_ref = SVG_DOC()?.querySelector(`#${iconProps.icon}`)
        if (svg_ref){
            //Append a Copy of the children (Paths / groups / etc.)
            svg_ref = svg_ref.cloneNode(true) as Element
            icon_el.replaceChildren(...Array.from(svg_ref.children))
            
            //Remove all old Attrs that were not defined by a parent node
            let static_keys = 0
            while(icon_el.attributes.length > static_keys)
                if (propKeys.includes(icon_el.attributes[static_keys].name))
                    static_keys += 1 //Skip removing this attribute
                else
                    icon_el.removeAttribute(icon_el.attributes[static_keys].name)

            //Add Attrs from Reference SVG that dont conflict with parent node props
            let attrs = svg_ref.attributes
            for (let i = 0; i < attrs.length; i++)
                if (!propKeys.includes(attrs[i].name))
                    icon_el.setAttribute(attrs[i].name, attrs[i].value)
        }
    }
    createEffect(update)

    //Useful when you need to force a repaint on an SVG that's loaded after window creation
    if(props.force_reload) setTimeout(update, 50);

    return <svg ref={icon_el} {...svgProps} attr:active={iconProps.activated? '': undefined} />
}

export interface text_icon_props extends JSX.HTMLAttributes<HTMLDivElement> {
    text: string,
    activated?: boolean
}
const DEFAULT_TEXT_PROPS:text_icon_props = {
    text:'',
    activated: undefined
}

export function TextIcon(props:text_icon_props){
    const merged = mergeProps(DEFAULT_TEXT_PROPS, props)
    merged.classList = mergeProps({icon_text:true}, props.classList)
    const [iconProps, divProps] = splitProps(merged, ["text", 'activated']);

    return <div {...divProps} attr:active={iconProps.activated? '': undefined}>
        {iconProps.text} 
    </div>
}

export enum icons {
    blank = 'blank',
    
    menu = 'menu',
    menu_add = 'menu_add',
    menu_ext = "menu_ext",
    menu_ext_small = "menu_ext_small",
    menu_search = 'menu_search',
    menu_search_quick = "menu_search_quick",
    menu_arrow_we = 'menu_arrow_we',
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