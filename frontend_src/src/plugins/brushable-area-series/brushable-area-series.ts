import {
    CustomSeriesPricePlotValues,
    ICustomSeriesPaneView,
    PaneRendererCustomData,
    Time,
    WhitespaceData,
} from 'lightweight-charts';
import { BrushableAreaData } from './data.js';
import { BrushableAreaSeriesOptions, defaultOptions } from './options.js';
import { BrushableAreaSeriesRenderer } from './renderer.js';

export class BrushableAreaSeries<TData extends BrushableAreaData>
	implements ICustomSeriesPaneView<Time, TData, BrushableAreaSeriesOptions> {
	_renderer: BrushableAreaSeriesRenderer<TData>;

	constructor() {
		this._renderer = new BrushableAreaSeriesRenderer();
	}

	priceValueBuilder(plotRow: TData): CustomSeriesPricePlotValues {
		return [plotRow.value];
	}

	isWhitespace(data: TData | WhitespaceData): data is WhitespaceData {
		return (data as Partial<TData>).value === undefined;
	}

	renderer(): BrushableAreaSeriesRenderer<TData> {
		return this._renderer;
	}

	update(
		data: PaneRendererCustomData<Time, TData>,
		options: BrushableAreaSeriesOptions
	): void {
		this._renderer.update(data, options);
	}

	defaultOptions() {
		return defaultOptions;
	}
}
