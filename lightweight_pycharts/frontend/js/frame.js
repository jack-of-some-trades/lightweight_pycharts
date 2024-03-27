import { Pane } from "./pane.js";
export class Frame {
    constructor(id, div, flex_width = 1, flex_height = 1) {
        this.is_active = true;
        this.panes = [];
        this.id = id;
        this.div = div;
        this.flex_width = flex_width;
        this.flex_height = flex_height;
        this.add_pane = this.add_pane.bind(this);
    }
    reassign_div(div) {
        this.div = div;
        this.panes.forEach(pane => {
            this.div.appendChild(pane.div);
        });
    }
    add_pane(id = '') {
        let child_div = document.createElement('div');
        this.div.appendChild(child_div);
        let new_pane = new Pane(id, child_div);
        this.panes.push(new_pane);
        this.resize();
        return new_pane;
    }
    resize() {
        let this_width = this.div.clientWidth;
        let this_height = this.div.clientHeight;
        this.panes.forEach(pane => {
            pane.resize(this_width, this_height);
        });
    }
    fitcontent() {
        this.panes.forEach(pane => {
            pane.fitcontent();
        });
    }
}
