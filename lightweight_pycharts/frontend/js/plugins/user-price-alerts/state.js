import { Delegate } from '../../helpers/delegate.js';
export class UserAlertsState {
    constructor() {
        this._alertAdded = new Delegate();
        this._alertRemoved = new Delegate();
        this._alertChanged = new Delegate();
        this._alertsChanged = new Delegate();
        this._alertsArray = [];
        this._alerts = new Map();
        this._alertsChanged.subscribe(() => {
            this._updateAlertsArray();
        }, this);
    }
    destroy() {
        this._alertsChanged.unsubscribeAll(this);
    }
    alertAdded() {
        return this._alertAdded;
    }
    alertRemoved() {
        return this._alertRemoved;
    }
    alertChanged() {
        return this._alertChanged;
    }
    alertsChanged() {
        return this._alertsChanged;
    }
    addAlert(price) {
        const id = this._getNewId();
        const userAlert = {
            price,
            id,
        };
        this._alerts.set(id, userAlert);
        this._alertAdded.fire(userAlert);
        this._alertsChanged.fire();
        return id;
    }
    removeAlert(id) {
        if (!this._alerts.has(id))
            return;
        this._alerts.delete(id);
        this._alertRemoved.fire(id);
        this._alertsChanged.fire();
    }
    alerts() {
        return this._alertsArray;
    }
    _updateAlertsArray() {
        this._alertsArray = Array.from(this._alerts.values()).sort((a, b) => {
            return b.price - a.price;
        });
    }
    _getNewId() {
        let id = Math.round(Math.random() * 1000000).toString(16);
        while (this._alerts.has(id)) {
            id = Math.round(Math.random() * 1000000).toString(16);
        }
        return id;
    }
}
