/* Unfortunately you can't use the lightweight charts .d.ts file as intended. This is the result of using python modules
 * that run a local server that doesn't have access to [node_modules] like node.js does. 
 * 
 * This gets even more annoying since the python web server can't interpolate './pkg' to mean './pkg.js' or './pkg.mjs'
 * The result is that you import the .d.ts into this file and have all the type hints, but hit a run-time error when launching the webserver.
 * 
 * I'm tired of working to solve this instead of working on the code itself so I'm just going to patch fix this. 
 * I'm importing ../js/pkg.mjs as lwc so both ts and js have definitions for the functions in the namespace lwc, albiet w/o type hints
 * I've then taken the pkg.d.ts, commented out the functions, and removed 'declare'from the Enums and renamed the file to pkg.ts.
 * 
 * The result is that the metric ton interfaces, enums, and types from the lightweight charts library can be imported
 * from "./pkg.js". The import is "./pkg.js" and not "./pkg.ts" because typescript knows to check the .ts for interfaces
 * and the python webview would hit a runtime import error if it had to look for a non-existant "./pkg.ts"
 * 
 * Additionally, I've created an Enum, Color, of all the named colors that come with the library for ease of access.
 *//*@ts-ignore*/
import * as lwc from "../js/pkg.mjs";
import { AreaStyleOptions, Color, ColorType, CrosshairMode, DeepPartial as DP, TimeChartOptions, VertAlign } from "./pkg.js";
import { py_api } from "./py_api.js";


let var_2: VertAlign = 'bottom'
let var_5 = CrosshairMode.Magnet

let my_var = lwc.ColorType.Solid
let my_var_spoof = ColorType.Solid

let opts: DP<AreaStyleOptions> = {
    topColor: 'rgba( 46, 220, 135, 0.4)',
};

// opts.crosshairMarkerBackgroundColor

//Define a global python api inferface.
declare global { interface Window { api: py_api; } }
window.api = new py_api()

let chartOpts: DP<TimeChartOptions> = {
    layout: {
        textColor: 'white',
        background: {
            type: ColorType.Solid,
            color: Color.papayawhip
        }
    }
};


const docwrapper = document.getElementById("wrapper");

if (docwrapper !== null) {
    // t.createChart(docwrapper, chartOpts_2)
    const chart = lwc.createChart(docwrapper, chartOpts);

    const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
        wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });
    candlestickSeries.setData([
        { time: '2018-12-22', open: 75.16, high: 82.84, low: 36.16, close: 45.72 },
        { time: '2018-12-23', open: 45.12, high: 53.90, low: 45.12, close: 48.09 },
        { time: '2018-12-24', open: 60.71, high: 60.71, low: 53.39, close: 59.29 },
        { time: '2018-12-25', open: 68.26, high: 68.26, low: 59.04, close: 60.50 },
        { time: '2018-12-26', open: 67.71, high: 105.85, low: 66.67, close: 91.04 },
        { time: '2018-12-27', open: 91.04, high: 121.40, low: 82.70, close: 111.40 },
        { time: '2018-12-28', open: 111.51, high: 142.83, low: 103.34, close: 131.25 },
        { time: '2018-12-29', open: 131.33, high: 151.17, low: 77.68, close: 96.43 },
        { time: '2018-12-30', open: 106.33, high: 110.20, low: 90.39, close: 98.10 },
        { time: '2018-12-31', open: 109.87, high: 114.69, low: 85.66, close: 111.26 },
    ]);
    chart.timeScale().fitContent();
};
