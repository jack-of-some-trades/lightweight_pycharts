import { createSignal, For, Match, Show, splitProps, Switch } from "solid-js"
import { SetStoreFunction } from "solid-js/store"
import { indicator } from "../../../src/indicator"
import { Icon, icons, TextIcon } from "../../icons"
import { location_reference, overlay_div_props, OverlayDiv, point } from "../../overlay/overlay_manager"

import "../../../css/frame_widgets/chart_frames/indicator_options.css"

interface indicator_option_props extends Omit<overlay_div_props, "location_ref" | "location">{
    parent_ind:indicator
    menu_struct: object
    setOptions: SetStoreFunction<object>
    close_menu: ()=>{}
    container_id:string
    frame_id:string
    indicator_id:string
}

function onSubmit(c_id:string, f_id:string, i_id:string, e:Event){
    e.preventDefault();
    if (e.target !== null){
        let nodes = (e.target as HTMLFormElement).querySelectorAll("input, select") 

        window.api.set_indicator_options( c_id, f_id, i_id,
            Object.fromEntries(
            Array.from(nodes as NodeListOf<HTMLInputElement>, (node) => {
                switch(node.getAttribute('type')){
                    case ("checkbox"): return [node.id, node.checked]
                    case ("number"): return [node.id, parseFloat(node.value)]
                    case ("source"): return [node.id, [node.value, 1]]
                    default: return [node.id, node.value]
                }
            })
        ))
    }
}

export function IndicatorOpts(props:indicator_option_props){
    const [location, setLocation] = createSignal<point>({x:0, y:0})
    const position_menu = () => {setLocation({x:window.innerWidth*0.7, y:window.innerHeight*0.2})}
    let form = document.createElement('form')

    const boundSubmit = onSubmit.bind(
        undefined, 
        props.container_id, 
        props.frame_id, 
        props.indicator_id
    )

    return (
        <OverlayDiv
            id={props.id}
            location={location()}
            setLocation={setLocation}
            classList={{indicator_opts:true}}
            location_ref={location_reference.CENTER}
            updateLocation={position_menu}
            drag_handle={`#${props.id}>.title_box`}
            bounding_client_id={`#${props.id}>.title_box`}
            onKeyPress={(e) => {if(e.key === "Enter") form.requestSubmit()}}
        >
            {/********* Title Bar *********/}
            <div class="title_box">
                <h2>Indicator Options</h2>
                <Icon icon={icons.close} force_reload={true} onClick={props.close_menu}/>
            </div>
            
            {/********* Input Form Loop *********/}
            <form ref={form} onSubmit={boundSubmit}>
                <For each={Object.entries(props.menu_struct)}>{([key, [type, params]]) => 
                    <Switch fallback={<>
                            <Input key={key} type={type} params={params} setOptions={props.setOptions}/>
                        </>}>
                        <Match when={type === "group"}>
                            <Group title={key} params={params} setOptions={props.setOptions}/>
                        </Match>
                        <Match when={type === "inline"}>
                            <Inline title={key} params={params} setOptions={props.setOptions}/>
                        </Match>
                    </Switch>
                }</For>
            </form>

            {/********* Submit Buttons *********/}
            <div class="footer">
                <input type="submit" value={"Ok"} onclick={()=>form.requestSubmit()}/>
                <input type="submit" value={"Apply"}/>
            </div>
        </OverlayDiv>
    )
}

interface section_props {
    title:string
    params:object
    setOptions: SetStoreFunction<object>
}
function Group(props:section_props){
    return  (
        <div class="group">
            <h3 innerText={props.title}/>
            <For each={Object.entries(props.params)}>{([key, [type, params]]) => 
                <Switch fallback={<>
                        <Input key={key} type={type} params={params} setOptions={props.setOptions}/>
                    </>}>
                    <Match when={type === "inline"}>
                        <Inline title={key} params={params} setOptions={props.setOptions}/>
                    </Match>
                </Switch>
            }</For>
        </div>
    )
}
function Inline(props:section_props){
    return  (
        <div class="inline">
            <For each={Object.entries(props.params)}>{([key, [type, params]]) => 
                <Input key={key} type={type} params={params} setOptions={props.setOptions}/>
            }</For>
        </div>
    )
}

