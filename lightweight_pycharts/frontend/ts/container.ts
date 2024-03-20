//@ts-ignore
import * as lwc from "../js/pkg.mjs";
import { CandlestickSeries, Color, ColorType, DeepPartial as DP, IChartApi, LayoutOptions, TimeChartOptions } from "./pkg.js";

/** Overall Structure:
 * Wrapper (Container (Frame[s] (Pane[s] (lwc.chart))))
 * The Wrapper contains the left side toolbar, right tool bar, tabs, etc.
 * 
 * The Wrapper can have multiple containers, one for each tab, though only one can be displayed at a time
 * 
 * Containers are the center body of the application, They can contain multiple Frames and handle chart syncing.
 * A container with multiple frames is a multi-layout chart. Because of this, the container handles the size of each frame
 *  
 * Frames contain the data of a chart and the charts themselves. Although Frames will have a single symbol, they can have multiple charts
 * The multiple charts allow for multiple panes. For example, a chart in the primary pane with an SMA overlay indicator and a
 * second frame at the bottom with an RSI Oscillator on a seprate axis.
 */

// ---------------- Base Layout Dimensions ---------------- //
const LAYOUT_MARGIN = 5
const LAYOUT_CHART_MARGIN = 2
const LAYOUT_DIM_TOP = {
    WIDTH: `100vw`,
    HEIGHT: 38,
    LEFT: 0,
    TOP: 0
}
const LAYOUT_DIM_LEFT = {
    WIDTH: 52,
    HEIGHT: -1, //Dynamically set
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    LEFT: 0
}
const LAYOUT_DIM_RIGHT = {
    WIDTH: 52,
    HEIGHT: -1, //Dynamically set
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    RIGHT: 0
}
const LAYOUT_DIM_BOTTOM = {
    WIDTH: -1, //Dynamically set
    HEIGHT: 38,
    BOTTOM: 0,
    LEFT: LAYOUT_DIM_LEFT.WIDTH + LAYOUT_MARGIN
}
const LAYOUT_DIM_CENTER = {
    WIDTH: -1, //Dynamically set
    HEIGHT: -1, //Dynamically set 
    TOP: LAYOUT_DIM_TOP.HEIGHT + LAYOUT_MARGIN,
    LEFT: LAYOUT_DIM_LEFT.WIDTH + LAYOUT_MARGIN
}

/**
 * Enum that corresponds to the different static divs of the window wrapper
 */
enum Wrapper_Divs {
    TOP_BAR = 'div_top',
    DRAWINGS = 'div_left',
    NAV_BAR = 'div_right',
    UTIL_BAR = 'div_bottom',
    CHART = 'div_center'
}

enum Orientation {
    Horizontal,
    Vertical,
    null
}

enum Container_Layouts {
    SINGLE,
    DOUBLE_VERT,
    DOUBLE_HORIZ,
    // TRIPLE_VERT,
    // TRIPLE_VERT_TOP,
    // TRIPLE_VERT_BOT,
    // TRIPLE_HORIZ,
    // TRIPLE_HORIZ_LEFT,
    // TRIPLE_HORIZ_RIGHT,
    // QUAD
}

interface flex_div {
    div: HTMLDivElement,
    isFrame: boolean,
    flex_width: number,
    flex_height: number,
    orientation: Orientation
}


/**
 * Wrapper Class.
 * Contains all the objects and elements required for a full tradestation
 * 
 * @member containers An Array of container objects. Analogous to tabs of a window.
 */
export class Wrapper {
    container: Container
    // containers: Container[] = []

    div: HTMLDivElement
    div_top: HTMLDivElement
    div_left: HTMLDivElement
    div_right: HTMLDivElement
    div_bottom: HTMLDivElement
    div_center: HTMLDivElement

