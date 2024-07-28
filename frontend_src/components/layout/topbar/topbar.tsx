
import { JSX } from "solid-js"
import "../../../css/layout/topbar.css"
import { Icon, icons } from "../../icons"
import { SeriesSwitcher } from "./series_switch"
import { TimeframeSwitcher } from "./timeframe_switch"


export function TopBar(props:JSX.HTMLAttributes<HTMLDivElement>){
    return <div id='layout_top' class='layout_main layout_flex' {...props}>
        {/**** left Aligned ****/}
        <div class='topbar' style={{"justify-content":"flex-start"}}>
            <SymbolSearchBox/>
            <div class='topbar_separator'/>
            <TimeframeSwitcher/>
            <div class='topbar_separator'/>
            <SeriesSwitcher/>
            <div class='topbar_separator'/>
            <Indicators/>
            <div class='topbar_separator'/>
        </div>

        {/**** Right Aligned ****/}
        <div class='topbar' style={{"justify-content":"flex-end"}}>
            <div class='topbar_separator'/>
            <LayoutSwitcher/>
        </div>
    </div>
}

function SymbolSearchBox(){

    function onClk(replace_symbol:boolean){
        //# TODO: Update this to actually call the overlay manager  
        console.log(`symbol search: ${replace_symbol?'replace':'add'}`)
    }
    
    return <div class='topbar_container'>
        <div id='symbol_search' class='sel_highlight' onMouseDown={()=>onClk(true)}>
            <Icon icon={icons.menu_search} style={{margin:'5px'}} width={20} height={20}/>
            <div id="search_text" class='topbar_containers text'>LWPC</div>
        </div>
        <Icon icon={icons.menu_add} onMouseDown={()=>onClk(false)}/>
    </div>
}

function Indicators(){
    return <div class="topbar_container" id='indicators'/>
}

function LayoutSwitcher(){
    return <div class="topbar_container" id='layout_switcher'/>
}