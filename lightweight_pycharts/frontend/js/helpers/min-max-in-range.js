export class UpperLowerInRange {
    constructor(arr, chunkSize = 10) {
        this._arr = arr;
        this._chunkSize = chunkSize;
        this._cache = new Map();
    }
    getMinMax(startIndex, endIndex) {
        const cacheKey = `${startIndex}:${endIndex}`;
        if (cacheKey in this._cache) {
            return this._cache.get(cacheKey);
        }
        const result = {
            lower: Infinity,
            upper: -Infinity,
        };
        const startChunkIndex = Math.floor(startIndex / this._chunkSize);
        const endChunkIndex = Math.floor(endIndex / this._chunkSize);
        for (let chunkIndex = startChunkIndex; chunkIndex <= endChunkIndex; chunkIndex++) {
            const chunkStart = chunkIndex * this._chunkSize;
            const chunkEnd = Math.min((chunkIndex + 1) * this._chunkSize - 1, this._arr.length - 1);
            const chunkCacheKey = `${chunkStart}:${chunkEnd}`;
            if (chunkCacheKey in this._cache.keys()) {
                const item = this._cache.get(cacheKey);
                this._check(item, result);
            }
            else {
                const chunkResult = {
                    lower: Infinity,
                    upper: -Infinity,
                };
                for (let i = chunkStart; i <= chunkEnd; i++) {
                    this._check(this._arr[i], chunkResult);
                }
                this._cache.set(chunkCacheKey, chunkResult);
                this._check(chunkResult, result);
            }
        }
        this._cache.set(cacheKey, result);
        return result;
    }
    _check(item, state) {
        if (item.lower < state.lower) {
            state.lower = item.lower;
        }
        if (item.upper > state.upper) {
            state.upper = item.upper;
        }
    }
}
