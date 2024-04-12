import { Delegate } from '../../helpers/delegate.js';
function determineChartX(chartElement, chart, mouseX) {
    const chartBox = chartElement.getBoundingClientRect();
    const x = mouseX - chartBox.left - chart.priceScale('left').width();
    if (x < 0 || x > chart.timeScale().width())
        return null;
    return x;
}
function determinePaneXLogical(chart, x) {
    if (x === null)
        return null;
    return chart.timeScale().coordinateToLogical(x);
}
function determineYPosition(chartElement, clientY) {
    const chartContainerBox = chartElement.getBoundingClientRect();
    return (clientY - chartContainerBox.y);
}
export class MultiTouchChartEvents {
    constructor(chart, options) {
        this._mouseState = {
            drawing: false,
            startLogical: null,
            startCoordinate: null,
            startX: null,
        };
        this._touchLeave = new Delegate();
        this._touchInteraction = new Delegate();
        this._unSubscribers = [];
        this._options = options;
        this._chart = chart;
        this._chartElement = chart.chartElement();
        this._addMouseEventListener(this._chartElement, 'mouseleave', this._mouseLeave);
        this._addMouseEventListener(this._chartElement, 'mousemove', this._mouseMove);
        this._addMouseEventListener(this._chartElement, 'mousedown', this._mouseDown);
        this._addMouseEventListener(this._chartElement, 'mouseup', this._mouseUp);
        this._addTouchEventListener(this._chartElement, 'touchstart', this._touchOther);
        this._addTouchEventListener(this._chartElement, 'touchmove', this._touchMove);
        this._addTouchEventListener(this._chartElement, 'touchcancel', this._touchFinish);
        this._addTouchEventListener(this._chartElement, 'touchend', this._touchFinish);
    }
    destroy() {
        this._touchLeave.destroy();
        this._touchInteraction.destroy();
        this._unSubscribers.forEach(unSub => {
            unSub();
        });
        this._unSubscribers = [];
    }
    leave() {
        return this._touchLeave;
    }
    move() {
        return this._touchInteraction;
    }
    _addMouseEventListener(target, eventType, handler) {
        const boundMouseMoveHandler = handler.bind(this);
        target.addEventListener(eventType, boundMouseMoveHandler);
        const unSubscriber = () => {
            target.removeEventListener(eventType, boundMouseMoveHandler);
        };
        this._unSubscribers.push(unSubscriber);
    }
    _addTouchEventListener(target, eventType, handler) {
        const boundMouseMoveHandler = handler.bind(this);
        target.addEventListener(eventType, boundMouseMoveHandler);
        const unSubscriber = () => {
            target.removeEventListener(eventType, boundMouseMoveHandler);
        };
        this._unSubscribers.push(unSubscriber);
    }
    _mouseLeave() {
        this._mouseState.drawing = false;
        this._touchLeave.fire();
    }
    _mouseMove(event) {
        const chartX = determineChartX(this._chartElement, this._chart, event.clientX);
        const logical = determinePaneXLogical(this._chart, chartX);
        const coordinate = determineYPosition(this._chartElement, event.clientY);
        const points = [];
        if (this._options.simulateMultiTouchUsingMouseDrag &&
            this._mouseState.drawing &&
            this._mouseState.startLogical !== null &&
            this._mouseState.startCoordinate !== null &&
            this._mouseState.startX !== null) {
            points.push({
                x: this._mouseState.startX,
                index: this._mouseState.startLogical,
                y: this._mouseState.startCoordinate,
            });
        }
        if (logical !== null && coordinate !== null && chartX !== null) {
            points.push({
                x: chartX,
                index: logical,
                y: coordinate,
            });
        }
        const interaction = {
            points,
        };
        this._touchInteraction.fire(interaction);
    }
    _mouseDown(event) {
        this._mouseState.startX = determineChartX(this._chartElement, this._chart, event.clientX);
        this._mouseState.startLogical = determinePaneXLogical(this._chart, this._mouseState.startX);
        this._mouseState.startCoordinate = determineYPosition(this._chartElement, event.clientY);
        this._mouseState.drawing =
            this._mouseState.startLogical !== null &&
                this._mouseState.startCoordinate !== null;
    }
    _mouseUp() {
        this._mouseState.drawing = false;
    }
    _touchMove(event) {
        event.preventDefault();
        const points = [];
        for (let i = 0; i < event.targetTouches.length; i++) {
            const touch = event.targetTouches.item(i);
            if (touch !== null) {
                const chartX = determineChartX(this._chartElement, this._chart, touch.clientX);
                const logical = determinePaneXLogical(this._chart, chartX);
                const y = determineYPosition(this._chartElement, touch.clientY);
                if (chartX !== null && y !== null && logical !== null) {
                    points.push({
                        x: chartX,
                        index: logical,
                        y,
                    });
                }
            }
        }
        const interaction = {
            points,
        };
        this._touchInteraction.fire(interaction);
    }
    _touchFinish(event) {
        event.preventDefault();
        if (event.targetTouches.length < 1) {
            this._touchLeave.fire();
            return;
        }
    }
    _touchOther(event) {
        event.preventDefault();
    }
}
