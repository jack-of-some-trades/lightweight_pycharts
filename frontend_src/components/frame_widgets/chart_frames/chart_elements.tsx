import { Accessor, JSX, Setter, Signal } from "solid-js";
import { TextIcon } from "../../icons";
import { Layout, layout_display } from "../../layout/layouts";
import { legend_props, PaneLegend } from "./pane_legend";


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