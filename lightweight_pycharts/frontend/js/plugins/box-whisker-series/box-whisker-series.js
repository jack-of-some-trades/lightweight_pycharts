import { defaultOptions } from './options.js';
import { WhiskerBoxSeriesRenderer } from './renderer.js';
export class WhiskerBoxSeries {
    constructor() {
        this._renderer = new WhiskerBoxSeriesRenderer();
    }
    priceValueBuilder(plotRow) {
        return [plotRow.quartiles[4], plotRow.quartiles[0], plotRow.quartiles[2]];
    }
    isWhitespace(data) {
        return data.quartiles === undefined;
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
