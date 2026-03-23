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
        Notes: {
            rich_text: [{ text: { content: buildEscalationNotes(target, trigger) } }],
        },
    };
}

function buildEscalationNotes(target: string, trigger: EscalationTrigger): string {
    const lines: string[] = [];

    if (trigger.type === 'score-regression') {
        lines.push(
            `Server "${target}" score dropped from ${trigger.previousScore} to ${trigger.newScore} (delta: ${trigger.delta}).`,
            `This exceeds the configured escalation threshold.`,
            `Action required: investigate what changed since the last scan and assess whether the regression introduces unacceptable risk.`,
        );
    } else if (trigger.type === 'status-downgrade') {
        lines.push(
            `Server "${target}" status downgraded. Score moved from ${trigger.previousScore} to ${trigger.newScore}.`,
            `A status downgrade indicates the server no longer meets the previous compliance threshold.`,
            `Action required: review scan findings and determine if the server should remain approved.`,
        );
    } else if (trigger.type === 'new-critical-finding') {
        lines.push(
            `Server "${target}" produced a critical-severity finding during a recurring scan.`,
            `Critical findings indicate severe vulnerabilities such as command injection, data exfiltration, or tool poisoning.`,
            `Action required: review the finding immediately and consider blocking the server until remediated.`,
        );
    }

    return lines.join(' ');
}
