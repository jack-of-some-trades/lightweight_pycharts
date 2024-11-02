/**
 * Components that generate a <form/> to edit and apply changes to ISeriesAPI options
 */
import { AreaSeriesOptions, BarSeriesOptions, BaselineSeriesOptions, BaselineStyleOptions, CandlestickSeriesOptions, HistogramSeriesOptions, LineSeriesOptions, LineStyle, LineStyleOptions, LineType, PriceLineSource, SeriesOptionsCommon } from "lightweight-charts"
import { createEffect, createSignal, For, Match, on, Show, Signal, Switch } from "solid-js"
import { ColorInput } from "../color_picker"
import { Icon, icons } from "../icons"

import "../../css/charting_frame/series_style_editor.css"
import { RoundedCandleSeriesOptions } from "../../src/charting_frame/series-plugins/rounded-candles-series/rounded-candles-series"
import * as s from "../../src/charting_frame/series-plugins/series-base"

interface series_style_editor_props{
    name: string
    series: s.SeriesBase_T
}

interface series_options_signals{
    priceline: Signal<boolean>,
    baseline: Signal<boolean>,
    markers: Signal<boolean> | undefined,
    crosshair: Signal<boolean> | undefined,
    wick_color: Signal<boolean> | undefined,
    border_color: Signal<boolean> | undefined,
}

/**
 * Entry Point Component that creates a <form/> for a single series and Populates it with
 * the relative settings based on the type of series object it was provided
 */
export function SeriesStyleEditor(props:series_style_editor_props){
    let form = document.createElement('form')
    const [options, setOptions] = createSignal(props.series.options())

    let s_type = props.series.s_type
    const LineType = s_type === s.Series_Type.LINE || s_type === s.Series_Type.AREA || s_type === s.Series_Type.BASELINE
    const CandleType = s_type === s.Series_Type.CANDLESTICK || s_type === s.Series_Type.ROUNDED_CANDLE

    //Boolean Signals to Show / Hide the more Niche Series Settings
    let signals:series_options_signals = {
        priceline: createSignal(false),
        baseline: createSignal(false),
        markers: LineType ? createSignal(false) : undefined,
        crosshair: LineType ? createSignal(false) : undefined,
        wick_color: CandleType ? createSignal(false) : undefined,
        border_color: s_type === s.Series_Type.CANDLESTICK ? createSignal(false) : undefined,
    }

    //Update the Options when the advanced settings toggle to make sure they are up-to-date
    createEffect(on(
        //Next Line pulls out all the valid Accessors from the signals object
        Object.values(signals).map((v) => v ? v[0] : undefined).filter((v) => v !== undefined), 
        () => setOptions(props.series.options())
    ))

    const editor_props = {
        submit: () => form.requestSubmit(),
        signals: signals
    }

    return (
        <form ref={form} class='style_form' onSubmit={onSubmit.bind(undefined, props.series)}>
            <div class='series_style_selector'>
                <TitleBar 
                    name={props.name} 
                    visible={options().visible}
                    submit={editor_props.submit}
                    signals={signals}
                />
                <Switch>
                    <Match when={props.series.s_type===s.Series_Type.LINE}>
                        <LineEditor opts={options() as LineSeriesOptions} {...editor_props}/></Match>
                    <Match when={props.series.s_type===s.Series_Type.AREA}>
                        <AreaEditor opts={options() as AreaSeriesOptions} {...editor_props}/></Match>
                    <Match when={props.series.s_type===s.Series_Type.HISTOGRAM}>
                        <HistogramEditor opts={options() as HistogramSeriesOptions} {...editor_props}/></Match>
                    <Match when={props.series.s_type===s.Series_Type.BASELINE}>
                        <BaseLineEditor opts={options() as BaselineSeriesOptions} {...editor_props}/></Match>
                    <Match when={props.series.s_type===s.Series_Type.BAR}>
                        <BarEditor opts={options() as BarSeriesOptions} {...editor_props}/></Match>
                    <Match when={props.series.s_type===s.Series_Type.CANDLESTICK}>
                        <CandleEditor opts={options() as CandlestickSeriesOptions} {...editor_props}/></Match>
                    <Match when={props.series.s_type===s.Series_Type.ROUNDED_CANDLE}>
                        <RndCandleEditor opts={options() as RoundedCandleSeriesOptions} {...editor_props}/></Match>
                </Switch>
            </div>
        </form>
    )
}

/**
 * Generic Submit function. Each form binds the first argument of this function and invokes on submit.
 * The function packages all of the <input/> Tag values into a partial options object that is applied
 * directly to the ISeriesAPI Options.
 */
