import type { Finding } from '../types/index.js';
import type { MCPServer } from '../types/index.js';

export abstract class BaseAnalyzer {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly description: string;

    abstract analyze(server: MCPServer): Promise<Finding[]>;

    protected findingId(prefix: string, index: number): string {
        return `${prefix}-${index.toString().padStart(3, '0')}`;
    }
}
