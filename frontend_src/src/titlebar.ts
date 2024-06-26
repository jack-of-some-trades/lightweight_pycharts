const Draggabilly = require('draggabilly')
import { icon_manager, icons } from "./icons";
import { LAYOUT_DIM_TITLE, Wrapper_Divs } from "./util_lwc";
import { Wrapper } from "./wrapper";

export class TitleBar {
    private div: HTMLDivElement

    private left_div: HTMLDivElement
    private right_div: HTMLDivElement

    tab_manager: Tabs

    constructor(parent: Wrapper) {
        this.div = parent.get_div(Wrapper_Divs.TITLE_BAR)

        this.left_div = document.createElement('div')
        this.left_div.classList.add('titlebar', 'titlebar_grab', 'tabs', 'drag-region')
        this.left_div.appendChild(document.createElement('div'))
        this.left_div.firstElementChild?.classList.add('tabs-content')

        this.right_div = document.createElement('div')
        this.right_div.classList.add('titlebar', 'titlebar_right', 'drag-region')
        this.right_div.appendChild(this.button(icons.window_add))
        this.right_div.appendChild(this.separator())
        this.right_div.appendChild(this.panel_toggle(parent, icons.panel_left))
        this.right_div.appendChild(this.panel_toggle(parent, icons.panel_top))
        this.right_div.appendChild(this.panel_toggle(parent, icons.panel_bottom, false))
        this.right_div.appendChild(this.panel_toggle(parent, icons.panel_right, false))

        this.div.appendChild(this.left_div)
        this.div.appendChild(this.right_div)

        this.tab_manager = new Tabs(this.left_div)
    }

    // This is called by the python View Class in _assign_callbacks if The view is frameless.
    create_window_btns() {
        this.right_div.appendChild(this.separator())
        this.right_div.appendChild(this.button(icons.minimize))
        this.right_div.appendChild(this.button(icons.maximize))
        this.right_div.appendChild(this.button(icons.close))
    }

    /**
     * Create a Topbar Toggleable div that shows/hides a layout panel
     * @param icon Valid args: icons.panel_left, icons.panel_right, icons.panel_bottom
     * @param active_start initial state of the panel, true === shown
     */
    panel_toggle(parent: Wrapper, icon: icons, active_start: boolean = true): HTMLDivElement {
        let toggle_btn = document.createElement('div')
        toggle_btn.classList.add('titlebar_menu_button')

        let wrap_div: Wrapper_Divs
        switch (icon) {
            case icons.panel_right:
                wrap_div = Wrapper_Divs.NAV_BAR
                break;
            case icons.panel_bottom:
                wrap_div = Wrapper_Divs.UTIL_BAR
                break;
            case icons.panel_top:
                wrap_div = Wrapper_Divs.TOP_BAR
                break;
            default:
                icon = icons.panel_left
                wrap_div = Wrapper_Divs.DRAW_TOOLS
        }

        let svg = icon_manager.get_svg(icon)
        if (active_start) {
            svg.setAttribute('active', '')
            parent.show_section(wrap_div)
        } else {
            parent.hide_section(wrap_div)
        }
        toggle_btn.appendChild(svg)

        toggle_btn.addEventListener('click', () => {
            if (toggle_btn.firstElementChild)
                if (toggle_btn.firstElementChild.hasAttribute('active')) {
                    toggle_btn.firstElementChild.removeAttribute('active')
                    parent.hide_section(wrap_div)
                } else {
                    toggle_btn.firstElementChild.setAttribute('active', '')
                    parent.show_section(wrap_div)
                }
        })

        return toggle_btn
    }


    /**
     * Create A pre-defined clickable button.
     */
    button(icon: icons): HTMLDivElement {
        let btn = document.createElement('div')
        btn.appendChild(icon_manager.get_svg(icon))
        btn.classList.add('titlebar_menu_button')
        btn.style.margin = '4px'
        switch (icon) {
            case icons.window_add:
                btn.classList.add("window_add")
                //Sends the add_container Command back to python so the two are synced
                btn.addEventListener('click', () => { window.api.add_container() }); break;
            case icons.close:
                btn.classList.add("close_btn")
                btn.addEventListener('click', () => { window.api.close() }); break;
            case icons.minimize:
                btn.classList.add("minimize_btn")
                btn.addEventListener('click', () => { window.api.minimize() }); break;
            case icons.maximize:
                btn.classList.add("maximize_btn")
                btn.addEventListener('click', () => {
                    window.api.maximize()
                    btn.replaceWith(window.titlebar.button(icons.restore))
                }); break;
            case icons.restore:
                btn.classList.add("restore_btn")
                btn.addEventListener('click', () => {
                    window.api.restore()
                    btn.replaceWith(window.titlebar.button(icons.maximize))
                }); break;
            default:
                btn.addEventListener('click', () => { console.log(`button ${icon} pressed!`) })
        }
        return btn
    }

