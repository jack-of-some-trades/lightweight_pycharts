import { icon_manager } from "./icons.js";
import { topbar } from "./topbar.js";
export class py_api {
    constructor() { this.loaded_check = this.loaded_check.bind(this); }
    loaded_check() {
        if (icon_manager.loaded && topbar.loaded && window.wrapper.loaded) {
            this.loaded();
        }
        else {
            setTimeout(this.loaded_check, 25);
        }
    }
}
