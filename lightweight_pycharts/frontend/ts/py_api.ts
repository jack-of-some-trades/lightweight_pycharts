
//Typescript API that interfaces with python.
//Each Function Maps directly to a function within the js_api class in js_api.py
export class py_api {
    callback!: (msg: string) => void;
}