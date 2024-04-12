import { MismatchDirection, } from '../../lib/pkg.js';
import { defaultOptions, } from './options.js';
import { ExpiringAlertPrimitive } from './primitive.js';
function hasValue(data) {
    return data.value !== undefined;
}
export class ExpiringPriceAlerts {
    constructor(series, options) {
        this._chart = null;
        this._whitespaceSeriesStart = null;
        this._whitespaceSeriesEnd = null;
        this._alerts = new Map();
        this._lastValue = undefined;
        this._series = series;
        this._options = Object.assign(Object.assign({}, defaultOptions), options);
        this._primitive = new ExpiringAlertPrimitive(this);
        this._series.attachPrimitive(this._primitive);
        this._dataChangedHandler = this._dataChanged.bind(this);
        this._series.subscribeDataChanged(this._dataChangedHandler);
        const currentLastPoint = this._series.dataByIndex(10000, MismatchDirection.NearestLeft);
        if (currentLastPoint)
            this.checkedCrossed(currentLastPoint);
        this._chart = this._primitive.chart;
        this._whitespaceSeries = this._chart.addLineSeries();
    }
    destroy() {
        this._series.unsubscribeDataChanged(this._dataChangedHandler);
        this._series.detachPrimitive(this._primitive);
    }
    alerts() {
        return this._alerts;
    }
    chart() {
        return this._chart;
    }
    series() {
        return this._series;
    }
    addExpiringAlert(price, startDate, endDate, parameters) {
        let id = (Math.random() * 100000).toFixed();
        while (this._alerts.has(id)) {
            id = (Math.random() * 100000).toFixed();
        }
        this._alerts.set(id, {
            price,
            start: startDate,
            end: endDate,
            parameters,
            crossed: false,
            expired: false,
        });
        this._update();
        return id;
    }
    removeExpiringAlert(id) {
        this._alerts.delete(id);
        this._update();
    }
    toggleCrossed(id) {
        const alert = this._alerts.get(id);
        if (!alert)
            return;
        alert.crossed = true;
        setTimeout(() => {
            this.removeExpiringAlert(id);
        }, this._options.clearTimeout);
        this._update();
    }
    checkExpired(time) {
        for (const [id, data] of this._alerts.entries()) {
            if (data.end <= time) {
                data.expired = true;
                setTimeout(() => {
                    this.removeExpiringAlert(id);
                }, this._options.clearTimeout);
            }
        }
        this._update();
    }
    checkedCrossed(point) {
        if (!hasValue(point))
            return;
        if (this._lastValue !== undefined) {
            for (const [id, data] of this._alerts.entries()) {
                let crossed = false;
                if (data.parameters.crossingDirection === 'up') {
                    if (this._lastValue <= data.price && point.value > data.price) {
                        crossed = true;
                    }
                }
                else if (data.parameters.crossingDirection === 'down') {
                    if (this._lastValue >= data.price && point.value < data.price) {
                        crossed = true;
                    }
                }
                if (crossed) {
                    this.toggleCrossed(id);
                }
            }
        }
        this._lastValue = point.value;
    }
    _update() {
        var _a, _b;
        let start = Infinity;
        let end = 0;
        const hasAlerts = this._alerts.size > 0;
        for (const [_id, data] of this._alerts.entries()) {
            if (data.end > end)
                end = data.end;
            if (data.start < start)
                start = data.start;
        }
        if (!hasAlerts) {
            start = null;
            end = null;
        }
        if (start) {
            const lastPlotDate = (_b = (_a = this._series.dataByIndex(1000000, MismatchDirection.NearestLeft)) === null || _a === void 0 ? void 0 : _a.time) !== null && _b !== void 0 ? _b : start;
            if (lastPlotDate < start)
                start = lastPlotDate;
        }
        if (this._whitespaceSeriesStart !== start ||
            this._whitespaceSeriesEnd !== end) {
            this._whitespaceSeriesStart = start;
            this._whitespaceSeriesEnd = end;
            if (!this._whitespaceSeriesStart || !this._whitespaceSeriesEnd) {
                this._whitespaceSeries.setData([]);
            }
            else {
                this._whitespaceSeries.setData(this._buildWhitespace(this._whitespaceSeriesStart, this._whitespaceSeriesEnd));
            }
        }
        this._primitive.requestUpdate();
    }
    _buildWhitespace(start, end) {
        const data = [];
        for (let time = start; time <= end; time += this._options.interval) {
            data.push({ time: time });
        }
        return data;
    }
    _dataChanged() {
        const lastPoint = this._series.dataByIndex(100000, MismatchDirection.NearestLeft);
        if (!lastPoint)
            return;
        this.checkedCrossed(lastPoint);
        this.checkExpired(lastPoint.time);
    }
}
