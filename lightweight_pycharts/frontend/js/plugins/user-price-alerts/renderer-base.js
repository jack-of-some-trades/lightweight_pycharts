export class PaneRendererBase {
    constructor() {
        this._data = null;
    }
    update(data) {
        this._data = data;
    }
}
