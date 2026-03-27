import { BaseAnalyzer } from '../base.js';
import type { Finding, MCPServer } from '../../types/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface BlocklistEntry {
    name?: string;
    namePattern?: string;
    reason: string;
    severity: string;
}

interface BlocklistData {
    version: string;
    packages: BlocklistEntry[];
    tools: BlocklistEntry[];
}

const DANGEROUS_COMMANDS = [
    'rm', 'del', 'format', 'shutdown', 'reboot', 'kill',
    'chmod', 'chown', 'sudo', 'su', 'passwd', 'mkfs', 'dd', 'fdisk',
    'rmdir', 'deltree', 'drop', 'truncate',
];

const PRIVILEGED_KEYWORDS = /\b(sudo|root|admin|administrator|elevated|privilege|superuser|chmod\s*777|--force|--no-verify)\b/i;

/**
 * Analyzer that checks MCP server tools and packages against configured
 * allowlists and blocklists. Detects blocklisted packages/tools, excessive
 * tool counts, dangerous command name similarity, duplicate descriptions,
 * and privileged operation indicators.
 */
export class ToolAllowlistAnalyzer extends BaseAnalyzer {
    readonly id = 'tool-allowlist';
    readonly name = 'Tool Allowlist/Blocklist';
    readonly description = 'Checks tools against blocklists and detects suspicious tool configurations';

    private blocklist: BlocklistData;

    constructor() {
        super();
        this.blocklist = this.loadBlocklist();
    }

    private loadBlocklist(): BlocklistData {
        try {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const blocklistPath = join(__dirname, '..', '..', '..', 'data', 'patterns', 'tool-blocklist.json');
            return JSON.parse(readFileSync(blocklistPath, 'utf-8'));
        } catch {
            return { version: '0', packages: [], tools: [] };
        }
    }

    async analyze(server: MCPServer): Promise<Finding[]> {
        const findings: Finding[] = [];
        let idx = 0;

        // Check 1: Package blocklist
        const packageName = server.packageJson?.name as string | undefined;
        if (packageName) {
            for (const entry of this.blocklist.packages) {
                if (entry.name && entry.name === packageName) {
                    findings.push({
                        id: this.findingId('ALW', ++idx),
                        analyzer: 'tool-allowlist',
                        severity: 'critical',
                        title: `Package "${packageName}" is on the community blocklist`,
                        recommendation: `This package is on the community blocklist: ${entry.reason}. Do not use.`,
                    });
                }
            }
        }

        // Check 2: Tool blocklist (name and pattern match)
        for (const tool of server.tools) {
            // Check exact name matches from package blocklist tools
            for (const entry of this.blocklist.tools) {
                if (entry.name && entry.name === tool.name) {
                    findings.push({
                        id: this.findingId('ALW', ++idx),
                        analyzer: 'tool-allowlist',
                        severity: 'critical',
                        title: `Tool "${tool.name}" is on the community blocklist`,
                        file: tool.handlerFile,
                        line: tool.handlerLine,
                        recommendation: `This tool is on the community blocklist: ${entry.reason}. Do not use.`,
                    });
                }
                // Check pattern matches
                if (entry.namePattern) {
                    try {
                        const pattern = new RegExp(entry.namePattern, 'i');
                        if (pattern.test(tool.name)) {
                            findings.push({
                                id: this.findingId('ALW', ++idx),
                                analyzer: 'tool-allowlist',
                                severity: 'critical',
                                title: `Tool "${tool.name}" matches blocklist pattern "${entry.namePattern}"`,
                                file: tool.handlerFile,
                                line: tool.handlerLine,
                                recommendation: `This tool is on the community blocklist: ${entry.reason}. Do not use.`,
                            });
                        }
                    } catch {
                        // Invalid regex pattern — skip silently
                    }
                }
            }
        }

        // Check 3: Excessive tool count
        if (server.tools.length > 50) {
            findings.push({
                id: this.findingId('ALW', ++idx),
                analyzer: 'tool-allowlist',
                severity: 'medium',
                title: `Server registers ${server.tools.length} tools (threshold: 50)`,
                recommendation: 'This server registers an unusually high number of tools. Review whether all tools are necessary.',
            });
        }

        // Check 4: Tool name similarity to system commands
        for (const tool of server.tools) {
            const toolNameLower = tool.name.toLowerCase();
            for (const cmd of DANGEROUS_COMMANDS) {
                if (toolNameLower === cmd || toolNameLower.startsWith(cmd + '_') || toolNameLower.startsWith(cmd + '-') || toolNameLower.startsWith(cmd + '.')) {
                    findings.push({
                        id: this.findingId('ALW', ++idx),
                        analyzer: 'tool-allowlist',
                        severity: 'high',
                        title: `Tool "${tool.name}" resembles dangerous system command "${cmd}"`,
                        file: tool.handlerFile,
                        line: tool.handlerLine,
                        recommendation: 'Tool name resembles a dangerous system command. Verify the tool does not perform destructive operations.',
                    });
                    break; // Only report once per tool
                }
            }
        }

        // Check 5: Duplicate descriptions
        const descriptionMap = new Map<string, string[]>();
        for (const tool of server.tools) {
            const desc = tool.description.trim();
            if (desc.length === 0) continue;
            const existing = descriptionMap.get(desc);
            if (existing) {
                existing.push(tool.name);
            } else {
                descriptionMap.set(desc, [tool.name]);
            }
        }
        for (const [description, toolNames] of descriptionMap) {
            if (toolNames.length > 1) {
                findings.push({
                    id: this.findingId('ALW', ++idx),
                    analyzer: 'tool-allowlist',
                    severity: 'medium',
                    title: `${toolNames.length} tools share identical description: "${description.substring(0, 80)}${description.length > 80 ? '...' : ''}"`,
                    code: `Tools: ${toolNames.join(', ')}`,
                    recommendation: 'Multiple tools share identical descriptions. This may indicate poor documentation or duplicated functionality.',
                });
            }
        }

        // Check 6: Privileged operation indicators
        for (const tool of server.tools) {
            const match = PRIVILEGED_KEYWORDS.exec(tool.description);
            if (match) {
                findings.push({
                    id: this.findingId('ALW', ++idx),
                    analyzer: 'tool-allowlist',
                    severity: 'high',
                    title: `Tool "${tool.name}" description indicates privileged operations ("${match[1]}")`,
                    file: tool.handlerFile,
                    line: tool.handlerLine,
                    code: tool.description.substring(0, 200),
                    recommendation: 'Tool description indicates privileged operations. Ensure proper authorization checks are in place.',
                });
            }
        }

        return findings;
    }
}
