import { createSignal, For, Match, splitProps, Switch } from "solid-js"
import { SetStoreFunction } from "solid-js/store"
import { indicator } from "../../../src/indicator"
import { location_reference, overlay_div_props, OverlayDiv, point } from "../../overlay/overlay_manager"


interface indicator_option_props extends Omit<overlay_div_props, "location_ref" | "location">{
    parent_ind:indicator
    menu_struct: object
    setOptions: SetStoreFunction<object>
}

export function IndicatorOpts(props:indicator_option_props){

    const [location, setLocation] = createSignal<point>({
        x: Math.floor(window.innerWidth/2), 
        y: Math.floor(window.innerHeight/2)
    })
    const move = (e:MouseEvent) => {
        if (e.target !== document.documentElement)
            //Only Move the location if the cursor is on the screen
            setLocation({
                x:location().x + e.movementX, 
                y:location().y + e.movementY
            })
    }
    const mouseup = (e:MouseEvent) => {
        if(e.button === 0) {
            document.removeEventListener('mousemove', move)
            document.removeEventListener('mouseup', mouseup)
        }
    }


    return (
        <OverlayDiv
            id={props.id}
            location={location()}
            location_ref={location_reference.CENTER}
            bounding_client_id={`#${props.id}>.ind_title_box`}
        >
            <div class="ind_title_box" 
                onMouseDown={(e)=>{ if(e.button === 0) {
                    document.addEventListener('mousemove', move)
                    document.addEventListener('mouseup', mouseup)
                }}}
            />
            <For each={Object.entries(props.menu_struct)}>{([key, [type, params]]) => 
                <Switch fallback={
                        <Input key={key} type={type} params={params} setOptions={props.setOptions}
                    />}>
                    <Match when={type === "group"}>
                        <Group title={key} params={params} setOptions={props.setOptions}/>
                    </Match>
                    <Match when={type === "inline"}>
                        <Inline title={key} params={params} setOptions={props.setOptions}/>
                    </Match>
                </Switch>
            }</For>
        </OverlayDiv>
    )
}

interface section_props {
    title:string
    params:object
    setOptions: SetStoreFunction<object>
}
function Group(props:section_props){
    return  <>
        <div class="Indicator_Group_Box"/>
        <For each={Object.entries(props.params)}>{([key, [type, params]]) => 
            <Switch fallback={
                    <Input key={key} type={type} params={params} setOptions={props.setOptions}
                />}>
                <Match when={type === "inline"}>
                    <Inline title={key} params={params} setOptions={props.setOptions}/>
                </Match>
            </Switch>
        }</For>
    </>
}
function Inline(props:section_props){
    return  <div class="Indicator_Inline_Group">
        <For each={Object.entries(props.params)}>{([key, [type, params]]) => 
            <Input key={key} type={type} params={params} setOptions={props.setOptions}/>
        }</For>
    </div>
}

interface input_switch_props extends input_props {type:string}
interface input_props {key:string; params:object, setOptions:SetStoreFunction<object>}

function Input(props: input_switch_props){
    const [,inputProps] = splitProps(props, ['type'])

    return <Switch fallback={<div id="failed_input_match"/>}>
        <Match when={props.type === "bool"}><BoolInput {...inputProps}/></Match>
        <Match when={props.type === "enum"}><EnumInput {...inputProps}/></Match>
        <Match when={props.type === "color"}><ColorInput {...inputProps}/></Match>
        <Match when={props.type === "source"}><SourceInput {...inputProps}/></Match>
        <Match when={props.type === "number"}><NumberInput {...inputProps}/></Match>
        <Match when={props.type === "string"}><StringInput {...inputProps}/></Match>
        <Match when={props.type === "select"}><SelectInput {...inputProps}/></Match>
        <Match when={props.type === "timestamp"}><TimeInput {...inputProps}/></Match>
    </Switch>
}

function BoolInput(props: input_props){return <div/>}
function EnumInput(props: input_props){return <div/>}
function TimeInput(props: input_props){return <div/>}
function ColorInput(props: input_props){return <div/>}
function SourceInput(props: input_props){return <div/>}
function NumberInput(props: input_props){return <div/>}
function StringInput(props: input_props){return <div/>}
function SelectInput(props: input_props){return <div/>}