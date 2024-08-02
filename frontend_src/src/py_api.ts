//Typescript API that interfaces with python.

import { Container_Layouts } from "./layouts";
import { makeid, Series_Type, symbol_item } from "./types";


//Each Function Maps directly to a function within the js_api class in js_api.py
export class py_api {
    close!: () => void;
    maximize!: () => void;
    minimize!: () => void;
    restore!: () => void;

    /* ---------------- Javascript >>> Python ---------------- */
    // The following functions are called by JS and hook to functions implemented in python.
    // These functions have default commands so functionality is maintained when launched on a local dev server.
    // These are over written (re-routed) at start-up by the Python View Class so they execute their respective python functions
    
    // @ts-ignore                                    
    add_container = () => window.container_manager.add_container(makeid(Array.from(container_manager.containers.keys()), 'c_'));
    // @ts-ignore
    remove_container = (id: string) => window.container_manager.remove_container(id);
    reorder_containers = (from: number, to: number) => {
        console.log(`reorder containers from: ${from} to: ${to} `)
    }

    layout_change = (container_id: string, layout: Container_Layouts) => {
        console.log(`Layout Change: ${container_id},${layout}`)
        //@ts-ignore
        window.container_manager.containers.get(container_id)?.set_layout(layout)
    };
    series_change = (container_id: string, frame_id: string, series_type: Series_Type) => {
        console.log(`Series Change: ${container_id},${frame_id},${series_type}`)
    };
    data_request = (container_id: string, frame_id: string, symbol: symbol_item, tf: string) => {
        console.log(`Data Request: ${container_id},${frame_id},${symbol},${tf}`)
    };
    symbol_search = (symbol: string, types: string[], brokers: string[], exchanges: string[], confirmed: boolean) => {
        console.log(`Search Request: ${symbol},${types},${brokers},${exchanges},${confirmed}`)
    };

    callback = (msg: string) => {console.log(msg)}
    
    /* ---------------- Python >>> Javascript ---------------- */
    // The following functions are called by Python. They are set by JS as the window is rendered

    setFrameless = (arg:boolean) => {}

    populate_search_symbols = (items:symbol_item[]) => {}
    set_search_filters = (category:string, opts:string[]) => {}

    update_series_opts = (opts:any) => console.log(opts)
    update_layout_opts = (opts:any) => console.log(opts)
    update_timeframe_opts = (opts:any) => console.log(opts, window.topbar)
}