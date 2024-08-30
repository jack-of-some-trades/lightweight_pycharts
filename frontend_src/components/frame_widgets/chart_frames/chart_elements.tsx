/**
 * JSX Components that are responsible for displaying, or are displayed on top of, a Charting Window.
 */
import { Accessor, JSX, Setter, Signal } from "solid-js";
import { TextIcon } from "../../icons";
import { Layout, layout_display } from "../../layout/layouts";
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
interface chart_pane_props{
    ref:Setter<HTMLDivElement>
    chart_el:HTMLDivElement
    legend_props:legend_props
}
export function ChartPane(props:chart_pane_props){
    return <>
        {props.chart_el}
        <PaneLegend {...props.legend_props}/>
        <div ref={props.ref} class="pane_ruler"/>
    </>
}


/**
 * To Be Implemented: Component to display over a given price axis to change the scale between Log and Linear.
 */
interface scale_props extends JSX.HTMLAttributes<HTMLDivElement>{
    class:string, show:Accessor<boolean>, scale:Signal<number>
}
function ScaleToggle(props:scale_props){
    return (
        <TextIcon 
            class={props.class}
            style={{display:props.show()?'block':'none'}}
            text={"L"} 
            activated={props.scale[0]() === 1}
        />
    )
}