function onSubmit(series:s.SeriesBase_T, e:SubmitEvent){
    e.preventDefault(); // Prevent the HTML Reload Request
    if (e.target !== null){
        let nodes = Array.from((e.target as HTMLFormElement).querySelectorAll("input, select"))
        //Filter out all the input tags within the Color Picker. (they're id-less)
        nodes = nodes.filter((node) => node.id !== "") 

        series.applyOptions(Object.fromEntries(
            Array.from(nodes as HTMLInputElement[], (node) => {
                switch(node.getAttribute('type')){
                    case ("checkbox"): return [node.id, node.checked]
                    case (null): return [node.id, parseInt(node.value)] // <select/> tag
                    case ("number"): return [node.id, parseFloat(node.value)]
                    // Special Case: '' for some color options means the setting will inherit from another color setting
                    case ("color_picker"): return [node.id, node.value === '#00000000' ? '' : node.value]
                    default: return [node.id, node.value]
                }
            })
        ))
    }
}


// #region --------------------- Series Editors ----------------------- */

/**
 * Individual Style Components for each type of ISeriesAPI Instance
 */

interface editor_props { 
    submit:()=>void,
    signals:series_options_signals
}

function LineEditor(props:{opts:LineSeriesOptions} & editor_props){
    return <>
        <PlotLine
            keys={['Plot Line: ', 'lineVisible', 'color', 'lineWidth', 'lineStyle', 'lineType']}
            vis={props.opts.lineVisible}
            color={props.opts.color}
            width={props.opts.lineWidth}
            style={props.opts.lineStyle}
            type={props.opts.lineType}
            submit={props.submit}
        />
        <Markers
            show_adv={props.signals.markers?.[0]() ?? false}
            submit={props.submit}
            options={props.opts}
        />
        <Crosshair
            show_adv={props.signals.crosshair?.[0]() ?? false}
            submit={props.submit}
            options={props.opts}
        />
        <SeriesCommon 
            show_baseline={props.signals.baseline?.[0]() ?? false}
            show_price_line={props.signals.priceline?.[0]() ?? false}
            submit={props.submit}
            options={props.opts}
        />
    </>
}


function AreaEditor(props:{opts:AreaSeriesOptions} & editor_props){
    return <>
        <div class="style_selector_row" innerText={'Area Series'}/>
        <PlotLine
            keys={['Line: ', 'lineVisible', 'lineColor', 'lineWidth', 'lineStyle', 'lineType']}
            vis={props.opts.lineVisible}
            color={props.opts.lineColor}
            width={props.opts.lineWidth}
            style={props.opts.lineStyle}
            type={props.opts.lineType}
            submit={props.submit}
        />
        <div class="style_selector_row">
            <label for={'invertFilledArea'} innerText={'Invert: '}/>
            <Checkbox key={'invertFilledArea'} checked={props.opts.invertFilledArea} submit={props.submit}/>
            <label for={'topColor'} innerText={'Top Color: '}/>
            <ColorInputWrapper key={'topColor'} default={props.opts.topColor} submit={props.submit}/>
            <label for={'bottomColor'} innerText={'Bottom Color: '}/>
            <ColorInputWrapper key={'bottomColor'} default={props.opts.bottomColor} submit={props.submit}/>
        </div>
        <Markers
            show_adv={props.signals.markers?.[0]() ?? false}
            submit={props.submit}
            options={props.opts}
        />
        <Crosshair
            show_adv={props.signals.crosshair?.[0]() ?? false}
            submit={props.submit}
            options={props.opts}
        />
        <SeriesCommon 
            show_baseline={props.signals.baseline?.[0]() ?? false}
            show_price_line={props.signals.priceline?.[0]() ?? false}
            submit={props.submit}
            options={props.opts}
        />
    </>
}


function HistogramEditor(props:{opts:HistogramSeriesOptions} & editor_props){
    return <></>
}

function BaseLineEditor(props:{opts:BaselineSeriesOptions} & editor_props){
    return <></>
}

function BarEditor(props:{opts:BarSeriesOptions} & editor_props){
    return <></>
}

function CandleEditor(props:{opts:CandlestickSeriesOptions} & editor_props){
    return <></>
}

function RndCandleEditor(props:{opts:RoundedCandleSeriesOptions} & editor_props){
    return <></>
}

// #endregion

// #region --------------------- Series Style Grouped Components ----------------------- */

