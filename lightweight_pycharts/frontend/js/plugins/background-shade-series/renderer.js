import { fullBarWidth } from '../../helpers/dimensions/full-width.js';
function parseRGB(rgbString) {
    const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) {
        throw new Error('Invalid RGB string');
    }
    return [
        parseInt(match[1], 10),
        parseInt(match[2], 10),
        parseInt(match[3], 10),
    ];
}
class SimpleColorInterpolator {
    constructor(color1, color2) {
        this.color1 = parseRGB(color1);
        this.color2 = parseRGB(color2);
    }
    createInterpolator(low, high) {
        const range = high - low;
        const colorDiff = [
            this.color2[0] - this.color1[0],
            this.color2[1] - this.color1[1],
            this.color2[2] - this.color1[2],
        ];
        return (value) => {
            const ratio = (value - low) / range;
            const mixedColor = [
                Math.round(this.color1[0] + colorDiff[0] * ratio),
                Math.round(this.color1[1] + colorDiff[1] * ratio),
                Math.round(this.color1[2] + colorDiff[2] * ratio),
            ];
            return `rgb(${mixedColor.join(',')})`;
        };
    }
}
export class BackgroundShadeSeriesRenderer {
    constructor() {
        this._data = null;
        this._options = null;
    }
    draw(target) {
        target.useBitmapCoordinateSpace(scope => this._drawImpl(scope));
    }
    update(data, options) {
        this._data = data;
        this._options = options;
    }
    _drawImpl(renderingScope) {
        if (this._data === null ||
            this._data.bars.length === 0 ||
            this._data.visibleRange === null ||
            this._options === null) {
            return;
        }
        const options = this._options;
        const colorMixer = new SimpleColorInterpolator(options.lowColor, options.highColor).createInterpolator(options.lowValue, options.highValue);
        const bars = this._data.bars.map(bar => {
            return {
                color: colorMixer(bar.originalData.value),
                x: bar.x,
            };
        });
        const halfWidth = this._data.barSpacing / 2;
        for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
            const bar = bars[i];
            const fullWidth = fullBarWidth(bar.x, halfWidth, renderingScope.horizontalPixelRatio);
            const yTop = 0;
            const height = renderingScope.bitmapSize.height;
            renderingScope.context.fillStyle = bar.color || 'rgba(0, 0, 0, 0)';
            renderingScope.context.fillRect(fullWidth.position, yTop, fullWidth.length, height);
        }
    }
}