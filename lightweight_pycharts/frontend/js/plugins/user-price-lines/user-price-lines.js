import { positionsBox, positionsLine } from '../../helpers/dimensions/positions.js';
import { CrosshairMode, LineStyle } from '../../lib/pkg.js';
import { PluginBase } from '../plugin-base.js';
const LABEL_HEIGHT = 21;
const plusIcon = `M7.5,7.5 m -7,0 a 7,7 0 1,0 14,0 a 7,7 0 1,0 -14,0 M4 7.5H11 M7.5 4V11`;
const plusIconPath = new Path2D(plusIcon);
const plusIconSize = 15;
class UserPriceLineDataBase {
    constructor(data) {
        this._y = 0;
        this._data = data;
    }
    update(data, series) {
        var _a;
        this._data = data;
        if (!this._data.price) {
            this._y = -10000;
            return;
        }
        this._y = (_a = series.priceToCoordinate(this._data.price)) !== null && _a !== void 0 ? _a : -10000;
    }
}
class UserPriceLinesPaneRenderer {
    constructor(data) {
        this._data = data;
    }
    draw(target) {
        if (!this._data.visible)
            return;
        target.useBitmapCoordinateSpace(scope => {
            const ctx = scope.context;
            const height = LABEL_HEIGHT;
            const width = height + 1;
            const xPos = positionsBox(this._data.rightX - width, this._data.rightX - 1, scope.horizontalPixelRatio);
            const yPos = positionsLine(this._data.y, scope.verticalPixelRatio, height);
            ctx.fillStyle = this._data.color;
            const roundedArray = [5, 0, 0, 5].map(i => i * scope.horizontalPixelRatio);
            ctx.beginPath();
            ctx.roundRect(xPos.position, yPos.position, xPos.length, yPos.length, roundedArray);
            ctx.fill();
            if (this._data.hovered) {
                ctx.fillStyle = this._data.hoverColor;
                ctx.beginPath();
                ctx.roundRect(xPos.position, yPos.position, xPos.length, yPos.length, roundedArray);
                ctx.fill();
            }
            ctx.translate(xPos.position + 3 * scope.horizontalPixelRatio, yPos.position + 3 * scope.verticalPixelRatio);
            ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);
            const iconScaling = 15 / plusIconSize;
            ctx.scale(iconScaling, iconScaling);
            ctx.strokeStyle = this._data.textColor;
            ctx.lineWidth = 1;
            ctx.stroke(plusIconPath);
        });
    }
}
class UserPriceLinesPaneView extends UserPriceLineDataBase {
    renderer() {
        var _a;
        const color = this._data.crosshairColor;
        return new UserPriceLinesPaneRenderer({
            visible: this._data.visible,
            y: this._y,
            color,
            textColor: this._data.crosshairLabelColor,
            rightX: this._data.timeScaleWidth,
            hoverColor: this._data.hoverColor,
            hovered: (_a = this._data.hovered) !== null && _a !== void 0 ? _a : false,
        });
    }
    zOrder() {
        return 'top';
    }
}
class UserPriceLinesLabelButton extends PluginBase {
    constructor(source) {
        super();
        this._data = {
            visible: false,
            hovered: false,
            timeScaleWidth: 0,
            crosshairLabelColor: '#000000',
            crosshairColor: '#ffffff',
            lineColor: '#000000',
            hoverColor: '#777777',
        };
        this._paneViews = [new UserPriceLinesPaneView(this._data)];
        this._source = source;
    }
    updateAllViews() {
        this._paneViews.forEach(pw => pw.update(this._data, this.series));
    }
    priceAxisViews() {
        return [];
    }
    paneViews() {
        return this._paneViews;
    }
    showAddLabel(price, hovered) {
        const crosshairColor = this.chart.options().crosshair.horzLine.labelBackgroundColor;
        this._data = {
            visible: true,
            price,
            hovered,
            timeScaleWidth: this.chart.timeScale().width(),
            crosshairColor,
            crosshairLabelColor: '#FFFFFF',
            lineColor: this._source.currentLineColor(),
            hoverColor: this._source.currentHoverColor(),
        };
        this.updateAllViews();
        this.requestUpdate();
    }
    hideAddLabel() {
        this._data.visible = false;
        this.updateAllViews();
        this.requestUpdate();
    }
}
const defaultOptions = {
    color: '#000000',
    hoverColor: '#777777',
    limitToOne: true,
};
export class UserPriceLines {
    constructor(chart, series, options) {
        this._clickHandler = (param) => this._onClick(param);
        this._moveHandler = (param) => this._onMouseMove(param);
        this._chart = chart;
        this._series = series;
        this._options = Object.assign(Object.assign({}, defaultOptions), options);
        this._chart.subscribeClick(this._clickHandler);
        this._chart.subscribeCrosshairMove(this._moveHandler);
        this._labelButtonPrimitive = new UserPriceLinesLabelButton(this);
        series.attachPrimitive(this._labelButtonPrimitive);
        this._setCrosshairMode();
    }
    currentLineColor() {
        return this._options.color;
    }
    currentHoverColor() {
        return this._options.hoverColor;
    }
    _setCrosshairMode() {
        if (!this._chart) {
            throw new Error('Unable to change crosshair mode because the chart instance is undefined');
        }
        this._chart.applyOptions({
            crosshair: {
                mode: CrosshairMode.Normal,
            },
        });
    }
    remove() {
        if (this._chart) {
            this._chart.unsubscribeClick(this._clickHandler);
            this._chart.unsubscribeCrosshairMove(this._moveHandler);
        }
        if (this._series && this._labelButtonPrimitive) {
            this._series.detachPrimitive(this._labelButtonPrimitive);
        }
        this._chart = undefined;
        this._series = undefined;
    }
    _onClick(param) {
        const price = this._getMousePrice(param);
        const xDistance = this._distanceFromRightScale(param);
        if (price === null ||
            xDistance === null ||
            xDistance > LABEL_HEIGHT ||
            !this._series)
            return;
        this._series.createPriceLine({
            price,
            color: this._options.color,
            lineStyle: LineStyle.Dashed,
        });
    }
    _onMouseMove(param) {
        const price = this._getMousePrice(param);
        const xDistance = this._distanceFromRightScale(param);
        if (price === null || xDistance === null || xDistance > LABEL_HEIGHT * 2) {
            this._labelButtonPrimitive.hideAddLabel();
            return;
        }
        this._labelButtonPrimitive.showAddLabel(price, xDistance < LABEL_HEIGHT);
    }
    _getMousePrice(param) {
        if (!param.point || !this._series)
            return null;
        const price = this._series.coordinateToPrice(param.point.y);
        return price;
    }
    _distanceFromRightScale(param) {
        if (!param.point || !this._chart)
            return null;
        const timeScaleWidth = this._chart.timeScale().width();
        return Math.abs(timeScaleWidth - param.point.x);
    }
}
