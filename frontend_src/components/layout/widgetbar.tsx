import { createEffect, createSignal, JSX, Match, Setter, splitProps, Switch } from "solid-js";
import { Icon, icons } from "../icons";

import "../../css/layout/widget_panel.css";
import { FrameViewer } from "../widget_panels/frame_viewer";
import { ObjectTree } from "../widget_panels/object_tree";
import { WIDGET_BAR_WIDTH, WIDGET_PANEL_MARGIN } from "./wrapper";

const [selectedWidget, setSelectedWidget] = createSignal<icons | undefined>()

// #region --------------------- Widget Bar Selector ----------------------- */

interface widget_bar_props extends JSX.HTMLAttributes<HTMLDivElement> {
    panelDisplay: JSX.CSSProperties
    showWidgetPanel: ()=>void
    hideWidgetPanel: ()=>void
}
export function WidgetBar(props:widget_bar_props){

    createEffect(() => {
        props.panelDisplay.display === 'flex' && selectedWidget()? props.showWidgetPanel() : props.hideWidgetPanel()
    })

    return <div class='layout_main layout_flex flex_col' style={props.style}>
        <WidgetIcon icon={icons.frame_editor}/>
        <WidgetIcon icon={icons.object_tree}/>
    </div>
}

function WidgetIcon(props:{icon:icons} & JSX.SvgSVGAttributes<SVGSVGElement> ){
    return (
        <Icon 
            width={34} height={34}
            classList={{icon:false, widget_bar_icon:true}}
            style={{margin:'4px', padding:'2px'}}
            onClick={() => setSelectedWidget(selectedWidget() !== props.icon? props.icon : undefined)} 
            attr:active={selectedWidget() === props.icon? "": undefined}
            {...props}
        />
    )
}


// #endregion

// #region --------------------- Widget Panel Display ----------------------- */

const MIN_PANEL_WIDTH = 156
const MAX_PANEL_WIDTH = 468

export interface PanelProps {
    resizePanel: (size:number) => void
}

interface widget_panel_props extends JSX.HTMLAttributes<HTMLDivElement> {
    resizePanel: Setter<number>
}
export function WidgetPanel(props:widget_panel_props){
    const [, divProps] = splitProps(props, ['resizePanel'])

    const resizeWidgetPanel = (e:MouseEvent) => {
        let width =  window.innerWidth - (e.clientX + WIDGET_BAR_WIDTH + WIDGET_PANEL_MARGIN)
        props.resizePanel(Math.max(Math.min(width, MAX_PANEL_WIDTH), MIN_PANEL_WIDTH))
    }

    //Allows each panel to set their own base size when shown.
    const PanelProps:PanelProps = {
        resizePanel: (size:number) => {props.resizePanel(Math.max(Math.min(size, MAX_PANEL_WIDTH), MIN_PANEL_WIDTH))}
    }

    const onMouseDown = (e:MouseEvent) => {
        if (e.offsetX > 6) return
        // These do still cleanup when the move event sticks to the window despite lifting the mouse button
        document.addEventListener('mousemove', resizeWidgetPanel)
        document.addEventListener('mouseup', () => document.removeEventListener('mousemove', resizeWidgetPanel), {once:true})
    }

    return <div class='layout_main widget_panel' {...divProps} onMouseDown={onMouseDown}>
        <Switch>
            <Match when={selectedWidget() === icons.frame_editor}><FrameViewer {...PanelProps}/></Match>
            <Match when={selectedWidget() === icons.object_tree}><ObjectTree {...PanelProps}/></Match>
        </Switch>
    </div>
}

// #endregion