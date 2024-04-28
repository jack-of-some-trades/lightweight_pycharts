import { Pane } from "./pane.js";
export class Frame {
    constructor(id, div) {
        this.panes = [];
        this.id = id;
        this.div = div;
        this.div.addEventListener('mousedown', this.assign_active_frame.bind(this));
    }
    assign_active_frame() {
        if (window.active_frame)
            window.active_frame.div.removeAttribute('active');
        window.active_frame = this;
        window.active_frame.div.setAttribute('active', '');
    }
    reassign_div(div) {
        this.div = div;
        this.panes.forEach(pane => {
            this.div.appendChild(pane.div);
        });
        this.div.addEventListener('mousedown', this.assign_active_frame.bind(this));
    }
    add_pane(id = '') {
        let child_div = document.createElement('div');
        child_div.classList.add('chart_pane');
        this.div.appendChild(child_div);
        let new_pane = new Pane(id, child_div);
        this.panes.push(new_pane);
        this.resize();
        return new_pane;
    }
    resize() {
        let this_width = this.div.clientWidth - 2;
        let this_height = this.div.clientHeight - 2;
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
