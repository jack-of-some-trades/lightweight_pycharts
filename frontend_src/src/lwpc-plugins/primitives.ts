
import { PrimitiveBase } from './primitive-base';
import { TrendLine } from './trend-line/trend-line';


export const primitives:Map<string, new(args : any) => PrimitiveBase> = new Map([
    ['TrendLine', TrendLine]
]) 