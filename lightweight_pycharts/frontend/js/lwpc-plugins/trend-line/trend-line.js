import { PrimitiveBase, draw_dot } from '../primitive-base.js';
const defaultOptions = {
    lineColor: 'rgb(255, 0, 0)',
    width: 1,
    autoscale: false,
    showLabels: true,
    labelBackgroundColor: 'rgba(255, 255, 255, 0.85)',
    labelTextColor: 'rgb(0, 0, 0)',
};
export class TrendLine extends PrimitiveBase {
    constructor(params) {
        super('TrendLine', 'id', false);
        this._p1 = params.p1;
        this._p2 = params.p2;
        this._options = Object.assign(Object.assign({}, defaultOptions), params.options);
        this._paneView = new TrendLinePaneView(this);
    }
    _pointIndex(p) {
        var _a;
        const timescale = this.chart.timeScale();
        return timescale.coordinateToLogical((_a = timescale.timeToCoordinate(p.time)) !== null && _a !== void 0 ? _a : -1);
    }
    _updateData(p1, p2) {
        if (p1 !== null)
            this._p1 = p1;
        if (p2 !== null)
            this._p2 = p2;
        this.requestUpdate();
    }
    _updateOptions(options) {
        this._options = Object.assign(Object.assign({}, this._options), options);
    }
    paneViews() { return [this._paneView]; }
    updateAllViews() { this._paneView.update(); }
    autoscaleInfo(startTimePoint, endTimePoint) {
        if (!this._options.autoscale)
            return null;
        if (this._p1 === null || this._p2 === null)
            return null;
        const p1Index = this._pointIndex(this._p1);
        const p2Index = this._pointIndex(this._p2);
        if (p1Index === null || p2Index === null)
            return null;
        if (endTimePoint < p1Index || startTimePoint > p2Index)
            return null;
        return {
            priceRange: {
                minValue: Math.min(this._p1.value, this._p2.value),
                maxValue: Math.max(this._p1.value, this._p2.value),
            },
        };
    }
    hitTest(x, y) {
        return this._paneView.hitTest(x, y);
    }
    onMouseDown(param) {
        const id = param.hoveredObjectId;
        if (!id || !id.startsWith('line') || !param.sourceEvent || !param.logical) {
            this._paneView._selected = false;
            return;
        }
        const timescale = this.chart.timeScale();
        const series = this.series;
        const chart_rect = this.chart.chartElement().getBoundingClientRect();
        if (!chart_rect)
            return;
        let update_func;
        if (id === "line") {
            let x = param.logical;
            let y = param.sourceEvent.clientY;
            update_func = (param) => {
                if (!param.logical || !param.sourceEvent || !this._p1 || !this._p2)
                    return;
                let dx = param.logical - x;
                let dy = param.sourceEvent.clientY - y;
                let p1 = this.movePoint(this._p1, dx, dy);
                let p2 = this.movePoint(this._p2, dx, dy);
                if (!p1 || !p2)
                    return;
                this._updateData(p1, p2);
                x = param.logical;
                y = param.sourceEvent.clientY;
            };
        }
        else if (id === "line_p1" || id === "line_p2") {
            update_func = (param) => {
                if (!param.sourceEvent)
                    return;
                let t = timescale.coordinateToTime(param.sourceEvent.clientX - chart_rect.left);
                let p = series.coordinateToPrice(param.sourceEvent.clientY - chart_rect.top);
                if (t && p)
                    if (id === "line_p1")
                        this._updateData({ time: t, value: p }, null);
                    else if (id === "line_p2")
                        this._updateData(null, { time: t, value: p });
            };
        }
        else
            return;
        this._paneView._selected = true;
        const chart = this.chart;
        const pressedMove = chart.options().handleScroll.valueOf();
        let pressedMoveReEnable;
        if (typeof (pressedMove) == 'boolean') {
            pressedMoveReEnable = pressedMove;
        }
        else {
            pressedMoveReEnable = pressedMove.pressedMouseMove;
        }
        chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
        update_func = update_func.bind(this);
        chart.subscribeCrosshairMove(update_func);
        document.addEventListener('mouseup', () => {
            chart.unsubscribeCrosshairMove(update_func);
            chart.applyOptions({ handleScroll: { pressedMouseMove: pressedMoveReEnable } });
        });
    }
    onClick(param) {
        switch (param.hoveredObjectId) {
            case 'line_p1':
                console.log('clicked p1');
                break;
            case 'line_p2':
                console.log('clicked p2');
                break;
            case 'line':
                console.log('clicked line');
                break;
        }
    }
}
class TrendLinePaneView {
    constructor(source) {
        this._p1 = null;
        this._p2 = null;
        this._hovered = false;
        this._selected = false;
        this.line = null;
        this.ctx = null;
        this._source = source;
        this._renderer = new TrendLinePaneRenderer(this._source._options, this.passback.bind(this));
    }
    update() {
        if (this._source._p1 === null || this._source._p2 === null)
            return;
        const series = this._source.series;
        const timeScale = this._source.chart.timeScale();
        let y1 = series.priceToCoordinate(this._source._p1.value);
        let y2 = series.priceToCoordinate(this._source._p2.value);
        let x1 = timeScale.timeToCoordinate(this._source._p1.time);
        let x2 = timeScale.timeToCoordinate(this._source._p2.time);
        if (x1 === null || x2 === null || y1 === null || y2 === null) {
            this._p1 = null;
            this._p2 = null;
            return;
        }
        this._p1 = { x: Math.round(x1), y: Math.round(y1) };
        this._p2 = { x: Math.round(x2), y: Math.round(y2) };
    }
    renderer() {
        this._renderer._update(this._p1, this._p2, this._hovered, this._selected);
        return this._renderer;
    }
    passback(ctx, line) {
        this.ctx = ctx;
        this.line = line;
    }
    hitTest(x, y) {
        if (this.line === null || this.ctx === null)
            return null;
        if (this._p1 === null || this._p2 === null)
            return null;
        this._hovered = false;
        if (!(x + 10 > this._p1.x && x - 10 < this._p2.x ||
            x - 10 < this._p1.x && x + 10 > this._p2.x))
            return null;
        if (!(y + 10 > this._p1.y && y - 10 < this._p2.y ||
            y - 10 < this._p1.y && y + 10 > this._p2.y))
            return null;
        if (Math.abs(this._p1.x - x) < 10 && Math.abs(this._p1.y - y) < 10) {
            this._hovered = true;
            return {
                cursorStyle: 'grab',
                externalId: "line_p1",
                zOrder: 'normal'
            };
        }
        if (Math.abs(this._p2.x - x) < 10 && Math.abs(this._p2.y - y) < 10) {
            this._hovered = true;
            return {
                cursorStyle: 'grab',
                externalId: "line_p2",
                zOrder: 'normal'
            };
        }
        this.ctx.lineWidth = Math.max(this._source._options.width, 6);
        if (this.ctx.isPointInStroke(this.line, x, y)) {
            this._hovered = true;
            return {
                cursorStyle: 'grab',
                externalId: "line",
                zOrder: 'normal'
            };
        }
        return null;
    }
}
class TrendLinePaneRenderer {
    constructor(options, passback) {
        this._p1 = null;
        this._p2 = null;
        this._hovered = false;
        this._selected = false;
        this._options = options;
        this._passback = passback;
    }
    draw(target) {
        target.useMediaCoordinateSpace(scope => {
            const ctx = scope.context;
            if (this._p1 === null || this._p2 === null) {
                this._passback(ctx, null);
            }
            else {
                let line = new Path2D();
                line.moveTo(this._p1.x, this._p1.y);
                line.lineTo(this._p2.x, this._p2.y);
                ctx.lineWidth = this._options.width;
                ctx.strokeStyle = this._options.lineColor;
                ctx.stroke(line);
                if (this._hovered || this._selected) {
                    draw_dot(ctx, this._p1, this._selected);
                    draw_dot(ctx, this._p2, this._selected);
                }
                this._passback(ctx, line);
            }
        });
    }
    _update(p1, p2, hovered, selected) {
        this._p1 = p1;
        this._p2 = p2;
        this._hovered = hovered;
        this._selected = selected;
    }
}
