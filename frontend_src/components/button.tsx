
import { get_svg, icons } from "../src/icons";

interface btn_props {
    icon:icons,
    class?:string,
    active_start?:boolean,
    onClick?:()=>void
}

const default_props = {
    active_start: false,
    onClick:()=>{console.log('Button Pressed!')}
}

export function Button(props:btn_props) {
    props = {
        ...default_props,
        ...props
    }
    const icon_el = get_svg(props.icon)
    return <div class={props.class} onClick={props.onClick}>{icon_el}</div>
}