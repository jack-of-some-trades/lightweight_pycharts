

import { createSignal, For, onCleanup, onMount, Setter, splitProps } from "solid-js"
import "../../css/overlay/symbol_search.css"
import { Icon, icons } from "../icons"
import { location_reference, overlay_div_props, OverlayCTX, OverlayDiv, point } from "./overlay_manager"

import { createStore, SetStoreFunction } from "solid-js/store"
import "../../css/overlay/symbol_search.css"
import { symbol_item } from "../../src/types"


interface select_filters {
    exchange:string[],
    data_broker:string[],
    security_type:string[],
}

const default_sel_filters:select_filters = {
    exchange:["NYSE", "NASDAQ"],
    data_broker:["Local", "Alpaca"],
    security_type:["Crypto", "Equity"],
}

export function SymbolSearchBox(){
    const id = "symbol_search"
    let box_el = document.createElement('div')
    let replace_el = document.createElement('div')

    const [ticker, setTicker] = createSignal<string>("LWPC")
    const [replace, setReplace] = createSignal<boolean>(true)
    const [menuLocation, setMenuLocation] = createSignal<point>({x:0, y:0})

    let display = OverlayCTX().getDisplayAccessor(id)
    let setDisplay = OverlayCTX().getDisplaySetter(id)

    window.topbar.setTicker = setTicker

    function onClk(e:MouseEvent, replace_symbol:boolean){
        setReplace(replace_symbol);
        setDisplay(!display());
        e.stopPropagation();
    }
    const position_menu = () => {setMenuLocation({x:window.innerWidth/2, y:window.innerHeight*0.4})}

    //Once Mounted the OverlayDiv visibility Accessor and Setter become valid.
    //Adding event manually makes it function as expected (it executes before prop events)
    onMount(() => { 
        display = OverlayCTX().getDisplayAccessor(id)
        setDisplay = OverlayCTX().getDisplaySetter(id)
        box_el.addEventListener('mousedown', (e) => onClk(e,true))
        replace_el.addEventListener('mousedown', (e) => onClk(e,false))
        window.addEventListener('resize', position_menu)
    })
    onCleanup(() => {window.removeEventListener('resize', position_menu)})

    //These signals and stores are initlilized here so that their state isn't reset when the search menu disappears
    const [symbols, setSymbols] = createSignal<symbol_item[]>([])
    const [filters, setFilters] = createStore<select_filters>(default_sel_filters)
    OverlayCTX().attachOverlay(
        id,
        <SymbolSearchMenu
            id={id}
            symbols={symbols()}
            filters={filters}
            setFilters={setFilters}
            replace={replace()}
            setReplace={setReplace}
            location={menuLocation()}
            updateLocation={position_menu}
        />
    )
    window.api.set_search_filters = setFilters
    window.api.populate_search_symbols = setSymbols
    
    return <div class='topbar_container'>
        <div id='symbol_box' class='sel_highlight' ref={box_el}>
            <Icon icon={icons.menu_search} style={{margin:'5px'}} width={20} height={20}/>
            <div id="search_text" class='topbar_containers text'>{ticker()}</div>
        </div>
        <div ref={replace_el} style={{display:"flex", "align-items":"center"}}>
            <Icon icon={icons.menu_add}/>
        </div>
    </div>
}



//#region --------------------- Overlay Menu --------------------- //


interface search_menu_props extends Omit<overlay_div_props, "location_ref">{
    symbols:symbol_item[]
    replace:boolean,
    setReplace:Setter<boolean>,
    filters:select_filters,
    setFilters:SetStoreFunction<select_filters>
}
type prop_key = keyof select_filters
const label_map = new Map<prop_key, string>([
    ["exchange","Exchange:"],
    ["data_broker","Data Broker:"],
    ["security_type","Security Type:"],
])

