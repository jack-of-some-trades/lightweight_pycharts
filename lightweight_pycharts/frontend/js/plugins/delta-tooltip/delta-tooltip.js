import { Delegate } from '../../helpers/delegate.js';
import { convertTime, formattedDateAndTime } from '../../helpers/time.js';
import { ColorType, CrosshairMode, } from '../../lib/pkg.js';
import { MultiTouchCrosshairPaneView, } from './crosshair-line-pane.js';
import { DeltaTooltipPaneView } from './delta-tooltip-pane.js';
import { MultiTouchChartEvents, } from './multi-touch-chart-events.js';
const defaultOptions = {
    lineColor: 'rgba(0, 0, 0, 0.2)',
    priceExtractor: (data) => {
        if (data.value !== undefined) {
            return [data.value, data.value.toFixed(2)];
        }
        if (data.close !== undefined) {
            return [
                data.close,
                data.close.toFixed(2),
            ];
        }
        return [0, ''];
    },
    showTime: false,
    topOffset: 20,
};
export class DeltaTooltipPrimitive {
    constructor(options) {
        this._crosshairData = [];
        this._touchChartEvents = null;
        this._activeRange = new Delegate();
        this._options = Object.assign(Object.assign({}, defaultOptions), options);
        this._tooltipData = {
            topSpacing: this._options.topOffset,
        };
        this._crosshairPaneView = new MultiTouchCrosshairPaneView(this._crosshairData);
        this._deltaTooltipPaneView = new DeltaTooltipPaneView(this._tooltipData);
        this._paneViews = [this._crosshairPaneView, this._deltaTooltipPaneView];
    }
    attached(param) {
        this._attachedParams = param;
        this._setCrosshairMode();
        this._touchChartEvents = new MultiTouchChartEvents(param.chart, {
            simulateMultiTouchUsingMouseDrag: true,
        });
        this._touchChartEvents.leave().subscribe(() => {
            this._activeRange.fire(null);
            this._hideCrosshair();
        }, this);
        this._touchChartEvents
            .move()
            .subscribe((interactions) => {
            this._showTooltip(interactions);
        }, this);
    }
    detached() {
        if (this._touchChartEvents) {
            this._touchChartEvents.leave().unsubscribeAll(this);
            this._touchChartEvents.move().unsubscribeAll(this);
            this._touchChartEvents.destroy();
        }
        this._activeRange.destroy();
    }
    paneViews() {
        return this._paneViews;
    }
    updateAllViews() {
        this._crosshairPaneView.update(this._crosshairData);
        this._deltaTooltipPaneView.update(this._tooltipData);
    }
    setData(crosshairData, tooltipData) {
        var _a;
        this._crosshairData = crosshairData;
        this._tooltipData = tooltipData;
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
        this._tooltipData.topSpacing = this._options.topOffset;
    }
    activeRange() {
        return this._activeRange;
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
                },
            },
        });
        const series = this.series();
        if (series) {
            series.applyOptions({ crosshairMarkerVisible: false });
        }
    }
    _hideTooltip() {
        this.setData([], {
            tooltips: [],
        });
    }
    _hideCrosshair() {
        this._hideTooltip();
    }
    _chartBackgroundColor() {
        const chart = this.chart();
        if (!chart) {
            return '#FFFFFF';
        }
        const backgroundOptions = chart.options().layout.background;
        if (backgroundOptions.type === ColorType.Solid) {
            return backgroundOptions.color;
        }
        return backgroundOptions.topColor;
    }
    _seriesLineColor() {
        const series = this.series();
        if (!series) {
            return '#888';
        }
        const seriesOptions = series.options();
        return (seriesOptions.color ||
            seriesOptions.lineColor ||
            '#888');
    }
    _showTooltip(interactions) {
        var _a, _b;
        const series = this.series();
        if (interactions.points.length < 1 || !series) {
            this._hideCrosshair();
            return;
        }
        const topMargin = (_a = this._tooltipData.topSpacing) !== null && _a !== void 0 ? _a : 20;
        const markerBorderColor = this._chartBackgroundColor();
        const markerColor = this._seriesLineColor();
        const tooltips = [];
        const crosshairData = [];
        const priceValues = [];
        let firstPointIndex = interactions.points[0].index;
        for (let i = 0; i < Math.min(2, interactions.points.length); i++) {
            const point = interactions.points[i];
            const data = series.dataByIndex(point.index);
            if (data) {
                const [priceValue, priceString] = this._options.priceExtractor(data);
                priceValues.push([priceValue, point.index]);
                const priceY = (_b = series.priceToCoordinate(priceValue)) !== null && _b !== void 0 ? _b : -1000;
                const [date, time] = formattedDateAndTime(data.time ? convertTime(data.time) : undefined);
                const state = {
                    x: point.x,
                    lineContent: [priceString, date],
                };
                if (this._options.showTime) {
                    state.lineContent.push(time);
                }
                if (point.index >= firstPointIndex) {
                    tooltips.push(state);
                }
                else {
                    tooltips.unshift(state);
                }
                crosshairData.push({
                    x: point.x,
                    priceY,
                    visible: true,
                    color: this.currentColor(),
                    topMargin,
                    markerColor,
                    markerBorderColor,
                });
            }
        }
        const deltaContent = {
            tooltips,
        };
        if (priceValues.length > 1) {
            const correctOrder = priceValues[1][1] > priceValues[0][1];
            const firstPrice = correctOrder ? priceValues[0][0] : priceValues[1][0];
            const secondPrice = correctOrder ? priceValues[1][0] : priceValues[0][0];
            const priceChange = secondPrice - firstPrice;
            const pctChange = (100 * priceChange) / firstPrice;
            const positive = priceChange >= 0;
            deltaContent.deltaTopLine = (positive ? '+' : '') + priceChange.toFixed(2);
            deltaContent.deltaBottomLine = (positive ? '+' : '') + pctChange.toFixed(2) + '%';
            deltaContent.deltaBackgroundColor = positive ? 'rgb(4,153,129, 0.2)' : 'rgb(239,83,80, 0.2)';
            deltaContent.deltaTextColor = positive ? 'rgb(4,153,129)' : 'rgb(239,83,80)';
            this._activeRange.fire({
                from: priceValues[correctOrder ? 0 : 1][1] + 1,
                to: priceValues[correctOrder ? 1 : 0][1] + 1,
                positive,
            });
        }
        else {
            deltaContent.deltaTopLine = '';
            deltaContent.deltaBottomLine = '';
            this._activeRange.fire(null);
        }
        this.setData(crosshairData, deltaContent);
    }
}
