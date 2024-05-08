import { icon_manager } from "./icons.js";
export class py_api {
    constructor() { this._loaded_check = this._loaded_check.bind(this); }
    _loaded_check() {
        if (icon_manager.loaded && window.loaded) {
            this.loaded();
            setTimeout(window.wrapper.resize.bind(window.wrapper), 75);
        }
        else {
            setTimeout(this._loaded_check, 50);
        }
    }
}
