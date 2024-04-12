import { defaultOptions } from './options.js';
import { GroupedBarsSeriesRenderer } from './renderer.js';
export class GroupedBarsSeries {
    constructor() {
        this._renderer = new GroupedBarsSeriesRenderer();
    }
    priceValueBuilder(plotRow) {
        return [
            0,
            ...plotRow.values,
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
