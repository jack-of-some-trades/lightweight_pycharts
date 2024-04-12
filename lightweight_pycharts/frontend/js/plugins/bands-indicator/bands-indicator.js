import { ClosestTimeIndexFinder } from '../../helpers/closest-index.js';
import { UpperLowerInRange } from '../../helpers/min-max-in-range.js';
import { cloneReadonly } from '../../helpers/simple-clone.js';
import { PluginBase } from '../plugin-base.js';
class BandsIndicatorPaneRenderer {
    constructor(data) {
        this._viewData = data;
    }
    draw() { }
    drawBackground(target) {
        const points = this._viewData.data;
        target.useBitmapCoordinateSpace(scope => {
            const ctx = scope.context;
            ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);
            ctx.strokeStyle = this._viewData.options.lineColor;
            ctx.lineWidth = this._viewData.options.lineWidth;
            ctx.beginPath();
            const region = new Path2D();
            const lines = new Path2D();
            region.moveTo(points[0].x, points[0].upper);
            lines.moveTo(points[0].x, points[0].upper);
            for (const point of points) {
                region.lineTo(point.x, point.upper);
                lines.lineTo(point.x, point.upper);
            }
            const end = points.length - 1;
            region.lineTo(points[end].x, points[end].lower);
            lines.moveTo(points[end].x, points[end].lower);
            for (let i = points.length - 2; i >= 0; i--) {
                region.lineTo(points[i].x, points[i].lower);
                lines.lineTo(points[i].x, points[i].lower);
            }
            region.lineTo(points[0].x, points[0].upper);
            region.closePath();
            ctx.stroke(lines);
            ctx.fillStyle = this._viewData.options.fillColor;
            ctx.fill(region);
        });
    }
}
class BandsIndicatorPaneView {
    constructor(source) {
        this._source = source;
        this._data = {
            data: [],
            options: this._source._options,
        };
    }
    update() {
        const series = this._source.series;
        const timeScale = this._source.chart.timeScale();
        this._data.data = this._source._bandsData.map(d => {
            var _a, _b, _c;
            return {
                x: (_a = timeScale.timeToCoordinate(d.time)) !== null && _a !== void 0 ? _a : -100,
                upper: (_b = series.priceToCoordinate(d.upper)) !== null && _b !== void 0 ? _b : -100,
                lower: (_c = series.priceToCoordinate(d.lower)) !== null && _c !== void 0 ? _c : -100,
            };
        });
    }
    renderer() {
        return new BandsIndicatorPaneRenderer(this._data);
    }
}
function extractPrice(dataPoint) {
    if (dataPoint.close)
        return dataPoint.close;
    if (dataPoint.value)
        return dataPoint.value;
    return undefined;
}
const defaults = {
    lineColor: 'rgb(25, 200, 100)',
    fillColor: 'rgba(25, 200, 100, 0.25)',
    lineWidth: 1,
};
export class BandsIndicator extends PluginBase {
    constructor(options = {}) {
        super();
        this._seriesData = [];
        this._bandsData = [];
        this._minValue = Number.POSITIVE_INFINITY;
        this._maxValue = Number.NEGATIVE_INFINITY;
        this._options = Object.assign(Object.assign({}, defaults), options);
        this._paneViews = [new BandsIndicatorPaneView(this)];
        this._timeIndices = new ClosestTimeIndexFinder([]);
        this._upperLower = new UpperLowerInRange([]);
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
    dataUpdated(scope) {
        this._seriesData = cloneReadonly(this.series.data());
        this.calculateBands();
        if (scope === 'full') {
            this._timeIndices = new ClosestTimeIndexFinder(this._seriesData);
        }
    }
    calculateBands() {
        const bandData = new Array(this._seriesData.length);
        let index = 0;
        this._minValue = Number.POSITIVE_INFINITY;
        this._maxValue = Number.NEGATIVE_INFINITY;
        this._seriesData.forEach(d => {
            const price = extractPrice(d);
            if (price === undefined)
                return;
            const upper = price * 1.1;
            const lower = price * 0.9;
            if (upper > this._maxValue)
                this._maxValue = upper;
            if (lower < this._minValue)
                this._minValue = lower;
            bandData[index] = {
                upper,
                lower,
                time: d.time,
            };
            index += 1;
        });
        bandData.length = index;
        this._bandsData = bandData;
        this._upperLower = new UpperLowerInRange(this._bandsData, 4);
    }
    autoscaleInfo(startTimePoint, endTimePoint) {
        var _a, _b, _c, _d;
        const ts = this.chart.timeScale();
        const startTime = ((_b = ts.coordinateToTime((_a = ts.logicalToCoordinate(startTimePoint)) !== null && _a !== void 0 ? _a : 0)) !== null && _b !== void 0 ? _b : 0);
        const endTime = ((_d = ts.coordinateToTime((_c = ts.logicalToCoordinate(endTimePoint)) !== null && _c !== void 0 ? _c : 5000000000)) !== null && _d !== void 0 ? _d : 5000000000);
        const startIndex = this._timeIndices.findClosestIndex(startTime, 'left');
        const endIndex = this._timeIndices.findClosestIndex(endTime, 'right');
        const range = this._upperLower.getMinMax(startIndex, endIndex);
        return {
            priceRange: {
                minValue: range.lower,
                maxValue: range.upper,
            },
        };
    }
}
