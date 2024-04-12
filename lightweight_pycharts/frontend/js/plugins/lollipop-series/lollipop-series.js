import { defaultOptions } from './options.js';
import { LollipopSeriesRenderer } from './renderer.js';
export class LollipopSeries {
    constructor() {
        this._renderer = new LollipopSeriesRenderer();
    }
    priceValueBuilder(plotRow) {
        return [0, plotRow.value];
    }
    isWhitespace(data) {
        return data.value === undefined;
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
