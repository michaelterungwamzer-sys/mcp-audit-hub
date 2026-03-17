export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type AnalyzerType =
    | 'tool-poisoning'
    | 'command-injection'
    | 'dependencies'
    | 'network'
    | 'filesystem'
    | 'authentication';

export interface Finding {
    id: string;
    analyzer: AnalyzerType;
    severity: Severity;
    title: string;
    file?: string;
    line?: number;
    code?: string;
    recommendation: string;
    references?: string[];
}

export interface SeverityBreakdown {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
}

export type ScanStatus = 'pass' | 'warn' | 'fail';

export interface ScoreResult {
    score: number;
    status: ScanStatus;
    breakdown: SeverityBreakdown;
}

export interface AnalyzerResult {
    status: string;
    findings: number;
    duration_ms: number;
}

export interface ScanResult {
    meta: {
        version: string;
        timestamp: string;
        target: string;
        targetType: string;
        duration_ms: number;
    };
    summary: {
        score: number;
        status: ScanStatus;
        findings: SeverityBreakdown;
        suppressed: number;
    };
    findings: Finding[];
    dependencies?: {
        total: number;
        direct: number;
        vulnerable: number;
    };
    analyzers: Record<string, AnalyzerResult>;
}

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
    critical: 25,
    high: 15,
    medium: 5,
    low: 1,
};

export function isSeverity(value: unknown): value is Severity {
    return (
        typeof value === 'string' &&
        SEVERITY_ORDER.includes(value as Severity)
    );
}

export function isFinding(value: unknown): value is Finding {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    return (
        typeof obj.id === 'string' &&
        typeof obj.analyzer === 'string' &&
        isSeverity(obj.severity) &&
        typeof obj.title === 'string' &&
        typeof obj.recommendation === 'string'
    );
}
