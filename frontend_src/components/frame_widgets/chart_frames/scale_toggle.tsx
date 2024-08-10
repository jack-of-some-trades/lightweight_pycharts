import { Accessor, JSX, Signal } from "solid-js";
import { TextIcon } from "../../icons";


interface scale_props extends JSX.HTMLAttributes<HTMLDivElement>{
    class:string, show:Accessor<boolean>, scale:Signal<number>
}

export function scale_toggle(props:scale_props){
    return (
        <TextIcon 
            class={props.class}
            style={{display:props.show()?'block':'none'}}
            text={"L"} 
            activated={props.scale[0]() === 1}
        />
    )
}