import { ensureDefined } from '../helpers/assertions.js';
export class PrimitiveBase {
    requestUpdate() { if (this._requestUpdate)
        this._requestUpdate(); }
    constructor(_type, _id, _autoscale) {
        this._chart = undefined;
        this._series = undefined;
        this._id = "";
        this._type = "null";
        this._autoscale = false;
        this._fireDataUpdated = (scope) => {
            if (this.onDataUpdate) {
                this.onDataUpdate(scope);
            }
        };
        this._fireMouseDown = (e) => {
            if (this.onMouseDown) {
                this.onMouseDown(this.makeMouseEventParams(e));
            }
        };
        this._fireClick = (e) => {
            if (this.onClick) {
                this.onClick(e);
            }
        };
        this._fireDblClick = (e) => {
            if (this.onDblClick) {
                this.onDblClick(e);
            }
        };
        this._fireCrosshairMove = (e) => {
            if (this.onDblClick) {
                this.onDblClick(e);
            }
        };
        this._type = _type;
        this._id = _id;
        this._autoscale = _autoscale;
    }
    attached({ chart, series, requestUpdate }) {
        this._chart = chart;
        this._series = series;
        if (this.onDataUpdate) {
            this._series.subscribeDataChanged(this._fireDataUpdated);
        }
        if (this.onClick) {
            this._chart.subscribeClick(this._fireClick);
        }
        if (this.onDblClick) {
            this._chart.subscribeDblClick(this._fireDblClick);
        }
        if (this.onCrosshairMove) {
            this._chart.subscribeCrosshairMove(this._fireCrosshairMove);
        }
        if (this.onMouseDown) {
            this._chart.chartElement().addEventListener('mousedown', this._fireMouseDown);
        }
        this._requestUpdate = requestUpdate;
        this.requestUpdate();
    }
    detached() {
        var _a, _b, _c, _d;
        if (this.onDataUpdate) {
            (_a = this._series) === null || _a === void 0 ? void 0 : _a.unsubscribeDataChanged(this._fireDataUpdated);
        }
        if (this.onClick) {
            (_b = this._chart) === null || _b === void 0 ? void 0 : _b.unsubscribeClick(this._fireClick);
        }
        if (this.onDblClick) {
            (_c = this._chart) === null || _c === void 0 ? void 0 : _c.unsubscribeDblClick(this._fireDblClick);
        }
        if (this.onCrosshairMove) {
            (_d = this._chart) === null || _d === void 0 ? void 0 : _d.unsubscribeCrosshairMove(this._fireCrosshairMove);
        }
        this._chart = undefined;
        this._series = undefined;
        this._requestUpdate = undefined;
    }
    get chart() { return ensureDefined(this._chart); }
    get series() { return ensureDefined(this._series); }
    makeMouseEventParams(e) {
        var _a, _b, _c, _d, _e, _f;
        const rect = (_a = this._chart) === null || _a === void 0 ? void 0 : _a.chartElement().getBoundingClientRect();
        let pt = undefined;
        if (rect && (e.clientX - rect.left < rect.width) && (e.clientY - rect.top < rect.height))
            pt = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        return {
            time: (_c = (_b = this._chart) === null || _b === void 0 ? void 0 : _b.timeScale().coordinateToTime(e.offsetX)) !== null && _c !== void 0 ? _c : undefined,
            logical: (_e = (_d = this._chart) === null || _d === void 0 ? void 0 : _d.timeScale().coordinateToLogical(e.offsetX)) !== null && _e !== void 0 ? _e : undefined,
            point: pt,
            seriesData: new Map(),
            hoveredSeries: undefined,
            hoveredObjectId: (this.hitTest && pt) ? (_f = this.hitTest(pt.x, pt.y)) === null || _f === void 0 ? void 0 : _f.externalId : undefined,
            sourceEvent: {
                clientX: e.clientX,
                clientY: e.clientY,
                pageX: e.pageX,
                pageY: e.pageY,
                screenX: e.screenX,
                screenY: e.screenY,
                localX: e.offsetX,
                localY: e.offsetY,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                metaKey: e.metaKey
            },
        };
    }
    getPane(params) {
        if (params.point && params.sourceEvent)
            if (params.point.x === params.sourceEvent.localX && params.point.y === params.sourceEvent.localY)
                return 'ViewPane';
            else if (params.point.x === params.sourceEvent.localX && params.point.y !== params.sourceEvent.localY)
                return "TimePane";
            else if (params.point.x !== params.sourceEvent.localX && params.point.y === params.sourceEvent.localY)
                return "PricePane";
            else
                return "Bot_Right_Corner";
        return '';
    }
    movePoint(pt, dx, dy) {
        let x = this.chart.timeScale().timeToCoordinate(pt.time);
        let y = this.series.priceToCoordinate(pt.value);
        if (!x || !y)
            return null;
        let l = this.chart.timeScale().coordinateToLogical(x);
        if (!l)
            return null;
        x = this.chart.timeScale().logicalToCoordinate(l + dx);
        if (!x)
            return null;
        let px = this.chart.timeScale().coordinateToTime(x);
        let py = this.series.coordinateToPrice(y + dy);
        if (!px || !py)
            return null;
        return { time: px, value: py };
    }
}
const cssAccentColor = getComputedStyle(document.body).getPropertyValue('--layout-main-fill');
const cssBorderColor = getComputedStyle(document.body).getPropertyValue('--accent-color');
export function draw_dot(ctx, p, sel = false, color = cssAccentColor, borderColor = cssBorderColor) {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 6, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = borderColor;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, sel ? 4 : 5, sel ? 4 : 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}
