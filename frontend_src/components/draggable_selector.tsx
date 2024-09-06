/**
 * A Generic Frame work for creating a vertical set of identification tags from a list of ids.
 * The Generic Tag can be populated with any definable inner component so long as that 
 * component's sole prop is the string Id used to maintain the list.
 */

import { closestCenter, createSortable, DragDropProvider, DragDropSensors, DragOverlay, SortableProvider, Transformer, useDragDropContext } from "@thisbeyond/solid-dnd";
import { Accessor, Component, createSignal, For, JSX, Show, splitProps } from "solid-js";

import "../css/draggable_selector.css";

interface drag_section_props {
    ids: Accessor<string[]>
    tag_name: (id:string) => string
    children?: Component<{id:string}>
    reorder_function: (from:number, to:number)=>void
}
export function DraggableSelection(props:drag_section_props){
    //Displays used in a keyed show tag so the <For/> tag updates when the container does.
    const [activeItem, setActiveItem] = createSignal<string>("");
  
    const onDragStart = ({ draggable }:any) => {setActiveItem(draggable.id);}
    const onDragEnd = ({ draggable, droppable }:any) => {
        if (draggable && droppable) {
            const currentItems = props.ids();
            const fromIndex = currentItems.indexOf(draggable.id);
            const toIndex = currentItems.indexOf(droppable.id);

            if (fromIndex !== toIndex) props.reorder_function(fromIndex, toIndex)
        }
    };

    return  (
        <DragDropProvider onDragStart={onDragStart} onDragEnd={onDragEnd} collisionDetector={closestCenter}>
            <DragDropSensors/>
            <ConstrainDragAxis/>
            <div class="drag_tag_column">
                <SortableProvider ids={props.ids()}>
                    <For each={props.ids()}>{(tag_id)=>{
                        let frame = active_container.frames.find((f) => f.id === tag_id)
                        return <SelectableItemTag 
                            tag_id={()=>tag_id}
                            tag_name={() => props.tag_name(tag_id)}
                            onClick={()=>frame?.assign_active_frame()}
                        >
                            {props.children?.({id:tag_id}) ?? undefined}
                        </SelectableItemTag>
                    }}</For>
                </SortableProvider>
            </div>
            <OverlayItemTag tag_id={activeItem} tag_name={() => props.tag_name(activeItem())}>
                {props.children?.({id:activeItem()}) ?? undefined}
            </OverlayItemTag>
        </DragDropProvider>
    )
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


interface tag_props extends JSX.HTMLAttributes<HTMLDivElement> {
    tag_id: Accessor<string>
    tag_name: Accessor<string>
}
function SelectableItemTag(props:tag_props){
    const sortable = createSortable(props.tag_id());
    const state = useDragDropContext()?.[0]

    const [,divProps] = splitProps(props, ['tag_id', 'tag_name'])
    
    //@ts-ignore
    return <div use:sortable class="drag_tag" {...divProps}
        style={{
            "opacity": sortable.isActiveDraggable ? '25%' : undefined,
            "transition": state?.active.draggable ? "transform .15s ease-in-out" : undefined
        }}
    >
        <span innerText={props.tag_name()}/>
        {props.children}
        <div class='drag_tag_bottom_border' innerText={'id: ' + props.tag_id()}/>
    </div>
};

function OverlayItemTag(props:tag_props){
    const [,divProps] = splitProps(props, ['tag_id', 'tag_name'])
    return <DragOverlay>
        <Show when={props.tag_id()} keyed>
            <div class="drag_tag_overlay" {...divProps}>
                <span innerText={props.tag_name()}/>
                {props.children}
                <div class='drag_tag_bottom_border' innerText={'id: ' + props.tag_id()}/>
            </div>
        </Show>
    </DragOverlay>
};

//#endregion
