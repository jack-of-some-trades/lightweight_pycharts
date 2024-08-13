import { Accessor, JSX, Setter, Signal, splitProps } from "solid-js";
import { TextIcon } from "../../icons";
import { Layout, layout_display } from "../../layout/layouts";
import { legend_props, PaneLegend } from "./pane_legend";


interface chart_frame_props {
    ref:Setter<HTMLDivElement>
    innerStyle: Accessor<string>
    displays: Accessor<layout_display[]>
}
export function ChartFrame(props:chart_frame_props){
    return (
        <Layout ref={props.ref} 
            class="chart_frame"
            select_cls="pane"
            innerStyle={props.innerStyle}
            displays={props.displays}
        />
    )
}

interface chart_pane_props extends JSX.HTMLAttributes<HTMLDivElement> {
    chart_el:HTMLDivElement
    legend_props:legend_props
}
export function ChartPane(props:chart_pane_props){
    const [, divProps] = splitProps(props, ["chart_el", "legend_props"])
    return <div {...divProps}>
        {props.chart_el}
        <PaneLegend {...props.legend_props}/>
    </div>
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