    /**
     * Create a Vertical Separator Div 
     */
    separator(): HTMLDivElement {
        let new_div = document.createElement('div')
        new_div.classList.add('titlebar_separator')
        new_div.style.height = `${LAYOUT_DIM_TITLE.HEIGHT - 2 * LAYOUT_DIM_TITLE.V_BUFFER}px`
        new_div.style.margin = `${LAYOUT_DIM_TITLE.V_BUFFER}px ${LAYOUT_DIM_TITLE.H_BUFFER}px`
        return new_div
    }
}


const TAB_CONTENT_MARGIN = 9
const TAB_CONTENT_OVERLAP_DISTANCE = 1

const TAB_CONTENT_MIN_WIDTH = 24
const TAB_CONTENT_MAX_WIDTH = 180

const TAB_SIZE_SMALL = 110
const TAB_SIZE_SMALLER = 54
const TAB_SIZE_MINI = 28


const closest = (value: number, array: number[]) => {
    let closest = Infinity
    let closestIndex = -1

    array.forEach((v: number, i: number) => {
        if (Math.abs(value - v) < closest) {
            closest = Math.abs(value - v)
            closestIndex = i
        }
    })

    return closestIndex
}

const tabTemplate = `
      <div class="tab">
        <div class="tab-dividers"></div>
        <div class="tab-background">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg"><defs><symbol id="tab-geometry-left" viewBox="0 0 214 36"><path d="M17 0h197v36H0v-2c4.5 0 9-3.5 9-8V8c0-4.5 3.5-8 8-8z"/></symbol><symbol id="tab-geometry-right" viewBox="0 0 214 36"><use xlink:href="#tab-geometry-left"/></symbol><clipPath id="crop"><rect class="mask" width="100%" height="100%" x="0"/></clipPath></defs><svg width="52%" height="100%"><use xlink:href="#tab-geometry-left" width="214" height="36" class="tab-geometry"/></svg><g transform="scale(-1, 1)"><svg width="52%" height="100%" x="-100%" y="0"><use xlink:href="#tab-geometry-right" width="214" height="36" class="tab-geometry"/></svg></g></svg>
        </div>
        <div class="tab-content">
          <div class="tab-favicon"></div>
          <div class="tab-title"></div>
          <div class="tab-price"></div>
          <div class="tab-drag-handle"></div>
          <div class="tab-close"></div>
        </div>
      </div>
    `

export interface TabProperties {
    title?: string,
    price?: string,
    favicon?: string | null
}
interface Position {
    x: number;
    y: number;
}
const defaultTabProperties: TabProperties = {
    title: 'LWPC',
    favicon: null
}
// console.log('Hello World')
/**
 * Class to create and manage the Tabs bar.
 * Class handles Tab movement, Addition, and removal. 
 */

class Tabs {
    static instances = 0
    instanceId: number
    el: HTMLDivElement
    styleEl: HTMLStyleElement
    isDragging: boolean                 //@ts-ignore
    draggabillies: Draggabilly[]        //@ts-ignore
    draggabillyDragging: Draggabilly | null = null

    constructor(el: HTMLDivElement) {
        this.draggabillies = []
        this.el = el
        this.isDragging = false

        this.instanceId = Tabs.instances
        this.el.setAttribute('data-tabs-instance-id', `${this.instanceId}`)
        Tabs.instances += 1

        this.setupCustomProperties()

        this.styleEl = document.createElement('style')
        this.el.appendChild(this.styleEl)

        this.setupEvents()
        this.layoutTabs()
        this.setupDraggabilly()
    }

    private setupCustomProperties() {
        this.el.style.setProperty('--tab-content-margin', `${TAB_CONTENT_MARGIN}px`)
    }

    private setupEvents() {
        window.addEventListener('resize', () => {
            this.cleanUpPreviouslyDraggedTabs()
            this.layoutTabs()
        })

        this.el.addEventListener('dblclick', event => {
            if (event.target === this.el || event.target === this.tabContentEl)
                //Sends the command back to python so the two stay synced
                window.api.add_container()
        })
    }

    private get tabEls() {
        return Array.prototype.slice.call(this.el.querySelectorAll('.tab'))
    }

    get tabContentEl() {
        return this.el.querySelector('.tabs-content') as HTMLDivElement
    }

