
import { Accessor, createContext, createEffect, createSignal, For, JSX, on, onMount, Setter, Show, useContext } from "solid-js";
import { PanelProps } from "../layout/widgetbar";

import { createStore, SetStoreFunction } from "solid-js/store";
import { SeriesBase_T } from "../../src/charting_frame/series-plugins/series-base";
import { DraggableSelection, OverlayItemTag, SelectableItemTag } from "../draggable_selector";

import '../../css/widget_panels/object_tree.css';

const DEFAULT_WIDTH = 250

// #region --------------------- Object Tree Context ----------------------- */

export interface ObjTree_Item {
    id: string
    name: string
    series: SeriesBase_T | undefined
}


/**
 * The Object Tree context is retrieved by the Object Tree Side Panel and Displayed
 * The Context should be Populated by the Frame so the Objects within can be rearranged
 */
interface Tree_context_props { 
    ids: Accessor<string[]>
    setIds: Setter<string[]>
    serieses: SeriesBase_T[]
    setSerieses: SetStoreFunction<SeriesBase_T[]>,
    
    seriesReorderFunc: Accessor<(from:number,to:number)=>void>
    setSeriesReorderFunc: Setter<(from:number,to:number)=>void>

    selectedSeries: Accessor<SeriesBase_T | undefined>
    setSelectedSeries: Setter<SeriesBase_T | undefined>
}
const default_tree_props:Tree_context_props = {
    ids: ()=>[],
    setIds: ()=>{},
    serieses: [],
    setSerieses: ()=>{},
    seriesReorderFunc: ()=>()=>{},
    setSeriesReorderFunc: ()=>{},
    
    selectedSeries: ()=>undefined,
    setSelectedSeries: ()=>undefined,
}

let TreeContext = createContext<Tree_context_props>( default_tree_props )
export function ObjectTreeCTX():Tree_context_props { return useContext(TreeContext) }

export function ObjTreeContext(props:JSX.HTMLAttributes<HTMLElement>){

    const [ids, setIds] = createSignal<string[]>([])
    const [items, setItems] = createStore<SeriesBase_T[]>([])
    const [selectedSeries, setSelectedSeries] = createSignal<SeriesBase_T>()
    const [seriesReorderFunc, setSeriesReorderFunc] = createSignal<((from:number,to:number)=>void)>(()=>{})

    const ObjTreeCTX:Tree_context_props = {
        ids: ids,
        setIds: setIds,
        serieses: items,
        setSerieses: setItems,
        seriesReorderFunc: seriesReorderFunc,
        setSeriesReorderFunc: setSeriesReorderFunc,
        
        selectedSeries: selectedSeries,
        setSelectedSeries: setSelectedSeries,
    }
    TreeContext = createContext<Tree_context_props>(ObjTreeCTX)

    return <TreeContext.Provider value={ObjTreeCTX}>
        {props.children}
    </TreeContext.Provider>
}

// #endregion

const MIN_TREE_HEIGHT = 50

