//@ts-ignore
import * as lwc from "../js/pkg.mjs";
import { CandlestickSeriesOptions, DeepPartial as DP, IChartApi, Series, SeriesData, TimeChartOptions } from "./pkg.js";
import * as u from "./util.js";
import { Container_Layouts, Orientation, Wrapper_Divs, flex_div } from "./util.js";

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
        this.div_top.style.height = `${u.LAYOUT_DIM_TOP.HEIGHT}px`
        this.div_top.style.width = u.LAYOUT_DIM_TOP.WIDTH //Const is already string
        this.div_top.style.left = `${u.LAYOUT_DIM_TOP.LEFT}px`
        this.div_top.style.top = `${u.LAYOUT_DIM_TOP.TOP}px`
        this.div_top.style.display = 'flex'
        //Display must be set in JS to be used to control visibility
        this.div.appendChild(this.div_top)

        //Create & Size Left Bar
        this.div_left = document.createElement('div')
        this.div_left.id = 'layout_left'
        this.div_left.classList.add('layout_main')
        this.div_left.style.height = `${u.LAYOUT_DIM_LEFT.HEIGHT}px`
        this.div_left.style.width = `${u.LAYOUT_DIM_LEFT.WIDTH}px`
        this.div_left.style.left = `${u.LAYOUT_DIM_LEFT.LEFT}px`
        this.div_left.style.top = `${u.LAYOUT_DIM_LEFT.TOP}px`
        this.div_left.style.display = 'flex'
        this.div.appendChild(this.div_left)

        //Create & Size Right Bar
        this.div_right = document.createElement('div')
        this.div_right.id = 'layout_right'
        this.div_right.classList.add('layout_main')
        this.div_right.style.height = `${u.LAYOUT_DIM_RIGHT.HEIGHT}px`
        this.div_right.style.width = `${u.LAYOUT_DIM_RIGHT.WIDTH}px`
        this.div_right.style.right = `${u.LAYOUT_DIM_RIGHT.RIGHT}px`
        this.div_right.style.top = `${u.LAYOUT_DIM_RIGHT.TOP}px`
        this.div_right.style.display = 'flex'
        this.div.appendChild(this.div_right)

        //Create & Size Bottom Bar
        this.div_bottom = document.createElement('div')
        this.div_bottom.id = 'layout_bottom'
        this.div_bottom.classList.add('layout_main')
        this.div_bottom.style.height = `${u.LAYOUT_DIM_BOTTOM.HEIGHT}px`
        this.div_bottom.style.width = `${u.LAYOUT_DIM_BOTTOM.WIDTH}px`
        this.div_bottom.style.left = `${u.LAYOUT_DIM_BOTTOM.LEFT}px`
        this.div_bottom.style.bottom = `${u.LAYOUT_DIM_BOTTOM.BOTTOM}px`
        this.div_bottom.style.display = 'flex'
        this.div.appendChild(this.div_bottom)

        //Create & Size center container
        this.div_center = document.createElement('div')
        this.div_center.id = 'layout_center'
        this.div_center.classList.add('layout_main')
        this.div_center.style.height = `${u.LAYOUT_DIM_CENTER.HEIGHT}px`
        this.div_center.style.width = `${u.LAYOUT_DIM_CENTER.WIDTH}px`
        this.div_center.style.left = `${u.LAYOUT_DIM_CENTER.LEFT}px`
        this.div_center.style.top = `${u.LAYOUT_DIM_CENTER.TOP}px`
        this.div_center.style.display = 'flex'
        this.div.appendChild(this.div_center)

        //Bind Funcitons to ensure expected 'this' functionality
        this.resize = this.resize.bind(this)
        this.get_div = this.get_div.bind(this)
        this.show_section = this.show_section.bind(this)
        this.hide_section = this.hide_section.bind(this)
        this.add_container = this.add_container.bind(this)

        //Initilize Window regions and perform initial resize
        this.container = new Container(this)    //Temporary until add_container() is written
        window.active_container = this.container
        this.resize()

        //Setup resize listener
        window.addEventListener('resize', this.resize)
    }

    /**
     * Resize the Wrapper and its visible contents 
     */
    resize() {
        let width = window.innerWidth
        let height = window.innerHeight

        this.div.style.width = `${width}px`
        this.div.style.height = `${height}px`

        let side_bar_height = height
        let center_height = height
        let center_width = width

        if (this.div_top.style.display === 'flex') { //Top Visible? 
            side_bar_height -= (u.LAYOUT_DIM_TOP.HEIGHT + u.LAYOUT_MARGIN)
            center_height -= (u.LAYOUT_DIM_TOP.HEIGHT + u.LAYOUT_MARGIN)
        }
        if (this.div_left.style.display === 'flex') { //Left Visible?
            center_width -= (u.LAYOUT_DIM_LEFT.WIDTH + u.LAYOUT_MARGIN)
        }
        if (this.div_right.style.display === 'flex') { //Right Visible?
            center_width -= (u.LAYOUT_DIM_RIGHT.WIDTH + u.LAYOUT_MARGIN)
        }
        if (this.div_bottom.style.display === 'flex') { //Bottom Visible?
            center_height -= (u.LAYOUT_DIM_BOTTOM.HEIGHT + u.LAYOUT_MARGIN)
        }

        //Top Bar automatically resizes, no adjustment needed
        this.div_left.style.height = `${side_bar_height}px`
        this.div_right.style.height = `${side_bar_height}px`
        this.div_center.style.height = `${center_height}px`
        this.div_center.style.width = `${center_width}px`
        this.div_bottom.style.width = `${center_width}px`

        //Resize Active Charting window (Ensures proper resize execution)
        window.active_container.resize()
    }

    /**
     * Get the HTML Div Object of the given Section of the chart
     * @param Section Wrapper_Div Enum
     * @returns Reference to the given HTML Div
     */
    get_div(section: Wrapper_Divs): HTMLDivElement {
        switch (section) {
            case (Wrapper_Divs.CHART): return this.div_center
            case (Wrapper_Divs.DRAW_TOOLS): return this.div_left
            case (Wrapper_Divs.NAV_BAR): return this.div_right
            case (Wrapper_Divs.TOP_BAR): return this.div_top
            case (Wrapper_Divs.UTIL_BAR): return this.div_bottom
            default: return this.div
        }
    }

    /**
     * Show a section of Wrapper's window. 
     * 
     * @param div_loc The portion of the wrapper, excluding the chart, to show.
     */
    show_section(div_loc: Wrapper_Divs) {
        switch (div_loc) {
            case (Wrapper_Divs.DRAW_TOOLS):
                this.div_left.style.display = 'flex'
                this.div_center.style.left = `${u.LAYOUT_DIM_CENTER.LEFT}px`
                this.div_bottom.style.left = `${u.LAYOUT_DIM_BOTTOM.LEFT}px`
                break;
            case (Wrapper_Divs.NAV_BAR):
                this.div_right.style.display = 'flex'
                break;
            case (Wrapper_Divs.TOP_BAR):
                this.div_top.style.display = 'flex'
                this.div_left.style.top = `${u.LAYOUT_DIM_LEFT.TOP}px`
                this.div_right.style.top = `${u.LAYOUT_DIM_RIGHT.TOP}px`
                this.div_center.style.top = `${u.LAYOUT_DIM_CENTER.TOP}px`
                break;
            case (Wrapper_Divs.UTIL_BAR):
                this.div_bottom.style.display = 'flex'
            //Chart Hide and Show Handled by Container.
        }
        this.resize()
    }

    /**
     * Hide a section of Wrapper's window. 
     * 
     * @param div_loc The portion of the wrapper, excluding the chart, to hide.
     */
    hide_section(section: Wrapper_Divs) {
        switch (section) {
            case (Wrapper_Divs.DRAW_TOOLS):
                this.div_left.style.display = 'none'
                this.div_center.style.left = '0px'
                this.div_bottom.style.left = '0px'
                break;
            case (Wrapper_Divs.NAV_BAR):
                this.div_right.style.display = 'none'
                break;
            case (Wrapper_Divs.TOP_BAR):
                this.div_top.style.display = 'none'
                this.div_left.style.top = '0px'
                this.div_right.style.top = '0px'
                this.div_center.style.top = '0px'
                break;
            case (Wrapper_Divs.UTIL_BAR):
                this.div_bottom.style.display = 'none'
            //Chart Hide and Show Handled by Container.
        }
        this.resize()
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
                flex_item.div.style.width = `${this_width * flex_item.flex_width - u.LAYOUT_CHART_MARGIN}px`
                flex_item.div.style.height = `${this_height * flex_item.flex_height}px`
            } else if (flex_item.orientation === Orientation.Vertical) {
                //vertical Separators have fixed width
                flex_item.div.style.width = `${u.LAYOUT_CHART_MARGIN}px`
                flex_item.div.style.height = `${this_height * flex_item.flex_height}px`
            } else if (flex_item.orientation === Orientation.Horizontal) {
                //Horizontal Separators have fixed height
                flex_item.div.style.width = `${this_width * flex_item.flex_width}px`
                flex_item.div.style.height = `${u.LAYOUT_CHART_MARGIN}px`
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

        // ------------ Assign and Append Children ------------
        this.flex_divs.forEach((flex_item, index) => {
            if (flex_item.isFrame) {
                if (index < this.frames.length) {
                    //Frames are persistent through layout changes.
                    //Update Existing Frames to new layout before creating new ones.
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

    /**
     * Creates a Flex Div for a Chart Frame
     */
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

    /**
     * Creates a Flex Div for use as a separator between elements
     */
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

    /**
     * Creates a new Frame that's tied to the given DIV element in specs
     */
    _add_frame(specs: flex_div) {
        if (specs.isFrame) {
            this.frames.push(new Frame(specs.div, specs.flex_width, specs.flex_height))
        }
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
    id: string = ''
    div: HTMLDivElement
    is_active: boolean = true
    flex_width: number
    flex_height: number

    // symbol: string   ???
    // data: number[]   ???

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
        let child_div = document.createElement('div')
        this.div.appendChild(child_div)
        this.panes.push(new Pane(child_div))
    }

    /**
     * Resize All Children Panes
     */
    resize() {
        let this_width = this.div.clientWidth
        let this_height = this.div.clientHeight

        this.panes.forEach(pane => {
            pane.resize(this_width, this_height)
        });

    }
}

//The portion of a chart where things are actually drawn
export class Pane {
    id: string = ''
    div: HTMLDivElement
    flex_width: number
    flex_height: number

    private chart: IChartApi
    private series: Series[] = []

    constructor(
        div: HTMLDivElement,
        flex_width: number = 1,
        flex_height: number = 1,
        chart_opts: DP<TimeChartOptions> = u.DEFAULT_PYCHART_OPTS
    ) {
        this.div = div
        this.flex_width = flex_width
        this.flex_height = flex_height

        //Only One Chart per pane, so this is the only definition needed
        this.chart = lwc.createChart(this.div, chart_opts);

        //Bind Funcitons to ensure expected 'this' functionality
        this.resize = this.resize.bind(this)
        this.set_data = this.set_data.bind(this)
        this.add_candlestick_series = this.add_candlestick_series.bind(this)
        // this. = this..bind(this)


        let data = [
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
        ]

        this.add_candlestick_series()
        this.set_data(this.series[0], data)
    }

    /**
     * Sets The Data of a Series to the data list given.
     * @param series The Data Series to be updated. Can be any of the base SeriesAPI types 
     * @param data List of Data, The type of **\*the first data point\*** should match the series type. There is some type checking, but not extensive
     * 
     * This function will ensure the data type matches the given series only up to OHLC vs Single Value. Beyond that it will not catch a mis-match of data type.
     * 
     * i.e. if the first data point is of generic Single Value, but the second data point is Baseline Data then the function will blindly
     * set the given Baseline Data to an Area, Line, Baseline, or Histogram Series. The Effect is that the specific color params given are ignored.
     * 
     * The only way around this would be to check every data point and that level of extensive type checking isn't necessary since the additional
     * values are just ignored anyway.
     * 
     */
    set_data(series: Series, data: SeriesData[]) {
        if (data.length == 0) {
            //Delete Present Data if none was given.
            series.setData([])
            return
        }
        let data_set: boolean = false

        //Check Against Most Restrictive Data/Series Types
        if (u.isCandlestickData(data[0])) {
            if (series.seriesType() == 'Candlestick') {
                //Data and Series Type match so set the data
                series.setData(data)
                data_set = true
            }
        } else if (u.isBarData(data[0])) {
            if (series.seriesType() == 'Bar') {
                //Data and Series Type match so set the data
                series.setData(data)
                data_set = true
            }
        } else if (u.isLineData(data[0]) || u.isAreaData(data[0])) {
            //Area and Line Data are identical in structure
            if (series.seriesType() == 'Line' || series.seriesType() == 'Area') {
                //Data and Series Type match so set the data
                series.setData(data)
                data_set = true
            }
        } else if (u.isBaselineData(data[0])) {
            if (series.seriesType() == 'Baseline') {
                //Data and Series Type match so set the data
                series.setData(data)
                data_set = true
            }
        } else if (u.isHistogramData(data[0])) {
            if (series.seriesType() == 'Histogram') {
                //Data and Series Type match so set the data
                series.setData(data)
                data_set = true
            }
        }

        //If not already set, Check against more basic data types
        if (!data_set) {
            if (u.isOhlcData(data[0])) {
                if (series.seriesType() == 'Candlestick' || series.seriesType() == 'Bar') {
                    series.setData(data)
                    data_set = true
                }

            } else if (u.isSingleValueData(data[0])) {
                let options = ['Line', 'Area', 'Baseline', 'Histogram']
                if (options.includes(series.seriesType())) {
                    series.setData(data)
                    data_set = true
                }
            }

        }

        if (data_set)
            //Implies that the series given was part of this chart, though that may not actually be the case.
            this.chart.timeScale().fitContent()
        else
            console.warn("Failed to set data on Pane.set_data() function call.")
    }

    add_candlestick_series(options?: DP<CandlestickSeriesOptions>) {
        this.series.push(this.chart.addCandlestickSeries(options))
    }

    /**
     * Resize the Pane given the Pane's flex size
     * @param width Total Frame Width in px
     * @param height Total Frame Height in px
     */
    resize(width: number, height: number) {
        let this_width = width * this.flex_width
        let this_height = height * this.flex_height

        this.div.style.width = `${this_width}px`
        this.div.style.height = `${this_height}px`
        this.chart.resize(this_width, this_height)
    }
}