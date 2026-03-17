import type { Finding, ScoreResult, ScanStatus, SeverityBreakdown } from '../types/index.js';
import { SEVERITY_WEIGHTS } from '../types/index.js';
import type { ScoringStrategy } from './index.js';

export class WeightedSumStrategy implements ScoringStrategy {
    calculate(findings: Finding[]): ScoreResult {
        const breakdown: SeverityBreakdown = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            total: findings.length,
        };

        let totalWeight = 0;

        for (const finding of findings) {
            breakdown[finding.severity]++;
            totalWeight += SEVERITY_WEIGHTS[finding.severity];
        }

        const score = Math.max(0, 100 - totalWeight);

        // Classification order matters (per scoring-output-config spec):
        // 1. score < 40 → FAIL
        // 2. any critical findings → WARN
        // 3. score ≥ 70 AND no criticals → PASS
        // 4. else → WARN
        let status: ScanStatus;

        if (score < 40) {
            status = 'fail';
        } else if (breakdown.critical > 0) {
            status = 'warn';
        } else if (score >= 70) {
            status = 'pass';
        } else {
            status = 'warn';
        }

        return { score, status, breakdown };
    }
}
