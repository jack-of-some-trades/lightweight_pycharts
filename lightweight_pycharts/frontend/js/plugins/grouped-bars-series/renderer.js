import { positionsBox, positionsLine, } from '../../helpers/dimensions/positions.js';
export class GroupedBarsSeriesRenderer {
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
        const barWidth = this._data.barSpacing;
        const groups = this._data.bars.map(bar => {
            const count = bar.originalData.values.length;
            const singleBarWidth = barWidth / (count + 1);
            const padding = singleBarWidth / 2;
            const startX = padding + bar.x - barWidth / 2 + singleBarWidth / 2;
            return {
                singleBarWidth,
                singleBars: bar.originalData.values.map((value, index) => {
                    var _a;
                    return ({
                        y: (_a = priceToCoordinate(value)) !== null && _a !== void 0 ? _a : 0,
                        color: options.colors[index % options.colors.length],
                        x: startX + index * singleBarWidth,
                    });
                }),
            };
        });
        const zeroY = (_a = priceToCoordinate(0)) !== null && _a !== void 0 ? _a : 0;
        for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
            const group = groups[i];
            let lastX;
            group.singleBars.forEach(bar => {
                const yPos = positionsBox(zeroY, bar.y, renderingScope.verticalPixelRatio);
                const xPos = positionsLine(bar.x, renderingScope.horizontalPixelRatio, group.singleBarWidth);
                renderingScope.context.beginPath();
                renderingScope.context.fillStyle = bar.color;
                const offset = lastX ? xPos.position - lastX : 0;
                renderingScope.context.fillRect(xPos.position - offset, yPos.position, xPos.length + offset, yPos.length);
                lastX = xPos.position + xPos.length;
            });
        }
    }
}
