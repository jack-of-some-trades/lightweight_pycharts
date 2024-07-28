import { JSX, Show, createEffect, onMount } from 'solid-js'
import { SetStoreFunction, createStore } from 'solid-js/store'
import { OverlayContextProvider } from '../overlay/overlay_manager'
import { TitleBar } from './titlebar'
import { TopBar } from './topbar/topbar'

const MARGIN = 5
const TOP_HEIGHT = 38
const TITLE_HEIGHT = 38
const NAVBAR_WIDTH = 52
const TOOLBAR_WIDTH = 46
const UTILBAR_WIDTH = 38

interface layout_struct {
    center:{width:string, height:string, top:string, left:string},
    titlebar:{width:string, height:string, top:string, left:string},
    topbar:{visible:boolean, width:string, height:string, top:string, left:string},
    toolbar:{visible:boolean, width:string, height:string, top:string, left:string},
    navbar:{visible:boolean, width:string, height:string, top:string, right:string},
    utilbar:{visible:boolean, width:string, height:string, bottom:string, left:string},
}

//Any value of -1px is dynamically set upon resize event
const layout_default:layout_struct = {
    center:{width:'-1px', height:'-1px', top:`${TITLE_HEIGHT + TOP_HEIGHT + MARGIN}px`, left:`${TOOLBAR_WIDTH + MARGIN}px`},
    titlebar:{width:'100vw', height:'38px', top:'0px', left:'0px'},
    topbar:{visible:true, width:'100vw', height:'38px', top:`${TITLE_HEIGHT}px`, left:'0px'},
    toolbar:{visible:true, width:`${TOOLBAR_WIDTH}px`, height:'-1px', top:`${TITLE_HEIGHT + TOP_HEIGHT + MARGIN}px`, left:'0px'},
    navbar:{visible:true, width:`${NAVBAR_WIDTH}px`, height:'-1px', top:`${TITLE_HEIGHT + TOP_HEIGHT + MARGIN}px`, right:'0px'},
    utilbar:{visible:true, width:'-1px', height:`${UTILBAR_WIDTH}px`, bottom:'0px', left:`${TOOLBAR_WIDTH + MARGIN}px`},
}

export enum LAYOUT_SECTIONS {
    TITLE_BAR = 'div_title',
    TOP_BAR = 'div_top',
    TOOL_BAR = 'div_left',
    NAV_BAR = 'div_right',
    UTIL_BAR = 'div_bottom',
    CENTER = 'div_center'
}

export function Wrapper(){
    let container_el: HTMLDivElement | undefined
    const [layout, set_layout] = createStore(layout_default)

    onMount(() => { 
        //Add Resize listener
        window.addEventListener('resize', () => resize(window.innerWidth, window.innerHeight, layout, set_layout))
        resize(window.innerWidth, window.innerHeight, layout, set_layout) //Set initial size
    });
    //createEffect adds a section visibility listener
    createEffect(() => resize(window.innerWidth, window.innerHeight, layout, set_layout))

    //Functions to be passed to the Titlebar
    const title_bar_props = {
        show_section:show_section_unbound.bind(undefined, set_layout),
        hide_section:hide_section_unbound.bind(undefined, set_layout),
    }

    return <>
        <GlobalContexts>
            <div id='layout_wrapper' class='wrapper'>
                <div ref={container_el} id='layout_center' class='layout_main' style={layout.center}/>
                <div id='layout_title' class='layout_title layout_flex' style={layout.titlebar}>
                    <TitleBar container_el={container_el} {...title_bar_props}/>
                </div>
                <Show when={layout.topbar.visible}> <TopBar style={layout.topbar}/> </Show>
                <Show when={layout.toolbar.visible}><div id='layout_left' class='layout_main layout_flex' style={layout.toolbar}/>
                </Show>
                <Show when={layout.navbar.visible}><div id='layout_right' class='layout_main layout_flex' style={layout.navbar}/>
                </Show>
                <Show when={layout.utilbar.visible}><div id='layout_bottom' class='layout_main' style={layout.utilbar}/>
                </Show>
            </div>
        </GlobalContexts>
    </>
}

function GlobalContexts(props:JSX.HTMLAttributes<HTMLElement>){
    return <>
        <OverlayContextProvider>
            {props.children}
        </OverlayContextProvider>
    </>
}

function resize(width:number, height:number, layout:layout_struct, set_layout:SetStoreFunction<layout_struct>){
    let side_bar_height = height
    let center_height = height - TITLE_HEIGHT
    let center_width = width

    if (layout.topbar.visible){
        side_bar_height -= (TOP_HEIGHT + MARGIN)
        center_height -= (TOP_HEIGHT + MARGIN)
    }
    if (layout.toolbar.visible)
        center_width -= (TOOLBAR_WIDTH + MARGIN)
    if (layout.navbar.visible)
        center_width -= (NAVBAR_WIDTH + MARGIN)
    if (layout.utilbar.visible)
        center_height -= (UTILBAR_WIDTH + MARGIN)

    //Top Bar automatically resizes, no adjustment needed
    set_layout('toolbar', 'height', `${side_bar_height}px`)
    set_layout('navbar', 'height', `${side_bar_height}px`)
    set_layout('center', 'height', `${center_height}px`)
    set_layout('center', 'width', `${center_width}px`)
    set_layout('utilbar', 'width', `${center_width}px`)

    //Resize Active Charting window (Ensures proper resize execution)
    if (window.active_container) {
        window.active_container.resize()
    }
}

function show_section_unbound(set_layout:SetStoreFunction<layout_struct>, section: LAYOUT_SECTIONS) {
    switch (section) {
        case (LAYOUT_SECTIONS.TOOL_BAR):
            set_layout('center', 'left', `${TOOLBAR_WIDTH + MARGIN}px`)
            set_layout('utilbar', 'left', `${TOOLBAR_WIDTH + MARGIN}px`)
            set_layout('toolbar', 'visible', true)
            break;
        case (LAYOUT_SECTIONS.NAV_BAR):
            set_layout('navbar', 'visible', true)
            break;
        case (LAYOUT_SECTIONS.TOP_BAR):
            set_layout('toolbar', 'top', `${TITLE_HEIGHT + TOP_HEIGHT + MARGIN}px`)
            set_layout('navbar', 'top', `${TITLE_HEIGHT + TOP_HEIGHT + MARGIN}px`)
            set_layout('center', 'top', `${TITLE_HEIGHT + TOP_HEIGHT + MARGIN}px`)
            set_layout('topbar', 'visible', true)
            break;
        case (LAYOUT_SECTIONS.UTIL_BAR):
            set_layout('utilbar', 'visible', true)
    }
}

function hide_section_unbound(set_layout:SetStoreFunction<layout_struct>, section: LAYOUT_SECTIONS) {
    switch (section) {
        case (LAYOUT_SECTIONS.TOOL_BAR):
            set_layout('center', 'left', `0px`)
            set_layout('utilbar', 'left', `0px`)
            set_layout('toolbar', 'visible', false)
            break;
        case (LAYOUT_SECTIONS.NAV_BAR):
            set_layout('navbar', 'visible', false)
            break;
        case (LAYOUT_SECTIONS.TOP_BAR):
            set_layout('toolbar', 'top', `${TITLE_HEIGHT}px`)
            set_layout('navbar', 'top', `${TITLE_HEIGHT}px`)
            set_layout('center', 'top', `${TITLE_HEIGHT}px`)
            set_layout('topbar', 'visible', false)
            break;
        case (LAYOUT_SECTIONS.UTIL_BAR):
            set_layout('utilbar', 'visible', false)
    }
}