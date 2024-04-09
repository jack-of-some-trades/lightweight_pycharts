/* Unfortunately you can't use the lightweight charts .d.ts file as intended. This is the result of using python modules
 * that run a local server that doesn't have access to [node_modules] like node.js does. 
 * 
 * This gets even more annoying since the python web server can't interpolate './pkg' to mean './pkg.js' or './pkg.mjs'
 * The result is that you import the .d.ts into this file it will only work until run-time when the webserver errors.
 * 
 * I'm tired of working to solve this instead of working on the code itself so I'm just going to patch fix this. 
 * I'm importing ../js/pkg.mjs as lwc so both ts and js have definitions for the functions in the namespace lwc, albiet w/o type hints
 * I've then taken the pkg.d.ts, commented out the functions, and removed 'declare'from the Enums and renamed the file to pkg.ts.
 * 
 * The result is that the metric ton interfaces, enums, and types from the lightweight charts library can be imported
 * from "./pkg.js". The import is "./pkg.js" and not "./pkg.ts" because typescript knows to check the .ts for interfaces
 * and the python webview would hit a runtime import error if it had to look for a non-existant "./pkg.ts"
 * 
 * Additionally, I've created an Enum, Color, of all the named colors that come with the library for ease of access.
 */
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