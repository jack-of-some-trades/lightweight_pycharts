import { CustomData } from '../../lib/pkg.js';

/**
 * HLCArea Series Data
 */
export interface HLCAreaData extends CustomData {
	high: number;
	low: number;
	close: number;
}