export function SymbolSearchMenu(props:search_menu_props){
    let setDisplay = OverlayCTX().getDisplaySetter(props.id)
    const [,overlayDivProps] = splitProps(props, ["replace", "setReplace", "symbols", "filters", "setFilters"])

    onMount(() => {setDisplay = OverlayCTX().getDisplaySetter(props.id)})

    function fetch(symbol:symbol_item){
        if (window.active_frame?.timeframe)
            window.api.data_request(
                window.active_container?.id,
                window.active_frame?.id,
                symbol,
                window.active_frame?.timeframe.toString()
            )
        setDisplay(false)
    }

    function search(confirmed:boolean){
        const symbol_menu = document.querySelector(`#${props.id}`); if (!symbol_menu) return
        
        // Fetch all the filter information directly from the DOM. Easier than creating yet another Store
        const symbol = (symbol_menu.querySelector("input.search_input") as HTMLInputElement).value
        const exchanges = Array.from(
            symbol_menu.querySelectorAll("#exchange > .bubble_item[active]"), 
            (node)=>node?.textContent??""
        )
        const brokers = Array.from(
            symbol_menu.querySelectorAll("#data_broker > .bubble_item[active]"), 
            (node)=>node?.textContent??""
        )
        const types = Array.from(
            symbol_menu.querySelectorAll("#security_type > .bubble_item[active]"), 
            (node)=>node?.textContent??""
        )
        window.api.symbol_search(symbol, types, brokers, exchanges, confirmed)
    }

    function update_filter(e: MouseEvent){
        let target = e.target as HTMLDivElement
        if (target.hasAttribute('active')) {
            target.removeAttribute('active')
            //Check if 'Any' needs to be reset
            if (target.parentElement?.querySelectorAll('.bubble_item[active]').length === 0)
                target.parentElement.querySelector('#any')?.setAttribute('active', '')
        }
        else {
            //Check if 'Any' needs to be cleared
            if (target.parentElement?.querySelectorAll('#any[active]').length === 1)
                target.parentElement.querySelector('#any')?.removeAttribute('active')
            target.setAttribute('active', '')
        }
        search(false)
    }

    function update_filter_any(e: MouseEvent){
        let target = e.target as HTMLDivElement
        //clear all Active bubbles
        let bubbles = target.parentElement?.querySelectorAll('.bubble_item[active]') as NodeList
        for (let i = 0; i < bubbles?.length; i++)
            (bubbles[i] as HTMLDivElement).removeAttribute('active')

        target.setAttribute('active', '')
        search(false)
    }

    return (
        <OverlayDiv 
            {...overlayDivProps} 
            classList={{symbol_menu:true}} 
            location_ref={location_reference.CENTER}>

            {/***** Title Bar *****/}
            <div class="symbol_title_bar">
                <Icon 
                    icon={icons.menu_search} 
                    width={28} height={28} 
                    classList={{icon:false, symbol_search_icon:true}} 
                />
                <h1 class="text" style={{margin: "8px 10px"}}>Symbol Search</h1>
                {/* <h1 class="text" style={{margin: "8px 0px"}} onClick={()=>props.setReplace(!props.replace)}>
                     - {props.replace? "Replace": "Add"}
                </h1> */}
                <div style={{"flex-grow":1}}/>
                <Icon 
                    icon={icons.close} 
                    style={{"margin-right":"15px", padding:"5px"}}
                    onClick={()=>setDisplay(false)}//Close Menu on Click
                />
            </div>

            {/***** Symbol Input *****/}
            <div class="symbol_input">
                <input class="search_input text" type="text" onInput={()=>search(false)}
                onkeypress={(e)=>{if(e.key === "Enter") search(true)}}/>
                <input class="search_submit text" type="submit" value="Submit" onClick={()=>search(true)}/>
            </div>

            
            {/***** Ticker Table *****/}
            <div class="symbol_list">
                <table id="symbols_table">
                    <thead>
                        <tr class="symbol_list_item text">
                            <th>Symbol</th><th>Name</th><th>Exchange</th><th>Type</th><th>Data Broker</th>
                        </tr>
                    </thead>
                    <tbody>
                        <For each={props.symbols}>{(symbol)=>
                            <tr class="symbol_list_item text" onClick={()=>fetch(symbol)}>
                                <td>{symbol.ticker}</td>
                                <td>{symbol.name ?? "-"}</td>
                                <td>{symbol.exchange ?? "-"}</td>
                                <td>{symbol.sec_type ?? "-"}</td>
                                <td>{symbol.broker ?? "-"}</td>
                            </tr>
                        }</For>
                    </tbody>
                </table>
            </div>

            {/***** Filters *****/}
            <For each={Object.keys(props.filters) as prop_key[]}>{(filter)=>
                <div id={filter} class="symbol_select_filter text">{label_map.get(filter)}
                    <div id="any" class="bubble_item" onmousedown={update_filter_any} attr:active="">Any</div>
                    <For each={props.filters[filter]}>{(opt)=>
                        <div class="bubble_item" onmousedown={update_filter}>{opt}</div>
                    }</For>
                </div>
            }</For>
        </OverlayDiv>
    )
}