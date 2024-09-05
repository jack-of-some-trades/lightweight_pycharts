
import {
    closestCenter,
    createSortable,
    DragDropProvider,
    DragDropSensors,
    DragOverlay,
    SortableProvider,
    Transformer,
    useDragDropContext
} from "@thisbeyond/solid-dnd";
import { createEffect, createSignal, For, Match, on, onMount, Show, Switch } from "solid-js";
import { ContainerCTX } from "../layout/container";
import { PanelProps } from "../layout/widgetbar";

import { Accessor } from "solid-js";
import "../../css/widget_panels/frame_viewer.css";
import { chart_frame } from "../../src/charting_frame/charting_frame";
import { frame } from "../../src/frame";

const DEFAULT_WIDTH = 200

export function FrameViewer(props:PanelProps){
    //Displays used in a keyed show tag so the <For/> tag updates when the container does.
    const displays = ContainerCTX().displays
    
    const [activeItem, setActiveItem] = createSignal<string>("");
    const [ids, setIds] = createSignal(Array.from(active_container.frames, (f)=>f.id))
  
    const onDragStart = ({ draggable }:any) => {setActiveItem(draggable.id);}
    const onDragEnd = ({ draggable, droppable }:any) => {
        if (draggable && droppable) {
            const currentItems = ids();
            const fromIndex = currentItems.indexOf(draggable.id);
            const toIndex = currentItems.indexOf(droppable.id);

            if (fromIndex !== toIndex) active_container.reorder_frames(fromIndex, toIndex)
        }
    };

    createEffect(on(displays, () => setIds(Array.from(active_container.frames, (f)=>f.id))))
    onMount(()=>props.resizePanel(DEFAULT_WIDTH))

    return <>
        <div class='panel_title'>Frame Viewer</div>
        <Show when={displays()} keyed>
            <DragDropProvider onDragStart={onDragStart} onDragEnd={onDragEnd} collisionDetector={closestCenter}>
                <DragDropSensors/>
                <ConstrainDragAxis/>
                <div class="frame_tag_column">
                    <SortableProvider ids={ids()}>
                        <For each={ids()}>{
                            (frame_id)=><SelectableFrameTag frame_id={frame_id}/>
                        }</For>
                    </SortableProvider>
                </div>
                <OverlayFrameTag frame_id={activeItem}/>
            </DragDropProvider>
        </Show>
    </>
}

function ConstrainDragAxis(){
    const DragCTX = useDragDropContext()?.[1]
    if (DragCTX === undefined) return
    const { onDragStart, onDragEnd, addTransformer, removeTransformer } = DragCTX
  
    const CONSTRAIN_X: Transformer = {
        id: "constrain-x-axis",
        order: 100,
        callback: (transform) => ({ ...transform, x: 0 }),
    };
  
    onDragStart(({ draggable }:any) => {
        addTransformer("draggables", draggable.id, CONSTRAIN_X);
    });
  
    onDragEnd(({ draggable }:any) => {
        removeTransformer("draggables", draggable.id, CONSTRAIN_X.id);
    });
  
    return <></>;
}


//#region ------------------ Frame Tag Bases ------------------

function SelectableFrameTag(props:{frame_id:string}){
    const frame = active_container.frames.find((f) => f.id === props.frame_id)
    const sortable = createSortable(props.frame_id);
    const state = useDragDropContext()?.[0]
    
    //@ts-ignore
    return <div use:sortable class="frame_tag" 
        style={{
            "opacity": sortable.isActiveDraggable ? '25%' : '100%',
            "transition": state?.active.draggable ? "transform .15s ease-in-out" : undefined
        }}
    >
        <FrameTag frame={frame}/>
    </div>
};

function OverlayFrameTag(props:{frame_id:Accessor<string>}){
    return <DragOverlay>
        <Show when={props.frame_id()} keyed>
            <div class="frame_tag_overlay">
                <FrameTag frame={active_container.frames.find((f) => f.id === props.frame_id())}/>
            </div>
        </Show>
    </DragOverlay>
};

function FrameTag(props:{frame:frame|undefined}){
    if (!props.frame) return
    return <>
        <Switch>
            <Match when={props.frame.type === 'abstract'}><AbstractFrameTag frame={props.frame}/></Match>
            <Match when={props.frame.type === 'charting_frame'}><ChartingFrameTag frame={props.frame as chart_frame}/></Match>
        </Switch>
        <div class='frame_tag_bottom_border' innerText={'id: ' + props.frame.id}/>
    </>
}

//#endregion

//#region ------------------ Specific Frame Tags ------------------


function AbstractFrameTag(props:{frame:frame}){
    return <span innerText={'Abstract Frame'}/>
}

function ChartingFrameTag(props:{frame:chart_frame}){
    return <span innerText={'Charting Frame'}/>
}