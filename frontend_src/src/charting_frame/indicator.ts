import { PriceScaleOptions } from "lightweight-charts";
import { Accessor, createSignal, Setter, Signal } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { IndicatorOpts } from "../../components/charting_frame/indicator_options";
import { OverlayCTX } from "../../components/layout/overlay_manager";
import { data_src } from "./charting_frame";
import { pane } from "./pane";
import { PrimitiveBase } from "./primitive-plugins/primitive-base";
import { primitives } from "./primitive-plugins/primitives";
import * as s from "./series-plugins/series-base";

export class indicator {
    id: string
    type: string
    name: string
    private pane: pane

    objVisibility: Signal<boolean>
    labelHtml: Accessor<string | undefined>
    setLabelHtml: Setter<string | undefined>

    menu_id: string | undefined
    menu_struct: object | undefined
    setOptions: SetStoreFunction<object> | undefined
    private sources: Accessor<data_src[]>

    menuVisibility: Accessor<boolean> | undefined
    setMenuVisibility: Setter<boolean> | undefined

    series = new Map<string, s.SeriesBase_T>()
    private visiblity = new Map<string, boolean>()
    private primitives_left = new Map<string, PrimitiveBase>()
    private primitives_right = new Map<string, PrimitiveBase>()
    private primitives_overlay = new Map<string, PrimitiveBase>()

    constructor(id: string, type: string, name: string, sources: Accessor<data_src[]>, pane: pane) {
        this.id = id
        this.name = name
        this.pane = pane
        this.type = type
        this.sources = sources

        const objVisibility = createSignal<boolean>(true)
        this.objVisibility = objVisibility
        this.setVisibility.bind(this)
        
        const labelHtml = createSignal<string | undefined>(undefined)
        this.labelHtml = labelHtml[0]
        this.setLabelHtml = labelHtml[1]

        this.pane.attach_indicator_to_legend(this)
    }

    setLabel(label:string){this.setLabelHtml(label !== ""? label : undefined)}

    // TODO: Implement
    move_to_pane(pane:pane){}

    delete() {
        //Clear All Sub-objects
        this.series.forEach((ser, key) => {
            ser.remove()
        })
        this.primitives_left.forEach((prim, key) => {
            this.pane.primitive_left.detachPrimitive(prim)
        })
        this.primitives_right.forEach((prim, key) => {
            this.pane.primitive_right.detachPrimitive(prim)
        })
        this.primitives_overlay.forEach((prim, key) => {
            this.pane.whitespace_series.detachPrimitive(prim)
        })
        //Remove from the pane that is currently displaying the indicator
        this.pane.detach_indicator_from_legend(this)
    }

    setVisibility(arg:boolean){
        this.objVisibility[1](arg)
        const _maps = [this.series, this.primitives_left, this.primitives_right, this.primitives_overlay]
        // This only works because the structure of primitives and series are similar enough
        for (let i = 0; i < _maps.length; i++)
            if (arg) for (const [k, v] of _maps[i].entries()){
                v.applyOptions({visible: this.visiblity.get(k)??true})
            }
            else for (const [k, v] of _maps[i].entries()){
                this.visiblity.set(k, v.options().visible)
                v.applyOptions({visible: false})
            }
    }

    //#region ------------------------ Python Interface ------------------------ //

    //Functions marked as protected are done so it indicate the original intent
    //only encompassed being called from python, not from within JS.

    protected add_series(_id: string, _type: s.Series_Type, _name:string|undefined = undefined) {
        this.series.set(_id, new s.SeriesBase(_id, _name, _type, this.pane.chart))
    }

    protected remove_series(_id: string) {
        let series = this.series.get(_id)
        if (series === undefined) return

        series.remove()
        this.series.delete(_id)
    }

    protected set_series_data(_id: string, data: s.SeriesData[]) {
        let series = this.series.get(_id)
        if (series === undefined) return
        series.setData(data)
        console.log(data, series.data())
    }

    protected update_series_data(_id: string, data: s.SeriesData) {
        let series = this.series.get(_id)
        if (series === undefined) return
        series.update(data)
    }

