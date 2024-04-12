import {
	CandlestickData,
	CustomData,
} from '../../lib/pkg.js';

export interface RoundedCandleSeriesData
	extends CandlestickData,
	CustomData {
	rounded?: boolean;
}
