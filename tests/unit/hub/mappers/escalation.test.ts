import { describe, it, expect } from 'vitest';
import {
    detectEscalationTriggers,
    mapToEscalationProperties,
} from '../../../../src/hub/mappers/escalation.js';
import type { ScanResult } from '../../../../src/types/index.js';
import type { OverdueServerEntry, EscalationTrigger } from '../../../../src/hub/types/hub.js';

const baseServer: OverdueServerEntry = {
    pageId: 'page-123',
    target: '@mcp/server-test',
    reviewCadence: 'weekly',
    nextReviewDue: '2026-03-20',
    latestScore: 85,
    latestStatus: 'pass',
};

const baseScanResult: ScanResult = {
    meta: {
        version: '0.1.0',
        timestamp: '2026-03-23T12:00:00Z',
        target: '@mcp/server-test',
        targetType: 'npm',
        duration_ms: 1500,
    },
    summary: {
        score: 85,
        status: 'pass',
        findings: { critical: 0, high: 0, medium: 0, low: 0 },
        suppressed: 0,
    },
    findings: [],
    analyzers: {},
};

describe('detectEscalationTriggers', () => {
    it('returns empty array when score is stable', () => {
        const triggers = detectEscalationTriggers(baseServer, baseScanResult, 15);
        expect(triggers).toEqual([]);
    });

    it('detects score regression when drop exceeds threshold', () => {
        const result = {
            ...baseScanResult,
            summary: { ...baseScanResult.summary, score: 65, status: 'warn' as const },
        };
        const triggers = detectEscalationTriggers(baseServer, result, 15);
        const scoreRegression = triggers.find((t) => t.type === 'score-regression');
        expect(scoreRegression).toBeDefined();
        expect(scoreRegression?.previousScore).toBe(85);
        expect(scoreRegression?.newScore).toBe(65);
        expect(scoreRegression?.delta).toBe(-20);
    });

    it('does not trigger score regression when drop is below threshold', () => {
        const result = {
            ...baseScanResult,
            summary: { ...baseScanResult.summary, score: 75, status: 'pass' as const },
        };
        const triggers = detectEscalationTriggers(baseServer, result, 15);
        const scoreRegression = triggers.find((t) => t.type === 'score-regression');
        expect(scoreRegression).toBeUndefined();
    });

    it('triggers at exact threshold boundary', () => {
        const result = {
            ...baseScanResult,
            summary: { ...baseScanResult.summary, score: 70, status: 'pass' as const },
        };
        const triggers = detectEscalationTriggers(baseServer, result, 15);
        const scoreRegression = triggers.find((t) => t.type === 'score-regression');
        expect(scoreRegression).toBeDefined();
    });

    it('does not trigger one point below threshold', () => {
        const result = {
            ...baseScanResult,
            summary: { ...baseScanResult.summary, score: 71, status: 'pass' as const },
        };
        const triggers = detectEscalationTriggers(baseServer, result, 15);
        const scoreRegression = triggers.find((t) => t.type === 'score-regression');
        expect(scoreRegression).toBeUndefined();
    });

    it('detects status downgrade from pass to warn', () => {
        const result = {
            ...baseScanResult,
            summary: { ...baseScanResult.summary, score: 80, status: 'warn' as const },
        };
        const triggers = detectEscalationTriggers(baseServer, result, 15);
        const downgrade = triggers.find((t) => t.type === 'status-downgrade');
        expect(downgrade).toBeDefined();
    });

    it('detects status downgrade from pass to fail', () => {
        const result = {
            ...baseScanResult,
            summary: { ...baseScanResult.summary, score: 30, status: 'fail' as const },
        };
        const triggers = detectEscalationTriggers(baseServer, result, 15);
        const downgrade = triggers.find((t) => t.type === 'status-downgrade');
        expect(downgrade).toBeDefined();
    });

    it('does not trigger status downgrade on same status', () => {
        const triggers = detectEscalationTriggers(baseServer, baseScanResult, 15);
        const downgrade = triggers.find((t) => t.type === 'status-downgrade');
        expect(downgrade).toBeUndefined();
    });

    it('detects new critical finding', () => {
        const result = {
            ...baseScanResult,
            findings: [
                {
                    id: 'f-1',
                    analyzer: 'tool-poisoning',
                    severity: 'critical' as const,
                    title: 'Hidden instructions',
                    description: 'Tool description contains hidden instructions',
                    file: 'index.ts',
                    line: 10,
                    evidence: '',
                },
            ],
        };
        const triggers = detectEscalationTriggers(baseServer, result, 15);
        const critical = triggers.find((t) => t.type === 'new-critical-finding');
        expect(critical).toBeDefined();
    });

    it('can return multiple triggers simultaneously', () => {
        const result = {
            ...baseScanResult,
            summary: { ...baseScanResult.summary, score: 30, status: 'fail' as const },
            findings: [
                {
                    id: 'f-1',
                    analyzer: 'tool-poisoning',
                    severity: 'critical' as const,
                    title: 'Hidden instructions',
                    description: 'desc',
                    file: 'index.ts',
                    line: 10,
                    evidence: '',
                },
            ],
        };
        const triggers = detectEscalationTriggers(baseServer, result, 15);
        expect(triggers.length).toBe(3);
        expect(triggers.map((t) => t.type).sort()).toEqual([
            'new-critical-finding',
            'score-regression',
            'status-downgrade',
        ]);
    });
});

describe('mapToEscalationProperties', () => {
    const trigger: EscalationTrigger = {
        type: 'score-regression',
        previousScore: 85,
        newScore: 52,
        delta: -33,
    };

    it('maps all required properties', () => {
        const props = mapToEscalationProperties('@mcp/server-test', trigger, 'history-page-1');

        expect(props.Title).toEqual({
            title: [{ text: { content: 'Score regression: @mcp/server-test (85 -> 52)' } }],
        });
        expect(props['Server Name']).toEqual({
            rich_text: [{ text: { content: '@mcp/server-test' } }],
        });
        expect(props['Previous Score']).toEqual({ number: 85 });
        expect(props['New Score']).toEqual({ number: 52 });
        expect(props.Delta).toEqual({ number: -33 });
        expect(props.Severity).toEqual({ select: { name: 'high' } });
        expect(props.Trigger).toEqual({ select: { name: 'score-regression' } });
        expect(props.Status).toEqual({ select: { name: 'open' } });
        expect(props['Scan History ID']).toEqual({
            rich_text: [{ text: { content: 'history-page-1' } }],
        });
        expect(props['Created At']).toBeDefined();
    });

    it('uses critical finding title for critical trigger type', () => {
        const criticalTrigger: EscalationTrigger = {
            type: 'new-critical-finding',
            previousScore: 85,
            newScore: 60,
            delta: -25,
        };
        const props = mapToEscalationProperties('@mcp/server-test', criticalTrigger, 'h-1');

        expect(props.Title).toEqual({
            title: [{ text: { content: 'Critical finding: @mcp/server-test' } }],
        });
    });

    it('derives severity from new score', () => {
        const criticalTrigger: EscalationTrigger = {
            type: 'score-regression',
            previousScore: 85,
            newScore: 20,
            delta: -65,
        };
        const props = mapToEscalationProperties('test', criticalTrigger, 'h-1');
        expect(props.Severity).toEqual({ select: { name: 'critical' } });
    });
});