interface input_switch_props extends input_props {type:string}
interface input_props {key:string; params:input_params, setOptions:SetStoreFunction<object>}
//The following interface is a catch all for anything the Indicator Options 
//Metaclass _parse_arg[_param] functions throw into the menu_struct for each argument
interface input_params {
    title: string
    default: any
    tooltip?: string
    options?: Array<any>

    label_map?: {[key: string]: number};

    src_type?: string

    min?: number
    max?: number
    step?: number
}

function Input(props: input_switch_props){
    const [,inputProps] = splitProps(props, ['type'])

    return <div>
        <label for={props.key} innerText={props.params.title + (props.params.title !== ""? ": ": "")}/>
        <Show when={props.params.options && props.type !== "enum"}>
            <datalist id={props.key + "_datalist"}>
                <For each={props.params.options}>{(option) =>
                    <option value={option}/>
                }</For>
            </datalist> 
        </Show>
        <Switch>
            <Match when={props.type === "bool"}><BoolInput {...inputProps}/></Match>
            <Match when={props.type === "enum"}><EnumInput {...inputProps}/></Match>
            <Match when={props.type === "color"}><ColorInput {...inputProps}/></Match>
            <Match when={props.type === "source"}><SourceInput {...inputProps}/></Match>
            <Match when={props.type === "number"}><NumberInput {...inputProps}/></Match>
            <Match when={props.type === "string"}><StringInput {...inputProps}/></Match>
            <Match when={props.type === "timestamp"}><TimeInput {...inputProps}/></Match>
        </Switch>
        <Show when={props.params.tooltip}>
            <span class="tooltip">
                <TextIcon text="?"/>
                <span class="tooltiptext" innerHTML={props.params.tooltip}/>
            </span>
        </Show>
    </div>
}

function BoolInput(props: input_props){
    return <input id={props.key} type="checkbox" checked={props.params.default ?? false}/>
}

function StringInput(props: input_props){
    return <input id={props.key} type="text" value={props.params.default}/>
}

function NumberInput(props: input_props){
    return (
        <input id={props.key}  type="number"
            value={props.params.default}
            max={props.params.max}
            min={props.params.min}
            step={props.params.step}
            list={props.params.options ? props.key + "_datalist" : undefined}
        />
    )
}

function EnumInput(props: input_props){
    return <span class="select-span">
        <select id={props.key}>
            <For each={props.params.options}>{(option) =>
                <option 
                    value={option}
                    innerText={props.params.label_map? props.params.label_map[option] : option}
                    selected={option == props.params.default? true : undefined}
                />
            }</For>
        </select>
        <Icon icon={icons.menu_arrow_ns}/>
    </span>
}

const padZeros = (num:number) => String(num).padStart(2,'0')
const UnixToString = (timestamp: number) => {
    let d = new Date(timestamp * 1000)
    return [
        d.getUTCFullYear(), "-",
        padZeros(d.getUTCMonth() + 1) , "-",
        padZeros(d.getUTCDate()), "T",
        padZeros(d.getUTCHours()), ":",
        padZeros(d.getUTCMinutes())
    ].join("")
    
}
function TimeInput(props: input_props){
    return <input id={props.key} type="datetime-local" value={UnixToString(props.params.default)}/>
}

const RGBAToHex = (rgba:string) => {
    return "#" + rgba.replace(/^rgba?\(|\s+|\)$/g, '').split(',') 
      .filter((string, index) => index !== 3)
      .map(string => parseFloat(string))
      .map((number, index) => index === 3 ? Math.round(number * 255) : number)
      .map(number => number.toString(16))
      .map(string => string.length === 1 ? "0" + string : string)
      .join("")
  }
function ColorInput(props: input_props){return <input id={props.key} type="color" value={RGBAToHex(props.params.default)}/>}

function SourceInput(props: input_props){
    return <span class="select-span">
        <select id={props.key} attr:type="source">
            <For each={props.params.options}>{(option) =>
                <option 
                    value={option}
                    innerText={option}
                    selected={option == props.params.default? true : undefined}
                />
            }</For>
        </select>
        <Icon icon={icons.menu_arrow_ns}/>
    </span>
}

