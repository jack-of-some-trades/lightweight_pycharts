//Typescript API that interfaces with python.

import { icon_manager } from "./icons.js";


//Each Function Maps directly to a function within the js_api class in js_api.py
export class py_api {
    loaded!: () => void;
    close!: () => void;
    maximize!: () => void;
    minimize!: () => void;
    restore!: () => void;

    add_container!: () => void;
    remove_container!: (id: string) => void;
    reorder_containers!: (from: number, to: number) => null

    callback!: (msg: string) => void;
    timeframe_switch!: (mult: number, period: string) => void;

    constructor() { this._loaded_check = this._loaded_check.bind(this) }

    //The Python "View" Subclasses Kick starts this recursive check 
    //immediately after they assigns the api callbacks above
    //=> those are guaranteed to have been loaded.
    _loaded_check() {
        //Check that everything outside of this class has been loaded
        if (icon_manager.loaded && window.loaded) {
            //Once everything is loaded break recursion and make the python callback
            //this.loaded() should only be called once and called from here
            this.loaded()
        } else {
            setTimeout(this._loaded_check, 50)
        }
    }
}