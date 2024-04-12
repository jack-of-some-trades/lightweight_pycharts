const tickSpacing = 40;
const horizontalPadding = 3;
const verticalPadding = 2;
const sideMargin = 10;
const fontSize = 12;
const radius = 4;
class OverlayPriceScaleRenderer {
    constructor() {
        this._data = null;
    }
    update(data) {
        this._data = data;
    }
    draw(target) {
        target.useMediaCoordinateSpace(scope => {
            if (!this._data)
                return;
            const labels = this._calculatePriceScale(scope.mediaSize.height, this._data);
            const maxLabelLength = labels.reduce((answer, label) => {
                return Math.max(answer, label.label.length);
            }, 0);
            const testLabelForWidth = ''.padEnd(maxLabelLength, '0');
            const ctx = scope.context;
            const isLeft = this._data.options.side === 'left';
            ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const testDimensions = ctx.measureText(testLabelForWidth);
            const width = testDimensions.width;
            const x = isLeft
                ? sideMargin
                : scope.mediaSize.width - sideMargin - width;
            const textX = x + horizontalPadding + Math.round(width / 2);
            labels.forEach(label => {
                ctx.beginPath();
                const topY = label.y - fontSize / 2;
                ctx.roundRect(x, topY, width + horizontalPadding * 2, fontSize + 2 * verticalPadding, radius);
                ctx.fillStyle = this._data.options.backgroundColor;
                ctx.fill();
                ctx.beginPath();
                ctx.fillStyle = this._data.options.textColor;
                ctx.fillText(label.label, textX, topY + verticalPadding, width);
            });
        });
    }
    _calculatePriceScale(height, data) {
        const yPositions = [];
        const halfTick = Math.round(tickSpacing / 4);
        let pos = halfTick;
        while (pos <= height - halfTick) {
            yPositions.push(pos);
            pos += tickSpacing;
        }
        const labels = yPositions
            .map(y => {
            const price = data.coordinateToPrice(y);
            if (price === null)
                return null;
            const priceLabel = data.priceFormatter.format(price);
            return {
                label: priceLabel,
                y: y,
            };
        })
            .filter((item) => Boolean(item));
        return labels;
    }
}
class OverlayPriceScaleView {
    constructor() {
        this._renderer = new OverlayPriceScaleRenderer();
    }
    renderer() {
        return this._renderer;
    }
    update(data) {
        this._renderer.update(data);
    }
}
const defaultOptions = {
    textColor: 'rgb(0, 0, 0)',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    side: 'left',
};
export class OverlayPriceScale {
    constructor(options) {
        this._chart = null;
        this._series = null;
        this._options = Object.assign(Object.assign({}, defaultOptions), options);
        this._paneViews = [new OverlayPriceScaleView()];
    }
    applyOptions(options) {
        this._options = Object.assign(Object.assign({}, this._options), options);
        if (this._requestUpdate)
            this._requestUpdate();
    }
    attached({ chart, series, requestUpdate }) {
        this._chart = chart;
        this._series = series;
        this._requestUpdate = requestUpdate;
    }
    detached() {
        this._chart = null;
        this._series = null;
    }
    updateAllViews() {
        if (!this._series || !this._chart)
            return;
        const coordinateToPrice = (coordinate) => this._series.coordinateToPrice(coordinate);
        const priceToCoordinate = (price) => this._series.priceToCoordinate(price);
        const priceFormatter = this._series.priceFormatter();
        const options = this._options;
        const data = {
            coordinateToPrice,
            priceToCoordinate,
            priceFormatter,
            options,
        };
        this._paneViews.forEach(pw => pw.update(data));
    }
    paneViews() {
        return this._paneViews;
    }
}
