import { positionsLine } from '../../helpers/dimensions/positions.js';
import { convertTime, formattedDateAndTime } from '../../helpers/time.js';
import { CrosshairMode, } from '../../lib/pkg.js';
import { TooltipElement } from './tooltip-element.js';
class TooltipCrosshairLinePaneRenderer {
    constructor(data) {
        this._data = data;
    }
    draw(target) {
        if (!this._data.visible)
            return;
        target.useBitmapCoordinateSpace(scope => {
            const ctx = scope.context;
            const crosshairPos = positionsLine(this._data.x, scope.horizontalPixelRatio, 1);
            ctx.fillStyle = this._data.color;
            ctx.fillRect(crosshairPos.position, this._data.topMargin * scope.verticalPixelRatio, crosshairPos.length, scope.bitmapSize.height);
        });
    }
}
class MultiTouchCrosshairPaneView {
    constructor(data) {
        this._data = data;
    }
    update(data) {
        this._data = data;
    }
    renderer() {
        return new TooltipCrosshairLinePaneRenderer(this._data);
    }
    zOrder() {
        return 'bottom';
    }
}
const defaultOptions = {
    lineColor: 'rgba(0, 0, 0, 0.2)',
    priceExtractor: (data) => {
        if (data.value !== undefined) {
            return data.value.toFixed(2);
        }
        if (data.close !== undefined) {
            return data.close.toFixed(2);
        }
        return '';
    }
};
export class TooltipPrimitive {
    constructor(options) {
        this._tooltip = undefined;
        this._data = {
            x: 0,
            visible: false,
            color: 'rgba(0, 0, 0, 0.2)',
            topMargin: 0,
        };
        this._moveHandler = (param) => this._onMouseMove(param);
        this._options = Object.assign(Object.assign({}, defaultOptions), options);
        this._paneViews = [new MultiTouchCrosshairPaneView(this._data)];
    }
    attached(param) {
        this._attachedParams = param;
        this._setCrosshairMode();
        param.chart.subscribeCrosshairMove(this._moveHandler);
        this._createTooltipElement();
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
        return this._options.lineColor;
    }
    chart() {
        var _a;
        return (_a = this._attachedParams) === null || _a === void 0 ? void 0 : _a.chart;
    }
    series() {
        var _a;
        return (_a = this._attachedParams) === null || _a === void 0 ? void 0 : _a.series;
    }
    applyOptions(options) {
        this._options = Object.assign(Object.assign({}, this._options), options);
        if (this._tooltip) {
            this._tooltip.applyOptions(Object.assign({}, this._options.tooltip));
        }
    }
    _setCrosshairMode() {
        const chart = this.chart();
        if (!chart) {
            throw new Error('Unable to change crosshair mode because the chart instance is undefined');
        }
        chart.applyOptions({
            crosshair: {
                mode: CrosshairMode.Magnet,
                vertLine: {
                    visible: false,
                    labelVisible: false,
                },
                horzLine: {
                    visible: false,
                    labelVisible: false,
                }
            },
        });
    }
    _hideTooltip() {
        if (!this._tooltip)
            return;
        this._tooltip.updateTooltipContent({
            title: '',
            price: '',
            date: '',
            time: '',
        });
        this._tooltip.updatePosition({
            paneX: 0,
            paneY: 0,
            visible: false,
        });
    }
    _hideCrosshair() {
        this._hideTooltip();
        this.setData({
            x: 0,
            visible: false,
            color: this.currentColor(),
            topMargin: 0,
        });
    }
    _onMouseMove(param) {
        var _a, _b, _c, _d;
        const chart = this.chart();
        const series = this.series();
        const logical = param.logical;
        if (!logical || !chart || !series) {
            this._hideCrosshair();
            return;
        }
        const data = param.seriesData.get(series);
        if (!data) {
            this._hideCrosshair();
            return;
        }
        const price = this._options.priceExtractor(data);
        const coordinate = chart.timeScale().logicalToCoordinate(logical);
        const [date, time] = formattedDateAndTime(param.time ? convertTime(param.time) : undefined);
        if (this._tooltip) {
            const tooltipOptions = this._tooltip.options();
            const topMargin = tooltipOptions.followMode == 'top' ? tooltipOptions.topOffset + 10 : 0;
            this.setData({
                x: coordinate !== null && coordinate !== void 0 ? coordinate : 0,
                visible: coordinate !== null,
                color: this.currentColor(),
                topMargin,
            });
            this._tooltip.updateTooltipContent({
                price,
                date,
                time,
            });
            this._tooltip.updatePosition({
                paneX: (_b = (_a = param.point) === null || _a === void 0 ? void 0 : _a.x) !== null && _b !== void 0 ? _b : 0,
                paneY: (_d = (_c = param.point) === null || _c === void 0 ? void 0 : _c.y) !== null && _d !== void 0 ? _d : 0,
                visible: true,
            });
        }
    }
    _createTooltipElement() {
        const chart = this.chart();
        if (!chart)
            throw new Error('Unable to create Tooltip element. Chart not attached');
        this._tooltip = new TooltipElement(chart, Object.assign({}, this._options.tooltip));
    }
}
