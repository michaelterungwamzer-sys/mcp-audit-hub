import type { ScanResult } from '../../types/index.js';

export interface OutputFormatter {
    format(result: ScanResult): string;
}
