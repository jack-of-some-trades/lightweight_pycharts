import { render } from 'solid-js/web';
import { Wrapper } from "../components/layout/wrapper";
import { container } from "./container";
import { container_manager } from './container_manager';
import { frame } from "./frame";
import { Container_Layouts } from './layouts';
import { pane } from "./pane.js";
import { py_api } from "./py_api";
import { Series_Type, tf } from './types';

//Declare Global interface. All Following declarations will be accessable to the python run_script() function
declare global {
    var api: py_api
    var loaded: boolean
    var container_manager: container_manager

    //Allow Global Control over the Topbar Display
    var topbar: {
        setSeries : (_:Series_Type) => void,
        setTimeframe : (_:tf) => void,
        setLayout : (_:Container_Layouts) => void,
        setTicker : (_:string) => void,
    }

    var active_pane: pane
    var active_frame: frame
    var active_container: container
    // Technically Pane, Frame & Container can refer to deleted objects 
    // if they have been removed, but where the active element at the time of deletion.
    // Beyond delaying some garbage collection, I don't think the dead references are 
    // an issue so the behavior will stay for now.
    var Container_Layouts: any
}

//declare global Attributes for JSX objects
declare module "solid-js" {
    namespace JSX {
        interface ExplicitAttributes{
            active: string
            target: string
            type: string
        }
    }
}

// Define The global Python <--> Js api interface.
window.api = new py_api();
//Enums that will be used by Python need to be placed into the Global Scope
window.Container_Layouts = Container_Layouts
//Allow Global Control over the Topbar Display. Functions will be overwritten as window is rendered
window.topbar = {
    setSeries : (_:Series_Type) => {},
    setTimeframe : (_:tf) => {},
    setLayout : (_:Container_Layouts) => {},
    setTicker : (_:string) => {},
}


render(Wrapper, document.body)

// //Final Resize before returning to python
// window.wrapper.resize()
// window.loaded = true