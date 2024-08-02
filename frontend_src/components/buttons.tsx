
import { createSignal, mergeProps, splitProps } from "solid-js";
import { Icon, icon_props } from "./icons";

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