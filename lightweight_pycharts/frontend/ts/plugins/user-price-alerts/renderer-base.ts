import { CanvasRenderingTarget2D } from '../../lib/fancy-canvas.js';
import { ISeriesPrimitivePaneRenderer } from '../../lib/pkg.js';
import { IRendererData } from './irenderer-data.js';

export abstract class PaneRendererBase implements ISeriesPrimitivePaneRenderer {
	_data: IRendererData | null = null;
	abstract draw(target: CanvasRenderingTarget2D): void;
	update(data: IRendererData | null) {
		this._data = data;
	}
}