function SettingsToggle(props:{signal:Signal<boolean> | undefined, tip:string}) {
    return <Show when={props.signal}>
        <span class="tooltip">
            <span class="tooltiptext" innerText={props.tip}/>
            <input type="checkbox" checked={props.signal?.[0]()} onInput={(e)=>props.signal?.[1](e.target.checked)}/>
        </span>
    </Show>
}

function TitleBar(props:{name:string, visible:boolean, submit:()=>void, signals:series_options_signals}){

    return <div class="style_selector_row">
        <label for={'visible'} innerText={props.name}/>
        <Checkbox key={'visible'} checked={props.visible} submit={props.submit}/>
        <span class="opts-select">
            <SettingsToggle signal={props.signals.baseline} tip='Index-to-100 Baseline'/>
            <SettingsToggle signal={props.signals.border_color} tip='Border Color'/>
            <SettingsToggle signal={props.signals.wick_color} tip='Wick Color'/>
            <SettingsToggle signal={props.signals.crosshair} tip='Crosshair Marker'/>
            <SettingsToggle signal={props.signals.markers} tip='Data Markers'/>
            <SettingsToggle signal={props.signals.priceline} tip='Price Line & Label'/>
            <label innerText={'Adv. Opts:'}/>
        </span>
    </div>
}


function SeriesCommon(props:{show_price_line:boolean, show_baseline:boolean, submit:()=>void, options:SeriesOptionsCommon}){
    return <>
        <PriceLine 
            visible={props.options.priceLineVisible}
            color={props.options.priceLineColor}
            width={props.options.priceLineWidth}
            style={props.options.priceLineStyle}
            source={props.options.priceLineSource}
            show_adv={props.show_price_line}
            submit={props.submit}
        />
        <PriceLabel 
            show_adv={props.show_price_line}
            title={props.options.title} 
            visible={props.options.lastValueVisible} 
            submit={props.submit}
        />
        <Baseline
            visible={props.options.baseLineVisible}
            color={props.options.baseLineColor}
            style={props.options.baseLineStyle}
            width={props.options.baseLineWidth}
            show_adv={props.show_baseline}
            submit={props.submit}
        />
    </>
}


interface plot_line_props{
    keys:string[], vis:boolean, color:string, width:number, style:LineStyle, type:LineType, submit:()=>void
}
function PlotLine(props:plot_line_props){
    return <div class="style_selector_row">
        <label for={props.keys[1]} innerText={props.keys[0]}/>
        <Checkbox key={props.keys[1]} checked={props.vis} submit={props.submit}/>
        <ColorInputWrapper key={props.keys[2]} default={props.color} submit={props.submit}/>
        <LineWidthPicker key={props.keys[3]} default={props.width} submit={props.submit}/>
        <LineTypePicker key={props.keys[5]} default={props.type} submit={props.submit}/>
        <LineStylePicker key={props.keys[4]} default={props.style} submit={props.submit}/>
    </div>
}


function PriceLabel(props:{title:string, visible:boolean, submit:()=>void, show_adv:boolean}){
    return <Show when={props.show_adv}>
        <div class="style_selector_row">
            <label for={'lastValueVisible'} innerText='Price Label:'/>
            <Checkbox key={'lastValueVisible'} checked={props.visible} submit={props.submit}/>
            <input type='text' id={'title'} value={props.title} onInput={props.submit}/>
        </div>
    </Show>
}


interface price_line_props{
    visible:boolean, color:string, width:number, style:LineStyle, source:PriceLineSource, submit:()=>void, show_adv:boolean
}
function PriceLine(props:price_line_props){
    return <Show when={props.show_adv}>
        <div class="style_selector_row">
            <label for={'priceLineVisible'}  innerText='Price Line:'/>
            <Checkbox key={'priceLineVisible'} checked={props.visible} submit={props.submit}/>
            <ColorInputWrapper key={'priceLineColor'} default={props.color} submit={props.submit}/>
            <LineWidthPicker key={'priceLineWidth'} default={props.width} submit={props.submit}/>
            <LineSourcePicker key={'priceLineSource'} default={props.source} submit={props.submit}/>
            <LineStylePicker key={'priceLineStyle'} default={props.style} submit={props.submit}/>
        </div>
    </Show>
}


interface baseline_props{
    visible:boolean, color:string, width:number, style:LineStyle, submit:()=>void, show_adv:boolean
}
function Baseline(props:baseline_props){
    return <Show when={props.show_adv}>
        <div class="style_selector_row">
        <label for={'baseLineVisible'}  innerText='Baseline:'/>
        <Checkbox key={'baseLineVisible'} checked={props.visible} submit={props.submit}/>
        <ColorInputWrapper key={'baseLineColor'} default={props.color} submit={props.submit}/>
        <LineWidthPicker key={'baseLineWidth'} default={props.width} submit={props.submit}/>
        <LineStylePicker key={'baseLineStyle'} default={props.style} submit={props.submit}/>
        </div>
    </Show>
}


