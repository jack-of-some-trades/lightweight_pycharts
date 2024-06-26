import { Container } from "./container";
import { Frame } from "./frame";
import { icon_manager } from "./icons";
import { overlay_manager } from "./overlay";
import { Pane } from "./pane.js";
import { py_api } from "./py_api";
import { TitleBar } from "./titlebar";
import { toolbox } from "./toolbox";
import { layout_selector, series_selector, timeframe_selector, topbar } from "./topbar";
import { Container_Layouts as c_layouts } from "./util_lwc";
import { Wrapper } from "./wrapper";

//Declare Global interface. All Following declarations will be accessable to the python run_script() function
declare global {
    var api: py_api
    var loaded: boolean
    var svgs: icon_manager
    var overlay_manager: overlay_manager

    var wrapper: Wrapper
    var titlebar: TitleBar
    var topbar: topbar
    var toolbox: toolbox
    var series_selector: series_selector
    var layout_selector: layout_selector
    var timeframe_selector: timeframe_selector

    var active_pane: Pane
    var active_frame: Frame
    var active_container: Container
    // Technically Pane, Frame & Container can refer to deleted objects 
    // if they have been removed, but where the active element at the time of deletion.
    // Beyond delaying some garbage collection, I don't think the dead references are 
    // an issue so the behavior will stay for now.
    var Container_Layouts: typeof c_layouts
}

// Define The global Python <--> Js api interface.
window.api = new py_api();
//Construct Icon Manager
window.svgs = new icon_manager();

//Define the global Objects (Each only one per window)
window.wrapper = new Wrapper();
window.overlay_manager = new overlay_manager()

window.series_selector = new series_selector()
window.layout_selector = new layout_selector()
window.timeframe_selector = new timeframe_selector()
window.topbar = new topbar(
    window.wrapper,
    window.timeframe_selector,
    window.layout_selector,
    window.series_selector
)
window.toolbox = new toolbox(window.wrapper)
window.titlebar = new TitleBar(window.wrapper)

//Enums that will be used by Python need to be placed into the Global Scope
window.Container_Layouts = c_layouts

//Final Resize before returning to python
window.wrapper.resize()
window.loaded = true