
type tab_props = {
    ref: HTMLDivElement
}

export function tab(props:tab_props){

    return (
        <div ref={props.ref} class="tab">
            <div class="tab-dividers"></div>
            <div class="tab-background">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <symbol id="tab-geometry-left" viewBox="0 0 214 36"><path d="M17 0h197v36H0v-2c4.5 0 9-3.5 9-8V8c0-4.5 3.5-8 8-8z"/></symbol>
                    <symbol id="tab-geometry-right" viewBox="0 0 214 36"><use href="#tab-geometry-left"/></symbol>
                    <clipPath id="crop"><rect class="mask" width="100%" height="100%" x="0"/></clipPath>
                </defs>
                <svg width="52%" height="100%"><use href="#tab-geometry-left" width="214" height="36" class="tab-geometry"/></svg>
                <g transform="scale(-1, 1)">
                    <svg width="52%" height="100%" x="-100%" y="0"><use href="#tab-geometry-right" width="214" height="36" class="tab-geometry"/></svg>
                </g>
                </svg>
            </div>
            <div class="tab-content">
                <div class="tab-favicon" />
                <div class="tab-title" />
                <div class="tab-price" />
                <div class="tab-drag-handle" />
                <div class="tab-close" />
            </div>
        </div>
    )
}