function Markers(props:{show_adv:boolean, submit:()=>void, options:LineStyleOptions | BaselineStyleOptions  | AreaSeriesOptions}){
    return <Show when={props.show_adv}>
        <div class="style_selector_row">
            <label for={'pointMarkersVisible'} innerText='Data Markers:'/>
            <Checkbox key={'pointMarkersVisible'} checked={props.options.pointMarkersVisible} submit={props.submit}/>
            <label for={'pointMarkersRadius'} innerText='Radius:'/>
            <LineWidthPicker key={'pointMarkersRadius'} default={props.options.pointMarkersRadius??2.5} submit={props.submit}/>
        </div>
    </Show>
}
function Crosshair(props:{show_adv:boolean, submit:()=>void, options:LineStyleOptions | BaselineStyleOptions  | AreaSeriesOptions}){
    return <Show when={props.show_adv}>
        <div class="style_selector_row">
            <label for={'crosshairMarkerVisible'} innerText='Crosshair Mark:'/>
            <Checkbox key={'crosshairMarkerVisible'} checked={props.options.crosshairMarkerVisible} submit={props.submit}/>
            <label for={'crosshairMarkerRadius'} innerText='Inner:'/>
            <LineWidthPicker key={'crosshairMarkerRadius'} default={props.options.crosshairMarkerRadius} submit={props.submit}/>
            <ColorInputWrapper key={'crosshairMarkerBackgroundColor'} default={props.options.crosshairMarkerBackgroundColor} submit={props.submit}/>
            <label for={'crosshairMarkerBorderWidth'} innerText='Outer:'/>
            <LineWidthPicker key={'crosshairMarkerBorderWidth'} default={props.options.crosshairMarkerBorderWidth} submit={props.submit}/>
            <ColorInputWrapper key={'crosshairMarkerBorderColor'} default={props.options.crosshairMarkerBorderColor} submit={props.submit}/>
        </div>
    </Show>
}

// #endregion

// #region --------------------- Series Style Simple Components ----------------------- */

function Checkbox(props:{key:string, checked:boolean, submit:()=>void}){
    return <input 
        id={props.key} 
        type="checkbox" 
        checked={props.checked}
        onInput={props.submit}
    />
}

function LineWidthPicker(props:{key:string, default:number, submit:()=>void}){
    return <input 
        id={props.key} 
        type="number" 
        value={props.default}
        step={'any'} min={1} max={10}
        onInput={props.submit}
    />
}

function LineStylePicker(props:{key:string, default:LineStyle, submit:()=>void}){
    return <span class="select-span">
        <select id={props.key} value={props.default} onInput={props.submit}>
            <For each={Object.entries(LineStyle)}>{([name, style]) => {
                if ( typeof(style) === "number" )
                    return <option value={style} innerText={name} selected={props.default === style? true : undefined}/>
            }}</For>
        </select>
        <Icon icon={icons.menu_arrow_ns}/>
    </span>
}

function LineTypePicker(props:{key:string, default:LineType, submit:()=>void}){
    return <span class="select-span">
        <select id={props.key} value={props.default} onInput={props.submit}>
            <For each={Object.entries(LineType)}>{([name, style]) => {
                if ( typeof(style) === "number" )
                    return <option value={style} innerText={name} selected={props.default === style? true : undefined}/>
            }}</For>
        </select>
        <Icon icon={icons.menu_arrow_ns}/>
    </span>
}

function LineSourcePicker(props:{key:string, default:PriceLineSource, submit:()=>void}){
    return <span class="select-span">
        <select id={props.key} value={props.default} onInput={props.submit}>
            <For each={Object.entries(PriceLineSource)}>{([name, style]) => {
                if ( typeof(style) === "number" )
                    return <option value={style} innerText={name} selected={props.default === style? true : undefined}/>
            }}</For>
        </select>
        <Icon icon={icons.menu_arrow_ns}/>
    </span>
}


function ColorInputWrapper(props:{key:string, default:string, submit:()=>void}){

    return (
        <ColorInput
            id={props.key}
            input_id={props.key}
            init_color={props.default}
            class="color_input_wrapper"
            onInput={props.submit}
        />
    )
}
// #endregion

// #endregion