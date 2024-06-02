import { CanvasRenderingTarget2D } from '../../lib/fancy-canvas.js';
import {
	AutoscaleInfo,
	Coordinate,
	HandleScrollOptions,
	ISeriesPrimitivePaneRenderer,
	ISeriesPrimitivePaneView,
	Logical,
	MouseEventParams,
	Point,
	PrimitiveHoveredItem,
	SingleValueData,
	Time
} from '../../lib/pkg.js';
import { PrimitiveBase, draw_dot } from '../primitive-base.js';



/* --------------------- Primitive Options ----------------------- */

export interface TrendLineOptions {
	lineColor: string;
	width: number;
	autoscale: boolean,
	showLabels: boolean;
	labelBackgroundColor: string;
	labelTextColor: string;
}

const defaultOptions: TrendLineOptions = {
	lineColor: 'rgb(255, 0, 0)',
	width: 1,
	autoscale: false,
	showLabels: true,
	labelBackgroundColor: 'rgba(255, 255, 255, 0.85)',
	labelTextColor: 'rgb(0, 0, 0)',
};

/* --------------------- Primitive Main Class ----------------------- */

export class TrendLine extends PrimitiveBase {
	_p1: SingleValueData | null;
	_p2: SingleValueData | null;
	_paneView: TrendLinePaneView;
	_options: TrendLineOptions;

	constructor(
		p1: SingleValueData | null,
		p2: SingleValueData | null,
		options?: Partial<TrendLineOptions>
	) {
		super()
		this._p1 = p1;
		this._p2 = p2;
		this._options = {
			...defaultOptions,
			...options,
		};
		this._paneView = new TrendLinePaneView(this);
	}
	//#region --------------- Util Functions --------------- //
	_pointIndex(p: SingleValueData): number | null {
		const timescale = this.chart.timeScale()
		return timescale.coordinateToLogical(timescale.timeToCoordinate(p.time) ?? -1)
	}

	_updateData(p1: SingleValueData | null, p2: SingleValueData | null) {
		if (p1 !== null) this._p1 = p1
		if (p2 !== null) this._p2 = p2
		this.requestUpdate()
	}

	_updateOptions(options: Partial<TrendLineOptions>) {
		this._options = {
			...this._options,
			...options
		}
	}
	//#endregion 

	//#region --------------- Base Class / Interface Functions --------------- //
	paneViews() { return [this._paneView]; }
	updateAllViews() { this._paneView.update(); }

	autoscaleInfo(startTimePoint: Logical, endTimePoint: Logical): AutoscaleInfo | null {
		if (!this._options.autoscale) return null
		if (this._p1 === null || this._p2 === null) return null

		const p1Index = this._pointIndex(this._p1);
		const p2Index = this._pointIndex(this._p2);
		if (p1Index === null || p2Index === null) return null;
		if (endTimePoint < p1Index || startTimePoint > p2Index) return null;

		return {
			priceRange: {
				minValue: Math.min(this._p1.value, this._p2.value),
				maxValue: Math.max(this._p1.value, this._p2.value),
			},
		};
	}

	hitTest(x: number, y: number): PrimitiveHoveredItem | null {
		return this._paneView.hitTest(x, y)
	}

