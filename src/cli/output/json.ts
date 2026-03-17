import type { ScanResult } from '../../types/index.js';
import type { OutputFormatter } from './formatter.js';

class JsonFormatter implements OutputFormatter {
    format(result: ScanResult): string {
        return JSON.stringify(result, null, 2);
    }
}

export function createJsonFormatter(): OutputFormatter {
    return new JsonFormatter();
}
