function cumulativeBuildUp(arr) {
    let sum = 0;
    return arr.map(value => {
        const newValue = sum + value;
        sum = newValue;
        return newValue;
    });
}
export class StackedAreaSeriesRenderer {
    constructor() {
        this._data = null;
        this._options = null;
    }
    draw(target, priceConverter) {
        target.useBitmapCoordinateSpace(scope => this._drawImpl(scope, priceConverter));
    }
    update(data, options) {
        this._data = data;
        this._options = options;
    }
    _drawImpl(renderingScope, priceToCoordinate) {
        var _a;
        if (this._data === null ||
            this._data.bars.length === 0 ||
            this._data.visibleRange === null ||
            this._options === null) {
            return;
        }
        const options = this._options;
        const bars = this._data.bars.map(bar => {
            return {
                x: bar.x,
                ys: cumulativeBuildUp(bar.originalData.values).map(value => { var _a; return (_a = priceToCoordinate(value)) !== null && _a !== void 0 ? _a : 0; }),
            };
        });
        const zeroY = (_a = priceToCoordinate(0)) !== null && _a !== void 0 ? _a : 0;
        const linesMeshed = this._createLinePaths(bars, this._data.visibleRange, renderingScope, zeroY * renderingScope.verticalPixelRatio);
        const areaPaths = this._createAreas(linesMeshed);
        const colorsCount = options.colors.length;
        areaPaths.forEach((areaPath, index) => {
            renderingScope.context.fillStyle =
                options.colors[index % colorsCount].area;
            renderingScope.context.fill(areaPath);
        });
        renderingScope.context.lineWidth =
            options.lineWidth * renderingScope.verticalPixelRatio;
        renderingScope.context.lineJoin = 'round';
        linesMeshed.forEach((linePath, index) => {
            if (index == 0)
                return;
            renderingScope.context.beginPath();
            renderingScope.context.strokeStyle =
                options.colors[(index - 1) % colorsCount].line;
            renderingScope.context.stroke(linePath.path);
        });
    }
    _createLinePaths(bars, visibleRange, renderingScope, zeroY) {
        const { horizontalPixelRatio, verticalPixelRatio } = renderingScope;
        const oddLines = [];
        const evenLines = [];
        let firstBar = true;
        for (let i = visibleRange.from; i < visibleRange.to; i++) {
            const stack = bars[i];
            let lineIndex = 0;
            stack.ys.forEach((yMedia, index) => {
                if (index % 2 !== 0) {
                    return;
                }
                const x = stack.x * horizontalPixelRatio;
                const y = yMedia * verticalPixelRatio;
                if (firstBar) {
                    oddLines[lineIndex] = {
                        path: new Path2D(),
                        first: { x, y },
                        last: { x, y },
                    };
                    oddLines[lineIndex].path.moveTo(x, y);
                }
                else {
                    oddLines[lineIndex].path.lineTo(x, y);
                    oddLines[lineIndex].last.x = x;
                    oddLines[lineIndex].last.y = y;
                }
                lineIndex += 1;
            });
            firstBar = false;
        }
        firstBar = true;
        for (let i = visibleRange.to - 1; i >= visibleRange.from; i--) {
            const stack = bars[i];
            let lineIndex = 0;
            stack.ys.forEach((yMedia, index) => {
                if (index % 2 === 0) {
                    return;
                }
                const x = stack.x * horizontalPixelRatio;
                const y = yMedia * verticalPixelRatio;
                if (firstBar) {
                    evenLines[lineIndex] = {
                        path: new Path2D(),
                        first: { x, y },
                        last: { x, y },
                    };
                    evenLines[lineIndex].path.moveTo(x, y);
                }
                else {
                    evenLines[lineIndex].path.lineTo(x, y);
                    evenLines[lineIndex].last.x = x;
                    evenLines[lineIndex].last.y = y;
                }
                lineIndex += 1;
            });
            firstBar = false;
        }
        const baseLine = {
            path: new Path2D(),
            first: { x: oddLines[0].last.x, y: zeroY },
            last: { x: oddLines[0].first.x, y: zeroY },
        };
        baseLine.path.moveTo(oddLines[0].last.x, zeroY);
        baseLine.path.lineTo(oddLines[0].first.x, zeroY);
        const linesMeshed = [baseLine];
        for (let i = 0; i < oddLines.length; i++) {
            linesMeshed.push(oddLines[i]);
            if (i < evenLines.length) {
                linesMeshed.push(evenLines[i]);
            }
        }
        return linesMeshed;
    }
    _createAreas(linesMeshed) {
        const areas = [];
        for (let i = 1; i < linesMeshed.length; i++) {
            const areaPath = new Path2D(linesMeshed[i - 1].path);
            areaPath.lineTo(linesMeshed[i].first.x, linesMeshed[i].first.y);
            areaPath.addPath(linesMeshed[i].path);
            areaPath.lineTo(linesMeshed[i - 1].first.x, linesMeshed[i - 1].first.y);
            areaPath.closePath();
            areas.push(areaPath);
        }
        return areas;
    }
}
