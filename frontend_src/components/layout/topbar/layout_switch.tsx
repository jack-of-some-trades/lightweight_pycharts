import { createEffect, createSignal, For, Show, splitProps } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { Container_Layouts, interval, layout_icon_map, series_icon_map } from "../../../src/util_lwc";
import { Icon, icons } from "../../icons";
import { location_reference, overlay_div_props, OverlayCTX, OverlayDiv, point } from "../../overlay/overlay_manager";
import { MenuItem, MenuSection, ShowMenuButton } from "../../overlay/simple_menu";

// CSS in topbar.css

interface layout_json {
    menu_listings:{
        simple?:Container_Layouts[]
        triple?:Container_Layouts[]
        quadruple?:Container_Layouts[]
    }
    favorites: Container_Layouts[]
}

const default_layout_opts: layout_json = {
    menu_listings:{
        simple:[Container_Layouts.SINGLE, Container_Layouts.DOUBLE_HORIZ, Container_Layouts.DOUBLE_VERT],
        triple:[
            Container_Layouts.TRIPLE_VERT,
            Container_Layouts.TRIPLE_HORIZ,
            Container_Layouts.TRIPLE_VERT_LEFT,
            Container_Layouts.TRIPLE_VERT_RIGHT,
            Container_Layouts.TRIPLE_HORIZ_TOP,
            Container_Layouts.TRIPLE_HORIZ_BOTTOM,
        ],
        quadruple:[
            Container_Layouts.QUAD_SQ_V,
            Container_Layouts.QUAD_SQ_H,
            Container_Layouts.QUAD_VERT,
            Container_Layouts.QUAD_HORIZ,
            Container_Layouts.QUAD_LEFT,
            Container_Layouts.QUAD_RIGHT,
            Container_Layouts.QUAD_TOP,
            Container_Layouts.QUAD_BOTTOM,
        ],
    },
    favorites: [
        Container_Layouts.SINGLE, Container_Layouts.DOUBLE_HORIZ, Container_Layouts.DOUBLE_VERT
    ]
}


export function LayoutSwitcher(){
    const id = 'layout_selector'
    let el = document.createElement('div')
    const [selectedLayout, setSelectedLayout] = createSignal<Container_Layouts>(Container_Layouts.SINGLE)
    const [menuLocation, setMenuLocation] = createSignal<point>({x:0, y:0})
    const [LayoutOpts, setLayoutOpts] = createStore(default_layout_opts)

    const ordered_favorites = () => {
        return Array.from(LayoutOpts.favorites).sort((a,b) => a - b)
    }
    const updateLocation = () => {
        setMenuLocation({
            x: el.getBoundingClientRect().right, 
            y: el.getBoundingClientRect().bottom
        })
    }

    // Tell Python when the Layout changes
    createEffect(() => { window.api.layout_change(
        window.active_container?.id ?? '',
        selectedLayout()
    )})

    OverlayCTX().attachOverlay(
        id,
        <LayoutMenu 
            id={id}
            onSel={setSelectedLayout}
            opts={LayoutOpts} 
            setOpts={setLayoutOpts}
            location={menuLocation()}
            updateLocation={updateLocation}
        />, 

    )

    return (
        <div class='topbar_container' ref={el}>
            {/* Additional Icon to show selected TF when it's not in the favorites list*/}
            <Show when={!LayoutOpts.favorites.includes(selectedLayout())}>
                <Icon 
                    icon={series_icon_map[selectedLayout()]}
                    classList={{topbar_icon_btn:true}}
                    activated={true}
                />
            </Show>

            {/* Display all favorites Ordered in increasing timestamp */}
            <For each={ordered_favorites()}>{ (fav) => 
                <Icon 
                    icon={layout_icon_map[fav]}
                    classList={{topbar_icon_btn:true}}
                    activated={selectedLayout() === fav}
                    onClick={() => setSelectedLayout(fav)}
                />
            }</For>
            {/* Button to Display Full Menu */}
            <ShowMenuButton 
                id={id} 
                class="topbar_menu_button"
                icon_act={icons.menu_arrow_sn} 
                icon_deact={icons.menu_arrow_ns}
            />
        </div>
    )
}


//#region --------------------- Overlay Menu --------------------- //

const default_display: Map<string,boolean> = new Map([
    ["simple", true],
    ["triple", false],
    ["quadruple", false]
])

interface LayoutMenu_Props extends Omit<overlay_div_props,"location_ref"> {
    opts:layout_json,
    onSel:(series:Container_Layouts)=>void
    setOpts:SetStoreFunction<layout_json>,
}

export function LayoutMenu(props:LayoutMenu_Props){
    const [,overlayDivProps] = splitProps(props, ["opts", "setOpts"])
    const accessor = (str: string) => props.opts.menu_listings[str as keyof typeof props.opts.menu_listings]

    function addFavorite(series:Container_Layouts){
        if (!props.opts.favorites.includes(series))
            props.setOpts("favorites", [...props.opts.favorites, series])
    }
    function removeFavorite(series:Container_Layouts){
        if (props.opts.favorites.includes(series))
            props.setOpts("favorites", props.opts.favorites.filter((fav) => fav != series))
    }

    return <OverlayDiv {...overlayDivProps} location_ref={location_reference.TOP_RIGHT}>
        <For each={Object.keys(props.opts.menu_listings) as interval[]}>{(section) =>
                <MenuSection
                    label={section.toLocaleUpperCase()} 
                    showByDefault={default_display.get(section)??false}
                    style={{display:"flex", "flex-direction":"row"}}
                    >
                    <For each={accessor(section)}>{(type)=>
                        <MenuItem 
                            expand={false}
                            icon={layout_icon_map[type]}
                            onSel={() => props.onSel(type)}

                            star={props.opts.favorites.includes(type)}
                            starAct={() => addFavorite(type)}
                            starDeact={() => removeFavorite(type)}
                        />
                    }</For>
                </MenuSection>
        }</For>
    </OverlayDiv>
}