	/**
	 * Move line / Point on line Function
	 */
	onMouseDown(param: MouseEventParams<Time>) {
		const id = param.hoveredObjectId as string
		if (!id || !id.startsWith('line') || !param.sourceEvent || !param.logical) {
			this._paneView._selected = false
			return
		}
		const timescale = this.chart.timeScale()
		const series = this.series


		const chart_rect = this.chart.chartElement().getBoundingClientRect()
		if (!chart_rect) return

		let update_func
		if (id === "line") {
			let x = param.logical
			let y = param.sourceEvent.clientY

			update_func = (param: MouseEventParams<Time>) => {
				if (!param.logical || !param.sourceEvent || !this._p1 || !this._p2) return
				let dx = param.logical - x as Logical
				let dy = param.sourceEvent.clientY - y as Coordinate

				let p1 = this.movePoint(this._p1, dx, dy)
				let p2 = this.movePoint(this._p2, dx, dy)

				if (!p1 || !p2) return
				this._updateData(p1, p2)
				x = param.logical
				y = param.sourceEvent.clientY
			}

		} else if (id === "line_p1" || id === "line_p2") {
			update_func = (param: MouseEventParams<Time>) => {
				if (!param.sourceEvent) return
				let t = timescale.coordinateToTime(param.sourceEvent.clientX - chart_rect.left)
				let p = series.coordinateToPrice(param.sourceEvent.clientY - chart_rect.top)
				if (t && p)
					if (id === "line_p1")
						this._updateData({ time: t, value: p }, null)
					else if (id === "line_p2")
						this._updateData(null, { time: t, value: p })
			}
		} else return

		//Now that we're gurenteed to have clicked on the line somewhere...
		this._paneView._selected = true


		const chart = this.chart
		const pressedMove = chart.options().handleScroll.valueOf() as HandleScrollOptions | boolean
		let pressedMoveReEnable: boolean
		if (typeof (pressedMove) == 'boolean') {
			pressedMoveReEnable = pressedMove
		} else {
			pressedMoveReEnable = pressedMove.pressedMouseMove
		}

		//Remove Scrolling effect
		chart.applyOptions({ handleScroll: { pressedMouseMove: false } })
		update_func = update_func.bind(this)
		chart.subscribeCrosshairMove(update_func)

		document.addEventListener('mouseup', () => {
			chart.unsubscribeCrosshairMove(update_func)
			//Reenable Scrolling effect if it was set
			chart.applyOptions({ handleScroll: { pressedMouseMove: pressedMoveReEnable } })
		})
	}

	onClick(param: MouseEventParams<Time>) {
		switch (param.hoveredObjectId) {
			case 'line_p1':
				console.log('clicked p1')
				break;
			case 'line_p2':
				console.log('clicked p2')
				break;
			case 'line':
				console.log('clicked line')
				break;
		}
	}
	//#endregion
}


/* --------------------- Primitive Render Classes ----------------------- */


class TrendLinePaneView implements ISeriesPrimitivePaneView {
	_p1: Point | null = null
	_p2: Point | null = null
	_source: TrendLine;
	_hovered: boolean = false
	_selected: boolean = false
	_renderer: TrendLinePaneRenderer

	line: Path2D | null = null
	ctx: CanvasRenderingContext2D | null = null

	constructor(source: TrendLine) {
		this._source = source;
		//Bind function so it can be tossed around.
		this._renderer = new TrendLinePaneRenderer(
			this._source._options,
			this.passback.bind(this)
		)
	}

	update() {
		if (this._source._p1 === null || this._source._p2 === null) return

		const series = this._source.series;
		const timeScale = this._source.chart.timeScale();
		let y1 = series.priceToCoordinate(this._source._p1.value);
		let y2 = series.priceToCoordinate(this._source._p2.value);
		let x1 = timeScale.timeToCoordinate(this._source._p1.time);
		let x2 = timeScale.timeToCoordinate(this._source._p2.time);

		//TODO: Fix this, if a line transitions from in whitespace to over a series, the line disappears 
		if (x1 === null || x2 === null || y1 === null || y2 === null) {
			this._p1 = null
			this._p2 = null
			return
		}

		this._p1 = { x: Math.round(x1) as Coordinate, y: Math.round(y1) as Coordinate }
		this._p2 = { x: Math.round(x2) as Coordinate, y: Math.round(y2) as Coordinate }
	}

	//This is only called about 1/4 the amount that update() is
	renderer() {
		this._renderer._update(this._p1, this._p2, this._hovered, this._selected)
		return this._renderer
	}

	//Passback of relevent objects to make hitdetection a LOT easier
	passback(ctx: CanvasRenderingContext2D, line: Path2D | null) {
		this.ctx = ctx; this.line = line;
	}

