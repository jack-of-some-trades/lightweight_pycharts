import { positionsLine } from '../../helpers/dimensions/positions.js';
import { MismatchDirection, } from '../../lib/pkg.js';
class PartialPriceLineRenderer {
    constructor() {
        this._price = null;
        this._x = null;
        this._color = '#000000';
    }
    update(priceY, color, x) {
        this._price = priceY;
        this._color = color;
        this._x = x;
    }
    draw(target) {
        target.useBitmapCoordinateSpace(scope => {
            if (this._price === null || this._x === null)
                return;
            const xPosition = Math.round(this._x * scope.horizontalPixelRatio);
            const yPosition = positionsLine(this._price, scope.verticalPixelRatio, scope.verticalPixelRatio);
            const yCentre = yPosition.position + yPosition.length / 2;
            const ctx = scope.context;
            ctx.beginPath();
            ctx.setLineDash([
                4 * scope.verticalPixelRatio,
                2 * scope.verticalPixelRatio,
            ]);
            ctx.moveTo(xPosition, yCentre);
            ctx.lineTo(scope.bitmapSize.width, yCentre);
            ctx.strokeStyle = this._color;
            ctx.lineWidth = scope.verticalPixelRatio;
            ctx.stroke();
        });
    }
}
class PartialPriceLineView {
    constructor() {
        this._renderer = new PartialPriceLineRenderer();
    }
    renderer() {
        return this._renderer;
    }
    update(priceY, color, x) {
        this._renderer.update(priceY, color, x);
    }
}
export class PartialPriceLine {
    constructor() {
        this._chart = null;
        this._series = null;
        this._paneViews = [new PartialPriceLineView()];
    }
    attached({ chart, series }) {
        this._chart = chart;
        this._series = series;
        this._series.applyOptions({
            priceLineVisible: false,
        });
    }
    detached() {
        this._chart = null;
        this._series = null;
    }
    updateAllViews() {
        if (!this._series || !this._chart)
            return;
        const seriesOptions = this._series.options();
        let color = seriesOptions.priceLineColor ||
            seriesOptions.color ||
            '#000000';
        const lastValue = this._series.dataByIndex(100000, MismatchDirection.NearestLeft);
        let price = null;
        let x = null;
        if (lastValue) {
            if (lastValue.color !== undefined) {
                color = lastValue.color;
            }
            price = getValue(lastValue);
            x = this._chart.timeScale().timeToCoordinate(lastValue.time);
        }
        const priceY = price !== null ? this._series.priceToCoordinate(price) : null;
        this._paneViews.forEach(pw => pw.update(priceY, color, x));
    }
    paneViews() {
        return this._paneViews;
    }
}
function getValue(data) {
    if (data.value !== undefined)
        return data.value;
    if (data.close !== undefined)
        return data.close;
    return null;
}
