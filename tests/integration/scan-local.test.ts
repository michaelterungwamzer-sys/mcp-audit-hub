import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { scan } from '../../src/scanner/index.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures');

describe('scan local directory (integration)', () => {
    it('produces score 100/pass for clean server', async () => {
        const cleanServerPath = join(FIXTURES_DIR, 'clean-server');
        const result = await scan(cleanServerPath, DEFAULT_CONFIG);

        // Clean server has no auth → AUTH-001 fires (high=15) → score = 85, still pass (≥70, no criticals)
        expect(result.summary.score).toBe(85);
        expect(result.summary.status).toBe('pass');
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].analyzer).toBe('authentication');
        expect(result.meta.target).toBe(cleanServerPath);
        expect(result.meta.targetType).toBe('local');
        expect(result.meta.version).toBe('0.1.0');
        expect(result.meta.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('produces valid JSON output for clean server', async () => {
        const cleanServerPath = join(FIXTURES_DIR, 'clean-server');
        const result = await scan(cleanServerPath, DEFAULT_CONFIG);

        // Verify the full structure is JSON-serializable
        const json = JSON.stringify(result);
        const parsed = JSON.parse(json);

        expect(parsed.meta).toBeDefined();
        expect(parsed.summary).toBeDefined();
        expect(parsed.findings).toBeDefined();
        expect(parsed.analyzers).toBeDefined();
        expect(parsed.summary.findings.total).toBe(1); // auth finding
    });

    it('throws on non-existent directory', async () => {
        await expect(
            scan('/does/not/exist', DEFAULT_CONFIG),
        ).rejects.toThrow();
    });
});
