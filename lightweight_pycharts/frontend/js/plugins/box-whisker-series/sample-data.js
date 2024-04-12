const dayLength = 24 * 60 * 60;
function quartileDataPoint(q0, q1, q2, q3, q4, basePoint) {
    return [
        basePoint + q0,
        basePoint + q1,
        basePoint + q2,
        basePoint + q3,
        basePoint + q4,
    ];
}
function whiskerDataSection(startDate, basePoint) {
    return [
        { quartiles: quartileDataPoint(55, 70, 80, 85, 95, basePoint) },
        { quartiles: quartileDataPoint(50, 70, 78, 83, 90, basePoint) },
        {
            quartiles: quartileDataPoint(58, 68, 75, 85, 90, basePoint),
            outliers: [45 + basePoint, 50 + basePoint],
        },
        { quartiles: quartileDataPoint(55, 65, 70, 80, 88, basePoint) },
        { quartiles: quartileDataPoint(52, 63, 68, 77, 85, basePoint) },
        {
            quartiles: quartileDataPoint(50, 65, 72, 76, 88, basePoint),
            outliers: [45 + basePoint, 95 + basePoint, 100 + basePoint],
        },
        { quartiles: quartileDataPoint(40, 60, 78, 85, 90, basePoint) },
        { quartiles: quartileDataPoint(45, 72, 80, 88, 95, basePoint) },
        { quartiles: quartileDataPoint(47, 70, 82, 86, 97, basePoint) },
        {
            quartiles: quartileDataPoint(53, 68, 83, 87, 92, basePoint),
            outliers: [45 + basePoint, 100 + basePoint],
        },
    ].map((d, index) => {
        return Object.assign(Object.assign({}, d), { time: (startDate + index * dayLength) });
    });
}
export function sampleWhiskerData() {
    return [
        ...whiskerDataSection(1677628800, 0),
        ...whiskerDataSection(1677628800 + 1 * 10 * dayLength, 20),
        ...whiskerDataSection(1677628800 + 2 * 10 * dayLength, 40),
        ...whiskerDataSection(1677628800 + (3 * 10 + 1) * dayLength, 30),
    ];
}
