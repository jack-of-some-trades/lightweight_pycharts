/**
 * Components that generate a <form/> to edit and apply changes to ISeriesAPI options
 */
import { AreaSeriesOptions, LineStyle, LineStyleOptions, LineType, PriceLineSource, SeriesOptionsCommon } from "lightweight-charts"
import { createEffect, createSignal, For, Match, on, Show, Signal, Switch } from "solid-js"
import { AnySeries, LineSeries, Series_Type } from "../../src/types"
import { ColorInput } from "../color_picker"
import { Icon, icons } from "../icons"

import "../../css/charting_frame/series_style_editor.css"

interface series_style_editor_props{
    name: string
    series: AnySeries
    series_type: Series_Type
}

/**
 * Entry Point Component that creates a <form/> and Populates it with the relative settings
 * based on the type of series object it was provided
 */
export function SeriesStyleEditor(props:series_style_editor_props){
    let form = document.createElement('form')
    const options = props.series.options()
    const submit = () => form.requestSubmit()
    return (
        <form ref={form} class='style_form' onSubmit={onSubmit.bind(undefined, props.series)}>
            <Switch>
                <Match when={props.series_type===Series_Type.LINE}>
                    <LineSeriesEditor series={props.series as LineSeries} name={props.name} submit={submit}/></Match>
                <Match when={props.series_type===Series_Type.AREA}>
                    <AreaSeriesEditor {...(options as any)} name={props.name} submit={submit}/></Match>
            </Switch>
        </form>
    )
}

/**
 * Generic Submit function. Each form binds the first argument and invokes the function on submit.
 * The function packages all of the <input/> Tag values into a partial object that is applied
 * directly to the ISeriesAPI Options.
 */
