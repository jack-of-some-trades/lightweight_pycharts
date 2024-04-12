import { positionsLine } from '../../helpers/dimensions/positions.js';
import { averageWidthPerCharacter, buttonHeight, buttonWidth, centreLabelHeight, centreLabelInlinePadding, clockIconViewBoxSize, crossPath, crossViewBoxSize, iconPadding, iconPaddingAlertTop, iconSize, labelHeight, removeButtonWidth, } from './constants.js';
import { PaneRendererBase } from './renderer-base.js';
export class PaneRenderer extends PaneRendererBase {
    draw(target) {
        target.useBitmapCoordinateSpace(scope => {
            if (!this._data)
                return;
            this._drawAlertLines(scope);
            this._drawAlertIcons(scope);
            const hasRemoveHover = this._data.alerts.some(alert => alert.showHover && alert.hoverRemove);
            if (!hasRemoveHover) {
                this._drawCrosshairLine(scope);
                this._drawCrosshairLabelButton(scope);
            }
            this._drawAlertLabel(scope);
        });
    }
    _drawHorizontalLine(scope, data) {
        const ctx = scope.context;
        try {
            const yPos = positionsLine(data.y, scope.verticalPixelRatio, data.lineWidth);
            const yCentre = yPos.position + yPos.length / 2;
            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = data.lineWidth;
            ctx.strokeStyle = data.color;
            const dash = 4 * scope.horizontalPixelRatio;
            ctx.setLineDash([dash, dash]);
            ctx.moveTo(0, yCentre);
            ctx.lineTo((data.width - buttonWidth) * scope.horizontalPixelRatio, yCentre);
            ctx.stroke();
        }
        finally {
            ctx.restore();
        }
    }
    _drawAlertLines(scope) {
        var _a;
        if (!((_a = this._data) === null || _a === void 0 ? void 0 : _a.alerts))
            return;
        const color = this._data.color;
        this._data.alerts.forEach(alertData => {
            this._drawHorizontalLine(scope, {
                width: scope.mediaSize.width,
                lineWidth: 1,
                color,
                y: alertData.y,
            });
        });
    }
    _drawAlertIcons(scope) {
        var _a;
        if (!((_a = this._data) === null || _a === void 0 ? void 0 : _a.alerts))
            return;
        const color = this._data.color;
        const icon = this._data.alertIcon;
        this._data.alerts.forEach(alert => {
            this._drawLabel(scope, {
                width: scope.mediaSize.width,
                labelHeight,
                y: alert.y,
                roundedCorners: 2,
                icon,
                iconScaling: iconSize / clockIconViewBoxSize,
                padding: {
                    left: iconPadding,
                    top: iconPaddingAlertTop,
                },
                color,
            });
        });
    }
    _calculateLabelWidth(textLength) {
        return (centreLabelInlinePadding * 2 +
            removeButtonWidth +
            textLength * averageWidthPerCharacter);
    }
    _drawAlertLabel(scope) {
        var _a;
        if (!((_a = this._data) === null || _a === void 0 ? void 0 : _a.alerts))
            return;
        const ctx = scope.context;
        const activeLabel = this._data.alerts.find(alert => alert.showHover);
        if (!activeLabel || !activeLabel.showHover)
            return;
        const labelWidth = this._calculateLabelWidth(activeLabel.text.length);
        const labelXDimensions = positionsLine(scope.mediaSize.width / 2, scope.horizontalPixelRatio, labelWidth);
        const yDimensions = positionsLine(activeLabel.y, scope.verticalPixelRatio, centreLabelHeight);
        ctx.save();
        try {
            const radius = 4 * scope.horizontalPixelRatio;
            ctx.beginPath();
            ctx.roundRect(labelXDimensions.position, yDimensions.position, labelXDimensions.length, yDimensions.length, radius);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            const removeButtonStartX = labelXDimensions.position +
                labelXDimensions.length -
                removeButtonWidth * scope.horizontalPixelRatio;
            if (activeLabel.hoverRemove) {
                ctx.beginPath();
                ctx.roundRect(removeButtonStartX, yDimensions.position, removeButtonWidth * scope.horizontalPixelRatio, yDimensions.length, [0, radius, radius, 0]);
                ctx.fillStyle = '#F0F3FA';
                ctx.fill();
            }
            ctx.beginPath();
            const dividerDimensions = positionsLine(removeButtonStartX / scope.horizontalPixelRatio, scope.horizontalPixelRatio, 1);
            ctx.fillStyle = '#F1F3FB';
            ctx.fillRect(dividerDimensions.position, yDimensions.position, dividerDimensions.length, yDimensions.length);
            ctx.beginPath();
            ctx.roundRect(labelXDimensions.position, yDimensions.position, labelXDimensions.length, yDimensions.length, radius);
            ctx.strokeStyle = '#131722';
            ctx.lineWidth = 1 * scope.horizontalPixelRatio;
            ctx.stroke();
            ctx.beginPath();
            ctx.fillStyle = '#131722';
            ctx.textBaseline = 'middle';
            ctx.font = `${Math.round(12 * scope.verticalPixelRatio)}px sans-serif`;
            ctx.fillText(activeLabel.text, labelXDimensions.position +
                centreLabelInlinePadding * scope.horizontalPixelRatio, activeLabel.y * scope.verticalPixelRatio);
            ctx.beginPath();
            const iconSize = 9;
            ctx.translate(removeButtonStartX +
                (scope.horizontalPixelRatio * (removeButtonWidth - iconSize)) / 2, (activeLabel.y - 5) * scope.verticalPixelRatio);
            const scaling = (iconSize / crossViewBoxSize) * scope.horizontalPixelRatio;
            ctx.scale(scaling, scaling);
            ctx.fillStyle = '#131722';
            ctx.fill(crossPath, 'evenodd');
        }
        finally {
            ctx.restore();
        }
    }
    _drawCrosshairLine(scope) {
        var _a;
        if (!((_a = this._data) === null || _a === void 0 ? void 0 : _a.crosshair))
            return;
        this._drawHorizontalLine(scope, {
            width: scope.mediaSize.width,
            lineWidth: 1,
            color: this._data.color,
            y: this._data.crosshair.y,
        });
    }
    _drawCrosshairLabelButton(scope) {
        var _a, _b;
        if (!((_a = this._data) === null || _a === void 0 ? void 0 : _a.button) || !((_b = this._data) === null || _b === void 0 ? void 0 : _b.crosshair))
            return;
        this._drawLabel(scope, {
            width: scope.mediaSize.width,
            labelHeight: buttonHeight,
            y: this._data.crosshair.y,
            roundedCorners: [2, 0, 0, 2],
            icon: this._data.button.crosshairLabelIcon,
            iconScaling: iconSize / clockIconViewBoxSize,
            padding: {
                left: iconPadding,
                top: iconPadding,
            },
            color: this._data.button.hovering
                ? this._data.button.hoverColor
                : this._data.color,
        });
    }
    _drawLabel(scope, data) {
        const ctx = scope.context;
        try {
            ctx.save();
            ctx.beginPath();
            const yDimension = positionsLine(data.y, scope.verticalPixelRatio, data.labelHeight);
            const x = (data.width - (buttonWidth + 1)) * scope.horizontalPixelRatio;
            ctx.roundRect(x, yDimension.position, buttonWidth * scope.horizontalPixelRatio, yDimension.length, adjustRadius(data.roundedCorners, scope.horizontalPixelRatio));
            ctx.fillStyle = data.color;
            ctx.fill();
            ctx.beginPath();
            ctx.translate(x + data.padding.left * scope.horizontalPixelRatio, yDimension.position + data.padding.top * scope.verticalPixelRatio);
            ctx.scale(data.iconScaling * scope.horizontalPixelRatio, data.iconScaling * scope.verticalPixelRatio);
            ctx.fillStyle = '#FFFFFF';
            data.icon.forEach(path => {
                ctx.beginPath();
                ctx.fill(path, 'evenodd');
            });
        }
        finally {
            ctx.restore();
        }
    }
}
function adjustRadius(radius, pixelRatio) {
    if (typeof radius === 'number') {
        return (radius * pixelRatio);
    }
    return radius.map(i => i * pixelRatio);
}
