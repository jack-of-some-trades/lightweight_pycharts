/**
 * JSX Components that are responsible for displaying, or are displayed on top of, a Charting Window.
 */
import { Accessor, createSignal, JSX, onCleanup, Setter, Show, Signal } from "solid-js";
import { TextIcon } from "../icons";
import { Layout, layout_display } from "../layout/layouts";
import { legend_props, PaneLegend } from "./pane_legend";


/**
 * @style_sel : querySelect string used by <Layout/> to ensure style sizing is only applied
 *              to the appropriate elements. Should be unique
 * @ref       : SolidJS Setter for a Div Element. The Getter function can later be invoked to retrieve the
 *              element for width/height measurement
 * @innerStyle :Style String to be place into the window
 * @displays  : Layout_Display[] List to be used by <Layout/>
 */
interface chart_frame_props {
    style_sel:string
    ref:Setter<HTMLDivElement>
    innerStyle: Accessor<string>
    displays: Accessor<layout_display[]>
}
export function ChartFrame(props:chart_frame_props){
    return <>
        <Layout 
            select_cls={props.style_sel}
            innerStyle={props.innerStyle}
            displays={props.displays}
        />
        <div ref={props.ref} class="frame_ruler"/>
    </>
}

/**
 * @ref :   SolidJS Setter for a Div Element. The Getter function can later be invoked to retrieve the
 *              element for width/height measurement
 * @chart_el : Charting Element to be placed into the window
 * @legend_Props : Props to be used in creation of an Indicator's Legend. See <PaneLegend/>
 */
interface chart_pane_props {
    ref:Setter<HTMLDivElement>
    chart_el:HTMLDivElement
    legend_props:legend_props

    rightScaleMode: Signal<number>
    rightScaleInvert: Signal<boolean>
    leftScaleMode: Signal<number>
    leftScaleInvert: Signal<boolean>
}
export function ChartPane(props:chart_pane_props){
    
    const left_scale_el = props.chart_el.querySelector("table > tr:first-child > td:nth-child(1)") as HTMLTableCellElement
    const right_scale_el = props.chart_el.querySelector("table > tr:first-child > td:nth-child(3)") as HTMLTableCellElement

    return <>
        {props.chart_el}
        <PaneLegend {...props.legend_props}/>
        <ScaleToggle 
            class='scale_buttons_left'
            scale_ref={left_scale_el} 
            scale_signal={props.leftScaleMode} 
            invert_signal={props.leftScaleInvert} 
        />
        <ScaleToggle
            class='scale_buttons_right'
            scale_ref={right_scale_el} 
            scale_signal={props.rightScaleMode} 
            invert_signal={props.rightScaleInvert} 
        />
        <div ref={props.ref} class="pane_ruler"/>
    </>
}


/**
 * To Be Implemented: Component to display over a given price axis to change the scale between Log and Linear.
 */
interface scale_props extends JSX.HTMLAttributes<HTMLDivElement>{
    scale_ref:HTMLTableCellElement
    scale_signal:Signal<number>, 
    invert_signal:Signal<boolean>
}
function ScaleToggle(props:scale_props){
    let divRef = document.createElement('div')
    const [show, setShow] = createSignal(false)
    const [wrapperStyle, setWrapperStyle] = createSignal<JSX.CSSProperties>({width:'0px'})

    const event_cleaner = new AbortController()
    onCleanup(()=>{event_cleaner.abort()})

    props.scale_ref.addEventListener('mouseleave', (e:MouseEvent)=>{
        if(!divRef.contains(e.relatedTarget as HTMLElement)) setShow(false)
    },{signal:event_cleaner.signal})

    props.scale_ref.addEventListener('mouseenter', ()=>{
        const rect = props.scale_ref.getBoundingClientRect()
        setWrapperStyle({ width:`${Math.min(rect.width/2), 28}px`})
        setShow(true)
    },{signal:event_cleaner.signal})

    //Set to Mode if not already, otherwise reset to normal
    const setMode = (mode:number) => {
        props.scale_signal[1](props.scale_signal[0]() !== mode? mode : 0)
    }

    return <Show when={show()}>
        <div ref={divRef} class={props.class} style={wrapperStyle()}>
            <TextIcon 
                text={"L"}
                onClick={()=>setMode(1)}
                activated={props.scale_signal[0]() === 1}
                classList={{icon_text:false, scale_icon_text:true}}
            />
            <TextIcon 
                text={"%"} 
                onClick={()=>setMode(2)}
                activated={props.scale_signal[0]() === 2}
                classList={{icon_text:false, scale_icon_text:true}}
            />
            <TextIcon 
                text={"‰"} 
                onClick={()=>setMode(3)}
                activated={props.scale_signal[0]() === 3}
                classList={{icon_text:false, scale_icon_text:true}}
            />
            <TextIcon 
                text={"I"}
                style={{'margin-top':'6px'}}
                activated={props.invert_signal[0]()}
                onClick={()=>props.invert_signal[1](!props.invert_signal[0]())}
                classList={{icon_text:false, scale_icon_text:true}}
            />
        </div>
    </Show>
}