import { positionsLine } from '../../helpers/dimensions/positions.js';
class TooltipCrosshairLinePaneRenderer {
    constructor(data) {
        this._data = data;
    }
    draw(target) {
        if (!this._data.length)
            return;
        target.useBitmapCoordinateSpace(scope => {
            const ctx = scope.context;
            this._data.forEach(data => {
                const crosshairPos = positionsLine(data.x, scope.horizontalPixelRatio, 1);
                ctx.fillStyle = data.color;
                ctx.fillRect(crosshairPos.position, data.topMargin * scope.verticalPixelRatio, crosshairPos.length, scope.bitmapSize.height);
                if (data.priceY) {
                    ctx.beginPath();
                    ctx.ellipse(data.x * scope.horizontalPixelRatio, data.priceY * scope.verticalPixelRatio, 6 * scope.horizontalPixelRatio, 6 * scope.verticalPixelRatio, 0, 0, Math.PI * 2);
                    ctx.fillStyle = data.markerBorderColor;
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(data.x * scope.horizontalPixelRatio, data.priceY * scope.verticalPixelRatio, 4 * scope.horizontalPixelRatio, 4 * scope.verticalPixelRatio, 0, 0, Math.PI * 2);
                    ctx.fillStyle = data.markerColor;
                    ctx.fill();
                }
            });
        });
    }
}
export class MultiTouchCrosshairPaneView {
    constructor(data) {
        this._data = data;
    }
    update(data) {
        this._data = data;
    }
    renderer() {
        return new TooltipCrosshairLinePaneRenderer(this._data);
    }
    zOrder() {
        return 'top';
    }
}
