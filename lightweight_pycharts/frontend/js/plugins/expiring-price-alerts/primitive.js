import { PluginBase } from '../plugin-base.js';
import { cancelIcon, downArrowIcon, tickIcon, upArrowIcon } from './icons.js';
import { ExpiringPriceAlertsPaneRenderer } from './renderer.js';
class ExpiringPriceAlertsPaneView {
    constructor(source) {
        this._source = source;
        this._renderer = new ExpiringPriceAlertsPaneRenderer();
    }
    renderer() {
        return this._renderer;
    }
    update() {
        var _a;
        const data = [];
        const ts = (_a = this._source._chart) === null || _a === void 0 ? void 0 : _a.timeScale();
        if (ts) {
            for (const alert of this._source._alerts.values()) {
                const priceY = this._source._series.priceToCoordinate(alert.price);
                if (priceY === null)
                    continue;
                let startX = ts.timeToCoordinate(alert.start);
                let endX = ts.timeToCoordinate(alert.end);
                if (startX === null && endX === null)
                    continue;
                if (!startX)
                    startX = 0;
                if (!endX)
                    endX = ts.width();
                let color = '#000000';
                let icon = upArrowIcon;
                if (alert.parameters.crossingDirection === 'up') {
                    color = alert.crossed
                        ? '#386D2E'
                        : alert.expired
                            ? '#30472C'
                            : '#64C750';
                    icon = alert.crossed
                        ? tickIcon
                        : alert.expired
                            ? cancelIcon
                            : upArrowIcon;
                }
                else if (alert.parameters.crossingDirection === 'down') {
                    color = alert.crossed
                        ? '#7C1F3E'
                        : alert.expired
                            ? '#4A2D37'
                            : '#C83264';
                    icon = alert.crossed
                        ? tickIcon
                        : alert.expired
                            ? cancelIcon
                            : downArrowIcon;
                }
                data.push({
                    priceY,
                    startX,
                    endX,
                    icon,
                    color,
                    text: alert.parameters.title,
                    fade: alert.expired,
                });
            }
        }
        this._renderer.update(data);
    }
}
export class ExpiringAlertPrimitive extends PluginBase {
    constructor(source) {
        super();
        this._source = source;
        this._views = [new ExpiringPriceAlertsPaneView(this._source)];
    }
    requestUpdate() {
        super.requestUpdate();
    }
    updateAllViews() {
        this._views.forEach(view => view.update());
    }
    paneViews() {
        return this._views;
    }
    autoscaleInfo() {
        let smallest = Infinity;
        let largest = -Infinity;
        for (const alert of this._source._alerts.values()) {
            if (alert.price < smallest)
                smallest = alert.price;
            if (alert.price > largest)
                largest = alert.price;
        }
        if (smallest > largest)
            return null;
        return {
            priceRange: {
                maxValue: largest,
                minValue: smallest,
            },
        };
    }
}
