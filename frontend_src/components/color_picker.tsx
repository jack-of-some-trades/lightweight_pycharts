import { createContext, createEffect, createSignal, For, JSX, onCleanup, onMount, Show, splitProps, useContext } from "solid-js"


import { createStore, SetStoreFunction } from "solid-js/store"
import "../css/color_picker.css"
import { Icon, icons } from "./icons"

const default_colors = [
    '#EBB0B0','#E9CEA1','#E5DF80','#ADEB97','#A3C3EA','#D8BDED',
    '#E15F5D','#E1B45F','#E2D947','#4BE940','#639AE1','#D7A0E8',
    '#E42C2A','#E49D30','#E7D827','#3CFF0A','#3275E4','#B06CE3',
    '#F3000D','#EE9A14','#F1DA13','#2DFC0F','#1562EE','#BB00EF',
    '#B50911','#E3860E','#D2BD11','#48DE0E','#1455B4','#6E009F',
    '#7C1713','#B76B12','#8D7A13','#479C12','#165579','#51007E',
]

// #region --------------------- Color Picker Context ----------------------- */

interface color_context_props { userColors: string[], setUserColors:SetStoreFunction<string[]> }
const default_color_props:color_context_props = { userColors: [], setUserColors: () => {} }

let ColorPickerContext = createContext<color_context_props>(default_color_props)
export function ColorPickerCTX():color_context_props { return useContext(ColorPickerContext) }

export function ColorContext(props:JSX.HTMLAttributes<HTMLElement>){
    const [userColors, setUserColors] = createStore<string[]>([])
    window.api.set_user_colors = setUserColors

    const ColorPickerCTX:color_context_props = {
        userColors:userColors,
        setUserColors:setUserColors
    }
    ColorPickerContext = createContext<color_context_props>(ColorPickerCTX)

    return <ColorPickerContext.Provider value={ColorPickerCTX}>
        {props.children}
    </ColorPickerContext.Provider>
}

// #endregion

// #region --------------------- Color Picker Element ----------------------- */

interface color_input_props extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'ref'|'onInput'|'oninput'> {
    input_id:string, 
    init_color:string, //rbga() or #hex string
    onInput?:(color:string)=>void,
}
export function ColorInput(props:color_input_props){
    let divRef = document.createElement('div')
    let opacityRef = document.createElement('input')
    const [showMenu, setShowMenu] = createSignal(false)
    const [selectedColor, setSelectedColor] = createSignal(
        props.init_color === '' ? '#00000000' :
        props.init_color.startsWith('#') ? props.init_color :
        RGBAToHex(props.init_color)
    )
    const [, divProps] = splitProps(props, ["input_id", "init_color", 'onInput'])

    //Document wide Hide menu to close out color picker when a click occurs outside of it.
    const hide_menu = (e:MouseEvent) => {if(! divRef.contains(e.target as HTMLElement)) setShowMenu(false)}
    onMount(() => document.addEventListener('mousedown', hide_menu))
    onCleanup(() => document.removeEventListener('mousedown', hide_menu))

    //#region ---- Functions to parse input and click events ---- 
    function onColorSelect(e:MouseEvent, color:string){
        if(e.button === 0) {
            let hex_num = Math.round(parseInt(opacityRef.value) * 2.55)
            setSelectedColor(color + hex_num.toString(16).padStart(2,'0'))
        }
    }

    function onOpacitySelect(){
        let hex_num = Math.round(parseInt(opacityRef.value) * 2.55)
        setSelectedColor(selectedColor().slice(0, 7) + hex_num.toString(16).padStart(2,'0'))
    }

    const get_opacity = () => Math.round(Number('0x' + selectedColor().slice(7))/ 2.55 )

    createEffect(()=>{
        if (props.onInput) props.onInput(selectedColor())
    })

    return <div ref={divRef} {...divProps} style={{'background-color':selectedColor()}}>
        {/* Inner div to conform to parent's size shape, also set position to relative. */}
        <div onClick={(e)=>{if(e.button === 0) setShowMenu(true)}}
            style={{width:"100%", height:"100%", position:"relative"}}
        >
            <Show when={showMenu()}>
                <div class="color_menu">
                    <DefaultColorSet onSel={onColorSelect}/>
                    <div class="cpick_separator"/>
                    <UserColorSet onSel={onColorSelect}/>
                    <div class="cpick_separator"/>
                    <div class="opacity_txt" innerText={"Opacity: " + get_opacity().toString() + "%"}/>
                    <input 
                        ref={opacityRef}
                        type="range" step={5}
                        value={selectedColor().length === 9 ? get_opacity() : 100 }
                        oninput={onOpacitySelect}
                    />
                </div>
            </Show>
        </div>

        {/* invisible Input tag, w/ user id, to enable querySelecting the chosen color */}
        <input 
            id={props.input_id} 
            type="color_picker" 
            value={selectedColor()}
        />
    </div>
}

function DefaultColorSet(props:{onSel:(e:MouseEvent, color:string)=>void}){
    return <div class="color_set"> 
        <For each={default_colors}>{(color)=>
            <div 
                class="color_box" 
                style={{"background-color":color}} 
                onMouseDown={(e) => props.onSel(e, color)}
            />
        }</For>
    </div>
}

function UserColorSet(props:{onSel:(e:MouseEvent, color:string)=>void}){
    const {userColors, setUserColors} = ColorPickerCTX()

    /** 
     * If you're here wandering why the last User Selectable Color wont delete and it annoys you, same.
     * the setUserColors() call below correctly slices the array. It should be deleteing.. best I can
     * tell it's a bug in SolidJS where the last element of an array (in a store) can't be trimmed
     */

    return <div class="color_set user_opts"> 
        <For each={userColors}>{(color, i) => <>
            <div class="color_box" style={{"background-color":color}} 
                onKeyDown={(e) => { if(e.key === 'Delete')
                    setUserColors([...userColors.slice(0,i()), ...userColors.slice(i() + 1)])
                }}
                onMouseDown={(e) => props.onSel(e, color)}
            >
                <input 
                    type='color' 
                    value={color.slice(0,7)}
                    onblur={(e:FocusEvent) => setUserColors(i(), (e.target as HTMLInputElement).value)}
                />
            </div>
        </>
        }</For>
        <div class="color_box">
            <Icon 
                icon={icons.options_add} 
                style={{width:"18px", height:"18px"}}
                onClick={() => setUserColors([...userColors, "#000000"])}
            />
        </div>
    </div>
}

function RGBAToHex(rgba:string, forceRemoveAlpha=false) {
    return "#" + rgba.replace(/^rgba?\(|\s+|\)$/g, '').split(',') 
        .filter((string, index) => !forceRemoveAlpha || index !== 3)
        .map(string => parseFloat(string))
        .map((number, index) => index === 3 ? Math.round(number * 255) : number)
        .map(number => number.toString(16))
        .map(string => string.length === 1 ? "0" + string : string)
        .join("")
}