import { ensureDefined } from '../helpers/assertions.js';
export class PluginBase {
    constructor() {
        this._chart = undefined;
        this._series = undefined;
        this._fireDataUpdated = (scope) => {
            if (this.dataUpdated) {
                this.dataUpdated(scope);
            }
        };
    }
    requestUpdate() {
        if (this._requestUpdate)
            this._requestUpdate();
    }
    attached({ chart, series, requestUpdate }) {
        this._chart = chart;
        this._series = series;
        this._series.subscribeDataChanged(this._fireDataUpdated);
        this._requestUpdate = requestUpdate;
        this.requestUpdate();
    }
    detached() {
        var _a;
        (_a = this._series) === null || _a === void 0 ? void 0 : _a.unsubscribeDataChanged(this._fireDataUpdated);
        this._chart = undefined;
        this._series = undefined;
        this._requestUpdate = undefined;
    }
    get chart() {
        return ensureDefined(this._chart);
    }
    get series() {
        return ensureDefined(this._series);
    }
}
