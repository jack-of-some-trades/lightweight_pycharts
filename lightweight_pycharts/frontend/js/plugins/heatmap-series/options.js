import { customSeriesDefaultOptions, } from '../../lib/pkg.js';
export const defaultOptions = Object.assign(Object.assign({}, customSeriesDefaultOptions), { lastValueVisible: false, priceLineVisible: false, cellShader: (amount) => {
        const amt = Math.min(Math.max(0, amount), 100);
        return `rgba(0, ${100 + amt * 1.55}, ${0 + amt}, ${0.2 + amt * 0.8})`;
    }, cellBorderWidth: 1, cellBorderColor: 'transparent' });
