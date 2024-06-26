import {
    CustomSeriesPricePlotValues,
    ICustomSeriesPaneView,
    PaneRendererCustomData,
    Time,
    WhitespaceData,
} from 'lightweight-charts';
import { HLCAreaData } from './data.js';
import { HLCAreaSeriesOptions, defaultOptions } from './options.js';
import { HLCAreaSeriesRenderer } from './renderer.js';

export class HLCAreaSeries<TData extends HLCAreaData>
	implements ICustomSeriesPaneView<Time, TData, HLCAreaSeriesOptions> {
	_renderer: HLCAreaSeriesRenderer<TData>;

	constructor() {
		this._renderer = new HLCAreaSeriesRenderer();
	}

	priceValueBuilder(plotRow: TData): CustomSeriesPricePlotValues {
		return [plotRow.low, plotRow.high, plotRow.close];
	}

	isWhitespace(data: TData | WhitespaceData): data is WhitespaceData {
		return (data as Partial<TData>).close === undefined;
	}

	renderer(): HLCAreaSeriesRenderer<TData> {
		return this._renderer;
	}

	update(
		data: PaneRendererCustomData<Time, TData>,
		options: HLCAreaSeriesOptions
	): void {
		this._renderer.update(data, options);
	}

	defaultOptions() {
		return defaultOptions;
	}
}
