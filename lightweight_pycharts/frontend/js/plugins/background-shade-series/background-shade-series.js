import { defaultOptions } from './options.js';
import { BackgroundShadeSeriesRenderer } from './renderer.js';
export class BackgroundShadeSeries {
    constructor() {
        this._renderer = new BackgroundShadeSeriesRenderer();
    }
    priceValueBuilder(_plotRow) {
        return [NaN];
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
