export class BrushableAreaSeriesRenderer {
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
            return {
                x: Math.round(bar.x * renderingScope.horizontalPixelRatio),
                y: priceToCoordinate(bar.originalData.value) *
                    renderingScope.verticalPixelRatio,
            };
        });
        const ctx = renderingScope.context;
        const bottomChartY = renderingScope.bitmapSize.height;
        const getRangeStyle = (index) => {
            if (typeof options.brushRanges === 'string')
                return options;
            const foundRange = options.brushRanges.findIndex((brushRange) => {
                return index >= brushRange.range.from && index < brushRange.range.to;
            });
            if (foundRange >= 0) {
                return options.brushRanges[foundRange].style;
            }
            return options;
        };
        const rangeStyles = new Array(this._data.visibleRange.to);
        const firstBar = bars[this._data.visibleRange.from];
        let minY = firstBar.y;
        for (let i = this._data.visibleRange.from + 1; i < this._data.visibleRange.to; i++) {
            rangeStyles[i] = getRangeStyle(i);
            const bar = bars[i];
            if (bar.y < minY)
                minY = bar.y;
        }
        const gradientMap = new Map();
        function getGradient(bottom, top) {
            const hash = bottom + top;
            if (gradientMap.has(hash))
                return gradientMap.get(hash);
            const gradient = ctx.createLinearGradient(0, bottomChartY, 0, minY);
            gradient.addColorStop(0, bottom);
            gradient.addColorStop(1, top);
            gradientMap.set(hash, gradient);
            return gradient;
        }
        let previousPosition = [firstBar.x, firstBar.y];
        for (let i = this._data.visibleRange.from + 1; i < this._data.visibleRange.to; i++) {
            const bar = bars[i];
            const rangeStyle = rangeStyles[i];
            ctx.beginPath();
            ctx.moveTo(previousPosition[0], previousPosition[1]);
            ctx.lineTo(bar.x, bar.y);
            ctx.lineTo(bar.x, bottomChartY);
            ctx.lineTo(previousPosition[0], bottomChartY);
            ctx.closePath();
            ctx.fillStyle = getGradient(rangeStyle.bottomColor, rangeStyle.topColor);
            ctx.fill();
            previousPosition = [bar.x, bar.y];
        }
        previousPosition = [firstBar.x, firstBar.y];
        for (let i = this._data.visibleRange.from + 1; i < this._data.visibleRange.to; i++) {
            const bar = bars[i];
            const rangeStyle = rangeStyles[i];
            const rangeStyleChanged = i > 0 ? rangeStyles[i - 1] !== rangeStyle : false;
            const rangeStyleWillChange = i === this._data.visibleRange.to - 1
                ? true
                : rangeStyles[i + 1] !== rangeStyle;
            if (rangeStyleChanged) {
                ctx.beginPath();
                ctx.moveTo(previousPosition[0], previousPosition[1]);
            }
            ctx.lineTo(bar.x, bar.y);
            if (rangeStyleWillChange) {
                ctx.strokeStyle = rangeStyle.lineColor;
                ctx.lineWidth =
                    rangeStyle.lineWidth * renderingScope.verticalPixelRatio;
                ctx.stroke();
            }
            previousPosition = [bar.x, bar.y];
        }
    }
}
