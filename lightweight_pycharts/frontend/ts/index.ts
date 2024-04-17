import { Container } from "./container.js";
import { Frame } from "./frame.js";
import { icon_manager } from "./icons.js";
import { overlay_manager } from "./overlay.js";
import { Pane } from "./pane.js";
import { py_api } from "./py_api.js";
import { toolbox } from "./toolbox.js";
import { layout_selector, series_selector, timeframe_selector, topbar } from "./topbar.js";
import { Container_Layouts } from "./util.js";
import { Wrapper } from "./wrapper.js";

//Declare Global interface. All Following declarations will be accessable to the python run_script() function
declare global {
    interface Window {
        api: py_api,
        loaded: boolean,
        svgs: icon_manager,
        overlay_manager: overlay_manager,

        wrapper: Wrapper,
        topbar: topbar,
        toolbox: toolbox,
        series_selector: series_selector,
        layout_selector: layout_selector,
        timeframe_selector: timeframe_selector,

        active_pane: Pane,
        active_frame: Frame,
        active_container: Container,
        Container: { new(div: HTMLDivElement, id: string): Container },

        Container_Layouts: typeof Container_Layouts
    }
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

//Define Global Constructors; might move this to be a responsibility of the wrapper class..
window.Container = Container

//Enums that will be used by Python need to be placed into the Global Scope
window.Container_Layouts = Container_Layouts

//Final Resize before returning to python
window.wrapper.resize()
window.loaded = true