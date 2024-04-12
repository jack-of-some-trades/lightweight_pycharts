import { defaultOptions } from './options.js';
import { HLCAreaSeriesRenderer } from './renderer.js';
export class HLCAreaSeries {
    constructor() {
        this._renderer = new HLCAreaSeriesRenderer();
    }
    priceValueBuilder(plotRow) {
        return [plotRow.low, plotRow.high, plotRow.close];
    }
    isWhitespace(data) {
        return data.close === undefined;
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
