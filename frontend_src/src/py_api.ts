//Typescript API that interfaces with python.

import { Container_Layouts, makeid, Series_Type, symbol_item } from "./util_lwc";


//Each Function Maps directly to a function within the js_api class in js_api.py
export class py_api {
    loaded!: () => void;
    close!: () => void;
    maximize!: () => void;
    minimize!: () => void;
    restore!: () => void;

    // The Following Functions have default commands so functionality is maintained when launched on a dev local server.
    // These are over written (re-routed) at start-up by the Python View Class so they execute their respective python functions
                                                                                    // @ts-ignore
    add_container = () => window.container_manager.add_container(makeid(Array.from(container_manager.containers.keys()), 'c_'), 'chart');                         // @ts-ignore
    remove_container = (id: string) => window.container_manager.remove_container(id);
    reorder_containers = (from: number, to: number) => {
        console.log(`reorder containers from: ${from} to: ${to} `)
    }

    layout_change = (container_id: string, layout: Container_Layouts) => {
        console.log(`Layout Change: ${container_id},${layout}`)
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
}