import type { AuditConfig } from '../types/index.js';

/**
 * Default audit configuration used as the base before merging
 * file-based config and CLI overrides. All analyzers are enabled,
 * scoring uses standard severity weights, and output defaults to
 * colored console format.
 */
export const DEFAULT_CONFIG: AuditConfig = {
    checks: {
        'tool-poisoning': { enabled: true, descriptionMaxLength: 500 },
        'command-injection': { enabled: true },
        'dependencies': { enabled: true },
        'network': { enabled: true },
        'filesystem': { enabled: true },
        'authentication': { enabled: true },
        'tls-verification': { enabled: true },
        'credential-hygiene': { enabled: true },
        'security-posture': {
            enabled: true,
            rateLimiting: { enabled: true },
            auditLogging: { enabled: true },
            inputValidation: { enabled: true },
        },
        'cross-server': { enabled: true },
        'tool-allowlist': { enabled: true },
        'rug-pull': { enabled: true },
    },
    severity: {
        failThreshold: 40,
        passThreshold: 70,
        weights: {
            critical: 25,
            high: 15,
            medium: 5,
            low: 1,
        },
    },
    output: {
        format: 'console',
        colors: true,
        verbose: false,
    },
    allowlist: {
        findings: [],
        packages: [],
    },
};