    constructor() {
        //Create Main container
        this.div = document.createElement('div')
        this.div.id = 'layout_wrapper'
        this.div.classList.add('wrapper')
        document.body.appendChild(this.div)

        //Create & Size Top Bar
        this.div_top = document.createElement('div')
        this.div_top.id = 'layout_top'
        this.div_top.classList.add('layout_main')
        this.div_top.style.height = `${LAYOUT_DIM_TOP.HEIGHT}px`
        this.div_top.style.width = LAYOUT_DIM_TOP.WIDTH //special case
        this.div_top.style.left = `${LAYOUT_DIM_TOP.LEFT}px`
        this.div_top.style.top = `${LAYOUT_DIM_TOP.TOP}px`
        this.div.appendChild(this.div_top)

        //Create & Size Left Bar
        this.div_left = document.createElement('div')
        this.div_left.id = 'layout_left'
        this.div_left.classList.add('layout_main')
        this.div_left.style.height = `${LAYOUT_DIM_LEFT.HEIGHT}px`
        this.div_left.style.width = `${LAYOUT_DIM_LEFT.WIDTH}px`
        this.div_left.style.left = `${LAYOUT_DIM_LEFT.LEFT}px`
        this.div_left.style.top = `${LAYOUT_DIM_LEFT.TOP}px`
        this.div.appendChild(this.div_left)

        //Create & Size Right Bar
        this.div_right = document.createElement('div')
        this.div_right.id = 'layout_right'
        this.div_right.classList.add('layout_main')
        this.div_right.style.height = `${LAYOUT_DIM_RIGHT.HEIGHT}px`
        this.div_right.style.width = `${LAYOUT_DIM_RIGHT.WIDTH}px`
        this.div_right.style.right = `${LAYOUT_DIM_RIGHT.RIGHT}px`
        this.div_right.style.top = `${LAYOUT_DIM_RIGHT.TOP}px`
        this.div.appendChild(this.div_right)

        //Create & Size Bottom Bar
        this.div_bottom = document.createElement('div')
        this.div_bottom.id = 'layout_bottom'
        this.div_bottom.classList.add('layout_main')
        this.div_bottom.style.height = `${LAYOUT_DIM_BOTTOM.HEIGHT}px`
        this.div_bottom.style.width = `${LAYOUT_DIM_BOTTOM.WIDTH}px`
        this.div_bottom.style.left = `${LAYOUT_DIM_BOTTOM.LEFT}px`
        this.div_bottom.style.bottom = `${LAYOUT_DIM_BOTTOM.BOTTOM}px`
        this.div.appendChild(this.div_bottom)

        //Create & Size center container
        this.div_center = document.createElement('div')
        this.div_center.id = 'layout_center'
        this.div_center.classList.add('layout_main')
        this.div_center.style.height = `${LAYOUT_DIM_CENTER.HEIGHT}px`
        this.div_center.style.width = `${LAYOUT_DIM_CENTER.WIDTH}px`
        this.div_center.style.left = `${LAYOUT_DIM_CENTER.LEFT}px`
        this.div_center.style.top = `${LAYOUT_DIM_CENTER.TOP}px`
        this.div.appendChild(this.div_center)

        //Bind Funcitons to ensure expected 'this' functionality
        this.resize = this.resize.bind(this)
        this.get_div = this.get_div.bind(this)
        this.add_container = this.add_container.bind(this)


        //Initilize Window regions and perform initial resize
        this.container = new Container(this)    //Temporary until add_container() is written
        window.active_container = this.container
        this.resize()

        //Setup resize listener
        window.addEventListener('resize', this.resize)
    }

    resize() {
        let width = window.innerWidth
        let height = window.innerHeight

        this.div.style.width = `${width}px`
        this.div.style.height = `${height}px`

        //Top Bar automatically resizes, no adjustment needed
        this.div_left.style.height = `${height - LAYOUT_DIM_LEFT.TOP}px`
        this.div_right.style.height = `${height - LAYOUT_DIM_RIGHT.TOP}px`
        this.div_bottom.style.width = `${width - LAYOUT_DIM_LEFT.WIDTH - LAYOUT_DIM_RIGHT.WIDTH - 2 * LAYOUT_MARGIN}px`
        this.div_center.style.width = `${width - LAYOUT_DIM_LEFT.WIDTH - LAYOUT_DIM_RIGHT.WIDTH - 2 * LAYOUT_MARGIN}px`
        this.div_center.style.height = `${height - LAYOUT_DIM_CENTER.TOP - LAYOUT_DIM_BOTTOM.HEIGHT - LAYOUT_MARGIN}px`

        //Resize Active Charting window (Ensures proper resize execution)
        window.active_container.resize()
    }

