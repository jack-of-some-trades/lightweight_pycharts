import { Icon, icons } from "../icons";

import "../../css/overlay/indicators.css";

export function IndicatorsBox(){
    return <div class="topbar_container">
        <div class="menu_selectable indicator_btn">
            <Icon icon={icons.indicator}/>
            <div class='text' style={{padding:"0px 2px"}}>Indicators</div>
        </div>
        <Icon icon={icons.indicator_template}/>
    </div>
}