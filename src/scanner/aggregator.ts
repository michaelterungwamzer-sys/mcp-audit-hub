import type { AuditConfig, Finding, ScoreResult } from '../types/index.js';
import { SEVERITY_ORDER } from '../types/index.js';
import { WeightedSumStrategy } from '../scoring/weighted-sum.js';

export interface AggregationResult {
    findings: Finding[];
    scoreResult: ScoreResult;
    suppressed: number;
}

function deduplicateFindings(findings: Finding[]): Finding[] {
    const seen = new Map<string, Finding>();

    for (const finding of findings) {
        const key = `${finding.analyzer}:${finding.file ?? ''}:${finding.line ?? ''}`;
        const existing = seen.get(key);

        if (!existing) {
            seen.set(key, finding);
        } else {
            // Keep the higher severity
            const existingIdx = SEVERITY_ORDER.indexOf(existing.severity);
            const newIdx = SEVERITY_ORDER.indexOf(finding.severity);

            if (newIdx < existingIdx) {
                seen.set(key, finding);
            }
        }
    }

    return Array.from(seen.values());
}

function applyAllowlist(findings: Finding[], config: AuditConfig): { filtered: Finding[]; suppressed: number } {
    const allowedIds = new Set(
        config.allowlist.findings
            .filter((e) => e.id)
            .map((e) => e.id),
    );

    const allowedPatterns = config.allowlist.findings
        .filter((e) => e.pattern)
        .map((e) => {
            const pattern = e.pattern!.replace(/\*/g, '.*');
            return new RegExp(`^${pattern}$`);
        });

    const filtered: Finding[] = [];
    let suppressed = 0;

    for (const finding of findings) {
        const isAllowedById = allowedIds.has(finding.id);
        const isAllowedByPattern = allowedPatterns.some((p) => p.test(finding.id));

        if (isAllowedById || isAllowedByPattern) {
            suppressed++;
        } else {
            filtered.push(finding);
        }
    }

    return { filtered, suppressed };
}

function sortBySeverity(findings: Finding[]): Finding[] {
    return [...findings].sort((a, b) => {
        return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    });
}

export function aggregate(findings: Finding[], config: AuditConfig): AggregationResult {
    const deduplicated = deduplicateFindings(findings);
    const { filtered, suppressed } = applyAllowlist(deduplicated, config);
    const sorted = sortBySeverity(filtered);

    const strategy = new WeightedSumStrategy();
    const scoreResult = strategy.calculate(sorted);

    return { findings: sorted, scoreResult, suppressed };
}