    get_div(div_loc: Wrapper_Divs): HTMLDivElement {
        switch (div_loc) {
            case (Wrapper_Divs.CHART): return this.div_center
            case (Wrapper_Divs.DRAWINGS): return this.div_left
            case (Wrapper_Divs.NAV_BAR): return this.div_right
            case (Wrapper_Divs.TOP_BAR): return this.div_top
            case (Wrapper_Divs.UTIL_BAR): return this.div_bottom
            default: return this.div
        }
    }

    /**
     * Generate a new container and makes it the window's active container 
     */
    add_container() { }
}


/**
 * Main Object that holds charts and data
 * 
 * @member frame_counter The number of frames that have been made. Used as an id system
 * 
 * @member flex_divs An array of Flex_Divs. Stores all Frame and Separator Divs
 */
export class Container {
    div: HTMLDivElement
    frames: Frame[] = []
    flex_divs: flex_div[] = []

    constructor(parent_wrapper: Wrapper) {
        this.div = parent_wrapper.get_div(Wrapper_Divs.CHART)
        this.div.style.flexWrap = `wrap`    //Flex-Wrap used to position layouts

        //Bind Funcitons to ensure expected 'this' functionality
        this.set_layout = this.set_layout.bind(this)
        this._add_frame = this._add_frame.bind(this)
        this._add_flex_frame = this._add_flex_frame.bind(this)
        this._add_flex_separator = this._add_flex_separator.bind(this)

        //Set default Layout
        this.set_layout(Container_Layouts.DOUBLE_VERT)
    }

    /**
     * Resize all the child Elements based on the size of the container's Div. 
     */
    resize() {
        let this_width = this.div.clientWidth
        let this_height = this.div.clientHeight

        //Resize Frame & Serparator Divs
        this.flex_divs.forEach((flex_item) => {
            if (flex_item.isFrame) {
                //Margin is subtracted from width to ensure size row wrap functions correctly
                flex_item.div.style.width = `${this_width * flex_item.flex_width - LAYOUT_CHART_MARGIN}px`
                flex_item.div.style.height = `${this_height * flex_item.flex_height}px`
            } else if (flex_item.orientation === Orientation.Vertical) {
                //vertical Separators have fixed width
                flex_item.div.style.width = `${LAYOUT_CHART_MARGIN}px`
                flex_item.div.style.height = `${this_height * flex_item.flex_height}px`
            } else if (flex_item.orientation === Orientation.Horizontal) {
                //Horizontal Separators have fixed height
                flex_item.div.style.width = `${this_width * flex_item.flex_width}px`
                flex_item.div.style.height = `${LAYOUT_CHART_MARGIN}px`
            }
        })

        //Resize all contents of each Frame
        this.frames.forEach((frame) => {
            frame.resize()
        });
    }

    /** 
     * Create and condifure all the necessary frames & separators for a given layout.
     */
    set_layout(layout: Container_Layouts = Container_Layouts.SINGLE) {
        // ------------ Clear Previous Layout ------------
        this.flex_divs.forEach((item) => {
            //Remove all the divs from the document
            this.div.removeChild(item.div)
        })
        //erase all original flex_divs
        this.flex_divs.length = 0

        // ------------ Create Layout ------------
        switch (layout) {
            case Container_Layouts.DOUBLE_VERT: {
                this._add_flex_frame(0.5, 1)
                this._add_flex_separator(Orientation.Vertical, 1)
                this._add_flex_frame(0.5, 1)
            } break;
            case Container_Layouts.DOUBLE_HORIZ: {
                this._add_flex_frame(1, 0.5)
                this._add_flex_separator(Orientation.Horizontal, 1)
                this._add_flex_frame(1, 0.5)
            } break;
            default:
                //Default Case is a single chart.
                this._add_flex_frame(1, 1)
        }

        // ------------ Append Children ------------
        this.flex_divs.forEach((flex_item, index) => {
            if (flex_item.isFrame) {
                if (index < this.frames.length) {
                    //Frames are persistent through layout changes.
                    //Update Existing Frames to new shape before creating new ones.
                    this.frames[index].div = flex_item.div
                    this.frames[index].flex_width = flex_item.flex_width
                    this.frames[index].flex_height = flex_item.flex_height
                } else {
                    this._add_frame(flex_item)
                }
            }
            this.div.appendChild(flex_item.div)
        })
    }

