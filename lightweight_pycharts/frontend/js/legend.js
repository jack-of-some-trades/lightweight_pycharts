export class Legend {
    constructor(parent) {
        this.parent = parent;
        this.div = document.createElement('div');
        this.div.classList.add('legend');
        this.div.style.display = 'flex';
        let main_source_div = document.createElement('div');
        this.div.appendChild(main_source_div);
        this.sources_div = document.createElement('div');
        this.sources_div.classList.add('legend_source');
        this.sources_div.style.display = 'flex';
        this.div.appendChild(this.sources_div);
        let toggler_div = document.createElement('div');
        toggler_div.classList.add('legend_toggler');
        this.div.appendChild(toggler_div);
        parent.div.appendChild(this.div);
    }
}
