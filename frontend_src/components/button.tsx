
import { createSignal, mergeProps, splitProps } from "solid-js";
import { Icon, icon_props } from "./icon";

declare module "solid-js" {
    namespace JSX {
        interface ExplicitAttributes{
            active: string
        }
    }
}

interface btn_props extends icon_props{
    onClick?:()=>void
}
const default_btn:btn_props = {
    icon:'',
    onClick: ()=>console.log('Button Pressed')
}

export function Btn(props:btn_props) {
    const merged = mergeProps(default_btn, props)
    const [, rest] = splitProps(props, ['onClick'])
    return <Icon {...rest} onClick={merged.onClick}/>
}




interface togglebtn_props extends icon_props{
    onAct?:()=>void,
    onDeact?:()=>void,
    activated?:boolean,
}
const default_togglebtn:togglebtn_props = {
    icon:'',
    activated: false,
    onAct:()=>{console.log('Button Activated!')},
    onDeact:()=>{console.log('Button Deactivated!')},
}

export function SelectBtn(props:togglebtn_props) {
    props = mergeProps(default_togglebtn, props)
    const [activated, setActivated] = createSignal(props.activated)
    const [, iconProps] = splitProps(props, ['onAct', 'onDeact'])

    iconProps.onClick = () => {
        if (activated() && props.onAct) props.onAct()
    }

    //Set Initial State
    if (activated() && props.onAct) props.onAct()
    else if (!activated() && props.onDeact) props.onDeact()

    return <Icon {...iconProps} activated={activated()}/>
}

export function ToggleBtn(props:togglebtn_props) {
    const merged = mergeProps(default_togglebtn, props)
    const [activated, setActivated] = createSignal(merged.activated)
    const [, iconProps] = splitProps(merged, ['onAct', 'onDeact'])

    iconProps.onClick = () => {
        setActivated(!activated())
        if (activated() && merged.onAct) merged.onAct()
        else if (!activated() && merged.onDeact) merged.onDeact()
    }

    //Set Initial State
    if (activated() && merged.onAct) merged.onAct()
    else if (!activated() && merged.onDeact) merged.onDeact()

    return <Icon {...iconProps} activated={activated()}/>
}