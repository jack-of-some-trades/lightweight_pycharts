export type update_tab_func = (
    title?: string,
    price?: string,
    favicon?: string
) => void

export interface container_args{
    id:string, 
    parent_div: HTMLDivElement, 
    update_tab_func:update_tab_func
}

/**
 * Abstract base class to define basic requirements and functionality of anything displayed in
 * the center of the app.
 */
export abstract class container{
    id:string
    div: HTMLDivElement
    update_tab: update_tab_func

    constructor(init_args:container_args) {
        this.id = init_args.id
        this.div = document.createElement('div')
        this.div.classList.add('layout_main')
        init_args.parent_div.appendChild(this.div)

        this.update_tab = init_args.update_tab_func

        window.container_manager.set_active_container(this.id)
    }

    abstract on_activation(): void
    abstract on_deactivation(): void
    abstract resize(): void
    abstract remove(): void
}