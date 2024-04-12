export function fullBarWidth(xMedia, halfBarSpacingMedia, horizontalPixelRatio) {
    const fullWidthLeftMedia = xMedia - halfBarSpacingMedia;
    const fullWidthRightMedia = xMedia + halfBarSpacingMedia;
    const fullWidthLeftBitmap = Math.round(fullWidthLeftMedia * horizontalPixelRatio);
    const fullWidthRightBitmap = Math.round(fullWidthRightMedia * horizontalPixelRatio);
    const fullWidthBitmap = fullWidthRightBitmap - fullWidthLeftBitmap;
    return {
        position: fullWidthLeftBitmap,
        length: fullWidthBitmap,
    };
}
