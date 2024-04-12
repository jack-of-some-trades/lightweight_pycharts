import { customSeriesDefaultOptions, } from '../../lib/pkg.js';
import { RoundedCandleSeriesRenderer } from './renderer.js';
const defaultOptions = Object.assign(Object.assign({}, customSeriesDefaultOptions), { upColor: '#26a69a', downColor: '#ef5350', wickVisible: true, borderVisible: true, borderColor: '#378658', borderUpColor: '#26a69a', borderDownColor: '#ef5350', wickColor: '#737375', wickUpColor: '#26a69a', wickDownColor: '#ef5350', radius: function (bs) {
        if (bs < 4)
            return 0;
        return bs / 3;
    } });
export class RoundedCandleSeries {
    constructor() {
        this._renderer = new RoundedCandleSeriesRenderer();
    }
    priceValueBuilder(plotRow) {
        return [plotRow.high, plotRow.low, plotRow.close];
    }
    renderer() {
        return this._renderer;
    }
    isWhitespace(data) {
        return data.close === undefined;
    }
    update(data, options) {
        this._renderer.update(data, options);
    }
    defaultOptions() {
        return defaultOptions;
    }
}
