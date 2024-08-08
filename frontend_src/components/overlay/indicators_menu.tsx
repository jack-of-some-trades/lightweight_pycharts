import { Icon, icons } from "../icons";

import "../../css/overlay/indicator_menu.css";

/* This is the File with the Button that get's mounted on the topbar and the resulting menu 
 * that opens allowing the user to search for Indicators to apply.
 *
 * For the Indicator Options Editing menu go to ../frame_widgets/chart_frames.
 */


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