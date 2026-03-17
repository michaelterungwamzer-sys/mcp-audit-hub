import type { AuditConfig } from '../types/index.js';

export const DEFAULT_CONFIG: AuditConfig = {
    checks: {
        'tool-poisoning': { enabled: true, descriptionMaxLength: 500 },
        'command-injection': { enabled: true },
        'dependencies': { enabled: true },
        'network': { enabled: true },
        'filesystem': { enabled: true },
        'authentication': { enabled: true },
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
