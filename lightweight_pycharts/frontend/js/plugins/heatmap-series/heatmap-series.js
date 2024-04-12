import { defaultOptions } from './options.js';
import { HeatMapSeriesRenderer } from './renderer.js';
export class HeatMapSeries {
    constructor() {
        this._renderer = new HeatMapSeriesRenderer();
    }
    priceValueBuilder(plotRow) {
        if (plotRow.cells.length < 1) {
            return [NaN];
        }
        let low = Infinity;
        let high = -Infinity;
        plotRow.cells.forEach(cell => {
            if (cell.low < low)
                low = cell.low;
            if (cell.high > high)
                high = cell.high;
        });
        const mid = low + (high - low) / 2;
        return [low, high, mid];
    }
    isWhitespace(data) {
        return data.cells === undefined || data.cells.length < 1;
    }
    renderer() {
        return this._renderer;
    }
    update(data, options) {
        this._renderer.update(data, options);
    }
    defaultOptions() {
        return defaultOptions;
    }
}
