import type { Finding, ScoreResult } from '../types/index.js';
import { WeightedSumStrategy } from './weighted-sum.js';

export interface ScoringStrategy {
    calculate(findings: Finding[]): ScoreResult;
}

export { WeightedSumStrategy } from './weighted-sum.js';

export function createScoringStrategy(method = 'weighted-sum'): ScoringStrategy {
    switch (method) {
        case 'weighted-sum':
            return new WeightedSumStrategy();
        default:
            throw new Error(`Unknown scoring method: ${method}`);
    }
}
