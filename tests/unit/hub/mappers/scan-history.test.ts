import { describe, it, expect } from 'vitest';
import { mapToHistoryProperties } from '../../../../src/hub/mappers/scan-history.js';
import type { ScanResult } from '../../../../src/types/index.js';

const mockScanResult: ScanResult = {
    meta: {
        version: '0.1.0',
        timestamp: '2026-03-21T12:00:00Z',
        target: '@mcp/server-test',
        targetType: 'npm',
        duration_ms: 1500,
    },
    summary: {
        score: 72,
        status: 'warn',
        findings: { critical: 0, high: 1, medium: 2, low: 1 },
        suppressed: 0,
    },
    findings: [
        { id: 'F-001', analyzer: 'filesystem', severity: 'high', title: 'Test', description: 'Test' },
        { id: 'F-002', analyzer: 'network', severity: 'medium', title: 'Test2', description: 'Test2' },
        { id: 'F-003', analyzer: 'network', severity: 'medium', title: 'Test3', description: 'Test3' },
        { id: 'F-004', analyzer: 'authentication', severity: 'low', title: 'Test4', description: 'Test4' },
    ],
    analyzers: {},
};

describe('mapToHistoryProperties', () => {
    it('maps all scan result fields to Notion properties', () => {
        const props = mapToHistoryProperties(mockScanResult, '@mcp/server-test', 'server-page-id');

        expect(props.Score).toEqual({ number: 72 });
        expect(props.Status).toEqual({ select: { name: 'warn' } });
        expect(props['Findings Count']).toEqual({ number: 4 });
        expect(props.Critical).toEqual({ number: 0 });
        expect(props.High).toEqual({ number: 1 });
        expect(props.Medium).toEqual({ number: 2 });
        expect(props.Low).toEqual({ number: 1 });
        expect(props['Duration ms']).toEqual({ number: 1500 });
        expect(props['Scanner Version']).toEqual({
            rich_text: [{ text: { content: '0.1.0' } }],
        });
    });

    it('includes server name as text', () => {
        const props = mapToHistoryProperties(mockScanResult, '@mcp/server-test', 'server-page-id');

        expect(props['Server Name']).toEqual({
            rich_text: [{ text: { content: '@mcp/server-test' } }],
        });
    });

    it('generates a scan ID from target and timestamp', () => {
        const props = mapToHistoryProperties(mockScanResult, '@mcp/server-test', 'server-page-id');
        const scanId = props['Scan ID'] as { title: Array<{ text: { content: string } }> };

        expect(scanId.title[0].text.content).toMatch(/^@mcp\/server-test-/);
    });
});
