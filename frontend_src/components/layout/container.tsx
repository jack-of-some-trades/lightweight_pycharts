import { Accessor, createContext, createSignal, For, JSX, Setter, useContext } from "solid-js"
import { Orientation } from "../../src/layouts"

export interface layout_display {
    orientation: Orientation
    element: JSX.Element | HTMLDivElement | undefined,
    mouseDown: (e:MouseEvent) => void
    el_active: Accessor<boolean>
    el_target: Accessor<boolean>
}

type ContainerContextProps = {
    getSize:Accessor<DOMRect>,
    setStyle: Setter<string>,
    setDisplay: Setter<layout_display[]>,
}
const default_ctx_args:ContainerContextProps = {
    getSize:() => {return new DOMRect(0,0,-1,-1)},
    setStyle: () => {},
    setDisplay: () => {},
}

let ContainerContext = createContext<ContainerContextProps>(default_ctx_args);
export function ContainerCTX():ContainerContextProps { return useContext<ContainerContextProps>(ContainerContext) }

export function Container(props : {style: JSX.CSSProperties}){
    let divRef = document.createElement('div')

    const [style, setStyle] = createSignal<string>('')
    const [displays, setDisplays] = createSignal<layout_display[]>([])
    const getSize = () => {return divRef.getBoundingClientRect()}

    const ctx_args:ContainerContextProps = {
        getSize: getSize,
        setStyle: setStyle,
        setDisplay: setDisplays,
    }
    ContainerContext = createContext<ContainerContextProps>(ctx_args);
    return <ContainerContext.Provider value={ctx_args}>
        <div id='layout_center' class='layout_main layout_flex' style={props.style}>
            <div ref={divRef} class="container">
                <style innerHTML={style()}/>
                <For each={displays()}>{(display) => {
                    
                    return (
                        <div
                            classList={{
                                frame: true, 
                                separator_v: display.orientation === Orientation.Vertical? true : false,
                                separator_h: display.orientation === Orientation.Horizontal? true : false 
                            }}
                            attr:active={display.el_active() ? "" : undefined}
                            attr:target={display.el_target() ? "" : undefined}
                            onMouseDown={display.mouseDown}
                        >
                            {display.element}
                        </div>
                    )}}
                </For>
            </div>
        </div>
    </ContainerContext.Provider>

}