import { candlestickWidth } from '../../helpers/dimensions/candles.js';
import { gridAndCrosshairMediaWidth } from '../../helpers/dimensions/crosshair-width.js';
import { positionsBox, positionsLine, } from '../../helpers/dimensions/positions.js';
function desiredWidths(barSpacing) {
    const bodyWidth = candlestickWidth(barSpacing, 1);
    const medianWidth = Math.floor(barSpacing);
    const lineWidth = candlestickWidth(barSpacing / 2, 1);
    return {
        body: bodyWidth,
        medianLine: Math.max(medianWidth, bodyWidth),
        extremeLines: lineWidth,
        outlierRadius: Math.min(bodyWidth, 4),
    };
}
export class WhiskerBoxSeriesRenderer {
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
                quartilesY: bar.originalData.quartiles.map(price => {
                    var _a;
                    return ((_a = priceToCoordinate(price)) !== null && _a !== void 0 ? _a : 0);
                }),
                outliers: (bar.originalData.outliers || []).map(price => {
                    var _a;
                    return ((_a = priceToCoordinate(price)) !== null && _a !== void 0 ? _a : 0);
                }),
                x: bar.x,
            };
        });
        const widths = desiredWidths(this._data.barSpacing);
        const verticalLineWidth = gridAndCrosshairMediaWidth(renderingScope.horizontalPixelRatio);
        const horizontalLineWidth = gridAndCrosshairMediaWidth(renderingScope.verticalPixelRatio);
        for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
            const bar = bars[i];
            if (widths.outlierRadius > 2) {
                this._drawOutliers(renderingScope.context, bar, widths.outlierRadius, options, renderingScope.horizontalPixelRatio, renderingScope.verticalPixelRatio);
            }
            this._drawWhisker(renderingScope.context, bar, widths.extremeLines, options, renderingScope.horizontalPixelRatio, renderingScope.verticalPixelRatio, verticalLineWidth, horizontalLineWidth);
            this._drawBox(renderingScope.context, bar, widths.body, options, renderingScope.horizontalPixelRatio, renderingScope.verticalPixelRatio);
            this._drawMedianLine(renderingScope.context, bar, widths.medianLine, options, renderingScope.horizontalPixelRatio, renderingScope.verticalPixelRatio, horizontalLineWidth);
        }
    }
    _drawWhisker(ctx, bar, extremeLineWidth, options, horizontalPixelRatio, verticalPixelRatio, wickWidth, horizontalWickWidth) {
        ctx.save();
        ctx.fillStyle = options.whiskerColor;
        const verticalLinePosition = positionsLine(bar.x, horizontalPixelRatio, wickWidth);
        const topWhiskerYPositions = positionsBox(bar.quartilesY[0], bar.quartilesY[1], verticalPixelRatio);
        ctx.fillRect(verticalLinePosition.position, topWhiskerYPositions.position, verticalLinePosition.length, topWhiskerYPositions.length);
        const bottomWhiskerYPositions = positionsBox(bar.quartilesY[3], bar.quartilesY[4], verticalPixelRatio);
        ctx.fillRect(verticalLinePosition.position, bottomWhiskerYPositions.position, verticalLinePosition.length, bottomWhiskerYPositions.length);
        const horizontalLinePosition = positionsLine(bar.x, horizontalPixelRatio, extremeLineWidth);
        const topWhiskerHorizontalYPosition = positionsLine(bar.quartilesY[4], verticalPixelRatio, horizontalWickWidth);
        ctx.fillRect(horizontalLinePosition.position, topWhiskerHorizontalYPosition.position, horizontalLinePosition.length, topWhiskerHorizontalYPosition.length);
        const bottomWhiskerHorizontalYPosition = positionsLine(bar.quartilesY[0], verticalPixelRatio, horizontalWickWidth);
        ctx.fillRect(horizontalLinePosition.position, bottomWhiskerHorizontalYPosition.position, horizontalLinePosition.length, bottomWhiskerHorizontalYPosition.length);
        ctx.restore();
    }
    _drawBox(ctx, bar, bodyWidth, options, horizontalPixelRatio, verticalPixelRatio) {
        ctx.save();
        const upperQuartileYPositions = positionsBox(bar.quartilesY[2], bar.quartilesY[3], verticalPixelRatio);
        const lowerQuartileYPositions = positionsBox(bar.quartilesY[1], bar.quartilesY[2], verticalPixelRatio);
        const xPositions = positionsLine(bar.x, horizontalPixelRatio, bodyWidth);
        ctx.fillStyle = options.lowerQuartileFill;
        ctx.fillRect(xPositions.position, lowerQuartileYPositions.position, xPositions.length, lowerQuartileYPositions.length);
        ctx.fillStyle = options.upperQuartileFill;
        ctx.fillRect(xPositions.position, upperQuartileYPositions.position, xPositions.length, upperQuartileYPositions.length);
        ctx.restore();
    }
    _drawMedianLine(ctx, bar, medianLineWidth, options, horizontalPixelRatio, verticalPixelRatio, horizontalLineWidth) {
        const xPos = positionsLine(bar.x, horizontalPixelRatio, medianLineWidth);
        const yPos = positionsLine(bar.quartilesY[2], verticalPixelRatio, horizontalLineWidth);
        ctx.save();
        ctx.fillStyle = options.whiskerColor;
        ctx.fillRect(xPos.position, yPos.position, xPos.length, yPos.length);
        ctx.restore();
    }
    _drawOutliers(ctx, bar, extremeLineWidth, options, horizontalPixelRatio, verticalPixelRatio) {
        ctx.save();
        const xPos = positionsLine(bar.x, horizontalPixelRatio, 1, true);
        ctx.fillStyle = options.outlierColor;
        ctx.lineWidth = 0;
        bar.outliers.forEach(outlier => {
            ctx.beginPath();
            const yPos = positionsLine(outlier, verticalPixelRatio, 1, true);
            ctx.arc(xPos.position, yPos.position, extremeLineWidth, 0, 2 * Math.PI);
            ctx.fill();
            ctx.closePath();
        });
        ctx.restore();
    }
}