function onSubmit(series:AnySeries, e:SubmitEvent){
    e.preventDefault();
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
                    //Color Picker can return '' because lightweight-charts treats that as 'no color selected'
                    case ("color_picker"): return [node.id, (node.value.endsWith('00')? '' : node.value)]
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

interface editor_props { submit:()=>void, name:string }

function LineSeriesEditor(props:{series:LineSeries} & editor_props){
    let options = props.series.options()
    const adv_settings = createSignal(false)

    //Update the Options when the advenced settings toggle to make sure they are up-to-date
    createEffect(on(adv_settings[0], () => options = props.series.options()))

    return <div class='series_style_selector'>
        <TitleBar 
            name={props.name} 
            visible={options.visible} 
            submit={props.submit} 
            signal={adv_settings}
        />
        <PlotLine
            keys={['Plot Line: ', 'lineVisible', 'color', 'lineWidth', 'lineStyle', 'lineType']}
            vis={options.lineVisible}
            color={options.color}
            width={options.lineWidth}
            style={options.lineStyle}
            type={options.lineType}
            submit={props.submit}
            show_adv={adv_settings[0]()}
        />
        <SeriesCommon 
            show_adv={adv_settings[0]()}
            submit={props.submit}
            options={options}
        />
        <Markers
            show_adv={adv_settings[0]()}
            submit={props.submit}
            options={options}
        />
    </div>
}


function AreaSeriesEditor(options:AreaSeriesOptions & SeriesOptionsCommon & editor_props){
    return <></>
}

// #endregion

// #region --------------------- Series Style Grouped Components ----------------------- */

function TitleBar(props:{name:string, visible:boolean, submit:()=>void, signal:Signal<boolean>}){
    return <div class="style_selector_row">
        <label for={'visible'} innerText={props.name}/>
        <Checkbox key={'visible'} visible={props.visible} submit={props.submit}/>
        <span>
            <input type="checkbox" checked={props.signal[0]()} onInput={(e)=>props.signal[1](e.target.checked)}/>
            <label innerText={'Adv. Opts:'}/>
        </span>
    </div>
}


function SeriesCommon(props:{show_adv:boolean, submit:()=>void, options:SeriesOptionsCommon}){
    return <>
        <PriceLine 
            visible={props.options.priceLineVisible}
            color={props.options.priceLineColor}
            width={props.options.priceLineWidth} 
            style={props.options.priceLineStyle}
            source={props.options.priceLineSource}
            submit={props.submit}
            show_adv={props.show_adv}
        />
        <PriceLabel 
            title={props.options.title} 
            visible={props.options.lastValueVisible} 
            submit={props.submit}
        />
        <Baseline
            show_adv={props.show_adv}
            visible={props.options.baseLineVisible}
            color={props.options.baseLineColor}
            style={props.options.baseLineStyle}
            width={props.options.baseLineWidth}
            submit={props.submit}
        />
    </>
}


interface plot_line_props{
    keys:string[], vis:boolean, color:string, width:number, style:LineStyle, type:LineType, submit:()=>void, show_adv:boolean
}
function PlotLine(props:plot_line_props){
    return <div class="style_selector_row">
        <label for={props.keys[1]} innerText={props.keys[0]}/>
        <Checkbox key={props.keys[1]} visible={props.vis} submit={props.submit}/>
        <ColorInputWrapper key={props.keys[2]} default={props.color} submit={props.submit}/>
        <LineWidthPicker key={props.keys[3]} default={props.width} submit={props.submit}/>
        <Show when={props.show_adv}>
            <LineTypePicker key={props.keys[5]} default={props.type} submit={props.submit}/>
        </Show>
        <LineStylePicker key={props.keys[4]} default={props.style} submit={props.submit}/>
    </div>
}


function PriceLabel(props:{title:string, visible:boolean, submit:()=>void}){
    return <div class="style_selector_row">
        <label for={'lastValueVisible'} innerText='Price Label:'/>
        <Checkbox key={'lastValueVisible'} visible={props.visible} submit={props.submit}/>
        <input type='text' id={'title'} value={props.title} onInput={props.submit}/>
    </div>
}


interface price_line_props{
    visible:boolean, color:string, width:number, style:LineStyle, source:PriceLineSource, submit:()=>void, show_adv:boolean
}
function PriceLine(props:price_line_props){
    return <div class="style_selector_row">
        <label for={'priceLineVisible'}  innerText='Price Line:'/>
        <Checkbox key={'priceLineVisible'} visible={props.visible} submit={props.submit}/>
        <ColorInputWrapper key={'priceLineColor'} default={props.color} submit={props.submit}/>
        <LineWidthPicker key={'priceLineWidth'} default={props.width} submit={props.submit}/>
        <Show when={props.show_adv}>
            <LineSourcePicker key={'priceLineSource'} default={props.source} submit={props.submit}/>
        </Show>
        <LineStylePicker key={'priceLineStyle'} default={props.style} submit={props.submit}/>
    </div>
}


interface baseline_props{
    visible:boolean, color:string, width:number, style:LineStyle, submit:()=>void, show_adv:boolean
}
function Baseline(props:baseline_props){
    return <Show when={props.show_adv}>
        <div class="style_selector_row">
        <label for={'baseLineVisible'}  innerText='Baseline:'/>
        <Checkbox key={'baseLineVisible'} visible={props.visible} submit={props.submit}/>
        <ColorInputWrapper key={'baseLineColor'} default={props.color} submit={props.submit}/>
        <LineWidthPicker key={'baseLineWidth'} default={props.width} submit={props.submit}/>
        <LineStylePicker key={'baseLineStyle'} default={props.style} submit={props.submit}/>
        </div>
    </Show>
}


function Markers(props:{show_adv:boolean, submit:()=>void, options:LineStyleOptions}){
    return <Show when={props.show_adv}>
        <div class="style_selector_row">
            <label for={'pointMarkersVisible'} innerText='Data pts:'/>
            <Checkbox key={'pointMarkersVisible'} visible={props.options.pointMarkersVisible} submit={props.submit}/>
            <LineWidthPicker key={'pointMarkersRadius'} default={props.options.pointMarkersRadius??2.5} submit={props.submit}/>

            <label for={'crosshairMarkerVisible'} innerText='Crosshair pt:'/>
            <Checkbox key={'crosshairMarkerVisible'} visible={props.options.crosshairMarkerVisible} submit={props.submit}/>
            <LineWidthPicker key={'crosshairMarkerRadius'} default={props.options.crosshairMarkerRadius} submit={props.submit}/>
            <ColorInputWrapper key={'crosshairMarkerBackgroundColor'} default={props.options.crosshairMarkerBackgroundColor} submit={props.submit}/>
            <LineWidthPicker key={'crosshairMarkerBorderWidth'} default={props.options.crosshairMarkerBorderWidth} submit={props.submit}/>
            <ColorInputWrapper key={'crosshairMarkerBorderColor'} default={props.options.crosshairMarkerBorderColor} submit={props.submit}/>
        </div>
    </Show>

}

// #endregion

// #region --------------------- Series Style Simple Components ----------------------- */

function Checkbox(props:{key:string, visible:boolean, submit:()=>void}){
    return <input 
        id={props.key} 
        type="checkbox" 
        checked={props.visible}
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