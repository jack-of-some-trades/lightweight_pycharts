/**
 * Components that generate a <form/> to edit and apply changes to ISeriesAPI options
 */
import { AreaSeriesOptions, LineStyle, LineStyleOptions, SeriesOptionsCommon } from "lightweight-charts"
import { For, Match, Switch } from "solid-js"
import { AnySeries, Series_Type } from "../../src/types"
import { ColorInput } from "../color_picker"
import { Icon, icons } from "../icons"

import "../../css/charting_frame/series_style_editor.css"

interface series_style_picker{
    name: string
    series: AnySeries
    series_type: Series_Type
}

/**
 * Entry Point Component that creates a <form/> and Populates it with the relative settings
 * based on the type of series object it was provided
 */
export function SeriesStylePicker(props:series_style_picker){
    let form = document.createElement('form')
    const options = props.series.options()
    const submit = () => form.requestSubmit()
    return (
        <form ref={form} class='style_form' onSubmit={onSubmit.bind(undefined, props.series)}>
            <Switch>
                <Match when={props.series_type===Series_Type.LINE}>
                    <LineStyleEditor {...(options as any)} name={props.name} onSubmit={submit}/></Match>
                <Match when={props.series_type===Series_Type.AREA}>
                    <AreaStyleEditor {...(options as any)} name={props.name} onSubmit={submit}/></Match>
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
                    case ("number"): return [node.id, parseFloat(node.value)]
                    //Color Picker can return '' because lightweight-charts treats that as 'no color selected'
                    case ("color_picker"): return [node.id, (node.value.endsWith('00')? '' : node.value)]
                    default: return [node.id, node.value]
                }
            })
        ))
    }
}


// #region --------------------- Series Styles ----------------------- */

/**
 * Individual Style Components for each type of ISeriesAPI Instance
 */

interface editor_opts { onSubmit:()=>void, name:string }

function LineStyleEditor(options:LineStyleOptions & SeriesOptionsCommon & editor_opts){
    return <div class='series_style_selector'>
        <div class="style_selector_row">
            <label for={'visible'} innerText={options.name}/>
            <Checkbox key={'visible'} visible={options.visible} submit={options.onSubmit}/>
        </div>
        <div class="style_selector_row">
            <label innerText='Plot Line:'/>
            <Checkbox key={'lineVisible'} visible={options.lineVisible} submit={options.onSubmit}/>
            <ColorInputWrapper key={'color'} default={options.color} submit={options.onSubmit}/>
            <LineWidthPicker key={'lineWidth'} default={options.lineWidth} submit={options.onSubmit}/>
            <LineStylePicker key={'lineStyle'} default={options.lineStyle} submit={options.onSubmit}/>
        </div>
        <PriceLine 
            visible={options.priceLineVisible}
            color={options.priceLineColor}
            width={options.priceLineWidth} 
            style={options.priceLineStyle}
            submit={options.onSubmit}
        />
        <PriceLabel 
            title={options.title} 
            visible={options.lastValueVisible} 
            submit={options.onSubmit}
        />
    </div>
}


function AreaStyleEditor(options:AreaSeriesOptions & SeriesOptionsCommon & editor_opts){
    return <></>
}

// #endregion

// #region --------------------- Series Style Grouped Components ----------------------- */

function PriceLabel(props:{title:string, visible:boolean, submit:()=>void}){
    return <div class="style_selector_row">
        <label innerText='Price Label:'/>
        <Checkbox key={'lastValueVisible'} visible={props.visible} submit={props.submit}/>
        <input type='text' id={'title'} value={props.title} onInput={props.submit}/>
    </div>
}


function PriceLine(props:{visible:boolean, width:number, style:LineStyle, color:string, submit:()=>void}){
    return <div class="style_selector_row">
        <label innerText='Price Line:'/>
        <Checkbox key={'priceLineVisible'} visible={props.visible} submit={props.submit}/>
        <ColorInputWrapper key={'priceLineColor'} default={props.color} submit={props.submit}/>
        <LineWidthPicker key={'priceLineWidth'} default={props.width} submit={props.submit}/>
        <LineStylePicker key={'priceLineStyle'} default={props.style} submit={props.submit}/>
    </div>
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
        step={1} min={1} max={10}
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