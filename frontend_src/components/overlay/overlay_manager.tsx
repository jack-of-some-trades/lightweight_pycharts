import { Accessor, createContext, createEffect, createSignal, For, JSX, on, onCleanup, onMount, Setter, Show, splitProps, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import "../../css/overlay/overlay.css";


//#region --------------------- Context Manager --------------------- //

type OverlayContextProps = {
    attachOverlay: (id:string, el:JSX.Element) => void,
    detachOverlay: (id:string) => void,
    getDivReference:(id:string) => undefined | HTMLDivElement,
    setDivReference:(id:string, el:HTMLDivElement) => void,
    getDisplaySetter:(id:string)=>Setter<boolean>,
    getDisplayAccessor:(id:string)=>Accessor<boolean>,
}
const default_ctx_args:OverlayContextProps = {
    attachOverlay: () => {},
    detachOverlay: () => {},
    getDivReference:() => {return undefined},
    setDivReference:() => {},
    getDisplaySetter: () => () => {},
    getDisplayAccessor: () => () => false,
}

const OverlayContext = createContext<OverlayContextProps>(default_ctx_args);
export function OverlayCTX():OverlayContextProps { 
    return useContext<OverlayContextProps>(OverlayContext) 
}

interface overlay_struct {
    id:string,              // Id of the menu
    el:JSX.Element          // The Menu itself, Should be an <OverlayDiv/>
}
export function OverlayContextProvider(props:JSX.HTMLAttributes<HTMLElement>) {
    const [overlays, setOverlays] = createStore<overlay_struct[]>([])
    const displayMap = new Map<string, [Accessor<boolean>, Setter<boolean>]>()
    const divMap = new Map<string, HTMLDivElement>()

    //#region ------------------- Overlay Context Functions ------------------- //

    /** Place a menu in the overlay manager
     * @param menu : JSX.Element, This should, at the topmost level, be an <OverlayDiv/>
     */
    function attachOverlay(id:string, el:JSX.Element){
        setOverlays([...overlays, {id:id, el:el}])
        displayMap.set(id, createSignal(false))
    }
    function detachOverlay(id:string){
        displayMap.delete(id)
        setOverlays(overlays.filter((overlay) => overlay.id !== id))
    }
    function getDivReference(id:string){ return divMap.get(id)}
    function setDivReference(id:string, el:HTMLDivElement){ divMap.set(id, el) }

    function getDisplayAccessor(id:string):Accessor<boolean>{
        const display = displayMap.get(id)
        return (display !== undefined)? display[0] : () => false
    }
    function getDisplaySetter(id:string):Setter<boolean>{
        const display = displayMap.get(id)
        return (display !== undefined)? display[1] : () => undefined
    }

    //#endregion

    const OverlayCTX = {
        attachOverlay:attachOverlay,
        detachOverlay:detachOverlay,
        getDivReference:getDivReference,
        setDivReference:setDivReference,
        getDisplaySetter:getDisplaySetter,
        getDisplayAccessor:getDisplayAccessor
    }

    //This Listener checks all Overlay Elements and removes visibility if a mouse event occurs 
    //outside of a menu 
    document.body.addEventListener('mousedown', (e) => 
        Array.from(overlays).forEach(
            ({id}) => {
                let el = getDivReference(id)
                if (el && ! el.contains(e.target as Node))
                    getDisplaySetter(id)(false)
            }
        )
    )

    return (
        <OverlayContext.Provider value={OverlayCTX}>
            {props.children}

            <div id='overlay_manager'>
                <For each={overlays}>{(overlay)=>
                    <Show when={getDisplayAccessor(overlay.id)()}>{overlay.el}</Show>
                }</For>
            </div>
        </OverlayContext.Provider>
    )
}

//#endregion

//#region --------------------- Overlay Mounting Interface --------------------- //

export type point = { x:number, y:number }
export enum location_reference {
    TOP_RIGHT,
    TOP_LEFT,
    BOTTOM_RIGHT,
    BOTTOM_LEFT,
    CENTER
}

/**
 * @param id : String ID of the Overlay Component. Can be used to retrieve the Visibility State
 * @param ref :
 * @param location : {x,y} Coordinate to draw the point at. Can be a reactive Signal
 * @param updateLocation : [Optional] function that can be called to update the location parameter above,
 *        Useful when the location is referencing a Signal that cannot be reactive such as a Div's ClientBoundingBox
 * @param display_ref : Reference Corner to position the Div, e.g. TOP_RIGHT will mean the top right corner of 
 *        the div will be drawn at location:{x,y}
 */
export interface overlay_div_props extends JSX.HTMLAttributes<HTMLDivElement> {
    id:string
    location: point
    location_ref: location_reference
    updateLocation?: () => void
}


/**
 * Interface that should be used when mounting a component to the Overlay Manager.
 * This wrapper div sets the necessary Event Listeners for Displaying and Positioning the component
 */
export function OverlayDiv(props:overlay_div_props){
    let divRef : HTMLDivElement|undefined = undefined
    props.classList = {...props.classList, overlay:true}
    const [style, setStyle] = createSignal<JSX.CSSProperties>({})
    const [,divProps] = splitProps(props, ["id", "location", "location_ref", "updateLocation"])
    
    //#region ------------------- Position Update Listeners ------------------- //

    //Set Position Function and preserve the Reactivity of Display_Ref
    let getBoundedPosition = getBoundedPositionFunc(props.location_ref)
    createEffect(() => { getBoundedPosition = getBoundedPositionFunc(props.location_ref) })

    onMount(() => {
        const display = OverlayCTX().getDisplayAccessor(props.id)

        //Next effect only really needs to fire once. It gets a reference to the Div once it is
        //attached to the document. Sadly, its the easiest way to get this reference
        createEffect(on(display, () => {
            if(!divRef) {
                divRef = document.querySelector(`#${props.id}`) as HTMLDivElement?? undefined
                OverlayCTX().setDivReference(props.id, divRef)
            }
        }))

        //Update Div Location when Location Changes (Preserve Reactivity of props.location)
        createEffect(() =>{ setStyle(getBoundedPosition(props.location, divRef?.getBoundingClientRect()))})

        //Manually Update Location on visibilty change and resize if given a means to.
        if (props.updateLocation) {
            createEffect(on(display, props.updateLocation))
            window.addEventListener('resize', props.updateLocation)
        }
    })
    onCleanup(() => {
        if (props.updateLocation) window.removeEventListener('resize', props.updateLocation)
    })

    //#endregion
    return (
        <div {...divProps} id={props.id}
            style={style()}>
            {props.children}
        </div>
    )
}

/**
 * @returns A Function that can be called with the desired drawing location and DOMRect of the given overlayDiv.
 *          This Function itself returns the CSSProperties Style that will place the OverlayDiv into the window
 *          at the location if possible. The draw location is bounded such that the OverlayDiv will not draw
 *          outside the window
 * @param display_ref : The desired reference corner in which to draw the OverlayDiv from
 */
function getBoundedPositionFunc(display_ref:location_reference):(pt:point, rect:DOMRect|undefined) => JSX.CSSProperties {
    switch(display_ref){
        case (location_reference.TOP_LEFT):
            return (pt:point, overlay_rect:DOMRect|undefined) => {
                const window_rect = document.querySelector('#overlay_manager')?.getBoundingClientRect()
                if (!window_rect || !overlay_rect) return {x:-1, y:-1}

                return {
                    top:`${Math.round(Math.min(Math.max(pt.y, 0), window_rect.height - overlay_rect.height))}px`, 
                    left:`${Math.round(Math.min(Math.max(pt.x, 0), window_rect.width - overlay_rect.width))}px`
                }
            }

        case (location_reference.BOTTOM_LEFT):
            return (pt:point, overlay_rect:DOMRect|undefined) => {
                const window_rect = document.querySelector('#overlay_manager')?.getBoundingClientRect()
                if (!window_rect || !overlay_rect) return {x:-1, y:-1}

                return {
                    bottom:`${Math.round(window_rect.height - Math.min(Math.max(pt.y, overlay_rect.height), window_rect.height))}px`,
                    left:`${Math.round(Math.min(Math.max(pt.x, 0), window_rect.width - overlay_rect.width))}px`
                }
            }

        case (location_reference.TOP_RIGHT):
            return (pt:point, overlay_rect:DOMRect|undefined) => {
                const window_rect = document.querySelector('#overlay_manager')?.getBoundingClientRect()
                if (!window_rect || !overlay_rect) return {x:-1, y:-1}

                return {
                    top:`${Math.round(Math.min(Math.max(pt.y, 0), window_rect.height - overlay_rect.height))}px`,
                    right:`${Math.round(window_rect.width - Math.min(Math.max(pt.x, overlay_rect.width), window_rect.width))}px`
                    }
            }

        case (location_reference.BOTTOM_RIGHT):
            return (pt:point, overlay_rect:DOMRect|undefined) => {
                const window_rect = document.querySelector('#overlay_manager')?.getBoundingClientRect()
                if (!window_rect || !overlay_rect) return {x:-1, y:-1}

                return {
                    bottom:`${Math.round(window_rect.height - Math.min(Math.max(pt.y, overlay_rect.height), window_rect.height))}px`,
                    right:`${Math.round(window_rect.width - Math.min(Math.max(pt.x, overlay_rect.width), window_rect.width))}px`
                }
            }

        case (location_reference.CENTER):
            return (pt:point, overlay_rect:DOMRect|undefined) => {
                const window_rect = document.querySelector('#overlay_manager')?.getBoundingClientRect()
                if (!window_rect || !overlay_rect) return {x:-1, y:-1}
                const left_bound = overlay_rect.width/2
                const top_bound = overlay_rect.height/2
                const right_bound = window_rect.width - left_bound
                const bottom_bound = window_rect.height - top_bound

                return {
                    top:`${Math.round(Math.min(Math.max(pt.y, top_bound), bottom_bound))}px`,
                    left:`${Math.round(Math.min(Math.max(pt.x, left_bound), right_bound))}px`
                }
            }
    }
}

//#endregion