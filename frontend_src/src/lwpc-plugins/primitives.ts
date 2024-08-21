
import { PrimitiveBase } from './primitive-base';
import { TrendLine } from './trend-line/trend-line';


export const primitives:Map<string, new(id:string, params:any) => PrimitiveBase> = new Map([
    ['TrendLine', TrendLine]
]) 