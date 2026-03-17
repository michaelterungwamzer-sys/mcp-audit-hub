import { describe, it, expect } from 'vitest';
import { WeightedSumStrategy } from '../../../src/scoring/weighted-sum.js';
import type { Finding } from '../../../src/types/index.js';

function makeFinding(severity: Finding['severity'], id = 'TEST-001', file = 'test.ts', line = 1): Finding {
    return {
        id,
        analyzer: 'tool-poisoning',
        severity,
        title: `Test finding (${severity})`,
        file,
        line,
        recommendation: 'Fix it',
    };
}

describe('WeightedSumStrategy', () => {
    const strategy = new WeightedSumStrategy();

    it('scores 100/pass for empty findings', () => {
        const result = strategy.calculate([]);
        expect(result.score).toBe(100);
        expect(result.status).toBe('pass');
        expect(result.breakdown.total).toBe(0);
    });

    it('scores 0/fail for 4 critical findings', () => {
        const findings = Array.from({ length: 4 }, (_, i) =>
            makeFinding('critical', `CRIT-${i}`),
        );
        const result = strategy.calculate(findings);
        expect(result.score).toBe(0);
        expect(result.status).toBe('fail');
        expect(result.breakdown.critical).toBe(4);
    });

    it('scores correctly for mixed findings: 1 critical + 2 high + 3 medium = 30/fail', () => {
        const findings = [
            makeFinding('critical', 'C-001'),
            makeFinding('high', 'H-001'),
            makeFinding('high', 'H-002'),
            makeFinding('medium', 'M-001'),
            makeFinding('medium', 'M-002'),
            makeFinding('medium', 'M-003'),
        ];
        // 25 + 15 + 15 + 5 + 5 + 5 = 70 → score = 100 - 70 = 30
        const result = strategy.calculate(findings);
        expect(result.score).toBe(30);
        expect(result.status).toBe('fail');
    });

    it('scores pass at boundary: score exactly 70 with no criticals', () => {
        // 2 high (30) = score 70
        const findings = [
            makeFinding('high', 'H-001'),
            makeFinding('high', 'H-002'),
        ];
        const result = strategy.calculate(findings);
        expect(result.score).toBe(70);
        expect(result.status).toBe('pass');
    });

    it('scores warn when score >= 70 but critical findings present', () => {
        // 1 critical (25) = score 75, but critical present → warn
        const findings = [makeFinding('critical', 'C-001')];
        const result = strategy.calculate(findings);
        expect(result.score).toBe(75);
        expect(result.status).toBe('warn');
    });

    it('scores warn at boundary: score exactly 40', () => {
        // 4 high (60) = score 40
        const findings = Array.from({ length: 4 }, (_, i) =>
            makeFinding('high', `H-${i}`),
        );
        const result = strategy.calculate(findings);
        expect(result.score).toBe(40);
        expect(result.status).toBe('warn');
    });

    it('scores fail at boundary: score 39', () => {
        // 4 high + 1 low = 61 → score = 39
        const findings = [
            ...Array.from({ length: 4 }, (_, i) => makeFinding('high', `H-${i}`)),
            makeFinding('low', 'L-001'),
        ];
        const result = strategy.calculate(findings);
        expect(result.score).toBe(39);
        expect(result.status).toBe('fail');
    });

    it('floors score at 0 (never negative)', () => {
        const findings = Array.from({ length: 10 }, (_, i) =>
            makeFinding('critical', `C-${i}`),
        );
        // 10 × 25 = 250 → max(0, 100 - 250) = 0
        const result = strategy.calculate(findings);
        expect(result.score).toBe(0);
        expect(result.status).toBe('fail');
    });

    it('correctly counts severity breakdown', () => {
        const findings = [
            makeFinding('critical', 'C-001'),
            makeFinding('high', 'H-001'),
            makeFinding('high', 'H-002'),
            makeFinding('medium', 'M-001'),
            makeFinding('low', 'L-001'),
            makeFinding('low', 'L-002'),
        ];
        const result = strategy.calculate(findings);
        expect(result.breakdown).toEqual({
            critical: 1,
            high: 2,
            medium: 1,
            low: 2,
            total: 6,
        });
    });

    it('score < 40 with criticals is FAIL (not WARN)', () => {
        // 2 critical (50) + 1 high (15) = 65 → score = 35
        const findings = [
            makeFinding('critical', 'C-001'),
            makeFinding('critical', 'C-002'),
            makeFinding('high', 'H-001'),
        ];
        const result = strategy.calculate(findings);
        expect(result.score).toBe(35);
        expect(result.status).toBe('fail');
    });
});
