import { averageWidthPerCharacter, buttonWidth, centreLabelHeight, centreLabelInlinePadding, clockIconPaths, clockPlusIconPaths, removeButtonWidth, showCentreLabelDistance, } from './constants.js';
import { MouseHandlers } from './mouse.js';
import { UserAlertPricePaneView } from './pane-view.js';
import { UserAlertsState } from './state.js';
export class UserPriceAlerts extends UserAlertsState {
    constructor() {
        super();
        this._chart = undefined;
        this._series = undefined;
        this._paneViews = [];
        this._pricePaneViews = [];
        this._lastMouseUpdate = null;
        this._currentCursor = null;
        this._symbolName = '';
        this._hoveringID = '';
        this._mouseHandlers = new MouseHandlers();
    }
    attached({ chart, series, requestUpdate }) {
        this._chart = chart;
        this._series = series;
        this._paneViews = [new UserAlertPricePaneView(false)];
        this._pricePaneViews = [new UserAlertPricePaneView(true)];
        this._mouseHandlers.attached(chart, series);
        this._mouseHandlers.mouseMoved().subscribe(mouseUpdate => {
            this._lastMouseUpdate = mouseUpdate;
            requestUpdate();
        }, this);
        this._mouseHandlers.clicked().subscribe(mousePosition => {
            if (mousePosition && this._series) {
                if (this._isHovering(mousePosition)) {
                    const price = this._series.coordinateToPrice(mousePosition.y);
                    if (price) {
                        this.addAlert(price);
                        requestUpdate();
                    }
                }
                if (this._hoveringID) {
                    this.removeAlert(this._hoveringID);
                    requestUpdate();
                }
            }
        }, this);
    }
    detached() {
        this._mouseHandlers.mouseMoved().unsubscribeAll(this);
        this._mouseHandlers.clicked().unsubscribeAll(this);
        this._mouseHandlers.detached();
        this._series = undefined;
    }
    paneViews() {
        return this._paneViews;
    }
    priceAxisPaneViews() {
        return this._pricePaneViews;
    }
    updateAllViews() {
        var _a;
        const alerts = this.alerts();
        const rendererData = this._calculateRendererData(alerts, this._lastMouseUpdate);
        this._currentCursor = null;
        if (((_a = rendererData === null || rendererData === void 0 ? void 0 : rendererData.button) === null || _a === void 0 ? void 0 : _a.hovering) ||
            (rendererData === null || rendererData === void 0 ? void 0 : rendererData.alerts.some(alert => alert.showHover && alert.hoverRemove))) {
            this._currentCursor = 'pointer';
        }
        this._paneViews.forEach(pv => pv.update(rendererData));
        this._pricePaneViews.forEach(pv => pv.update(rendererData));
    }
    hitTest() {
        if (!this._currentCursor)
            return null;
        return {
            cursorStyle: this._currentCursor,
            externalId: 'user-alerts-primitive',
            zOrder: 'top',
        };
    }
    setSymbolName(name) {
        this._symbolName = name;
    }
    _isHovering(mousePosition) {
        return Boolean(mousePosition &&
            mousePosition.xPositionRelativeToPriceScale >= 1 &&
            mousePosition.xPositionRelativeToPriceScale < buttonWidth);
    }
    _isHoveringRemoveButton(mousePosition, timescaleWidth, alertY, textLength) {
        if (!mousePosition || !timescaleWidth)
            return false;
        const distanceY = Math.abs(mousePosition.y - alertY);
        if (distanceY > centreLabelHeight / 2)
            return false;
        const labelWidth = centreLabelInlinePadding * 2 +
            removeButtonWidth +
            textLength * averageWidthPerCharacter;
        const buttonCentreX = (timescaleWidth + labelWidth - removeButtonWidth) * 0.5;
        const distanceX = Math.abs(mousePosition.x - buttonCentreX);
        return distanceX <= removeButtonWidth / 2;
    }
    _calculateRendererData(alertsInfo, mousePosition) {
        var _a, _b;
        if (!this._series)
            return null;
        const priceFormatter = this._series.priceFormatter();
        const showCrosshair = mousePosition && !mousePosition.overTimeScale;
        const showButton = showCrosshair;
        const crosshairPrice = mousePosition && this._series.coordinateToPrice(mousePosition.y);
        const crosshairPriceText = priceFormatter.format(crosshairPrice !== null && crosshairPrice !== void 0 ? crosshairPrice : -100);
        let closestDistance = Infinity;
        let closestIndex = -1;
        const alerts = alertsInfo.map((alertInfo, index) => {
            var _a;
            const y = (_a = this._series.priceToCoordinate(alertInfo.price)) !== null && _a !== void 0 ? _a : -100;
            if ((mousePosition === null || mousePosition === void 0 ? void 0 : mousePosition.y) && y >= 0) {
                const distance = Math.abs(mousePosition.y - y);
                if (distance < closestDistance) {
                    closestIndex = index;
                    closestDistance = distance;
                }
            }
            return {
                y,
                showHover: false,
                price: alertInfo.price,
                id: alertInfo.id,
            };
        });
        this._hoveringID = '';
        if (closestIndex >= 0 && closestDistance < showCentreLabelDistance) {
            const timescaleWidth = (_b = (_a = this._chart) === null || _a === void 0 ? void 0 : _a.timeScale().width()) !== null && _b !== void 0 ? _b : 0;
            const a = alerts[closestIndex];
            const text = `${this._symbolName} crossing ${this._series
                .priceFormatter()
                .format(a.price)}`;
            const hoverRemove = this._isHoveringRemoveButton(mousePosition, timescaleWidth, a.y, text.length);
            alerts[closestIndex] = Object.assign(Object.assign({}, alerts[closestIndex]), { showHover: true, text,
                hoverRemove });
            if (hoverRemove)
                this._hoveringID = a.id;
        }
        return {
            alertIcon: clockIconPaths,
            alerts,
            button: showButton
                ? {
                    hovering: this._isHovering(mousePosition),
                    hoverColor: '#50535E',
                    crosshairLabelIcon: clockPlusIconPaths,
                }
                : null,
            color: '#131722',
            crosshair: showCrosshair
                ? {
                    y: mousePosition.y,
                    text: crosshairPriceText,
                }
                : null,
        };
    }
}
