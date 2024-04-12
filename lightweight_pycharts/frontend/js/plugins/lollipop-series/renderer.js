import { positionsBox, positionsLine, } from '../../helpers/dimensions/positions.js';
export class LollipopSeriesRenderer {
    constructor() {
        this._data = null;
        this._options = null;
    }
    draw(target, priceConverter) {
        target.useBitmapCoordinateSpace(scope => this._drawImpl(scope, priceConverter));
    }
    update(data, options) {
        this._data = data;
        this._options = options;
    }
    _drawImpl(renderingScope, priceToCoordinate) {
        if (this._data === null ||
            this._data.bars.length === 0 ||
            this._data.visibleRange === null ||
            this._options === null) {
            return;
        }
        const options = this._options;
        const bars = this._data.bars.map(bar => {
            var _a;
            return {
                x: bar.x,
                y: (_a = priceToCoordinate(bar.originalData.value)) !== null && _a !== void 0 ? _a : 0,
            };
        });
        const lineWidth = Math.min(this._options.lineWidth, this._data.barSpacing);
        const barWidth = this._data.barSpacing;
        const radius = Math.floor(barWidth / 2);
        const zeroY = priceToCoordinate(0);
        for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
            const bar = bars[i];
            const xPosition = positionsLine(bar.x, renderingScope.horizontalPixelRatio, lineWidth);
            const yPositionBox = positionsBox(zeroY !== null && zeroY !== void 0 ? zeroY : 0, bar.y, renderingScope.verticalPixelRatio);
            renderingScope.context.beginPath();
            renderingScope.context.fillStyle = options.color;
            renderingScope.context.fillRect(xPosition.position, yPositionBox.position, xPosition.length, yPositionBox.length);
            renderingScope.context.arc(bar.x * renderingScope.horizontalPixelRatio, bar.y * renderingScope.verticalPixelRatio, radius * renderingScope.horizontalPixelRatio, 0, Math.PI * 2);
            renderingScope.context.fill();
        }
    }
}
