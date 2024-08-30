/**
 * Indicator File Search Menu and Topbar Show/Hide Toggle Button
 */

import { Icon, icons } from "../../icons";

import "../../../css/layout/indicator_menu.css";

// Box that gets mounted to the Topbar
export function IndicatorsBox(){
    return <div class="topbar_container">
        <div class="menu_selectable indicator_topbar_btn">
            <Icon icon={icons.indicator}/>
            <div class='text' style={{padding:"0px 2px"}}>Indicators</div>
        </div>
        {/* <Icon icon={icons.indicator_template}/> */}
    </div>
}