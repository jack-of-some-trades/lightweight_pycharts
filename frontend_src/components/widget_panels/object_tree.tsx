
import { createEffect, createSignal, on, onMount, Show } from "solid-js";
import { ContainerCTX } from "../layout/container";
import { PanelProps } from "../layout/widgetbar";

import { DraggableSelection } from "../draggable_selector";

const DEFAULT_WIDTH = 250

export function ObjectTree(props:PanelProps){
    //Displays used in a keyed show tag so the <For/> tag updates when the container does.
    const displays = ContainerCTX().displays
    
    const [ids, setIds] = createSignal(Array.from(active_container.frames, (f)=>f.id))
    createEffect(on(displays, () => setIds(Array.from(active_container.frames, (f)=>f.id))))
    const getTagName = (id:string) => ""

    onMount(()=>props.resizePanel(DEFAULT_WIDTH))

    return <>
        <div class='widget_panel_title'>Object Tree</div>
        <Show when={displays()} keyed>
            <DraggableSelection
                ids={ids}
                tag_name={getTagName}
                reorder_function={active_container.reorder_frames.bind(active_container)}
            />
        </Show>
    </>
}