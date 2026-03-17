import type { AnalyzerType, Severity } from './finding.js';

export interface CheckConfig {
    enabled: boolean;
    [key: string]: unknown;
}

export interface SeverityConfig {
    failThreshold: number;
    passThreshold: number;
    weights: Record<Severity, number>;
}

export interface OutputConfig {
    format: 'console' | 'json';
    colors: boolean;
    verbose: boolean;
}

export interface AllowlistEntry {
    id?: string;
    pattern?: string;
    reason: string;
}

export interface AllowlistConfig {
    findings: AllowlistEntry[];
    packages: string[];
}

export interface AuditConfig {
    checks: Record<AnalyzerType, CheckConfig>;
    severity: SeverityConfig;
    output: OutputConfig;
    allowlist: AllowlistConfig;
}
