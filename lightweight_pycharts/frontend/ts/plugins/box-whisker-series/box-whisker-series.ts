import {
	CustomSeriesPricePlotValues,
	ICustomSeriesPaneView,
	PaneRendererCustomData,
	Time,
	WhitespaceData,
} from '../../lib/pkg.js';
import { WhiskerBoxSeriesOptions, defaultOptions } from './options.js';
import { WhiskerBoxSeriesRenderer } from './renderer.js';
import { WhiskerData } from './sample-data.js';

export class WhiskerBoxSeries<TData extends WhiskerData>
	implements ICustomSeriesPaneView<Time, TData, WhiskerBoxSeriesOptions> {
	_renderer: WhiskerBoxSeriesRenderer<TData>;

	constructor() {
		this._renderer = new WhiskerBoxSeriesRenderer();
	}

	priceValueBuilder(plotRow: TData): CustomSeriesPricePlotValues {
		// we don't consider outliers here
		return [plotRow.quartiles[4], plotRow.quartiles[0], plotRow.quartiles[2]];
	}

	isWhitespace(data: TData | WhitespaceData): data is WhitespaceData {
		return (data as Partial<TData>).quartiles === undefined;
	}

	renderer(): WhiskerBoxSeriesRenderer<TData> {
		return this._renderer;
	}

	update(
		data: PaneRendererCustomData<Time, TData>,
		options: WhiskerBoxSeriesOptions
	): void {
		this._renderer.update(data, options);
	}

	defaultOptions() {
		return defaultOptions;
	}
}
