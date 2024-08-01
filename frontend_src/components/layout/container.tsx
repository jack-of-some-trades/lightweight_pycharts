import { For } from "solid-js"
import { flex_frame, Orientation } from "../../src/container"
import { frame } from "../../src/frame"


interface container_props {
    flex_displays: flex_frame[]
    display_elements: frame[]
    // active_element: boolean[]
    // target_element: boolean[]
}

export function Container(props : container_props){
    //Element Count keeps track of how many display elements have been placed into the screen
    //This is needed since the display list has both elements & separators, thus the <For> index isn't useful 
    let element_count = 0

    return <>
        <For each={props.flex_displays}>{(flex_display, i) => {
            if(i() === 0) element_count = 0 // Reset element Counter at beginning of loop 
            // console.log("re-render", props.flex_displays)
            // console.log("iterator frame", flex_display, flex_display.rect)

            let element = undefined, target = undefined, active = undefined;
            if (flex_display.orientation === Orientation.null){
                element = props.display_elements[element_count]
                // target = props.target_element[element_count]
                // active = props.active_element[element_count]
                // console.log("render frame",props.display_elements.length, element)
                element_count += 1
            }
            
            return (
                <div
                    classList={{
                        frame: flex_display.orientation === Orientation.null? true : false, 
                        frame_separator_v: flex_display.orientation === Orientation.Vertical? true : false,
                        frame_separator_h: flex_display.orientation === Orientation.Horizontal? true : false 
                    }} 
                    style={{
                        "top": `${flex_display.rect.top}px`, 
                        "left": `${flex_display.rect.left}px`, 
                        "width": `${flex_display.rect.width}px`, 
                        "height": `${flex_display.rect.height}px`,
                    }}
                    attr:active={active? "": undefined}
                    attr:target={target? "": undefined}
                    onMouseDown={flex_display.mouseDown}
                >
                    {element?.element}
                </div>
            )}}
        </For>
    </>
}