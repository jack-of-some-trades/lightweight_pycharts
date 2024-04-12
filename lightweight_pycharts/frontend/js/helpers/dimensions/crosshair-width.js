export function gridAndCrosshairBitmapWidth(horizontalPixelRatio) {
    return Math.max(1, Math.floor(horizontalPixelRatio));
}
export function gridAndCrosshairMediaWidth(horizontalPixelRatio) {
    return (gridAndCrosshairBitmapWidth(horizontalPixelRatio) / horizontalPixelRatio);
}