    private get tabContentWidths() {
        const numberOfTabs = this.tabEls.length
        const tabsContentWidth = this.tabContentEl.clientWidth
        const tabsCumulativeOverlappedWidth = (numberOfTabs - 1) * TAB_CONTENT_OVERLAP_DISTANCE
        const targetWidth = (tabsContentWidth - (2 * TAB_CONTENT_MARGIN) + tabsCumulativeOverlappedWidth) / numberOfTabs
        const clampedTargetWidth = Math.max(TAB_CONTENT_MIN_WIDTH, Math.min(TAB_CONTENT_MAX_WIDTH, targetWidth))
        const flooredClampedTargetWidth = Math.floor(clampedTargetWidth)
        const totalTabsWidthUsingTarget = (flooredClampedTargetWidth * numberOfTabs) + (2 * TAB_CONTENT_MARGIN) - tabsCumulativeOverlappedWidth
        const totalExtraWidthDueToFlooring = tabsContentWidth - totalTabsWidthUsingTarget

        // TODO - Support tabs with different widths / e.g. "pinned" tabs
        const widths:number[] = []
        let extraWidthRemaining = totalExtraWidthDueToFlooring
        for (let i = 0; i < numberOfTabs; i += 1) {
            const extraWidth = flooredClampedTargetWidth < TAB_CONTENT_MAX_WIDTH && extraWidthRemaining > 0 ? 1 : 0
            widths.push(flooredClampedTargetWidth + extraWidth)
            if (extraWidthRemaining > 0) extraWidthRemaining -= 1
        }

        return widths
    }

    private get tabContentPositions() {
        const positions: number[] = []
        const tabContentWidths = this.tabContentWidths

        let position = TAB_CONTENT_MARGIN
        tabContentWidths.forEach((width, i) => {
            const offset = i * TAB_CONTENT_OVERLAP_DISTANCE
            positions.push(position - offset)
            position += width
        })

        return positions
    }

    private get tabPositions() {
        const positions: number[] = []

        this.tabContentPositions.forEach((contentPosition) => {
            positions.push(contentPosition - TAB_CONTENT_MARGIN)
        })
        return positions
    }

    private layoutTabs() {
        const tabContentWidths = this.tabContentWidths

        this.tabEls.forEach((tabEl, i) => {
            const contentWidth = tabContentWidths[i]
            const width = contentWidth + (2 * TAB_CONTENT_MARGIN)
            tabEl.style.width = width + 'px'
            tabEl.removeAttribute('is-small')
            tabEl.removeAttribute('is-smaller')
            tabEl.removeAttribute('is-mini')

            if (contentWidth < TAB_SIZE_SMALL) tabEl.setAttribute('is-small', '')
            if (contentWidth < TAB_SIZE_SMALLER) tabEl.setAttribute('is-smaller', '')
            if (contentWidth < TAB_SIZE_MINI) tabEl.setAttribute('is-mini', '')
        })

        let styleHTML = ''
        this.tabPositions.forEach((position, i) => {
            styleHTML += `
            .tabs[data-tabs-instance-id="${this.instanceId}"] .tab:nth-child(${i + 1}) {
              transform: translate3d(${position}px, 0, 0)
            }
          `
        })
        this.styleEl.innerHTML = styleHTML
    }

    private createNewTabEl() {
        const div = document.createElement('div')
        div.innerHTML = tabTemplate
        return div.firstElementChild as HTMLDivElement
    }

    addTab(tabProperties: TabProperties = {}, { animate = true, background = false } = {}): HTMLDivElement {
        const tabEl = this.createNewTabEl()

        if (animate) {
            tabEl.classList.add('tab-was-just-added')
            setTimeout(() => tabEl.classList.remove('tab-was-just-added'), 500)
        }

        tabProperties = { ...defaultTabProperties, ...tabProperties }
        this.tabContentEl.appendChild(tabEl)
        this.updateTab(tabEl, tabProperties)
        if (!background) this.setCurrentTab(tabEl)
        this.cleanUpPreviouslyDraggedTabs()
        this.layoutTabs()
        this.setupDraggabilly()

        return tabEl //return tab element so container has a reference
    }

    setTabCloseEventListener(tabEl: HTMLDivElement, container_id: string) {
        let close_div = tabEl.querySelector('.tab-close') as HTMLDivElement
        close_div.addEventListener('click', () => { window.api.remove_container(container_id) })
    }

    get activeTabEl() {
        return this.el.querySelector('.tab[active]')
    }

    hasActiveTab() {
        return !!this.activeTabEl
    }

    setCurrentTab(tabEl: HTMLDivElement) {
        const activeTabEl = this.activeTabEl
        if (activeTabEl === tabEl) return
        if (activeTabEl) activeTabEl.removeAttribute('active')
        tabEl.setAttribute('active', '')
        window.wrapper.set_active_container(tabEl)
    }

    removeTab(tabEl: HTMLDivElement) {
        if (tabEl === this.activeTabEl) {
            if (tabEl.nextElementSibling) {
                this.setCurrentTab(tabEl.nextElementSibling as HTMLDivElement)
            } else if (tabEl.previousElementSibling) {
                this.setCurrentTab(tabEl.previousElementSibling as HTMLDivElement)
            }
            if (this.activeTabEl)
                window.wrapper.set_active_container(this.activeTabEl as HTMLDivElement)
        }
        tabEl.remove()
        this.cleanUpPreviouslyDraggedTabs()
        this.layoutTabs()
        this.setupDraggabilly()
    }

