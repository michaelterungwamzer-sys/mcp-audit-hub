import type { ScanResult } from '../../types/index.js';
import type { OverdueServerEntry, EscalationTrigger } from '../types/hub.js';
import { deriveRiskClassification } from '../types/hub.js';

export function detectEscalationTriggers(
    server: OverdueServerEntry,
    scanResult: ScanResult,
    threshold: number,
): EscalationTrigger[] {
    const triggers: EscalationTrigger[] = [];
    const newScore = scanResult.summary.score;
    const previousScore = server.latestScore;
    const delta = newScore - previousScore;

    // Score regression
    if (delta < 0 && Math.abs(delta) >= threshold) {
        triggers.push({
            type: 'score-regression',
            previousScore,
            newScore,
            delta,
        });
    }

    // Status downgrade
    const statusRank: Record<string, number> = { pass: 3, warn: 2, fail: 1 };
    const oldRank = statusRank[server.latestStatus] ?? 0;
    const newRank = statusRank[scanResult.summary.status] ?? 0;
    if (newRank < oldRank) {
        triggers.push({
            type: 'status-downgrade',
            previousScore,
            newScore,
            delta,
        });
    }

    // New critical finding
    const hasCritical = scanResult.findings.some(
        (f) => f.severity === 'critical',
    );
    if (hasCritical) {
        triggers.push({
            type: 'new-critical-finding',
            previousScore,
            newScore,
            delta,
        });
    }

    return triggers;
}

export function mapToEscalationProperties(
    target: string,
    trigger: EscalationTrigger,
    scanHistoryPageId: string,
): Record<string, unknown> {
    const severity = deriveRiskClassification(trigger.newScore);
    const titleText = trigger.type === 'new-critical-finding'
        ? `Critical finding: ${target}`
        : `Score regression: ${target} (${trigger.previousScore} -> ${trigger.newScore})`;

    return {
        Title: {
            title: [{ text: { content: titleText.slice(0, 100) } }],
        },
        'Server Name': {
            rich_text: [{ text: { content: target } }],
        },
        'Previous Score': {
            number: trigger.previousScore,
        },
        'New Score': {
            number: trigger.newScore,
        },
        Delta: {
            number: trigger.delta,
        },
        Severity: {
            select: { name: severity },
        },
        Trigger: {
            select: { name: trigger.type },
        },
        Status: {
            select: { name: 'open' },
        },
        'Scan History ID': {
            rich_text: [{ text: { content: scanHistoryPageId } }],
        },
        'Created At': {
            date: { start: new Date().toISOString() },
        },
    };
}
