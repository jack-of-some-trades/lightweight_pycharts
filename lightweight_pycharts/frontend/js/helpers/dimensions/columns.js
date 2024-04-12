const alignToMinimalWidthLimit = 4;
const showSpacingMinimalBarWidth = 1;
function columnSpacing(barSpacingMedia, horizontalPixelRatio) {
    return Math.ceil(barSpacingMedia * horizontalPixelRatio) <=
        showSpacingMinimalBarWidth
        ? 0
        : Math.max(1, Math.floor(horizontalPixelRatio));
}
function desiredColumnWidth(barSpacingMedia, horizontalPixelRatio, spacing) {
    return (Math.round(barSpacingMedia * horizontalPixelRatio) -
        (spacing !== null && spacing !== void 0 ? spacing : columnSpacing(barSpacingMedia, horizontalPixelRatio)));
}
function columnCommon(barSpacingMedia, horizontalPixelRatio) {
    const spacing = columnSpacing(barSpacingMedia, horizontalPixelRatio);
    const columnWidthBitmap = desiredColumnWidth(barSpacingMedia, horizontalPixelRatio, spacing);
    const shiftLeft = columnWidthBitmap % 2 === 0;
    const columnHalfWidthBitmap = (columnWidthBitmap - (shiftLeft ? 0 : 1)) / 2;
    return {
        spacing,
        shiftLeft,
        columnHalfWidthBitmap,
        horizontalPixelRatio,
    };
}
function calculateColumnPosition(xMedia, columnData, previousPosition) {
    const xBitmapUnRounded = xMedia * columnData.horizontalPixelRatio;
    const xBitmap = Math.round(xBitmapUnRounded);
    const xPositions = {
        left: xBitmap - columnData.columnHalfWidthBitmap,
        right: xBitmap +
            columnData.columnHalfWidthBitmap -
            (columnData.shiftLeft ? 1 : 0),
        shiftLeft: xBitmap > xBitmapUnRounded,
    };
    const expectedAlignmentShift = columnData.spacing + 1;
    if (previousPosition) {
        if (xPositions.left - previousPosition.right !== expectedAlignmentShift) {
            if (previousPosition.shiftLeft) {
                previousPosition.right = xPositions.left - expectedAlignmentShift;
            }
            else {
                xPositions.left = previousPosition.right + expectedAlignmentShift;
            }
        }
    }
    return xPositions;
}
function fixPositionsAndReturnSmallestWidth(positions, initialMinWidth) {
    return positions.reduce((smallest, position) => {
        if (position.right < position.left) {
            position.right = position.left;
        }
        const width = position.right - position.left + 1;
        return Math.min(smallest, width);
    }, initialMinWidth);
}
function fixAlignmentForNarrowColumns(positions, minColumnWidth) {
    return positions.map((position) => {
        const width = position.right - position.left + 1;
        if (width <= minColumnWidth)
            return position;
        if (position.shiftLeft) {
            position.right -= 1;
        }
        else {
            position.left += 1;
        }
        return position;
    });
}
export function calculateColumnPositions(xMediaPositions, barSpacingMedia, horizontalPixelRatio) {
    const common = columnCommon(barSpacingMedia, horizontalPixelRatio);
    const positions = new Array(xMediaPositions.length);
    let previous = undefined;
    for (let i = 0; i < xMediaPositions.length; i++) {
        positions[i] = calculateColumnPosition(xMediaPositions[i], common, previous);
        previous = positions[i];
    }
    const initialMinWidth = Math.ceil(barSpacingMedia * horizontalPixelRatio);
    const minColumnWidth = fixPositionsAndReturnSmallestWidth(positions, initialMinWidth);
    if (common.spacing > 0 && minColumnWidth < alignToMinimalWidthLimit) {
        return fixAlignmentForNarrowColumns(positions, minColumnWidth);
    }
    return positions;
}
export function calculateColumnPositionsInPlace(items, barSpacingMedia, horizontalPixelRatio, startIndex, endIndex) {
    const common = columnCommon(barSpacingMedia, horizontalPixelRatio);
    let previous = undefined;
    for (let i = startIndex; i < Math.min(endIndex, items.length); i++) {
        items[i].column = calculateColumnPosition(items[i].x, common, previous);
        previous = items[i].column;
    }
    const minColumnWidth = items.reduce((smallest, item, index) => {
        if (!item.column || index < startIndex || index > endIndex)
            return smallest;
        if (item.column.right < item.column.left) {
            item.column.right = item.column.left;
        }
        const width = item.column.right - item.column.left + 1;
        return Math.min(smallest, width);
    }, Math.ceil(barSpacingMedia * horizontalPixelRatio));
    if (common.spacing > 0 && minColumnWidth < alignToMinimalWidthLimit) {
        items.forEach((item, index) => {
            if (!item.column || index < startIndex || index > endIndex)
                return;
            const width = item.column.right - item.column.left + 1;
            if (width <= minColumnWidth)
                return item;
            if (item.column.shiftLeft) {
                item.column.right -= 1;
            }
            else {
                item.column.left += 1;
            }
            return item.column;
        });
    }
}
