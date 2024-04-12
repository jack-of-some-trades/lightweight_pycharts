import { positionsLine } from '../../helpers/dimensions/positions.js';
import { CrosshairMode, } from '../../lib/pkg.js';
class CrosshairHighlightPaneRenderer {
    constructor(data) {
        this._data = data;
    }
    draw(target) {
        if (!this._data.visible)
            return;
        target.useBitmapCoordinateSpace(scope => {
            const ctx = scope.context;
            const crosshairPos = positionsLine(this._data.x, scope.horizontalPixelRatio, Math.max(1, this._data.barSpacing));
            ctx.fillStyle = this._data.color;
            ctx.fillRect(crosshairPos.position, 0, crosshairPos.length, scope.bitmapSize.height);
        });
    }
}
class CrosshairHighlightPaneView {
    constructor(data) {
        this._data = data;
    }
    update(data) {
        this._data = data;
    }
    renderer() {
        return new CrosshairHighlightPaneRenderer(this._data);
    }
    zOrder() {
        return 'bottom';
    }
}
const defaultOptions = {
    color: 'rgba(0, 0, 0, 0.2)',
};
export class CrosshairHighlightPrimitive {
    constructor(options) {
        this._data = {
            x: 0,
            visible: false,
            color: 'rgba(0, 0, 0, 0.2)',
            barSpacing: 6,
        };
        this._moveHandler = (param) => this._onMouseMove(param);
        this._options = Object.assign(Object.assign({}, defaultOptions), options);
        this._paneViews = [new CrosshairHighlightPaneView(this._data)];
    }
    attached(param) {
        this._attachedParams = param;
        this._setCrosshairMode();
        param.chart.subscribeCrosshairMove(this._moveHandler);
    }
    detached() {
        const chart = this.chart();
        if (chart) {
            chart.unsubscribeCrosshairMove(this._moveHandler);
        }
    }
    paneViews() {
        return this._paneViews;
    }
    updateAllViews() {
        this._paneViews.forEach(pw => pw.update(this._data));
    }
    setData(data) {
        var _a;
        this._data = data;
        this.updateAllViews();
        (_a = this._attachedParams) === null || _a === void 0 ? void 0 : _a.requestUpdate();
    }
    currentColor() {
        return this._options.color;
    }
    chart() {
        var _a;
        return (_a = this._attachedParams) === null || _a === void 0 ? void 0 : _a.chart;
    }
    _setCrosshairMode() {
        const chart = this.chart();
        if (!chart) {
            throw new Error('Unable to change crosshair mode because the chart instance is undefined');
        }
        chart.applyOptions({
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    visible: false,
                },
            },
        });
    }
    _barSpacing() {
        const chart = this.chart();
        if (!chart)
            return 6;
        const ts = chart.timeScale();
        const visibleLogicalRange = ts.getVisibleLogicalRange();
        if (!visibleLogicalRange)
            return 6;
        return ts.width() / (visibleLogicalRange.to - visibleLogicalRange.from);
    }
    _onMouseMove(param) {
        const chart = this.chart();
        const logical = param.logical;
        if (!logical || !chart) {
            this.setData({
                x: 0,
                visible: false,
                color: this.currentColor(),
                barSpacing: this._barSpacing(),
            });
            return;
        }
        const coordinate = chart.timeScale().logicalToCoordinate(logical);
        this.setData({
            x: coordinate !== null && coordinate !== void 0 ? coordinate : 0,
            visible: coordinate !== null,
            color: this.currentColor(),
            barSpacing: this._barSpacing(),
        });
    }
}
