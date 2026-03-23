import { describe, it, expect } from 'vitest';
import {
    detectSource,
    detectLanguage,
    mapToNewRegistryProperties,
    mapToUpdateRegistryProperties,
    mapAdvanceReviewDate,
} from '../../../../src/hub/mappers/server-registry.js';
import type { ScanResult } from '../../../../src/types/index.js';

const mockScanResult: ScanResult = {
    meta: {
        version: '0.1.0',
        timestamp: '2026-03-21T12:00:00Z',
        target: '@modelcontextprotocol/server-filesystem',
        targetType: 'npm',
        duration_ms: 1500,
    },
    summary: {
        score: 72,
        status: 'warn',
        findings: { critical: 0, high: 1, medium: 1, low: 1 },
        suppressed: 0,
    },
    findings: [],
    analyzers: {},
};

describe('detectSource', () => {
    it('detects npm packages', () => {
        expect(detectSource('@modelcontextprotocol/server-filesystem')).toBe('npm');
        expect(detectSource('some-package')).toBe('npm');
    });

    it('detects local paths', () => {
        expect(detectSource('./my-server')).toBe('local');
        expect(detectSource('../other-server')).toBe('local');
        expect(detectSource('/absolute/path')).toBe('local');
    });

    it('detects github URLs', () => {
        expect(detectSource('https://github.com/user/repo')).toBe('github');
    });
});

describe('detectLanguage', () => {
    it('defaults to typescript', () => {
        expect(detectLanguage(mockScanResult)).toBe('typescript');
    });
});

describe('mapToNewRegistryProperties', () => {
    it('creates all required properties for a new server entry', () => {
        const props = mapToNewRegistryProperties(mockScanResult, '@mcp/server-test');

        expect(props.Name).toEqual({ title: [{ text: { content: '@mcp/server-test' } }] });
        expect(props.Source).toEqual({ select: { name: 'npm' } });
        expect(props['Latest Score']).toEqual({ number: 72 });
        expect(props.Status).toEqual({ select: { name: 'warn' } });
        expect(props.Approval).toEqual({ select: { name: 'pending' } });
        expect(props['Scan Count']).toEqual({ number: 1 });
        expect(props['Risk Classification']).toEqual({ select: { name: 'medium' } });
    });

    it('classifies risk based on score', () => {
        const critical = mapToNewRegistryProperties(
            { ...mockScanResult, summary: { ...mockScanResult.summary, score: 20 } },
            'test',
        );
        expect(critical['Risk Classification']).toEqual({ select: { name: 'critical' } });

        const high = mapToNewRegistryProperties(
            { ...mockScanResult, summary: { ...mockScanResult.summary, score: 50 } },
            'test',
        );
        expect(high['Risk Classification']).toEqual({ select: { name: 'high' } });

        const low = mapToNewRegistryProperties(
            { ...mockScanResult, summary: { ...mockScanResult.summary, score: 90 } },
            'test',
        );
        expect(low['Risk Classification']).toEqual({ select: { name: 'low' } });
    });
});

describe('mapToUpdateRegistryProperties', () => {
    it('updates score, status, scan count, and risk classification', () => {
        const props = mapToUpdateRegistryProperties(mockScanResult, 3);

        expect(props['Latest Score']).toEqual({ number: 72 });
        expect(props.Status).toEqual({ select: { name: 'warn' } });
        expect(props['Scan Count']).toEqual({ number: 4 });
        expect(props['Risk Classification']).toEqual({ select: { name: 'medium' } });
        expect(props['Last Scanned']).toBeDefined();
    });
});

describe('mapAdvanceReviewDate', () => {
    it('advances weekly by 7 days', () => {
        const props = mapAdvanceReviewDate('weekly', '2026-03-23');
        const nextDate = (props['Next Review Due'] as { date: { start: string } }).date.start;
        expect(nextDate).toBe('2026-03-30');
    });

    it('advances monthly by 30 days', () => {
        const props = mapAdvanceReviewDate('monthly', '2026-03-01');
        const nextDate = (props['Next Review Due'] as { date: { start: string } }).date.start;
        expect(nextDate).toBe('2026-03-31');
    });

    it('advances quarterly by 90 days', () => {
        const props = mapAdvanceReviewDate('quarterly', '2026-01-01');
        const nextDate = (props['Next Review Due'] as { date: { start: string } }).date.start;
        expect(nextDate).toBe('2026-04-01');
    });

    it('defaults to 30 days for unknown cadence', () => {
        const props = mapAdvanceReviewDate('unknown', '2026-03-01');
        const nextDate = (props['Next Review Due'] as { date: { start: string } }).date.start;
        expect(nextDate).toBe('2026-03-31');
    });
});
