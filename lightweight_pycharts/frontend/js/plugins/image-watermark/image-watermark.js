class ImageWatermarkPaneRenderer {
    constructor(source, view) {
        this._source = source;
        this._view = view;
    }
    draw(target) {
        target.useMediaCoordinateSpace(scope => {
            var _a;
            const ctx = scope.context;
            const pos = this._view._placement;
            if (!pos)
                return;
            if (!this._source._imgElement)
                throw new Error(`Image element missing.`);
            ctx.globalAlpha = (_a = this._source._options.alpha) !== null && _a !== void 0 ? _a : 1;
            ctx.drawImage(this._source._imgElement, pos.x, pos.y, pos.width, pos.height);
        });
    }
}
class ImageWatermarkPaneView {
    constructor(source) {
        this._placement = null;
        this._source = source;
    }
    zOrder() {
        return 'bottom';
    }
    update() {
        this._placement = this._determinePlacement();
    }
    renderer() {
        return new ImageWatermarkPaneRenderer(this._source, this);
    }
    _determinePlacement() {
        var _a;
        if (!this._source._chart)
            return null;
        const leftPriceScaleWidth = this._source._chart.priceScale('left').width();
        const plotAreaWidth = this._source._chart.timeScale().width();
        const startX = leftPriceScaleWidth;
        const plotAreaHeight = this._source._chart.chartElement().clientHeight -
            this._source._chart.timeScale().height();
        const plotCentreX = Math.round(plotAreaWidth / 2) + startX;
        const plotCentreY = Math.round(plotAreaHeight / 2) + 0;
        const padding = (_a = this._source._options.padding) !== null && _a !== void 0 ? _a : 0;
        let availableWidth = plotAreaWidth - 2 * padding;
        let availableHeight = plotAreaHeight - 2 * padding;
        if (this._source._options.maxHeight)
            availableHeight = Math.min(availableHeight, this._source._options.maxHeight);
        if (this._source._options.maxWidth)
            availableWidth = Math.min(availableWidth, this._source._options.maxWidth);
        const scaleX = availableWidth / this._source._imageWidth;
        const scaleY = availableHeight / this._source._imageHeight;
        const scaleToUse = Math.min(scaleX, scaleY);
        const drawWidth = this._source._imageWidth * scaleToUse;
        const drawHeight = this._source._imageHeight * scaleToUse;
        const x = plotCentreX - 0.5 * drawWidth;
        const y = plotCentreY - 0.5 * drawHeight;
        return {
            x,
            y,
            height: drawHeight,
            width: drawWidth,
        };
    }
}
export class ImageWatermark {
    constructor(imageUrl, options) {
        this._imgElement = null;
        this._imageHeight = 0;
        this._imageWidth = 0;
        this._chart = null;
        this._containerElement = null;
        this._imageUrl = imageUrl;
        this._options = options;
        this._paneViews = [new ImageWatermarkPaneView(this)];
    }
    attached({ chart, requestUpdate }) {
        this._chart = chart;
        this._requestUpdate = requestUpdate;
        this._containerElement = chart.chartElement();
        this._imgElement = new Image();
        this._imgElement.onload = () => {
            var _a, _b, _c, _d;
            this._imageHeight = (_b = (_a = this._imgElement) === null || _a === void 0 ? void 0 : _a.naturalHeight) !== null && _b !== void 0 ? _b : 1;
            this._imageWidth = (_d = (_c = this._imgElement) === null || _c === void 0 ? void 0 : _c.naturalWidth) !== null && _d !== void 0 ? _d : 1;
            this._paneViews.forEach(pv => pv.update());
            this.requestUpdate();
        };
        this._imgElement.src = this._imageUrl;
    }
    detached() {
        this._imgElement = null;
    }
    requestUpdate() {
        if (this._requestUpdate)
            this._requestUpdate();
    }
    updateAllViews() {
        this._paneViews.forEach(pv => pv.update());
    }
    paneViews() {
        return this._paneViews;
    }
}
