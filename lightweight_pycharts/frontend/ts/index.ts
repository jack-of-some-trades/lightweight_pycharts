import { Container } from "./container.js";
import { Frame } from "./frame.js";
import { icon_manager } from "./icons.js";
import { Pane } from "./pane.js";
import { py_api } from "./py_api.js";
import { Container_Layouts } from "./util.js";
import { Wrapper } from "./wrapper.js";

//Declare Global interface. All Following declarations will be accessable to the python run_script() function
declare global {
    interface Window {
        api: py_api,
        wrapper: Wrapper,
        svg_manager: icon_manager
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
window.svg_manager = new icon_manager();

//Define the global Wrapper (Only one per window)
window.wrapper = new Wrapper();

//Define Global Constructors
window.Container = Container

//Enums that will be used by Python need to be placed into the Global Scope
window.Container_Layouts = Container_Layouts