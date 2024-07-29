import { render } from 'solid-js/web';
import { Wrapper } from "../components/layout/wrapper";
import { container } from "./container";
import { container_manager } from './container_manager';
import { frame } from "./frame";
import { pane } from "./pane.js";
import { py_api } from "./py_api";
import { Container_Layouts as c_layouts } from "./util_lwc";

//Declare Global interface. All Following declarations will be accessable to the python run_script() function
declare global {
    var api: py_api
    var loaded: boolean
    var container_manager: container_manager

    var active_pane: pane
    var active_frame: frame
    var active_container: container
    // Technically Pane, Frame & Container can refer to deleted objects 
    // if they have been removed, but where the active element at the time of deletion.
    // Beyond delaying some garbage collection, I don't think the dead references are 
    // an issue so the behavior will stay for now.
    var Container_Layouts: typeof c_layouts
}

// Define The global Python <--> Js api interface.
window.api = new py_api();
//Enums that will be used by Python need to be placed into the Global Scope
window.Container_Layouts = c_layouts

render(Wrapper, document.body)

// //Final Resize before returning to python
// window.wrapper.resize()
// window.loaded = true