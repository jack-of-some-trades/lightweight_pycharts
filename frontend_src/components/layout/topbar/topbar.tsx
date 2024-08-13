
import { JSX } from "solid-js"
import "../../../css/layout/topbar.css"
import { IndicatorsBox } from "../../overlay/indicators_menu"
import { SymbolSearchBox } from "../../overlay/symbol_search"
import { LayoutSwitcher } from "./layout_switch"
import { SeriesSwitcher } from "./series_switch"
import { TimeframeSwitcher } from "./timeframe_switch"


export function TopBar(props:JSX.HTMLAttributes<HTMLDivElement>){
    return <div class='layout_main layout_flex' {...props}>
        {/**** left Aligned ****/}
        <div class='topbar' style={{"justify-content":"flex-start"}}>
            <SymbolSearchBox/>
            <div class='topbar_separator'/>
            <TimeframeSwitcher/>
            <div class='topbar_separator'/>
            <SeriesSwitcher/>
            <div class='topbar_separator'/>
            <IndicatorsBox/>
            <div class='topbar_separator'/>
        </div>

        {/**** Right Aligned ****/}
        <div class='topbar' style={{"justify-content":"flex-end"}}>
            <div class='topbar_separator'/>
            <LayoutSwitcher/>
        </div>
    </div>
}
