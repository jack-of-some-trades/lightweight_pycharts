function optimalCandlestickWidth(barSpacing, pixelRatio) {
    const barSpacingSpecialCaseFrom = 2.5;
    const barSpacingSpecialCaseTo = 4;
    const barSpacingSpecialCaseCoeff = 3;
    if (barSpacing >= barSpacingSpecialCaseFrom &&
        barSpacing <= barSpacingSpecialCaseTo) {
        return Math.floor(barSpacingSpecialCaseCoeff * pixelRatio);
    }
    const barSpacingReducingCoeff = 0.2;
    const coeff = 1 -
        (barSpacingReducingCoeff *
            Math.atan(Math.max(barSpacingSpecialCaseTo, barSpacing) - barSpacingSpecialCaseTo)) /
            (Math.PI * 0.5);
    const res = Math.floor(barSpacing * coeff * pixelRatio);
    const scaledBarSpacing = Math.floor(barSpacing * pixelRatio);
    const optimal = Math.min(res, scaledBarSpacing);
    return Math.max(Math.floor(pixelRatio), optimal);
}
export function candlestickWidth(barSpacing, horizontalPixelRatio) {
    let width = optimalCandlestickWidth(barSpacing, horizontalPixelRatio);
    if (width >= 2) {
        const wickWidth = Math.floor(horizontalPixelRatio);
        if (wickWidth % 2 !== width % 2) {
            width--;
        }
    }
    return width;
}
