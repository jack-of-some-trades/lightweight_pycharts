# File structure:
The './ts' Folder Contains all the Typescript Files Used when writing this library. This includes the source code files
that have been written for the purpose of this library (e.g. wrapper.ts, py_api.ts, ...), and the libraries this repository
build on (Lightweight-Charts API & Fancy-canvas). The Libraries are directly copied and included rather than referenced 
due to the unique implementation requirements that are discussed below.

The './js' Folder Contains all the transpiled Typescript files. These are the files that are loaded and run by the python pywebview library.

The './css' Folder Contains all the Base .css and .svg files referenced by the typescript code.

# Library Imports:
The Files within './ts/lib' are 'pkg.ts', 'fancy-canvas.ts' and ./fancy-canvas'
- The 'pkg.ts' file is a slightly modified and expanded version of TradingView's Lightweight-charts API.
    - The TradingView's Lightweight-charts API is Licensed by an Apache 2.0 License.
    - pkg.ts, specifically, is a modified version of the index.d.ts file.
    - 'pkg.ts' imports 'pkg.mjs'. pkg.mjs is a standalone javascript version of TradingView's Lightweight-charts API
    - The .pkg.ts (formally index.d.ts) file has been expanded. All additional Expantions can be seen at the bottom of the
      File in the "Additional Types" Section denoted by a comment line break. These Addtional Types include:
        - A Generic Type Encompassing a set of SeriesData Types
        - Explicit Series Type Definitions of the ISeriesAPI General Type (e.g. CandlestickSeries, LineSeries, ...) 
        - Redefined Versions of SeriesOptionsMap, SeriesDataItemTypeMap, SeriesPartialOptionsMaps
            -These have been redefined so that they can be expanded to include more custom series types.
        - An Enum of All the named Colors defined within the standalone Lightweight-Charts API.
    - See below for the reasoning for changes to the file structure and imports
- The 'fancy-canvas.ts' file is the 'index.ts' file that originally came with the '../../lib/fancy-canvas' library
    -This was moved and renamed to offer more clear importing of the library.

- The ./fancy-canvas' folder is TradingView's Fancy Canvas Repository
    '../../lib/fancy-canvas' is Licensed under a MIT License

The Folders './ts/plugins' and './ts/helpers' Come from TradingView's Lightweight-Charts repository on Github (https://github.com/tradingview/lightweight-charts).
    - The code within these folders also falls under the same Apache 2.0 License Mentioned above.
    - All of the import paths within these folders have been changed to import the respective code properly given changes to the file structure
    - The Javascript and Example Files have been removed to limit the amount of code in this repository. The Javascript files have been
       Re-Transpiled into the './js' Folder.

All Javascript Files from the libraries have been removed to limit how much code is uploaded directly by this repository.
These Javascript Files are re-transpiled locally and placed within their respective './js/.js' folders.

The '.ts/lwpc-plugins' folder houses all the plugins written specifically for the Lightweight-PyCharts library. This was made a separate folder in order to
maintain some level of separation between source code written for this repository and the lightweight-charts repository.


# The Necessity for changing the file structure and imports:
 * Unfortunately you can't use the lightweight charts or fancy-canvas .d.ts files as normal. This is the result of using python modules
 * that run a local server that executes javascript. That local server doesn't have access to [node_modules], like node.js does, so a locally accessable
 * version of the .d.ts is needed instead.
 * 
 * This gets even more annoying since the python web server can't interpret './pkg.js' to mean './pkg.js' or './pkg.mjs'
 * The result is that if you import "pkg.d.ts" via "import './pkg.js'", it will only work until run-time at which 
 * the webserver errors since it can't find a file called './pkg.js' in the local context
 * 
 * The solution I've come up with is to take the pkg.d.ts and relabel it as pkg.ts with an import of './pkg.mjs'.
 * This compiles down to pkg.js which is the stand-in replacement for "import 'lighteweight-charts'" across all files.
 * 
 * The one catch is that functions were only 'declared' within the originial .d.ts. Those 'declare' key-words were
 * removed. In their place, The functions were explicitly defined to reference their actual implementation in './pkg.mjs'.
 * 
 * The import is "./pkg.js" and not "./pkg.ts" because, by some miracle, the typescript compiler knows to ignore the '.js' and look 
 * an equivelant '.ts' when type checking. if a './pkg.ts' import were used then the python webview would hit a runtime import error 
 * as it look for a non-existant "./pkg.ts" in it's local context.
 * 
 * Additionally, I've created an Enum, Color, of all the named colors that come with the library for ease of access.
