import { calculateColumnPositionsInPlace, } from '../../helpers/dimensions/columns.js';
import { positionsBox } from '../../helpers/dimensions/positions.js';
function cumulativeBuildUp(arr) {
    let sum = 0;
    return arr.map(value => {
        const newValue = sum + value;
        sum = newValue;
        return newValue;
    });
}
export class StackedBarsSeriesRenderer {
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
        var _a;
        if (this._data === null ||
            this._data.bars.length === 0 ||
            this._data.visibleRange === null ||
            this._options === null) {
            return;
        }
        const options = this._options;
        const bars = this._data.bars.map(bar => {
            return {
                x: bar.x,
                ys: cumulativeBuildUp(bar.originalData.values).map(value => { var _a; return (_a = priceToCoordinate(value)) !== null && _a !== void 0 ? _a : 0; }),
            };
        });
        calculateColumnPositionsInPlace(bars, this._data.barSpacing, renderingScope.horizontalPixelRatio, this._data.visibleRange.from, this._data.visibleRange.to);
        const zeroY = (_a = priceToCoordinate(0)) !== null && _a !== void 0 ? _a : 0;
        for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
            const stack = bars[i];
            const column = stack.column;
            if (!column)
                return;
            let previousY = zeroY;
            const width = Math.min(Math.max(renderingScope.horizontalPixelRatio, column.right - column.left), this._data.barSpacing * renderingScope.horizontalPixelRatio);
            stack.ys.forEach((y, index) => {
                const color = options.colors[index % options.colors.length];
                const stackBoxPositions = positionsBox(previousY, y, renderingScope.verticalPixelRatio);
                renderingScope.context.fillStyle = color;
                renderingScope.context.fillRect(column.left, stackBoxPositions.position, width, stackBoxPositions.length);
                previousY = y;
            });
        }
    }
}