	/**
	 * Implementation of a Hit test when you have access to the Canvas Target...
	 * This function gets invoked a LOT. Need to make sure it's efficient.
	 */
	hitTest(x: number, y: number): PrimitiveHoveredItem | null {
		if (this.line === null || this.ctx === null) return null
		if (this._p1 === null || this._p2 === null) return null

		this._hovered = false //Assume it isn't. Will correct if not.
		if (!( //Course X range Check
			x + 10 > this._p1.x && x - 10 < this._p2.x ||
			x - 10 < this._p1.x && x + 10 > this._p2.x
		)) return null
		if (!( //Course Y range Check
			y + 10 > this._p1.y && y - 10 < this._p2.y ||
			y - 10 < this._p1.y && y + 10 > this._p2.y
		)) return null


		//Only check to a square around the point since it's much faster
		if (Math.abs(this._p1.x - x) < 10 && Math.abs(this._p1.y - y) < 10) {
			this._hovered = true
			return {
				cursorStyle: 'grab',
				externalId: "line_p1",
				zOrder: 'normal'
			}
		}
		if (Math.abs(this._p2.x - x) < 10 && Math.abs(this._p2.y - y) < 10) {
			this._hovered = true
			return {
				cursorStyle: 'grab',
				externalId: "line_p2",
				zOrder: 'normal'
			}
		}
		//Set min width so it's easier to hover on small lines
		this.ctx.lineWidth = Math.max(this._source._options.width, 6)
		if (this.ctx.isPointInStroke(this.line, x, y)) {
			this._hovered = true
			return {
				cursorStyle: 'grab',
				externalId: "line",
				zOrder: 'normal'
			}
		}
		return null
	}
}

class TrendLinePaneRenderer implements ISeriesPrimitivePaneRenderer {
	_p1: Point | null = null
	_p2: Point | null = null
	_hovered: boolean = false
	_selected: boolean = false
	_options: TrendLineOptions
	_passback: CallableFunction

	constructor(options: TrendLineOptions, passback: CallableFunction) {
		this._options = options
		this._passback = passback
	}

	draw(target: CanvasRenderingTarget2D) {
		target.useMediaCoordinateSpace(scope => {
			const ctx = scope.context;
			if (this._p1 === null || this._p2 === null) {
				this._passback(ctx, null)
			} else {
				let line = new Path2D()
				line.moveTo(this._p1.x, this._p1.y)
				line.lineTo(this._p2.x, this._p2.y)
				ctx.lineWidth = this._options.width
				ctx.strokeStyle = this._options.lineColor
				ctx.stroke(line)

				if (this._hovered || this._selected) {
					draw_dot(ctx, this._p1, this._selected)
					draw_dot(ctx, this._p2, this._selected)
				}
				this._passback(ctx, line) //Passback reference for hitTest()
			}
		});
	}

	_update(p1: Point | null, p2: Point | null, hovered: boolean, selected: boolean) {
		this._p1 = p1
		this._p2 = p2
		this._hovered = hovered
		this._selected = selected
	}
}




// update_func = (e: MouseEvent) => {
// 	let dx = e.clientX - x
// 	let dy = e.clientY - y

// 	if (!this._p1 || !this._p2) return
// 	let c1x = timescale.timeToCoordinate(this._p1.time)
// 	let c1y = series.priceToCoordinate(this._p1.value)
// 	let c2x = timescale.timeToCoordinate(this._p2.time)
// 	let c2y = series.priceToCoordinate(this._p2.value)

// 	if (!c1x || !c1y || !c2x || !c2y) return
// 	let p1x = timescale.coordinateToTime(c1x + dx)
// 	let p1y = series.coordinateToPrice(c1y + dy)
// 	let p2x = timescale.coordinateToTime(c2x + dx)
// 	let p2y = series.coordinateToPrice(c2y + dy)

// 	if (!p1x || !p1y || !p2x || !p2y) return
// 	this._updateData({ time: p1x, value: p1y }, { time: p2x, value: p2y })
// 	x = e.clientX
// 	y = e.clientY
// }
// update_func = update_func.bind(