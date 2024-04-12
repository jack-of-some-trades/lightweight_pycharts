import { defaultOptions } from './options.js';
import { StackedAreaSeriesRenderer } from './renderer.js';
export class StackedAreaSeries {
    constructor() {
        this._renderer = new StackedAreaSeriesRenderer();
    }
    priceValueBuilder(plotRow) {
        return [
            0,
            plotRow.values.reduce((previousValue, currentValue) => previousValue + currentValue, 0),
        ];
    }
    isWhitespace(data) {
        var _a;
        return !Boolean((_a = data.values) === null || _a === void 0 ? void 0 : _a.length);
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
