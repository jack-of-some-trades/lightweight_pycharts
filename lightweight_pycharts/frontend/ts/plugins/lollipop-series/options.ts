import {
	CustomSeriesOptions,
	customSeriesDefaultOptions,
} from '../../lib/pkg.js';

export interface LollipopSeriesOptions extends CustomSeriesOptions {
	lineWidth: number;
}

export const defaultOptions: LollipopSeriesOptions = {
	...customSeriesDefaultOptions,
	lineWidth: 2,
} as const;
