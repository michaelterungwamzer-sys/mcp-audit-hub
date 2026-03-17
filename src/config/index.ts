import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_CONFIG } from './defaults.js';
import { validateConfig } from './schema.js';
import type { AuditConfig } from '../types/index.js';

function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
    const result = { ...target };

    for (const key of Object.keys(source)) {
        const targetVal = (target as Record<string, unknown>)[key];
        const sourceVal = source[key];

        if (
            typeof targetVal === 'object' &&
            targetVal !== null &&
            !Array.isArray(targetVal) &&
            typeof sourceVal === 'object' &&
            sourceVal !== null &&
            !Array.isArray(sourceVal)
        ) {
            (result as Record<string, unknown>)[key] = deepMerge(
                targetVal as Record<string, unknown>,
                sourceVal as Record<string, unknown>,
            );
        } else if (sourceVal !== undefined) {
            (result as Record<string, unknown>)[key] = sourceVal;
        }
    }

    return result;
}

export async function loadConfig(
    cliOptions: Record<string, unknown> = {},
): Promise<AuditConfig> {
    let fileConfig: Record<string, unknown> = {};

    const configPath = typeof cliOptions.config === 'string'
        ? cliOptions.config
        : join(process.cwd(), 'mcp-audit.config.json');

    try {
        const raw = await readFile(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const validation = validateConfig(parsed);

        if (!validation.valid) {
            console.warn(
                `Warning: Config file has errors: ${validation.errors.join(', ')}. Using defaults.`,
            );
        } else {
            fileConfig = parsed;
        }
    } catch {
        // No config file found — use defaults silently
    }

    let config = deepMerge(
        DEFAULT_CONFIG as unknown as Record<string, unknown>,
        fileConfig,
    ) as unknown as AuditConfig;

    // Apply CLI overrides
    if (typeof cliOptions.output === 'string') {
        config = {
            ...config,
            output: { ...config.output, format: cliOptions.output as 'console' | 'json' },
        };
    }

    if (cliOptions.color === false || cliOptions.noColor === true) {
        config = {
            ...config,
            output: { ...config.output, colors: false },
        };
    }

    if (cliOptions.verbose === true) {
        config = {
            ...config,
            output: { ...config.output, verbose: true },
        };
    }

    return config;
}

export { DEFAULT_CONFIG } from './defaults.js';
export { validateConfig } from './schema.js';
