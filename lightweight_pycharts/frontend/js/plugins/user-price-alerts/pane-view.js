import { PaneRenderer } from './pane-renderer.js';
import { PriceScalePaneRenderer } from './price-scale-pane-renderer.js';
export class UserAlertPricePaneView {
    constructor(isPriceScale) {
        this._renderer = isPriceScale
            ? new PriceScalePaneRenderer()
            : new PaneRenderer();
    }
    zOrder() {
        return 'top';
    }
    renderer() {
        return this._renderer;
    }
    update(data) {
        this._renderer.update(data);
    }
}