    _add_flex_frame(flex_width: number, flex_height: number) {
        let child_div = document.createElement('div')
        child_div.classList.add('chart_frame')
        this.flex_divs.push({
            div: child_div,
            isFrame: true,
            flex_width: flex_width,
            flex_height: flex_height,
            orientation: Orientation.null
        })
    }

    _add_flex_separator(type: Orientation, size: number) {
        let child_div = document.createElement('div')
        child_div.classList.add('separator')

        this.flex_divs.push({
            div: child_div,
            isFrame: false,
            flex_height: (type === Orientation.Vertical ? size : 0),
            flex_width: (type === Orientation.Horizontal ? size : 0),
            orientation: type
        })
    }

    _add_frame(specs: flex_div) {
        if (specs.isFrame) {
            this.frames.push(new Frame(specs.div, specs.flex_width, specs.flex_height))
        }
    }

    sync_charts() {

    }

    hide() {
        this.div.style.display = 'none'
    }

    show() {
        this.div.style.display = 'flex'
    }
}

/**
 * @member Div: Div That Contains Pane's and pane seprators. Can be Null since 
 */
export class Frame {
    //The class that contains all the data to be displayed
    div: HTMLDivElement
    is_active: boolean = true
    flex_width: number
    flex_height: number

    // symbol: string
    // data: number[]?

    private panes: Pane[] = []

    constructor(div: HTMLDivElement, flex_width: number = 1, flex_height: number = 1) {
        this.div = div
        this.flex_width = flex_width
        this.flex_height = flex_height

        //Bind Functions
        this.add_pane = this.add_pane.bind(this)

        //Add First Pane
        this.add_pane()
    }

    reassign_div(div: HTMLDivElement) {
        this.div = div
    }

    add_pane() {
        if (this.div) {
            let child_div = document.createElement('div')
            this.div.appendChild(child_div)
            this.panes.push(new Pane(child_div))
        }
    }

    resize() {
        let this_width = this.div.clientWidth
        let this_height = this.div.clientHeight

        this.panes.forEach(pane => {
            pane.resize(this_width, this_height)
        });

    }
}

export class Pane {
    div: HTMLDivElement
    flex_width: number
    flex_height: number

    private chart: IChartApi

    //The portion of a chart where things are actually drawn
    constructor(div: HTMLDivElement, flex_width: number = 1, flex_height: number = 1) {
        this.div = div
        this.flex_width = flex_width
        this.flex_height = flex_height


        let layoutopts: DP<LayoutOptions> = {
            textColor: 'white',
            background: {
                type: ColorType.Solid,
                color: Color.black
            }
        }

        let chartOpts: DP<TimeChartOptions> = {
            height: this.div.clientHeight,
            layout: layoutopts,
            rightPriceScale: { visible: true }
        };


        this.chart = lwc.createChart(this.div, chartOpts);

        const candles_series: CandlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
            wickUpColor: '#26a69a', wickDownColor: '#ef5350',
        });

        candles_series.setData([
            { time: '2018-12-22', open: 75.16, high: 82.84, low: 36.16, close: 45.72 },
            { time: '2018-12-23', open: 45.12, high: 53.90, low: 45.12, close: 48.09 },
            { time: '2018-12-24', open: 60.71, high: 60.71, low: 53.39, close: 59.29 },
            { time: '2018-12-25', open: 68.26, high: 68.26, low: 59.04, close: 60.50 },
            { time: '2018-12-26', open: 67.71, high: 105.85, low: 66.67, close: 91.04 },
            { time: '2018-12-27', open: 91.04, high: 121.40, low: 82.70, close: 111.40 },
            { time: '2018-12-28', open: 111.51, high: 142.83, low: 103.34, close: 131.25 },
            { time: '2018-12-29', open: 131.33, high: 151.17, low: 77.68, close: 96.43 },
            { time: '2018-12-30', open: 106.33, high: 110.20, low: 90.39, close: 98.10 },
            { time: '2018-12-31', open: 109.87, high: 114.69, low: 85.66, close: 111.26 },
        ]);

        this.chart.timeScale().fitContent();
    }

    resize(width: number, height: number) {
        let this_width = width * this.flex_width
        let this_height = height * this.flex_height

        this.div.style.width = `${this_width}px`
        this.div.style.height = `${this_height}px`
        this.chart.resize(this_width, this_height)
    }
}