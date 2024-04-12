import { ensureDefined } from '../../helpers/assertions.js';
import { positionsBox } from '../../helpers/dimensions/positions.js';
import { isBusinessDay, } from '../../lib/pkg.js';
import { PluginBase } from '../plugin-base.js';
class RectanglePaneRenderer {
    constructor(p1, p2, fillColor) {
        this._p1 = p1;
        this._p2 = p2;
        this._fillColor = fillColor;
    }
    draw(target) {
        target.useBitmapCoordinateSpace(scope => {
            if (this._p1.x === null ||
                this._p1.y === null ||
                this._p2.x === null ||
                this._p2.y === null)
                return;
            const ctx = scope.context;
            const horizontalPositions = positionsBox(this._p1.x, this._p2.x, scope.horizontalPixelRatio);
            const verticalPositions = positionsBox(this._p1.y, this._p2.y, scope.verticalPixelRatio);
            ctx.fillStyle = this._fillColor;
            ctx.fillRect(horizontalPositions.position, verticalPositions.position, horizontalPositions.length, verticalPositions.length);
        });
    }
}
class RectanglePaneView {
    constructor(source) {
        this._p1 = { x: null, y: null };
        this._p2 = { x: null, y: null };
        this._source = source;
    }
    update() {
        const series = this._source.series;
        const y1 = series.priceToCoordinate(this._source._p1.price);
        const y2 = series.priceToCoordinate(this._source._p2.price);
        const timeScale = this._source.chart.timeScale();
        const x1 = timeScale.timeToCoordinate(this._source._p1.time);
        const x2 = timeScale.timeToCoordinate(this._source._p2.time);
        this._p1 = { x: x1, y: y1 };
        this._p2 = { x: x2, y: y2 };
    }
    renderer() {
        return new RectanglePaneRenderer(this._p1, this._p2, this._source._options.fillColor);
    }
}
class RectangleAxisPaneRenderer {
    constructor(p1, p2, fillColor, vertical) {
        this._vertical = false;
        this._p1 = p1;
        this._p2 = p2;
        this._fillColor = fillColor;
        this._vertical = vertical;
    }
    draw(target) {
        target.useBitmapCoordinateSpace(scope => {
            if (this._p1 === null || this._p2 === null)
                return;
            const ctx = scope.context;
            ctx.globalAlpha = 0.5;
            const positions = positionsBox(this._p1, this._p2, this._vertical ? scope.verticalPixelRatio : scope.horizontalPixelRatio);
            ctx.fillStyle = this._fillColor;
            if (this._vertical) {
                ctx.fillRect(0, positions.position, 15, positions.length);
            }
            else {
                ctx.fillRect(positions.position, 0, positions.length, 15);
            }
        });
    }
}
class RectangleAxisPaneView {
    constructor(source, vertical) {
        this._p1 = null;
        this._p2 = null;
        this._vertical = false;
        this._source = source;
        this._vertical = vertical;
    }
    update() {
        [this._p1, this._p2] = this.getPoints();
    }
    renderer() {
        return new RectangleAxisPaneRenderer(this._p1, this._p2, this._source._options.fillColor, this._vertical);
    }
    zOrder() {
        return 'bottom';
    }
}
class RectanglePriceAxisPaneView extends RectangleAxisPaneView {
    getPoints() {
        const series = this._source.series;
        const y1 = series.priceToCoordinate(this._source._p1.price);
        const y2 = series.priceToCoordinate(this._source._p2.price);
        return [y1, y2];
    }
}
class RectangleTimeAxisPaneView extends RectangleAxisPaneView {
    getPoints() {
        const timeScale = this._source.chart.timeScale();
        const x1 = timeScale.timeToCoordinate(this._source._p1.time);
        const x2 = timeScale.timeToCoordinate(this._source._p2.time);
        return [x1, x2];
    }
}
class RectangleAxisView {
    constructor(source, p) {
        this._pos = null;
        this._source = source;
        this._p = p;
    }
    coordinate() {
        var _a;
        return (_a = this._pos) !== null && _a !== void 0 ? _a : -1;
    }
    visible() {
        return this._source._options.showLabels;
    }
    tickVisible() {
        return this._source._options.showLabels;
    }
    textColor() {
        return this._source._options.labelTextColor;
    }
    backColor() {
        return this._source._options.labelColor;
    }
    movePoint(p) {
        this._p = p;
        this.update();
    }
}
class RectangleTimeAxisView extends RectangleAxisView {
    update() {
        const timeScale = this._source.chart.timeScale();
        this._pos = timeScale.timeToCoordinate(this._p.time);
    }
    text() {
        return this._source._options.timeLabelFormatter(this._p.time);
    }
}
class RectanglePriceAxisView extends RectangleAxisView {
    update() {
        const series = this._source.series;
        this._pos = series.priceToCoordinate(this._p.price);
    }
    text() {
        return this._source._options.priceLabelFormatter(this._p.price);
    }
}
const defaultOptions = {
    fillColor: 'rgba(200, 50, 100, 0.75)',
    previewFillColor: 'rgba(200, 50, 100, 0.25)',
    labelColor: 'rgba(200, 50, 100, 1)',
    labelTextColor: 'white',
    showLabels: true,
    priceLabelFormatter: (price) => price.toFixed(2),
    timeLabelFormatter: (time) => {
        if (typeof time == 'string')
            return time;
        const date = isBusinessDay(time)
            ? new Date(time.year, time.month, time.day)
            : new Date(time * 1000);
        return date.toLocaleDateString();
    },
};
class Rectangle extends PluginBase {
    constructor(p1, p2, options = {}) {
        super();
        this._p1 = p1;
        this._p2 = p2;
        this._options = Object.assign(Object.assign({}, defaultOptions), options);
        this._paneViews = [new RectanglePaneView(this)];
        this._timeAxisViews = [
            new RectangleTimeAxisView(this, p1),
            new RectangleTimeAxisView(this, p2),
        ];
        this._priceAxisViews = [
            new RectanglePriceAxisView(this, p1),
            new RectanglePriceAxisView(this, p2),
        ];
        this._priceAxisPaneViews = [new RectanglePriceAxisPaneView(this, true)];
        this._timeAxisPaneViews = [new RectangleTimeAxisPaneView(this, false)];
    }
    updateAllViews() {
        this._paneViews.forEach(pw => pw.update());
        this._timeAxisViews.forEach(pw => pw.update());
        this._priceAxisViews.forEach(pw => pw.update());
        this._priceAxisPaneViews.forEach(pw => pw.update());
        this._timeAxisPaneViews.forEach(pw => pw.update());
    }
    priceAxisViews() {
        return this._priceAxisViews;
    }
    timeAxisViews() {
        return this._timeAxisViews;
    }
    paneViews() {
        return this._paneViews;
    }
    priceAxisPaneViews() {
        return this._priceAxisPaneViews;
    }
    timeAxisPaneViews() {
        return this._timeAxisPaneViews;
    }
    applyOptions(options) {
        this._options = Object.assign(Object.assign({}, this._options), options);
        this.requestUpdate();
    }
}
class PreviewRectangle extends Rectangle {
    constructor(p1, p2, options = {}) {
        super(p1, p2, options);
        this._options.fillColor = this._options.previewFillColor;
    }
    updateEndPoint(p) {
        this._p2 = p;
        this._paneViews[0].update();
        this._timeAxisViews[1].movePoint(p);
        this._priceAxisViews[1].movePoint(p);
        this.requestUpdate();
    }
}
export class RectangleDrawingTool {
    constructor(chart, series, drawingsToolbarContainer, options) {
        this._previewRectangle = undefined;
        this._points = [];
        this._drawing = false;
        this._clickHandler = (param) => this._onClick(param);
        this._moveHandler = (param) => this._onMouseMove(param);
        this._chart = chart;
        this._series = series;
        this._drawingsToolbarContainer = drawingsToolbarContainer;
        this._addToolbarButton();
        this._defaultOptions = options;
        this._rectangles = [];
        this._chart.subscribeClick(this._clickHandler);
        this._chart.subscribeCrosshairMove(this._moveHandler);
    }
    remove() {
        this.stopDrawing();
        if (this._chart) {
            this._chart.unsubscribeClick(this._clickHandler);
            this._chart.unsubscribeCrosshairMove(this._moveHandler);
        }
        this._rectangles.forEach(rectangle => {
            this._removeRectangle(rectangle);
        });
        this._rectangles = [];
        this._removePreviewRectangle();
        this._chart = undefined;
        this._series = undefined;
        this._drawingsToolbarContainer = undefined;
    }
    startDrawing() {
        this._drawing = true;
        this._points = [];
        if (this._toolbarButton) {
            this._toolbarButton.style.fill = 'rgb(100, 150, 250)';
        }
    }
    stopDrawing() {
        this._drawing = false;
        this._points = [];
        if (this._toolbarButton) {
            this._toolbarButton.style.fill = 'rgb(0, 0, 0)';
        }
    }
    isDrawing() {
        return this._drawing;
    }
    _onClick(param) {
        if (!this._drawing || !param.point || !param.time || !this._series)
            return;
        const price = this._series.coordinateToPrice(param.point.y);
        if (price === null) {
            return;
        }
        this._addPoint({
            time: param.time,
            price,
        });
    }
    _onMouseMove(param) {
        if (!this._drawing || !param.point || !param.time || !this._series)
            return;
        const price = this._series.coordinateToPrice(param.point.y);
        if (price === null) {
            return;
        }
        if (this._previewRectangle) {
            this._previewRectangle.updateEndPoint({
                time: param.time,
                price,
            });
        }
    }
    _addPoint(p) {
        this._points.push(p);
        if (this._points.length >= 2) {
            this._addNewRectangle(this._points[0], this._points[1]);
            this.stopDrawing();
            this._removePreviewRectangle();
        }
        if (this._points.length === 1) {
            this._addPreviewRectangle(this._points[0]);
        }
    }
    _addNewRectangle(p1, p2) {
        const rectangle = new Rectangle(p1, p2, Object.assign({}, this._defaultOptions));
        this._rectangles.push(rectangle);
        ensureDefined(this._series).attachPrimitive(rectangle);
    }
    _removeRectangle(rectangle) {
        ensureDefined(this._series).detachPrimitive(rectangle);
    }
    _addPreviewRectangle(p) {
        this._previewRectangle = new PreviewRectangle(p, p, Object.assign({}, this._defaultOptions));
        ensureDefined(this._series).attachPrimitive(this._previewRectangle);
    }
    _removePreviewRectangle() {
        if (this._previewRectangle) {
            ensureDefined(this._series).detachPrimitive(this._previewRectangle);
            this._previewRectangle = undefined;
        }
    }
    _addToolbarButton() {
        if (!this._drawingsToolbarContainer)
            return;
        const button = document.createElement('div');
        button.style.width = '20px';
        button.style.height = '20px';
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M315.4 15.5C309.7 5.9 299.2 0 288 0s-21.7 5.9-27.4 15.5l-96 160c-5.9 9.9-6.1 22.2-.4 32.2s16.3 16.2 27.8 16.2H384c11.5 0 22.2-6.2 27.8-16.2s5.5-22.3-.4-32.2l-96-160zM288 312V456c0 22.1 17.9 40 40 40H472c22.1 0 40-17.9 40-40V312c0-22.1-17.9-40-40-40H328c-22.1 0-40 17.9-40 40zM128 512a128 128 0 1 0 0-256 128 128 0 1 0 0 256z"/></svg>`;
        button.addEventListener('click', () => {
            if (this.isDrawing()) {
                this.stopDrawing();
            }
            else {
                this.startDrawing();
            }
        });
        this._drawingsToolbarContainer.appendChild(button);
        this._toolbarButton = button;
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = '#C83264';
        colorPicker.style.width = '24px';
        colorPicker.style.height = '20px';
        colorPicker.style.border = 'none';
        colorPicker.style.padding = '0px';
        colorPicker.style.backgroundColor = 'transparent';
        colorPicker.addEventListener('change', () => {
            const newColor = colorPicker.value;
            this._defaultOptions.fillColor = newColor + 'CC';
            this._defaultOptions.previewFillColor = newColor + '77';
            this._defaultOptions.labelColor = newColor;
        });
        this._drawingsToolbarContainer.appendChild(colorPicker);
    }
}
