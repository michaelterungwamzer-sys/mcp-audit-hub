import type { AuditConfig, Finding, MCPServer } from '../types/index.js';
import { BaseAnalyzer } from './base.js';
import { ToolPoisoningAnalyzer } from './tool-poisoning/index.js';
import { CommandInjectionAnalyzer } from './command-injection/index.js';
import { DependencyAnalyzer } from './dependency/index.js';
import { NetworkAnalyzer } from './network/index.js';
import { FilesystemAnalyzer } from './filesystem/index.js';
import { AuthenticationAnalyzer } from './authentication/index.js';

export interface AnalyzerDescription {
    id: string;
    name: string;
    description: string;
}

export class AnalyzerRegistry {
    private analyzers: BaseAnalyzer[] = [];

    register(analyzer: BaseAnalyzer): void {
        this.analyzers.push(analyzer);
    }

    getEnabled(config: AuditConfig): BaseAnalyzer[] {
        return this.analyzers.filter((a) => {
            const checkConfig = config.checks[a.id as keyof typeof config.checks];
            return checkConfig?.enabled !== false;
        });
    }

    getDescriptions(): AnalyzerDescription[] {
        return this.analyzers.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description,
        }));
    }

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

export function createDefaultRegistry(): AnalyzerRegistry {
    const registry = new AnalyzerRegistry();
    registry.register(new ToolPoisoningAnalyzer());
    registry.register(new CommandInjectionAnalyzer());
    registry.register(new DependencyAnalyzer());
    registry.register(new NetworkAnalyzer());
    registry.register(new FilesystemAnalyzer());
    registry.register(new AuthenticationAnalyzer());
    return registry;
}

export function getAnalyzerDescriptions(): AnalyzerDescription[] {
    return createDefaultRegistry().getDescriptions();
}

export { BaseAnalyzer } from './base.js';
