import { Delegate } from '../../helpers/delegate.js';
export class MouseHandlers {
    constructor() {
        this._chart = undefined;
        this._series = undefined;
        this._unSubscribers = [];
        this._clicked = new Delegate();
        this._mouseMoved = new Delegate();
    }
    attached(chart, series) {
        this._chart = chart;
        this._series = series;
        const container = this._chart.chartElement();
        this._addMouseEventListener(container, 'mouseleave', this._mouseLeave);
        this._addMouseEventListener(container, 'mousemove', this._mouseMove);
        this._addMouseEventListener(container, 'click', this._mouseClick);
    }
    detached() {
        this._series = undefined;
        this._clicked.destroy();
        this._mouseMoved.destroy();
        this._unSubscribers.forEach(unSub => {
            unSub();
        });
        this._unSubscribers = [];
    }
    clicked() {
        return this._clicked;
    }
    mouseMoved() {
        return this._mouseMoved;
    }
    _addMouseEventListener(target, eventType, handler) {
        const boundMouseMoveHandler = handler.bind(this);
        target.addEventListener(eventType, boundMouseMoveHandler);
        const unSubscriber = () => {
            target.removeEventListener(eventType, boundMouseMoveHandler);
        };
        this._unSubscribers.push(unSubscriber);
    }
    _mouseLeave() {
        this._mouseMoved.fire(null);
    }
    _mouseMove(event) {
        this._mouseMoved.fire(this._determineMousePosition(event));
    }
    _mouseClick(event) {
        this._clicked.fire(this._determineMousePosition(event));
    }
    _determineMousePosition(event) {
        if (!this._chart || !this._series)
            return null;
        const element = this._chart.chartElement();
        const chartContainerBox = element.getBoundingClientRect();
        const priceScaleWidth = this._series.priceScale().width();
        const timeScaleHeight = this._chart.timeScale().height();
        const x = event.clientX - chartContainerBox.x;
        const y = event.clientY - chartContainerBox.y;
        const overTimeScale = y > element.clientHeight - timeScaleHeight;
        const xPositionRelativeToPriceScale = element.clientWidth - priceScaleWidth - x;
        const overPriceScale = xPositionRelativeToPriceScale < 0;
        return {
            x,
            y,
            xPositionRelativeToPriceScale,
            overPriceScale,
            overTimeScale,
        };
    }
}
