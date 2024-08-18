# File structure:
The './src' Folder Contains all the Typescript Files written purposly for this library/Web-app Frontend. 

The subfolder './src/lwpc-plugins' was also written for the purpose of this library so python can directly access and
manipulate canvas primitives or define custom series. Any file within this folder may be written from scratch, or modified versions of the plugins found in './src/plugins'

The subfolder './src/plugins' & './src/helpers' were taken directly from the lightweight-charts github repo at https://github.com/tradingview/lightweight-charts
These are helper functions and plugin examples that don't inherently ship with the 'lightweight-charts' npm package.
These may or may not remain in the library as it is developed. 

The './css' Folder Contains all the Base .css files referenced by the typescript code.

'./components' Holds all* of the .JSX/.TSX elements that can be displayed by the GUI.
*The Frontend was initially developed using vanilla typescript, thus some elements were coded directly into the ./src files. In addition to that, some ./src objects have ownership of .TSX elements and are constructed there as needed.

# Compilation:

The Typescript is compiled and minified into a index.js file under the '../lightweight_pycharts/frontend/assets' folder. This minified javascript file is
loaded at runtime by pywebview whenever python launches, hence it's location under the Python sub-directory of this repository.