    updateTab(tabEl: HTMLDivElement, tabProperties: TabProperties) {
        const tab_title = tabEl.querySelector('.tab-title') as HTMLDivElement
        const tab_price = tabEl.querySelector('.tab-price') as HTMLDivElement
        tab_title.textContent = tabProperties.title ?? ""
        if (tabProperties.price) {
            tab_price.textContent = tabProperties.price
            tab_price.removeAttribute('empty')
        } else {
            tab_price.setAttribute('empty', '')
        }


        const faviconEl = tabEl.querySelector('.tab-favicon') as HTMLDivElement
        if (tabProperties.favicon) {
            faviconEl.style.backgroundImage = `url('${tabProperties.favicon}')`
            faviconEl.removeAttribute('hidden')
        } else {
            faviconEl.setAttribute('hidden', '')
            faviconEl.removeAttribute('style')
        }
    }

    cleanUpPreviouslyDraggedTabs() {
        this.tabEls.forEach((tabEl) => tabEl.classList.remove('tab-was-just-dragged'))
    }

    setupDraggabilly() {
        const tabEls = this.tabEls
        const tabPositions = this.tabPositions

        if (this.isDragging) {
            this.isDragging = false
            this.el.classList.remove('tabs-is-sorting')
            this.draggabillyDragging.element.classList.remove('tab-is-dragging')
            this.draggabillyDragging.element.style.transform = ''
            this.draggabillyDragging.dragEnd()
            this.draggabillyDragging.isDragging = false
            this.draggabillyDragging.positionDrag = () => { } // Prevent Draggabilly from updating tabEl.style.transform in later frames
            this.draggabillyDragging.destroy()
            this.draggabillyDragging = null
        }

        this.draggabillies.forEach(d => d.destroy())

        tabEls.forEach((tabEl, originalIndex) => {
            const originalTabPositionX = tabPositions[originalIndex]
            const draggabilly = new Draggabilly(tabEl, {
                axis: 'x',
                handle: '.tab-drag-handle',
                containment: this.tabContentEl
            })

            this.draggabillies.push(draggabilly)

            draggabilly.on('pointerDown', () => {
                this.setCurrentTab(tabEl)
            })

            draggabilly.on('dragStart', () => {
                this.isDragging = true
                this.draggabillyDragging = draggabilly
                tabEl.classList.add('tab-is-dragging')
                this.el.classList.add('tabs-is-sorting')
            })

            draggabilly.on('dragEnd', () => {
                this.isDragging = false
                const finalTranslateX = parseFloat(tabEl.style.left)
                tabEl.style.transform = `translate3d(0, 0, 0)`

                // Animate dragged tab back into its place
                requestAnimationFrame(() => {
                    tabEl.style.left = '0'
                    tabEl.style.transform = `translate3d(${finalTranslateX}px, 0, 0)`

                    requestAnimationFrame(() => {
                        tabEl.classList.remove('tab-is-dragging')
                        this.el.classList.remove('tabs-is-sorting')

                        tabEl.classList.add('tab-was-just-dragged')

                        requestAnimationFrame(() => {
                            tabEl.style.transform = ''

                            this.layoutTabs()
                            this.setupDraggabilly()
                        })
                    })
                })
            })

            draggabilly.on('dragMove', (event: Event, pointer: MouseEvent, moveVector: Position) => {
                // Current index be computed within the event since it can change during the dragMove
                const tabEls = this.tabEls
                const currentIndex = tabEls.indexOf(tabEl)

                const currentTabPositionX = originalTabPositionX + moveVector.x
                const destinationIndexTarget = closest(currentTabPositionX, tabPositions)
                const destinationIndex = Math.max(0, Math.min(tabEls.length, destinationIndexTarget))

                if (currentIndex !== destinationIndex) {
                    this.animateTabMove(tabEl, currentIndex, destinationIndex)
                }
            })
        })
    }

    private animateTabMove(tabEl: HTMLDivElement, originIndex: number, destinationIndex: number) {
        if (destinationIndex < originIndex) {
            if (tabEl.parentNode)
                tabEl.parentNode.insertBefore(tabEl, this.tabEls[destinationIndex])
        } else {
            if (tabEl.parentNode)
                tabEl.parentNode.insertBefore(tabEl, this.tabEls[destinationIndex + 1])
        }
        //This is the once instance where something is simultaniously updated in
        //javascript and python from the source of the change.
        window.api.reorder_containers(originIndex, destinationIndex)
        window.wrapper.reorder_containers(originIndex, destinationIndex)
        this.layoutTabs()
    }
}