export function ObjectTree(props:PanelProps){
    onMount(()=>{props.resizePanel(DEFAULT_WIDTH)})
    const primTitleDiv = createSignal<HTMLDivElement>()
    const seriesTitleDiv = createSignal<HTMLDivElement>()

    const getHeight = (el:Element | undefined) => Math.ceil(el?.getBoundingClientRect().height ?? 0)
    const widgetPanelHeight = () => getHeight(document.querySelector('.layout_main.widget_panel') ?? undefined)
    let seriesTreeHeight = (widgetPanelHeight() - 50)/2
    const seriesTreeStyle = createSignal<JSX.CSSProperties>({height:`${seriesTreeHeight}px`})
    const primTreeStyle = createSignal<JSX.CSSProperties>({height:`${seriesTreeHeight}px`})

    // Resize Trees when dragging the divider.
    const resizeSeriesTree = (e:MouseEvent) => {
        let free_space = widgetPanelHeight() - getHeight(primTitleDiv[0]()) - getHeight(seriesTitleDiv[0]())
        // Bound the new setting to keep the Series and Primitive Trees above their minimums
        seriesTreeHeight = Math.min(Math.max( MIN_TREE_HEIGHT, seriesTreeHeight + e.movementY ), free_space - MIN_TREE_HEIGHT)
        seriesTreeStyle[1]({height:`${seriesTreeHeight}px`})
        primTreeStyle[1]({height:`${free_space - seriesTreeHeight}px`})
    }
    const onMouseDown = () => {
        document.addEventListener('mousemove', resizeSeriesTree)
        document.addEventListener('mouseup', () => document.removeEventListener('mousemove', resizeSeriesTree), {once:true})
    }

    // Resize the Trees to 50/50 when the series objects change.
    createEffect(on(ObjectTreeCTX().ids, () => {
        let free_space = widgetPanelHeight() - getHeight(primTitleDiv[0]()) - getHeight(seriesTitleDiv[0]())
        seriesTreeHeight = Math.floor(free_space/2)
        seriesTreeStyle[1]({height:`${seriesTreeHeight}px`})
        primTreeStyle[1]({height:`${free_space - seriesTreeHeight}px`})
    }))

    return <>
        <div ref={seriesTitleDiv[1]} class='widget_panel_title'>Series Object Tree</div>
        <SeriesTree style={seriesTreeStyle[0]()}/>

        <div class='obj_tree_resize_handle' onMouseDown={onMouseDown}/>

        <div ref={primTitleDiv[1]} class='widget_panel_title'>Primitive Object Tree</div>
        <PrimitiveTree style={primTreeStyle[0]()}/>
    </>
}

function SeriesTree(props:JSX.HTMLAttributes<HTMLDivElement>){
    const ids = ObjectTreeCTX().ids
    const serieses = ObjectTreeCTX().serieses
    const reorder = ObjectTreeCTX().seriesReorderFunc
    const setSelectedSeries = ObjectTreeCTX().setSelectedSeries

    return <Show when={ids()} keyed>
        <DraggableSelection
            ids={ids}
            ref={props.ref}
            style={props.style}
            classList={{'obj_tree':true}}
            overlay_child={
                ({id}) => OverlayItemTag({
                    tag_id:()=>id, 
                    tag_name:()=>serieses.find((series)=>series.id===id)?.name ?? ""
                })
            }
            reorder_function={reorder()}
        >
            <For each={ids()}>{(id) => {
                const series = serieses.find((series)=>series.id===id)
                if (series === undefined) return

                return <SelectableItemTag 
                    onClick={()=>setSelectedSeries(series)}
                    tag_id={()=>id}
                    tag_name={()=>serieses.find((item)=>item.id===id)?.name ?? ""}
                />
            }}</For>            
        </DraggableSelection>
    </Show>
}


function PrimitiveTree(props:JSX.HTMLAttributes<HTMLDivElement>){
    //Remove Possibility of Series being undefined since Execution is gated by a <Show/> Tag that guarantees obj validity
    const series = ObjectTreeCTX().selectedSeries as Accessor<SeriesBase_T>
    
    return <Show when={series()} keyed>
        <DraggableSelection
            ids={series().primitiveIds}
            classList={{'obj_tree':true}}
            style={props.style}
            overlay_child={
                ({id}) => OverlayItemTag({
                    tag_id:()=>id, 
                    tag_name:()=>series().primitives.find((prim)=>prim._id===id)?._type ?? ""
                })
            }
            reorder_function={series().reorderPrimitives.bind(series())}
        >
            <For each={series().primitiveIds()}>{(id) => {
                const primitive = series().primitives.find((prim)=>prim._id===id)
                if (primitive === undefined) return

                return <SelectableItemTag 
                    tag_id={()=>id}
                    tag_name={() => primitive._type}
                >
                    {/* Show Primitive information defined by the Element */}
                    {primitive.obj_tree_el}
                </SelectableItemTag>
            }}</For>            
        </DraggableSelection>
    </Show>
}