import { icon_manager } from "./icons.js";
export class py_api {
    constructor() { this.loaded_check = this.loaded_check.bind(this); }
    loaded_check() {
        if (icon_manager.loaded && window.wrapper.loaded) {
            this.loaded();
        }
        else {
            setTimeout(this.loaded_check, 10);
        }
    }
}
