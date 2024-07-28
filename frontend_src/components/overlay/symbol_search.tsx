

import "../../css/overlay/symbol_search.css"
import { Icon, icons } from "../icons"


export function SymbolSearchBox(){
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

export function SymbolSearchMenu(){
    return <div id='Symbol Search'/>
}