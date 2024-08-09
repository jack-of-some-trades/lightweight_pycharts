import { Accessor, For, JSX } from "solid-js"
import { Orientation } from "../../src/layouts"


export interface layout_display {
    orientation: Orientation
    element: JSX.Element | HTMLDivElement | undefined,
    mouseDown: (e:MouseEvent) => void
    el_active: Accessor<boolean>
    el_target: Accessor<boolean>
}

interface container_props { displays: layout_display[] }

export function Container(props : container_props){
    return <>
        <For each={props.displays}>{(display) => {
            
            return (
                <div
                    classList={{
                        frame: true, 
                        separator_v: display.orientation === Orientation.Vertical? true : false,
                        separator_h: display.orientation === Orientation.Horizontal? true : false 
                    }}
                    attr:active={display.el_active() ? "" : undefined}
                    attr:target={display.el_target() ? "" : undefined}
                    onMouseDown={display.mouseDown}
                >
                    {display.element}
                </div>
            )}}
        </For>
    </>
}