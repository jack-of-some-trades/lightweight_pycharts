
import { Accessor, createContext, createSignal, For, JSX, Setter, useContext } from "solid-js"
import { Icon, icons } from "../../icons"
import { location_reference, OverlayCTX, OverlayDiv, point } from "../../overlay/overlay_manager"
import { toolbar_menu_props, ToolBarMenuButton } from "./toolbar_menu"

import "../../../css/layout/toolbar.css"
import { TOOL_FUNC_MAP } from "../../../src/tools"

export function ToolBar(props:JSX.HTMLAttributes<HTMLDivElement>){
    return <div id='layout_left' class='layout_main layout_flex' {...props}>
        {/**** Top Aligned ****/}
        <div class='toolbar' style={{"justify-content":"flex-start"}}>
            <ToolBarMenuButton {...crosshair_menu_props}/>
            <ToolBarMenuButton {...trend_menu_props}/>
            <ToolBarMenuButton {...fib_menu_props}/>
            <ToolBarMenuButton {...measure_menu_props}/>
            <div class='toolbar_separator'/>
        </div>

        {/**** Bottom Aligned ****/}
        <div class='toolbar' style={{"justify-content":"flex-end"}}>
            <div class='toolbar_separator'/>
            <ToolBoxToggle/>
        </div>
    </div>
}

function ToolBoxToggle(){
    const id = "toolbox"
    const visibilitySignal = createSignal<boolean>(false)
    const visibility = visibilitySignal[0]
    const setVisibility = visibilitySignal[1]

    OverlayCTX().attachOverlay(
        id,
        <ToolBoxOverlay id={id} />,
        visibilitySignal,
        false, // Don't Auto Hide. Only Toggle Btn Should change visibility
    )

    return <div class="toolbox_btn_wrap" onMouseDown={()=>setVisibility(!visibility())} >    
        <Icon 
            icon={visibility()? icons.star_filled: icons.star}
            width={26}
            height={26}
            classList={{toolbox_btn:true}}
        />
    </div>
    
}

//#region --------------------- Toolbox Context --------------------- //

interface toolbox_context_props {
    tools:Accessor<icons[]>,
    setTools:Setter<icons[]>
    location:Accessor<point>,
    setLocation:Setter<point>
}

const default_toolbox_props:toolbox_context_props = {
    tools: () => [],
    setTools: () => {},
    location: () => {return {x:0, y:0}},
    setLocation: () => {},
}

const ToolboxContext = createContext<toolbox_context_props>(default_toolbox_props)
export function ToolBoxCTX():toolbox_context_props { return useContext(ToolboxContext) }


export function ToolBoxContext(props:JSX.HTMLAttributes<HTMLElement>){

    const [tools, setTools] = createSignal<icons[]>([])
    const [location, setLocation] = createSignal<point>({x:60, y:window.innerHeight-50})

    const ToolboxCTX:toolbox_context_props = {
        tools:tools,
        setTools:setTools,
        location:location,
        setLocation:setLocation,
    }

    return <ToolboxContext.Provider value={ToolboxCTX}>
        {props.children}
    </ToolboxContext.Provider>
}

//#endregion


//#region --------------------- Toolbox Overlay --------------------- //


interface toolbox_props extends JSX.HTMLAttributes<HTMLDivElement> {
    id:string
}


function ToolBoxOverlay( props:toolbox_props ){
    const tools = ToolBoxCTX().tools
    const location = ToolBoxCTX().location
    const setLocation = ToolBoxCTX().setLocation

    const move = (e:MouseEvent) => {
        if (e.target !== document.documentElement)
            setLocation({
                x:location().x + e.movementX, 
                y:location().y + e.movementY
            })
    }

    const mouseup = (e:MouseEvent) => {
        if(e.button === 0) {
            document.removeEventListener('mousemove', move)
            document.removeEventListener('mouseup', mouseup)
        }
    }
    
    return (
        <OverlayDiv 
            id={props.id}
            location={location()}
            location_ref={location_reference.TOP_LEFT}
            bounding_client_id={`#${props.id}>#menu_dragable`}
        >
            {/* Drag Handle */}
            <Icon 
                hover={false} 
                icon={icons.menu_dragable} 
                onMouseDown={(e)=>{ if(e.button === 0) {
                    document.addEventListener('mousemove', move)
                    document.addEventListener('mouseup', mouseup)
                }}}
            />

            {/* Favorite Tools */}
            <For each={tools()}>{(tool)=>
                <Icon 
                    icon={tool}
                    onClick={TOOL_FUNC_MAP.get(tool)}
                />
            }</For>
        </OverlayDiv>
    )
}

//#endregion


//#region --------------------- Toolbar Section Props --------------------- //

const crosshair_menu_props:toolbar_menu_props = {
    id:"crosshair_menu",
    default_icon: icons.cursor_cross,
    tools:[
        [icons.cursor_cross, icons.cursor_dot, icons.cursor_arrow],
    ]
}


const trend_menu_props:toolbar_menu_props = {
    id:"trend_menu",
    default_icon: icons.trend_line,
    tools:[
        [icons.trend_line, icons.horiz_line, icons.vert_line, icons.horiz_ray],
        [icons.polyline],
        [icons.channel_parallel, icons.channel_disjoint],
    ]
}


const fib_menu_props:toolbar_menu_props = {
    id:"fibonacci_menu",
    default_icon: icons.fib_retrace,
    tools:[
        [icons.fib_retrace, icons.fib_extend],
    ]
}


const measure_menu_props:toolbar_menu_props = {
    id:"measure_menu",
    default_icon: icons.range_price,
    tools:[
        [icons.range_price, icons.range_date, icons.range_price_date],
    ]
}

//#endregion