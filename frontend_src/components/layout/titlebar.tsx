import { onMount } from "solid-js"
import { container_manager } from "../../src/container_manager"
import { icons } from "../../src/icons"
import { Button } from "../button"
import { LAYOUT_SECTIONS } from "./wrapper"

interface title_bar_props {
    container_el: HTMLDivElement | undefined,
    show_section:(section:LAYOUT_SECTIONS) => void,
    hide_section:(section:LAYOUT_SECTIONS) => void,
}

export function TitleBar(props:title_bar_props) {  
    let tab_div:HTMLDivElement|undefined

    onMount(()=>{
        if (tab_div && props.container_el){
            window.container_manager = new container_manager(
                props.container_el, 
                tab_div
            )
        }
    })
    
    return <>
        <div ref={tab_div} class="titlebar titlebar_grab tabs drag-region">
            <div class="tabs-content"/>
        </div>
        <div class="titlebar titlebar_right drag-region">
            <Button {...{icon:icons.panel_left}}/>
            <Button icon={icons.panel_right}/>
            <Button icon={icons.panel_top}/>
            <Button icon={icons.panel_bottom}/>
        </div>
    </>
}