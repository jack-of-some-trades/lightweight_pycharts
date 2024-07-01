import { Show, createEffect, createSignal, onMount } from 'solid-js'
import { get_svg, icons } from '../src/icons'

export function indicator(){
    const [state, setState] = createSignal(true)

    createEffect(()=>console.log(state()))

    const icon_el = get_svg(icons.menu)

    onMount(()=>{

        setTimeout(() => {
            icon_el.setAttribute('active','')
        }, 1000)
        setTimeout(() => {
            setState(false)
        }, 2000)
        setTimeout(() => {
            setState(true)
        }, 3000)
        
    })

    return (
        <Show when={state()}>
            <div><h2>A Simple Popup?</h2>{icon_el}</div>
            
        </Show>
    )
}