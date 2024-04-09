import { Container } from "./container.js";
import { icon_manager } from "./icons.js";
import { py_api } from "./py_api.js";
import { Container_Layouts } from "./util.js";
import { Wrapper } from "./wrapper.js";
window.api = new py_api();
window.svg_manager = new icon_manager();
window.wrapper = new Wrapper();
window.Container = Container;
window.Container_Layouts = Container_Layouts;
