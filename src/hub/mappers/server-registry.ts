import type { ScanResult } from '../../types/index.js';
import { deriveRiskClassification } from '../types/hub.js';

export function detectSource(target: string): string {
    if (target.startsWith('/') || target.startsWith('./') || target.startsWith('..') || target.includes('\\')) {
        return 'local';
    }
    if (target.includes('github.com')) {
        return 'github';
    }
    return 'npm';
}

export function detectLanguage(scanResult: ScanResult): string {
    const pkg = scanResult.meta as Record<string, unknown>;
    const target = pkg.target as string ?? '';

    if (target.endsWith('.py') || target.includes('python')) {
        return 'python';
    }
    return 'typescript';
}

export function mapToNewRegistryProperties(
    scanResult: ScanResult,
    target: string,
): Record<string, unknown> {
    return {
        Name: {
            title: [{ text: { content: target } }],
        },
        Source: {
            select: { name: detectSource(target) },
        },
        Language: {
            select: { name: detectLanguage(scanResult) },
        },
        'Latest Score': {
            number: scanResult.summary.score,
        },
        Status: {
            select: { name: scanResult.summary.status },
        },
        Approval: {
            select: { name: 'pending' },
        },
        'Last Scanned': {
            date: { start: new Date().toISOString() },
        },
        'Scan Count': {
            number: 1,
        },
        'Risk Classification': {
            select: { name: deriveRiskClassification(scanResult.summary.score) },
        },
    };
}

export function mapToUpdateRegistryProperties(
    scanResult: ScanResult,
    existingScanCount: number,
): Record<string, unknown> {
    return {
        'Latest Score': {
            number: scanResult.summary.score,
        },
        Status: {
            select: { name: scanResult.summary.status },
        },
        'Last Scanned': {
            date: { start: new Date().toISOString() },
        },
        'Scan Count': {
            number: existingScanCount + 1,
        },
        'Risk Classification': {
            select: { name: deriveRiskClassification(scanResult.summary.score) },
        },
    };
}
