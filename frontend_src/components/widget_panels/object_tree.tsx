
import { Accessor, createContext, createSignal, For, JSX, onMount, Setter, Show, useContext } from "solid-js";
import { PanelProps } from "../layout/widgetbar";

import { createStore, SetStoreFunction } from "solid-js/store";
import { DraggableSelection, OverlayItemTag, SelectableItemTag } from "../draggable_selector";

const DEFAULT_WIDTH = 250

// #region --------------------- Object Tree Context ----------------------- */

export interface ObjTree_Item {
    id: string
    name: string
    element: Element | undefined
}


/**
 * The Object Tree context is retrieved by the Object Tree Side Panel and Displayed
 * The Context should be Populated by the Frame so the Objects within can be rearranged
 */
interface Tree_context_props { 
    ids: Accessor<string[]>
    setIds: Setter<string[]>
    items: ObjTree_Item[]
    setItems: SetStoreFunction<ObjTree_Item[]>,
    
    reorderFunc: Accessor<(from:number,to:number)=>void>
    setReorderFunc: Setter<(from:number,to:number)=>void>
}
const default_tree_props:Tree_context_props = {
    ids: ()=>[],
    setIds: ()=>{},
    items: [],
    setItems: ()=>{},
    reorderFunc: ()=>()=>{},
    setReorderFunc: ()=>{}
}

let TreeContext = createContext<Tree_context_props>( default_tree_props )
export function ObjectTreeCTX():Tree_context_props { return useContext(TreeContext) }

export function ObjTreeContext(props:JSX.HTMLAttributes<HTMLElement>){

    const [ids, setIds] = createSignal<string[]>([])
    const [items, setItems] = createStore<ObjTree_Item[]>([])
    const [reorderFunc, setReorderFunc] = createSignal<((from:number,to:number)=>void)>(()=>{})

    const ObjTreeCTX:Tree_context_props = {
        ids: ids,
        setIds: setIds,
        items: items,
        setItems: setItems,
        reorderFunc: reorderFunc,
        setReorderFunc: setReorderFunc
    }
    TreeContext = createContext<Tree_context_props>(ObjTreeCTX)

    return <TreeContext.Provider value={ObjTreeCTX}>
        {props.children}
    </TreeContext.Provider>
}

// #endregion


export function ObjectTree(props:PanelProps){
    const ids = ObjectTreeCTX().ids
    const items = ObjectTreeCTX().items
    const reorder = ObjectTreeCTX().reorderFunc

    onMount(()=>props.resizePanel(DEFAULT_WIDTH))

    return <>
        <div class='widget_panel_title'>Object Tree</div>
        <Show when={ids()} keyed>
            <DraggableSelection
                ids={ids}
                overlay_child={
                    ({id}) => OverlayItemTag({
                        tag_id:()=>id, 
                        tag_name:()=>items.find((item)=>item.id===id)?.name ?? ""
                    })
                }
                reorder_function={reorder()}
            >
                <For each={ids()}>{(id) => {
                    let item = items.find((item)=>item.id===id)
                    if (item === undefined) return

                    return <SelectableItemTag 
                        tag_id={()=>id}
                        tag_name={() => item.name}
                    >
                        {item.element}
                    </SelectableItemTag>
                }}</For>            
            </DraggableSelection>
        </Show>
    </>
}