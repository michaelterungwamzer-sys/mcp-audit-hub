import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { scan } from '../../src/scanner/index.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures');

describe('scan vulnerable server (integration)', () => {
    it('detects multiple vulnerabilities and scores below 70', async () => {
        const vulnerablePath = join(FIXTURES_DIR, 'vulnerable-server');
        const result = await scan(vulnerablePath, DEFAULT_CONFIG);

        // Should find multiple findings across different analyzers
        expect(result.findings.length).toBeGreaterThanOrEqual(3);

        // Should have at least one critical finding
        const criticals = result.findings.filter((f) => f.severity === 'critical');
        expect(criticals.length).toBeGreaterThanOrEqual(1);

        // Score should be well below pass threshold
        expect(result.summary.score).toBeLessThan(70);

        // Status should be warn or fail (has criticals)
        expect(['warn', 'fail']).toContain(result.summary.status);

        // Should detect findings from multiple analyzer types
        const analyzerTypes = new Set(result.findings.map((f) => f.analyzer));
        expect(analyzerTypes.size).toBeGreaterThanOrEqual(2);
    });

    it('detects tool poisoning patterns', async () => {
        const vulnerablePath = join(FIXTURES_DIR, 'vulnerable-server');
        const result = await scan(vulnerablePath, DEFAULT_CONFIG);

        const poisoningFindings = result.findings.filter((f) => f.analyzer === 'tool-poisoning');
        expect(poisoningFindings.length).toBeGreaterThanOrEqual(1);
    });

    it('detects command injection', async () => {
        const vulnerablePath = join(FIXTURES_DIR, 'vulnerable-server');
        const result = await scan(vulnerablePath, DEFAULT_CONFIG);

        const injectionFindings = result.findings.filter((f) => f.analyzer === 'command-injection');
        expect(injectionFindings.length).toBeGreaterThanOrEqual(1);
    });

    it('detects sensitive filesystem access', async () => {
        const vulnerablePath = join(FIXTURES_DIR, 'vulnerable-server');
        const result = await scan(vulnerablePath, DEFAULT_CONFIG);

        const fsFindings = result.findings.filter((f) => f.analyzer === 'filesystem');
        expect(fsFindings.length).toBeGreaterThanOrEqual(1);
    });

    it('detects missing authentication', async () => {
        const vulnerablePath = join(FIXTURES_DIR, 'vulnerable-server');
        const result = await scan(vulnerablePath, DEFAULT_CONFIG);

        const authFindings = result.findings.filter((f) => f.analyzer === 'authentication');
        expect(authFindings.length).toBe(1);
    });

    it('detects typosquatting dependency', async () => {
        const vulnerablePath = join(FIXTURES_DIR, 'vulnerable-server');
        const result = await scan(vulnerablePath, DEFAULT_CONFIG);

        const depFindings = result.findings.filter((f) => f.analyzer === 'dependencies');
        const typosquatFinding = depFindings.find((f) => f.title.includes('loash'));
        expect(typosquatFinding).toBeDefined();
    });
});
