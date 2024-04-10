//Typescript API that interfaces with python.

import { icon_manager } from "./icons.js";


//Each Function Maps directly to a function within the js_api class in js_api.py
export class py_api {
    loaded!: () => void;
    close!: () => void;
    maximize!: () => void;
    minimize!: () => void;
    callback!: (msg: string) => void;

    constructor() { this.loaded_check = this.loaded_check.bind(this) }

    loaded_check() {
        //Check that everything outside of this class has been loaded
        if (icon_manager.loaded && window.wrapper.loaded) {
            //Once everything is loaded break recursion and make the python callback
            //this.loaded() should only be called once and called from here
            this.loaded()
        } else {
            setTimeout(this.loaded_check, 10)
        }
    }
}