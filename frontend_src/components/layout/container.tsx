import { createContext, createSignal, JSX, useContext } from "solid-js";
import { default_layout_ctx_args, Layout, layout_display } from "./layouts";

import "../../css/layout/container.css";

let ContainerContext = createContext(default_layout_ctx_args);
export function ContainerCTX() { return useContext(ContainerContext) }

export function Container(props : {style: JSX.CSSProperties}){
    let divRef = document.createElement('div')

    const [style, setStyle] = createSignal<string>('')
    const [displays, setDisplays] = createSignal<layout_display[]>([])
    const getSize = () => {return divRef.getBoundingClientRect()}

    const ctx_args = {
        getSize: getSize,
        setStyle: setStyle,
        setDisplay: setDisplays,
    }

    //Redefine outer scope context variable (Effectively makes this a singleton.)
    ContainerContext = createContext(ctx_args);
    return <ContainerContext.Provider value={ctx_args}>
        <div ref={divRef} id='container' class='layout_main' style={props.style}>
            <Layout
                select_cls="frame"
                innerStyle={style}
                displays={displays}
            />
        </div>
    </ContainerContext.Provider>
}