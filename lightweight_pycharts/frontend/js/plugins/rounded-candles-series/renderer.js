import { candlestickWidth } from '../../helpers/dimensions/candles.js';
import { gridAndCrosshairMediaWidth } from '../../helpers/dimensions/crosshair-width.js';
import { positionsBox, positionsLine } from '../../helpers/dimensions/positions.js';
export class RoundedCandleSeriesRenderer {
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
        const bars = this._data.bars.map(bar => {
            var _a, _b, _c, _d;
            const isUp = bar.originalData.close >= bar.originalData.open;
            const openY = (_a = priceToCoordinate(bar.originalData.open)) !== null && _a !== void 0 ? _a : 0;
            const highY = (_b = priceToCoordinate(bar.originalData.high)) !== null && _b !== void 0 ? _b : 0;
            const lowY = (_c = priceToCoordinate(bar.originalData.low)) !== null && _c !== void 0 ? _c : 0;
            const closeY = (_d = priceToCoordinate(bar.originalData.close)) !== null && _d !== void 0 ? _d : 0;
            return {
                openY,
                highY,
                lowY,
                closeY,
                x: bar.x,
                isUp,
            };
        });
        const radius = this._options.radius(this._data.barSpacing);
        this._drawWicks(renderingScope, bars, this._data.visibleRange);
        this._drawCandles(renderingScope, bars, this._data.visibleRange, radius);
    }
    _drawWicks(renderingScope, bars, visibleRange) {
        if (this._data === null || this._options === null) {
            return;
        }
        const { context: ctx, horizontalPixelRatio, verticalPixelRatio, } = renderingScope;
        const wickWidth = gridAndCrosshairMediaWidth(horizontalPixelRatio);
        for (let i = visibleRange.from; i < visibleRange.to; i++) {
            const bar = bars[i];
            ctx.fillStyle = bar.isUp
                ? this._options.wickUpColor
                : this._options.wickDownColor;
            const verticalPositions = positionsBox(bar.lowY, bar.highY, verticalPixelRatio);
            const linePositions = positionsLine(bar.x, horizontalPixelRatio, wickWidth);
            ctx.fillRect(linePositions.position, verticalPositions.position, linePositions.length, verticalPositions.length);
        }
    }
    _drawCandles(renderingScope, bars, visibleRange, radius) {
        if (this._data === null || this._options === null) {
            return;
        }
        const { context: ctx, horizontalPixelRatio, verticalPixelRatio, } = renderingScope;
        const candleBodyWidth = candlestickWidth(this._data.barSpacing, 1);
        for (let i = visibleRange.from; i < visibleRange.to; i++) {
            const bar = bars[i];
            const verticalPositions = positionsBox(Math.min(bar.openY, bar.closeY), Math.max(bar.openY, bar.closeY), verticalPixelRatio);
            const linePositions = positionsLine(bar.x, horizontalPixelRatio, candleBodyWidth);
            ctx.fillStyle = bar.isUp
                ? this._options.upColor
                : this._options.downColor;
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(linePositions.position, verticalPositions.position, linePositions.length, verticalPositions.length, radius);
                ctx.fill();
            }
            else {
                ctx.fillRect(linePositions.position, verticalPositions.position, linePositions.length, verticalPositions.length);
            }
        }
    }
}