    /**
     * Unfortunately, change_series_type changes the draw order of the Series on screen.
     * This is the result of deleteing the old series and creating a new one... I mean that would be
     * unfortunate if I didn't figure out a way around it.. 
     * 
     * To do this (after applying the objects to the screen) you need to change the _zOrder:number 
     * within some/all of the series applied to the tv 'Pane' (not this lib's pane) which displays 
     * the series objects. To get a reference to this pane's series objects call 
     * chart._chartWidget._model._panes[0]._dataSources: (chart.lw.$i.kc[0].vo)** for lwc v4.2.0
     * 
     * With this array, you can set _dataSources[i]._zOrder to the desired value. (chart.lw.$i.kc[0].vo[i].Zi)**
     * The _zOrder value can be a duplicate, negative, and have gaps between other series values.
     * From here the pane._cachedOrderedSources needs to be set to null (chart.lw.$i.kc[0].po = null)** 
     * Then a redraw of the chart invoked. chart._chartWidget._model.lightUpdate() ( chart.lw.$i.$h() )**
     * 
     * To Re-order primitives you need to re-order the series' _primitives array.
     * chart._chartWidget._model._serieses[i]._primitives (chart.lw.$i.yc[i].jl)
     */
    protected change_series_type(_id: string, series_type: s.Series_Type, data: s.SeriesData[]) {
        let old_series = this.series.get(_id)
        if (old_series === undefined) {
            //Create Series and return if it doesn't exist
            this.add_series(_id, series_type)
            this.series.get(_id)?.setData(data)
            return
        }

        let new_series = new s.SeriesBase(_id, old_series.Name, series_type, this.pane.chart)
        let timescale = this.pane.chart.timeScale()
        let current_range = timescale.getVisibleRange()

        //@ts-ignore (Type Checking Done in Python, Data should already be updated if it needed to be)
        new_series.setData(data)
        this.series.set(_id, new_series)

        old_series.remove()
        //Setting Data Changes Visible Range, set it back.
        if (current_range !== null)
            timescale.setVisibleRange(current_range)
    }

    protected update_series_opts(_id: string, opts: s.SeriesOptions) {
        let series = this.series.get(_id)
        if (series === undefined) return
        series.applyOptions(opts)
    }
    
    protected update_scale_opts(_id: string, opts: PriceScaleOptions) {
        let series = this.series.get(_id)
        if (series === undefined) return
        series.priceScale().applyOptions(opts)
    }

    protected add_primitive(_id: string, _type: string, params:object) {
        let primitive_type = primitives.get(_type)
        if (primitive_type === undefined) return
        let new_obj = new primitive_type(this.id + _id, params)

        this.primitives_right.set(_id, new_obj)
        this.pane.primitive_right.attachPrimitive(new_obj)
    }

    protected remove_primitive(_id: string) {
        let _obj = this.primitives_right.get(_id)
        if (_obj === undefined) return

        this.pane.primitive_right.detachPrimitive(_obj) 
        this.primitives_right.delete(_id)
    }
    
    protected update_primitive(_id: string, params:object) {
        let _obj = this.primitives_right.get(_id)
        if (_obj === undefined) return
        _obj.updateData(params)
    }

    applyOptions(options_in:object){
        if (this.setOptions) this.setOptions(options_in)
    }

    //TODO : Make it so that a Style Settings Menu will still be generated without needing 
    //to call the function below, or even require a menu_struct/Indicator Options Class
    protected set_menu_struct(menu_struct:object, options_in:object){
        if (this.menu_id !== undefined) {
            if (this.setOptions) this.setOptions(options_in)
            return //Menu has already been created.
        }

        const menuVisibility = createSignal<boolean>(false)
        this.menuVisibility = menuVisibility[0]
        this.setMenuVisibility = menuVisibility[1]

        const [options, setOptions] = createStore<object>(options_in)
        this.setOptions = setOptions
        this.menu_struct = menu_struct
        this.menu_id = `${this.pane.id}_${this.id}_options`

        //See EoF for Explanation of this second AttachOverlay Call.
        OverlayCTX().attachOverlay(this.menu_id, undefined, menuVisibility)
        OverlayCTX().attachOverlay(
            this.menu_id,
            IndicatorOpts({
                id: this.menu_id,
                parent_ind: this,
                options: options,
                menu_struct: this.menu_struct,
                close_menu: () => menuVisibility[1](false),
                sources: this.sources,

                container_id: this.pane.id.substring(0,6),
                frame_id: this.pane.id.substring(0,13),
                indicator_id: this.id
            }),
            menuVisibility
        )
    }

    //#endregion
}


/**Ok, so this is stupid. im not a huge fan, but it somewhat cleanly fixes a bug.
 * 
 * Essentially the crux of the problem is IndicatiorOpts' OverlayDiv has an onMount function.
 * As written, this only works if the onMount() is called at some point after the AttachOverlay()
 * call is completed. 
 * 
 * This works for all other Overlays since they are created with the full document tree and are not mounted
 * until after all objects are created. In the case of IndicatorOpts, this element is created after the full 
 * tree and thus can be mounted immediately causing a bug where the overlay can never be displayed. The extra 
 * bogus call to AttachOverlay() puts the menuVisibility signal where it needs to be before IndicatorOpts is
 * ever created & mounted.
 * 
 * The problem is kinda baked into the OverlayDiv... but this fixes it without repercussions so this is likely
 * how the implementation will stay...
 */