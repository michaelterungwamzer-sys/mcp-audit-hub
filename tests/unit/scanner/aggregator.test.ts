import { describe, it, expect } from 'vitest';
import { aggregate } from '../../../src/scanner/aggregator.js';
import { DEFAULT_CONFIG } from '../../../src/config/defaults.js';
import type { Finding, AuditConfig } from '../../../src/types/index.js';

function makeFinding(
    overrides: Partial<Finding> = {},
): Finding {
    return {
        id: 'TEST-001',
        analyzer: 'tool-poisoning',
        severity: 'medium',
        title: 'Test finding',
        file: 'test.ts',
        line: 1,
        recommendation: 'Fix it',
        ...overrides,
    };
}

describe('aggregate', () => {
    const config = DEFAULT_CONFIG;

    it('returns score 100/pass for empty findings', () => {
        const result = aggregate([], config);
        expect(result.scoreResult.score).toBe(100);
        expect(result.scoreResult.status).toBe('pass');
        expect(result.findings).toHaveLength(0);
        expect(result.suppressed).toBe(0);
    });

    it('deduplicates findings with same analyzer+file+line', () => {
        const findings = [
            makeFinding({ id: 'A', severity: 'medium' }),
            makeFinding({ id: 'B', severity: 'high' }),
        ];
        const result = aggregate(findings, config);
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].severity).toBe('high'); // kept higher severity
    });

    it('keeps findings with different lines', () => {
        const findings = [
            makeFinding({ id: 'A', line: 1 }),
            makeFinding({ id: 'B', line: 2 }),
        ];
        const result = aggregate(findings, config);
        expect(result.findings).toHaveLength(2);
    });

    it('keeps findings with different files', () => {
        const findings = [
            makeFinding({ id: 'A', file: 'a.ts' }),
            makeFinding({ id: 'B', file: 'b.ts' }),
        ];
        const result = aggregate(findings, config);
        expect(result.findings).toHaveLength(2);
    });

    it('sorts findings by severity (critical first)', () => {
        const findings = [
            makeFinding({ id: 'L', severity: 'low', file: 'l.ts' }),
            makeFinding({ id: 'C', severity: 'critical', file: 'c.ts' }),
            makeFinding({ id: 'H', severity: 'high', file: 'h.ts' }),
        ];
        const result = aggregate(findings, config);
        expect(result.findings[0].severity).toBe('critical');
        expect(result.findings[1].severity).toBe('high');
        expect(result.findings[2].severity).toBe('low');
    });

    it('suppresses allowlisted findings by ID', () => {
        const findings = [
            makeFinding({ id: 'ALLOW-001', file: 'a.ts' }),
            makeFinding({ id: 'KEEP-001', file: 'b.ts' }),
        ];
        const configWithAllowlist: AuditConfig = {
            ...config,
            allowlist: {
                findings: [{ id: 'ALLOW-001', reason: 'known safe' }],
                packages: [],
            },
        };
        const result = aggregate(findings, configWithAllowlist);
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].id).toBe('KEEP-001');
        expect(result.suppressed).toBe(1);
    });

    it('suppresses allowlisted findings by pattern', () => {
        const findings = [
            makeFinding({ id: 'DEP-001', file: 'a.ts' }),
            makeFinding({ id: 'DEP-002', file: 'b.ts' }),
            makeFinding({ id: 'INJ-001', file: 'c.ts' }),
        ];
        const configWithAllowlist: AuditConfig = {
            ...config,
            allowlist: {
                findings: [{ pattern: 'DEP-*', reason: 'reviewed' }],
                packages: [],
            },
        };
        const result = aggregate(findings, configWithAllowlist);
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].id).toBe('INJ-001');
        expect(result.suppressed).toBe(2);
    });

    it('scores after allowlist removal (suppressed do not affect score)', () => {
        const findings = [
            makeFinding({ id: 'C-001', severity: 'critical', file: 'a.ts' }),
        ];
        const configWithAllowlist: AuditConfig = {
            ...config,
            allowlist: {
                findings: [{ id: 'C-001', reason: 'false positive' }],
                packages: [],
            },
        };
        const result = aggregate(findings, configWithAllowlist);
        expect(result.scoreResult.score).toBe(100);
        expect(result.scoreResult.status).toBe('pass');
    });
});
