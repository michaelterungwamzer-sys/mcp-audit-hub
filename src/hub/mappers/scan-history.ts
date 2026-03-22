import type { ScanResult } from '../../types/index.js';

export function mapToHistoryProperties(
    scanResult: ScanResult,
    target: string,
    serverPageId: string,
): Record<string, unknown> {
    const breakdown = scanResult.summary.findings;
    const timestamp = new Date().toISOString();
    const scanId = `${target}-${timestamp.replace(/[:.]/g, '-')}`;

    return {
        'Scan ID': {
            title: [{ text: { content: scanId } }],
        },
        'Server Name': {
            rich_text: [{ text: { content: target } }],
        },
        Score: {
            number: scanResult.summary.score,
        },
        Status: {
            select: { name: scanResult.summary.status },
        },
        'Findings Count': {
            number: scanResult.findings.length,
        },
        Critical: {
            number: breakdown.critical ?? 0,
        },
        High: {
            number: breakdown.high ?? 0,
        },
        Medium: {
            number: breakdown.medium ?? 0,
        },
        Low: {
            number: breakdown.low ?? 0,
        },
        'Duration ms': {
            number: scanResult.meta.duration_ms,
        },
        'Scanned At': {
            date: { start: timestamp },
        },
        'Scanner Version': {
            rich_text: [{ text: { content: scanResult.meta.version } }],
        },
    };
}
