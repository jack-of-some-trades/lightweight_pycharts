
import { PrimitiveBase } from './primitive-base.js';
import { TrendLine } from './trend-line/trend-line.js';


export const primitives:Map<string, new(args : any) => PrimitiveBase> = new Map([
    ['TrendLine', TrendLine]
]) 