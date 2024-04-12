class AnchoredTextRenderer {
    constructor(options) {
        this._data = options;
    }
    draw(target) {
        target.useMediaCoordinateSpace(scope => {
            const ctx = scope.context;
            ctx.font = this._data.font;
            const textWidth = ctx.measureText(this._data.text).width;
            const horzMargin = 20;
            let x = horzMargin;
            const width = scope.mediaSize.width;
            const height = scope.mediaSize.height;
            switch (this._data.horzAlign) {
                case 'right': {
                    x = width - horzMargin - textWidth;
                    break;
                }
                case 'middle': {
                    x = width / 2 - textWidth / 2;
                    break;
                }
            }
            const vertMargin = 10;
            const lineHeight = this._data.lineHeight;
            let y = vertMargin + lineHeight;
            switch (this._data.vertAlign) {
                case 'middle': {
                    y = height / 2 + lineHeight / 2;
                    break;
                }
                case 'bottom': {
                    y = height - vertMargin;
                    break;
                }
            }
            ctx.fillStyle = this._data.color;
            ctx.fillText(this._data.text, x, y);
        });
    }
}
class AnchoredTextPaneView {
    constructor(source) {
        this._source = source;
    }
    update() { }
    renderer() {
        return new AnchoredTextRenderer(this._source._data);
    }
}
export class AnchoredText {
    constructor(options) {
        this._data = options;
        this._paneViews = [new AnchoredTextPaneView(this)];
    }
    updateAllViews() {
        this._paneViews.forEach(pw => pw.update());
    }
    paneViews() {
        return this._paneViews;
    }
    attached({ requestUpdate }) {
        this.requestUpdate = requestUpdate;
    }
    detached() {
        this.requestUpdate = undefined;
    }
    applyOptions(options) {
        this._data = Object.assign(Object.assign({}, this._data), options);
        if (this.requestUpdate)
            this.requestUpdate();
    }
}
