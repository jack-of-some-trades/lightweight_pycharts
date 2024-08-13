import { Accessor, For, JSX, Setter } from "solid-js"
import { Orientation } from "../../src/layouts"

import "../../css/layout/layouts.css"

export interface layout_display {
    orientation: Orientation
    element: JSX.Element | HTMLDivElement | undefined,
    mouseDown: (e:MouseEvent) => void
    el_active: Accessor<boolean>
    el_target: Accessor<boolean>
}

type LayoutContextProps = {
    getSize:Accessor<DOMRect>,
    setStyle: Setter<string>,
    setDisplay: Setter<layout_display[]>,
}

export const default_layout_ctx_args:LayoutContextProps = {
    getSize:() => {return new DOMRect(0,0,-1,-1)},
    setStyle: () => {},
    setDisplay: () => {},
}

interface layout_props{
    select_cls:string
    innerStyle: Accessor<string>
    displays: Accessor<layout_display[]>
}

export function Layout(props: layout_props){
    return <>
        <style innerHTML={props.innerStyle()}/>
        <For each={props.displays()}>{(display) =>
            <div
                id={  
                    display.orientation === Orientation.Vertical? "separator_v" 
                    : display.orientation === Orientation.Horizontal? "separator_h" 
                    : undefined
                }
                class={props.select_cls}
                attr:active={display.el_active() ? "" : undefined}
                attr:target={display.el_target() ? "" : undefined}
                onMouseDown={display.mouseDown}
            >
                {display.element}
            </div>
        }</For>
    </>
}

