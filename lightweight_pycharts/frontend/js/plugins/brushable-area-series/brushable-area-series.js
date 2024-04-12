import { defaultOptions } from './options.js';
import { BrushableAreaSeriesRenderer } from './renderer.js';
export class BrushableAreaSeries {
    constructor() {
        this._renderer = new BrushableAreaSeriesRenderer();
    }
    priceValueBuilder(plotRow) {
        return [plotRow.value];
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
