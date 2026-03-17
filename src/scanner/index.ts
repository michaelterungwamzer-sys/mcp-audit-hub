import type { AuditConfig, ScanResult } from '../types/index.js';
import { resolveTarget } from './resolver.js';
import { parseMCPServer } from './parser.js';
import { aggregate } from './aggregator.js';
import { createDefaultRegistry } from '../analyzers/index.js';

const VERSION = '0.1.0';

export async function scan(target: string, config: AuditConfig): Promise<ScanResult> {
    const startTime = performance.now();

    // Step 1: Resolve target
    const resolved = await resolveTarget(target);

    // Step 2: Parse MCP server structure
    const server = await parseMCPServer(resolved);

    // Step 3: Run analyzers
    const registry = createDefaultRegistry();
    const { findings: rawFindings, analyzerResults } = await registry.runAll(server, config);

    // Step 4: Aggregate, deduplicate, score
    const { findings, scoreResult, suppressed } = aggregate(rawFindings, config);

    // Step 5: Build ScanResult
    const duration = Math.round(performance.now() - startTime);

    return {
        meta: {
            version: VERSION,
            timestamp: new Date().toISOString(),
            target,
            targetType: resolved.targetType,
            duration_ms: duration,
        },
        summary: {
            score: scoreResult.score,
            status: scoreResult.status,
            findings: scoreResult.breakdown,
            suppressed,
        },
        findings,
        analyzers: analyzerResults,
    };
}
