/** Severity level of a security finding, ordered from most to least critical. */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/** Type of security analyzer that produced a finding. */
export type AnalyzerType =
    | 'tool-poisoning'
    | 'command-injection'
    | 'dependencies'
    | 'network'
    | 'filesystem'
    | 'authentication'
    | 'tls-verification'
    | 'security-posture'
    | 'credential-hygiene'
    | 'cross-server'
    | 'tool-allowlist'
    | 'rug-pull';

/** A single security finding reported by an analyzer. */
export interface Finding {
    /** Unique identifier for this finding. */
    id: string;
    /** The analyzer that produced this finding. */
    analyzer: AnalyzerType;
    /** Severity level of this finding. */
    severity: Severity;
    /** Short human-readable title describing the issue. */
    title: string;
    /** File path where the issue was found, if applicable. */
    file?: string;
    /** Line number within the file where the issue was found, if applicable. */
    line?: number;
    /** Code snippet related to the finding, if available. */
    code?: string;
    /** Recommended action to remediate this finding. */
    recommendation: string;
    /** URLs or identifiers for external references (e.g., CVEs, OWASP links). */
    references?: string[];
}

/** Counts of findings broken down by severity level. */
export interface SeverityBreakdown {
    /** Number of critical-severity findings. */
    critical: number;
    /** Number of high-severity findings. */
    high: number;
    /** Number of medium-severity findings. */
    medium: number;
    /** Number of low-severity findings. */
    low: number;
    /** Total number of findings across all severities. */
    total: number;
}

/** Overall status of a scan: pass, warn, or fail. */
export type ScanStatus = 'pass' | 'warn' | 'fail';

/** Result of scoring a set of findings, including numeric score and severity breakdown. */
export interface ScoreResult {
    /** Numeric security score (0-100, higher is better). */
    score: number;
    /** Overall scan status derived from the score and findings. */
    status: ScanStatus;
    /** Breakdown of findings by severity level. */
    breakdown: SeverityBreakdown;
}

/** Result metadata for a single analyzer's execution. */
export interface AnalyzerResult {
    /** Status string indicating the analyzer outcome (e.g., 'completed', 'error'). */
    status: string;
    /** Number of findings produced by this analyzer. */
    findings: number;
    /** Time in milliseconds the analyzer took to run. */
    duration_ms: number;
}

/** Complete result of a security scan, including metadata, findings, and per-analyzer results. */
export interface ScanResult {
    /** Metadata about the scan execution. */
    meta: {
        /** Scanner version used. */
        version: string;
        /** ISO 8601 timestamp of when the scan was performed. */
        timestamp: string;
        /** Path or identifier of the scan target. */
        target: string;
        /** Type of target scanned (e.g., 'directory', 'repository'). */
        targetType: string;
        /** Total scan duration in milliseconds. */
        duration_ms: number;
    };
    /** High-level summary of scan results. */
    summary: {
        /** Numeric security score (0-100). */
        score: number;
        /** Overall scan status. */
        status: ScanStatus;
        /** Finding counts broken down by severity. */
        findings: SeverityBreakdown;
        /** Number of findings suppressed by the allowlist. */
        suppressed: number;
    };
    /** All security findings from the scan. */
    findings: Finding[];
    /** Dependency analysis results, if available. */
    dependencies?: {
        /** Total number of dependencies. */
        total: number;
        /** Number of direct dependencies. */
        direct: number;
        /** Number of dependencies with known vulnerabilities. */
        vulnerable: number;
    };
    /** Per-analyzer execution results keyed by analyzer name. */
    analyzers: Record<string, AnalyzerResult>;
}

/** Severity levels ordered from most to least critical. */
export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

/** Default scoring weights for each severity level, used in weighted-sum calculations. */
export const SEVERITY_WEIGHTS: Record<Severity, number> = {
    critical: 25,
    high: 15,
    medium: 5,
    low: 1,
};

/**
 * Type guard that checks whether a value is a valid Severity string.
 * @param value - The value to check.
 * @returns True if the value is one of 'critical', 'high', 'medium', or 'low'.
 */
export function isSeverity(value: unknown): value is Severity {
    return (
        typeof value === 'string' &&
        SEVERITY_ORDER.includes(value as Severity)
    );
}

/**
 * Type guard that checks whether a value conforms to the Finding interface.
 * @param value - The value to check.
 * @returns True if the value has the required Finding properties with correct types.
 */
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
