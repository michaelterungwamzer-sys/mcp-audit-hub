import type { AuditConfig, Finding, MCPServer } from '../types/index.js';
import { BaseAnalyzer } from './base.js';
import { ToolPoisoningAnalyzer } from './tool-poisoning/index.js';
import { CommandInjectionAnalyzer } from './command-injection/index.js';
import { DependencyAnalyzer } from './dependency/index.js';
import { NetworkAnalyzer } from './network/index.js';
import { FilesystemAnalyzer } from './filesystem/index.js';
import { AuthenticationAnalyzer } from './authentication/index.js';
import { TlsVerificationAnalyzer } from './tls-verification/index.js';
import { SecurityPostureAnalyzer } from './security-posture/index.js';
import { CredentialHygieneAnalyzer } from './credential-hygiene/index.js';
import { CrossServerAnalyzer } from './cross-server/index.js';
import { ToolAllowlistAnalyzer } from './tool-allowlist/index.js';
import { RugPullAnalyzer } from './rug-pull/index.js';

/**
 * Describes an analyzer's identity and purpose for display in CLI output.
 * @property id - Unique analyzer identifier.
 * @property name - Human-readable analyzer name.
 * @property description - Brief explanation of what the analyzer checks.
 */
export interface AnalyzerDescription {
    id: string;
    name: string;
    description: string;
}

/**
 * Registry that manages the collection of security analyzers.
 * Supports registering analyzers, filtering by config, and running all enabled analyzers
 * against an MCP server in parallel.
 */
export class AnalyzerRegistry {
    private analyzers: BaseAnalyzer[] = [];

    /**
     * Register a new analyzer instance with the registry.
     * @param analyzer - The analyzer to add.
     */
    register(analyzer: BaseAnalyzer): void {
        this.analyzers.push(analyzer);
    }

    /**
     * Return only the analyzers that are enabled in the given configuration.
     * @param config - The audit configuration containing per-check enable/disable flags.
     * @returns Array of enabled analyzer instances.
     */
    getEnabled(config: AuditConfig): BaseAnalyzer[] {
        return this.analyzers.filter((a) => {
            const checkConfig = config.checks[a.id as keyof typeof config.checks];
            return checkConfig?.enabled !== false;
        });
    }

    /**
     * Get descriptive metadata for all registered analyzers.
     * @returns Array of analyzer descriptions (id, name, description).
     */
    getDescriptions(): AnalyzerDescription[] {
        return this.analyzers.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description,
        }));
    }

    /**
     * Run all enabled analyzers in parallel against the given MCP server.
     * Disabled analyzers are marked as 'skipped'; failed analyzers are marked as 'error'.
     * @param server - The parsed MCP server to scan.
     * @param config - The audit configuration controlling which checks are enabled.
     * @returns Combined findings from all analyzers and per-analyzer status/timing metadata.
     */
    async runAll(
        server: MCPServer,
        config: AuditConfig,
    ): Promise<{ findings: Finding[]; analyzerResults: Record<string, { status: string; findings: number; duration_ms: number }> }> {
        const enabled = this.getEnabled(config);
        const analyzerResults: Record<string, { status: string; findings: number; duration_ms: number }> = {};

        const results = await Promise.allSettled(
            enabled.map(async (analyzer) => {
                const start = performance.now();
                const findings = await analyzer.analyze(server);
                const duration = Math.round(performance.now() - start);

                analyzerResults[analyzer.id] = {
                    status: findings.length === 0 ? 'pass' : 'warn',
                    findings: findings.length,
                    duration_ms: duration,
                };

                return findings;
            }),
        );

        const allFindings: Finding[] = [];

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const analyzer = enabled[i];

            if (result.status === 'fulfilled') {
                allFindings.push(...result.value);
            } else {
                console.warn(`Analyzer "${analyzer.name}" failed: ${result.reason}`);
                analyzerResults[analyzer.id] = {
                    status: 'error',
                    findings: 0,
                    duration_ms: 0,
                };
            }
        }

        // Fill in results for disabled analyzers
        for (const analyzer of this.analyzers) {
            if (!analyzerResults[analyzer.id]) {
                analyzerResults[analyzer.id] = {
                    status: 'skipped',
                    findings: 0,
                    duration_ms: 0,
                };
            }
        }

        return { findings: allFindings, analyzerResults };
    }
}

/**
 * Create an AnalyzerRegistry pre-populated with all built-in security analyzers.
 * @returns A registry containing tool-poisoning, command-injection, dependency,
 *          network, filesystem, and authentication analyzers.
 */
export function createDefaultRegistry(): AnalyzerRegistry {
    const registry = new AnalyzerRegistry();
    registry.register(new ToolPoisoningAnalyzer());
    registry.register(new CommandInjectionAnalyzer());
    registry.register(new DependencyAnalyzer());
    registry.register(new NetworkAnalyzer());
    registry.register(new FilesystemAnalyzer());
    registry.register(new AuthenticationAnalyzer());
    registry.register(new TlsVerificationAnalyzer());
    registry.register(new SecurityPostureAnalyzer());
    registry.register(new CredentialHygieneAnalyzer());
    registry.register(new CrossServerAnalyzer());
    registry.register(new ToolAllowlistAnalyzer());
    registry.register(new RugPullAnalyzer());
    return registry;
}

/**
 * Convenience function to get descriptions of all built-in analyzers.
 * Creates a default registry internally and extracts descriptions.
 * @returns Array of analyzer descriptions for display purposes.
 */
export function getAnalyzerDescriptions(): AnalyzerDescription[] {
    return createDefaultRegistry().getDescriptions();
}

export { BaseAnalyzer } from './base.js';
