import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseAnalyzer } from '../base.js';
import { parseSource, findCallExpressions, findStringInSource } from '../utils/ast-helpers.js';
import type { Finding, MCPServer, MCPTool, Severity } from '../../types/index.js';

interface PatternCategory {
    severity: Severity;
    patterns: string[];
}

interface PatternLibrary {
    version: string;
    categories: Record<string, PatternCategory>;
}

const DESCRIPTION_WARN_LENGTH = 500;
const DESCRIPTION_HIGH_LENGTH = 1000;

const NETWORK_KEYWORDS = ['network', 'http', 'https', 'request', 'fetch', 'api', 'send', 'url', 'endpoint', 'webhook'];
const FILE_KEYWORDS = ['file', 'read', 'write', 'disk', 'filesystem', 'fs', 'path', 'directory'];
const ENV_KEYWORDS = ['env', 'environment', 'variable', 'config', 'secret', 'credential'];
const EXEC_KEYWORDS = ['exec', 'execute', 'command', 'shell', 'process', 'spawn', 'run'];

const NETWORK_CALLS = ['fetch', 'request', 'get', 'post', 'put', 'patch', 'delete'];
const FILE_CALLS = ['readFile', 'readFileSync', 'writeFile', 'writeFileSync', 'createReadStream', 'createWriteStream'];
const EXEC_CALLS = ['exec', 'execSync', 'spawn', 'spawnSync', 'execFile'];

export class ToolPoisoningAnalyzer extends BaseAnalyzer {
    readonly id = 'tool-poisoning';
    readonly name = 'Tool Poisoning';
    readonly description = 'Detects malicious or deceptive content in MCP tool descriptions';

    private patterns: PatternLibrary;

    constructor() {
        super();
        this.patterns = this.loadPatterns();
    }

    private loadPatterns(): PatternLibrary {
        try {
            const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'data', 'patterns');
            const raw = readFileSync(join(dataDir, 'poisoning.json'), 'utf-8');
            return JSON.parse(raw);
        } catch {
            return { version: '1.0', categories: {} };
        }
    }

    async analyze(server: MCPServer): Promise<Finding[]> {
        const findings: Finding[] = [];
        let findingIndex = 0;

        for (const tool of server.tools) {
            // Check 1: Description length
            if (tool.description.length > DESCRIPTION_HIGH_LENGTH) {
                findings.push({
                    id: this.findingId('POI', ++findingIndex),
                    analyzer: 'tool-poisoning',
                    severity: 'high',
                    title: `Tool "${tool.name}" has excessively long description (${tool.description.length} chars)`,
                    file: tool.handlerFile,
                    line: tool.handlerLine,
                    code: tool.description.substring(0, 100) + '...',
                    recommendation: 'Review full description for hidden instructions. Keep descriptions concise.',
                });
            } else if (tool.description.length > DESCRIPTION_WARN_LENGTH) {
                findings.push({
                    id: this.findingId('POI', ++findingIndex),
                    analyzer: 'tool-poisoning',
                    severity: 'medium',
                    title: `Tool "${tool.name}" has long description (${tool.description.length} chars)`,
                    file: tool.handlerFile,
                    line: tool.handlerLine,
                    code: tool.description.substring(0, 100) + '...',
                    recommendation: 'Review description for hidden instructions.',
                });
            }

            // Check 2: Suspicious pattern matching
            for (const [categoryName, category] of Object.entries(this.patterns.categories)) {
                for (const pattern of category.patterns) {
                    try {
                        const regex = new RegExp(pattern, 'i');
                        const match = tool.description.match(regex);
                        if (match) {
                            findings.push({
                                id: this.findingId('POI', ++findingIndex),
                                analyzer: 'tool-poisoning',
                                severity: category.severity,
                                title: `Tool "${tool.name}" contains suspicious ${categoryName.replace(/_/g, ' ')} pattern`,
                                file: tool.handlerFile,
                                line: tool.handlerLine,
                                code: `Matched: "${match[0]}"`,
                                recommendation: `This tool description may contain malicious instructions. Review the full description carefully.`,
                                references: ['https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks'],
                            });
                        }
                    } catch {
                        // Invalid regex — skip
                    }
                }
            }

            // Check 3: Description-implementation discrepancy
            const discrepancies = this.detectDiscrepancies(tool, server);
            findings.push(...discrepancies.map((d) => ({
                ...d,
                id: this.findingId('POI', ++findingIndex),
            })));
        }

        return findings;
    }

    private detectDiscrepancies(tool: MCPTool, server: MCPServer): Omit<Finding, 'id'>[] {
        const findings: Omit<Finding, 'id'>[] = [];

        // Find the handler source file
        const sourceFile = server.sourceFiles.find((f) => f.path === tool.handlerFile);
        if (!sourceFile || !sourceFile.ast) return findings;

        const ast = sourceFile.ast as ReturnType<typeof parseSource>;
        if (!ast) return findings;

        const descLower = tool.description.toLowerCase();

        // Check for network calls in handler not mentioned in description
        const networkCalls = findCallExpressions(ast, NETWORK_CALLS, sourceFile.path);
        if (networkCalls.length > 0 && !findStringInSource(descLower, NETWORK_KEYWORDS)) {
            findings.push({
                analyzer: 'tool-poisoning',
                severity: 'critical',
                title: `Tool "${tool.name}" makes undisclosed network calls`,
                file: networkCalls[0].file,
                line: networkCalls[0].line,
                code: `Calls: ${networkCalls.map((c) => c.name).join(', ')}`,
                recommendation: 'Tool description should disclose all network activity.',
            });
        }

        // Check for file operations not mentioned in description
        const fileCalls = findCallExpressions(ast, FILE_CALLS, sourceFile.path);
        if (fileCalls.length > 0 && !findStringInSource(descLower, FILE_KEYWORDS)) {
            findings.push({
                analyzer: 'tool-poisoning',
                severity: 'critical',
                title: `Tool "${tool.name}" performs undisclosed file operations`,
                file: fileCalls[0].file,
                line: fileCalls[0].line,
                code: `Calls: ${fileCalls.map((c) => c.name).join(', ')}`,
                recommendation: 'Tool description should disclose all filesystem operations.',
            });
        }

        // Check for environment variable access not mentioned in description
        if (sourceFile.content.includes('process.env') && !findStringInSource(descLower, ENV_KEYWORDS)) {
            findings.push({
                analyzer: 'tool-poisoning',
                severity: 'high',
                title: `Tool "${tool.name}" accesses environment variables without disclosure`,
                file: sourceFile.path,
                line: tool.handlerLine,
                recommendation: 'Tool description should disclose environment variable usage.',
            });
        }

        // Check for exec/spawn not mentioned in description
        const execCalls = findCallExpressions(ast, EXEC_CALLS, sourceFile.path);
        if (execCalls.length > 0 && !findStringInSource(descLower, EXEC_KEYWORDS)) {
            findings.push({
                analyzer: 'tool-poisoning',
                severity: 'critical',
                title: `Tool "${tool.name}" executes shell commands without disclosure`,
                file: execCalls[0].file,
                line: execCalls[0].line,
                code: `Calls: ${execCalls.map((c) => c.name).join(', ')}`,
                recommendation: 'Tool description must disclose command execution.',
            });
        }

        return findings;
    }
}
