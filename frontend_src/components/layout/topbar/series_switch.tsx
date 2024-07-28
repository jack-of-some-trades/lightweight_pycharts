import { createEffect, createSignal, For, Show, splitProps } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { interval, series_icon_map, series_label_map, Series_Type } from "../../../src/util_lwc";
import { Icon, icons } from "../../icons";
import { location_reference, overlay_div_props, OverlayCTX, OverlayDiv, point } from "../../overlay/overlay_manager";
import { MenuItem, ShowMenuButton } from "../../overlay/simple_menu";

// CSS in topbar.css

interface series_json {
    menu_listings:{
        ohlc?:Series_Type[]
        line?:Series_Type[]
        area?:Series_Type[]
        hist?:Series_Type[]
    }
    favorites: Series_Type[]
}

const default_series_select_opts: series_json = {
    menu_listings:{
        ohlc:[Series_Type.CANDLESTICK, Series_Type.BAR, Series_Type.ROUNDED_CANDLE],
        line:[Series_Type.LINE],
        area:[Series_Type.AREA, Series_Type.BASELINE],
        hist:[Series_Type.HISTOGRAM],
    },
    favorites: [
        Series_Type.ROUNDED_CANDLE
    ]
}


export function SeriesSwitcher(){
    const id = 'series_selector'
    let el = document.createElement('div')
    const [selectedSeries, setSelectedSeries] = createSignal<Series_Type>(Series_Type.CANDLESTICK)
    const [menuLocation, setMenuLocation] = createSignal<point>({x:0, y:0})
    const [SeriesOpts, setSeriesOpts] = createStore(default_series_select_opts)

    const ordered_favorites = () => {
        return Array.from(SeriesOpts.favorites).sort((a,b) => a - b)
    }
    const updateLocation = () => {
        setMenuLocation({
            x: el.getBoundingClientRect().right, 
            y: el.getBoundingClientRect().bottom
        })
    }

    // Tell Python when the Series Type changes
    createEffect(() => { window.api.series_change(
        window.active_container?.id ?? '',
        window.active_frame?.id ?? '',
        selectedSeries()
    )})

    OverlayCTX().attachOverlay(
        id,
        <SeriesMenu 
            id={id}
            onSel={setSelectedSeries}
            opts={SeriesOpts} 
            setOpts={setSeriesOpts}
            location={menuLocation()}
            updateLocation={updateLocation}
        />, 

    )

    return (
        <div class='topbar_container' ref={el}>
            {/* Additional Icon to show selected TF when it's not in the favorites list*/}
            <Show when={!SeriesOpts.favorites.includes(selectedSeries())}>
                <Icon 
                    icon={series_icon_map[selectedSeries()]}
                    classList={{topbar_icon_btn:true}}
                    activated={true}
                />
            </Show>

            {/* Display all favorites Ordered in increasing timestamp */}
            <For each={ordered_favorites()}>{ (fav) => 
                <Icon 
                    icon={series_icon_map[fav]}
                    classList={{topbar_icon_btn:true}}
                    activated={selectedSeries() === fav}
                    onClick={() => setSelectedSeries(fav)}
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

interface SeriesMenu_Props extends Omit<overlay_div_props,"location_ref"> {
    opts:series_json,
    onSel:(series:Series_Type)=>void
    setOpts:SetStoreFunction<series_json>,
}

export function SeriesMenu(props:SeriesMenu_Props){
    const [,overlayDivProps] = splitProps(props, ["opts", "setOpts"])
    const accessor = (str: string) => props.opts.menu_listings[str as keyof typeof props.opts.menu_listings]

    function addFavorite(series:Series_Type){
        if (!props.opts.favorites.includes(series))
            props.setOpts("favorites", [...props.opts.favorites, series])
    }
    function removeFavorite(series:Series_Type){
        if (props.opts.favorites.includes(series))
            props.setOpts("favorites", props.opts.favorites.filter((fav) => fav != series))
    }

    return <OverlayDiv {...overlayDivProps} location_ref={location_reference.TOP_RIGHT}>
        <For each={Object.keys(props.opts.menu_listings) as interval[]}>{(section) =>
                <>
                <div class="menu_section_titlebox" />
                <For each={accessor(section)}>{(type)=>
                    <MenuItem 
                        expand={true}
                        icon={series_icon_map[type]}
                        label={series_label_map[type]}
                        onSel={() => props.onSel(type)}

                        star={props.opts.favorites.includes(type)}
                        starAct={() => addFavorite(type)}
                        starDeact={() => removeFavorite(type)}
                    />
                }</For>
                </>
        }</For>
    </OverlayDiv>
}