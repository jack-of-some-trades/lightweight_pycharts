import { createSignal, onMount, Show } from "solid-js"
import { container_manager } from "../../src/container_manager"
import { Btn, ToggleBtn } from "../buttons"
import { icons } from '../icons'
import { LAYOUT_SECTIONS } from "./wrapper"

import "../../css/layout/tabs.css"
import "../../css/layout/titlebar.css"

interface title_bar_props {
    container_el: HTMLDivElement | undefined,
    show_section:(section:LAYOUT_SECTIONS) => void,
    hide_section:(section:LAYOUT_SECTIONS) => void,
}

export function TitleBar(props:title_bar_props) {  
    let tab_div:HTMLDivElement|undefined
    const [frameless, setFrameless] = createSignal(false)
    const [fullscreen, setFullscreen] = createSignal(false)
    //Expose set function to global window so Python can access it.
    if (!window.api.setFrameless) window.api.setFrameless = setFrameless

    onMount(()=>{
        if (tab_div && props.container_el)
            window.container_manager = new container_manager(
                props.container_el, 
                tab_div
            )
    })
    
    return <>
        {/**** Tabs Bar ****/}
        <div ref={tab_div} class="titlebar titlebar_grab tabs drag-region">
            <div class="tabs-content"/>
        </div>

        {/**** Window Controls ****/}
        <div class="titlebar titlebar_btns drag-region">

            {/**** New Tab and Window Panel Controls ****/}
            <Btn icon={icons.window_add} classList={{window_btn:true}}
                style={{padding:'1px 3px'}}
                onClick={() => { window.api.add_container() }}/>
            <div class="titlebar_separator"/>
            <ToggleBtn icon={icons.panel_left} classList={{layout_btn:true}} activated={true} 
                onAct={()=>{props.show_section(LAYOUT_SECTIONS.TOOL_BAR)}} 
                onDeact={()=>{props.hide_section(LAYOUT_SECTIONS.TOOL_BAR)}}/>
            <ToggleBtn icon={icons.panel_right} classList={{layout_btn:true}} 
                onAct={()=>{props.show_section(LAYOUT_SECTIONS.NAV_BAR)}} 
                onDeact={()=>{props.hide_section(LAYOUT_SECTIONS.NAV_BAR)}}/>
            <ToggleBtn icon={icons.panel_top} classList={{layout_btn:true}} activated={true} 
                onAct={()=>{props.show_section(LAYOUT_SECTIONS.TOP_BAR)}} 
                onDeact={()=>{props.hide_section(LAYOUT_SECTIONS.TOP_BAR)}}/>
            <ToggleBtn icon={icons.panel_bottom} classList={{layout_btn:true}} 
                onAct={()=>{props.show_section(LAYOUT_SECTIONS.UTIL_BAR)}} 
                onDeact={()=>{props.hide_section(LAYOUT_SECTIONS.UTIL_BAR)}}/>


            {/**** Frameless Window Controls ****/}
            <Show when={frameless()}>
                <div class="titlebar_separator"/>
                <Btn icon={icons.minimize} classList={{window_btn:true}} style={{padding:'3px'}} width={16} height={16}
                    onClick={() => { window.api.minimize() }}/>
                <Show when={fullscreen()}><Btn icon={icons.restore} classList={{window_btn:true}}
                    onClick={() => { setFullscreen(false); window.api.restore()  }}/> </Show>
                <Show when={!fullscreen()}> <Btn icon={icons.maximize} classList={{window_btn:true}} style={{padding:'2px'}}
                    onClick={() => { setFullscreen(true); window.api.maximize()  }}/> </Show>
                <Btn icon={icons.close} classList={{window_btn:true}} style={{padding:'3px'}} width={16} height={16}
                    onClick={() => { window.api.close() }}/>
            </Show>
        </div>
    </>
}
