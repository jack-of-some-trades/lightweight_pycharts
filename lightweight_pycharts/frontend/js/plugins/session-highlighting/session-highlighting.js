import { PluginBase } from '../plugin-base.js';
class SessionHighlightingPaneRenderer {
    constructor(data) {
        this._viewData = data;
    }
    draw(target) {
        const points = this._viewData.data;
        target.useBitmapCoordinateSpace(scope => {
            const ctx = scope.context;
            const yTop = 0;
            const height = scope.bitmapSize.height;
            const halfWidth = (scope.horizontalPixelRatio * this._viewData.barWidth) / 2;
            const cutOff = -1 * (halfWidth + 1);
            const maxX = scope.bitmapSize.width;
            points.forEach(point => {
                const xScaled = point.x * scope.horizontalPixelRatio;
                if (xScaled < cutOff)
                    return;
                ctx.fillStyle = point.color || 'rgba(0, 0, 0, 0)';
                const x1 = Math.max(0, Math.round(xScaled - halfWidth));
                const x2 = Math.min(maxX, Math.round(xScaled + halfWidth));
                ctx.fillRect(x1, yTop, x2 - x1, height);
            });
        });
    }
}
class SessionHighlightingPaneView {
    constructor(source) {
        this._source = source;
        this._data = {
            data: [],
            barWidth: 6,
            options: this._source._options,
        };
    }
    update() {
        const timeScale = this._source.chart.timeScale();
        this._data.data = this._source._backgroundColors.map(d => {
            var _a;
            return {
                x: (_a = timeScale.timeToCoordinate(d.time)) !== null && _a !== void 0 ? _a : -100,
                color: d.color,
            };
        });
        if (this._data.data.length > 1) {
            this._data.barWidth = this._data.data[1].x - this._data.data[0].x;
        }
        else {
            this._data.barWidth = 6;
        }
    }
    renderer() {
        return new SessionHighlightingPaneRenderer(this._data);
    }
    zOrder() {
        return 'bottom';
    }
}
const defaults = {};
export class SessionHighlighting extends PluginBase {
    constructor(highlighter, options = {}) {
        super();
        this._seriesData = [];
        this._backgroundColors = [];
        this._highlighter = highlighter;
        this._options = Object.assign(Object.assign({}, defaults), options);
        this._paneViews = [new SessionHighlightingPaneView(this)];
    }
    updateAllViews() {
        this._paneViews.forEach(pw => pw.update());
    }
    paneViews() {
        return this._paneViews;
    }
    attached(p) {
        super.attached(p);
        this.dataUpdated('full');
    }
    dataUpdated(_scope) {
        this._backgroundColors = this.series.data().map(dataPoint => {
            return {
                time: dataPoint.time,
                color: this._highlighter(dataPoint.time),
            };
        });
        this.requestUpdate();
    }
}
