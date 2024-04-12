export function cloneReadonly(obj) {
    return JSON.parse(JSON.stringify(obj));
}
