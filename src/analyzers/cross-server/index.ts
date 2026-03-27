import { BaseAnalyzer } from '../base.js';
import type { Finding, MCPServer, SourceFile } from '../../types/index.js';

/** Package name patterns that indicate an MCP server dependency. */
const MCP_PACKAGE_PATTERNS = [
    /^@modelcontextprotocol\/server/,
    /mcp-server-/,
    /^mcp-/,
    /-mcp$/,
    /^fastmcp$/,
];

/** Patterns in tool output strings that could relay prompt injection to another MCP server. */
const PROMPT_INJECTION_PATTERNS = [
    /['"`].*<tool_call>.*['"`]/i,
    /['"`].*<function_call>.*['"`]/i,
    /['"`].*use_mcp_tool.*['"`]/i,
    /['"`].*call_tool\s*\(.*['"`]/i,
    /return\s+.*['"`].*(?:please\s+run|execute\s+the|use\s+the\s+tool).*['"`]/i,
];

/** Patterns indicating localhost HTTP communication with specific ports. */
const LOCALHOST_PATTERNS = [
    /https?:\/\/localhost:\d+/,
    /https?:\/\/127\.0\.0\.1:\d+/,
    /https?:\/\/\[::1\]:\d+/,
    /fetch\s*\(\s*['"`]https?:\/\/localhost:/,
    /fetch\s*\(\s*['"`]https?:\/\/127\.0\.0\.1:/,
];

/** Patterns indicating access to shared/temp state locations. */
const SHARED_STATE_PATTERNS = [
    /\/tmp\//,
    /os\.tmpdir\s*\(/,
    /tempfile\./,
    /['"`]TEMP['"`]/,
    /['"`]TMP['"`]/,
    /process\.env\.TEMP/,
    /process\.env\.TMP/,
    /\.sqlite['"`]/,
    /\.db['"`]/,
];

/** Patterns indicating reads of sensitive data. */
const SENSITIVE_READ_PATTERNS = [
    /process\.env/,
    /os\.environ/,
    /dotenv/,
    /\.env['"`]/,
    /readFileSync\s*\(.*(?:passwd|shadow|key|secret|credential|token)/i,
    /open\s*\(.*(?:passwd|shadow|key|secret|credential|token)/i,
    /fs\.readFile/,
];

/** Patterns indicating outbound network calls. */
const NETWORK_CALL_PATTERNS = [
    /\bfetch\s*\(/,
    /\brequests?\./,
    /\bhttpx\./,
    /\baxios[\s.(]/,
    /\bhttp\.request/,
    /\burllib/,
    /\bnode-fetch/,
    /\bgot\s*\(/,
    /\.post\s*\(\s*['"`]https?:/,
    /\.get\s*\(\s*['"`]https?:/,
];

/**
 * Detects cross-server attack patterns including inter-server dependencies,
 * localhost communication, shared state access, prompt injection relay,
 * and sensitive data exfiltration flows.
 */
export class CrossServerAnalyzer extends BaseAnalyzer {
    readonly id = 'cross-server';
    readonly name = 'Cross-Server Attack Detection';
    readonly description = 'Detects cross-server attack patterns and inter-server data flow risks';

    async analyze(server: MCPServer): Promise<Finding[]> {
        const findings: Finding[] = [];
        let idx = 0;

        // Check 1: MCP server package dependencies
        idx = this.checkMcpPackageDependencies(server, findings, idx);

        // Check 2-5: Source file scanning
        const sourceFiles = server.sourceFiles.filter((f) => f.language !== 'unknown');
        for (const file of sourceFiles) {
            idx = this.checkLocalhostCommunication(file, findings, idx);
            idx = this.checkSharedStateAccess(file, findings, idx);
            idx = this.checkPromptInjectionRelay(file, findings, idx);
            idx = this.checkSensitiveDataFlow(file, findings, idx);
        }

        return findings;
    }

    /**
     * Check 1: Detect MCP server packages in dependencies.
     */
    private checkMcpPackageDependencies(
        server: MCPServer,
        findings: Finding[],
        idx: number,
    ): number {
        const ownName = server.packageJson?.name as string | undefined;

        // Check Node.js dependencies
        const deps = {
            ...(server.packageJson?.dependencies as Record<string, string> | undefined),
            ...(server.packageJson?.devDependencies as Record<string, string> | undefined),
        };

        for (const pkgName of Object.keys(deps)) {
            if (ownName && pkgName === ownName) continue;
            if (this.isMcpPackage(pkgName)) {
                findings.push({
                    id: this.findingId('XSV', ++idx),
                    analyzer: 'cross-server',
                    severity: 'high',
                    title: `MCP server package dependency detected: ${pkgName}`,
                    recommendation:
                        'Review whether this MCP server should depend on another MCP server package. Cross-server dependencies can enable lateral attacks.',
                    references: ['CWE-829'],
                });
            }
        }

        // Check Python dependencies via pythonConfig
        const pythonDeps = this.extractPythonDependencies(server);
        for (const pkgName of pythonDeps) {
            if (ownName && pkgName === ownName) continue;
            if (this.isMcpPackage(pkgName)) {
                findings.push({
                    id: this.findingId('XSV', ++idx),
                    analyzer: 'cross-server',
                    severity: 'high',
                    title: `MCP server Python package dependency detected: ${pkgName}`,
                    recommendation:
                        'Review whether this MCP server should depend on another MCP server package. Cross-server dependencies can enable lateral attacks.',
                    references: ['CWE-829'],
                });
            }
        }

        // Check Python source imports for known MCP server packages
        const pythonFiles = server.sourceFiles.filter((f) => f.language === 'python');
        for (const file of pythonFiles) {
            const lines = file.content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const importMatch = line.match(
                    /(?:from|import)\s+([\w._-]+)/,
                );
                if (importMatch) {
                    const importedPkg = importMatch[1].split('.')[0];
                    if (this.isMcpPackage(importedPkg)) {
                        findings.push({
                            id: this.findingId('XSV', ++idx),
                            analyzer: 'cross-server',
                            severity: 'high',
                            title: `Python import of MCP server package: ${importedPkg}`,
                            file: file.relativePath,
                            line: i + 1,
                            code: line.trim(),
                            recommendation:
                                'Review whether this MCP server should depend on another MCP server package. Cross-server dependencies can enable lateral attacks.',
                            references: ['CWE-829'],
                        });
                    }
                }
            }
        }

        return idx;
    }

    /**
     * Check 2: Detect localhost port communication that may target other MCP servers.
     */
    private checkLocalhostCommunication(
        file: SourceFile,
        findings: Finding[],
        idx: number,
    ): number {
        const lines = file.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const pattern of LOCALHOST_PATTERNS) {
                if (pattern.test(line)) {
                    findings.push({
                        id: this.findingId('XSV', ++idx),
                        analyzer: 'cross-server',
                        severity: 'high',
                        title: 'Localhost port communication detected',
                        file: file.relativePath,
                        line: i + 1,
                        code: line.trim(),
                        recommendation:
                            'Review localhost network calls that may communicate with other MCP servers. Ensure this inter-server communication is intentional and secured.',
                        references: ['CWE-918'],
                    });
                    break; // one finding per line
                }
            }
        }
        return idx;
    }

    /**
     * Check 3: Detect shared state access (temp dirs, shared databases, shared config).
     */
    private checkSharedStateAccess(
        file: SourceFile,
        findings: Finding[],
        idx: number,
    ): number {
        const lines = file.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const pattern of SHARED_STATE_PATTERNS) {
                if (pattern.test(line)) {
                    findings.push({
                        id: this.findingId('XSV', ++idx),
                        analyzer: 'cross-server',
                        severity: 'medium',
                        title: 'Shared state access detected',
                        file: file.relativePath,
                        line: i + 1,
                        code: line.trim(),
                        recommendation:
                            'Shared state (temp files, shared databases) can be vectors for cross-server poisoning. Use server-specific namespaces.',
                        references: ['CWE-362'],
                    });
                    break; // one finding per line
                }
            }
        }
        return idx;
    }

    /**
     * Check 4: Detect prompt injection relay patterns in tool outputs.
     */
    private checkPromptInjectionRelay(
        file: SourceFile,
        findings: Finding[],
        idx: number,
    ): number {
        const lines = file.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const pattern of PROMPT_INJECTION_PATTERNS) {
                if (pattern.test(line)) {
                    findings.push({
                        id: this.findingId('XSV', ++idx),
                        analyzer: 'cross-server',
                        severity: 'critical',
                        title: 'Prompt injection relay pattern detected',
                        file: file.relativePath,
                        line: i + 1,
                        code: line.trim(),
                        recommendation:
                            'Tool output contains patterns that could manipulate another MCP server\'s behavior through prompt injection relay. Sanitize tool outputs.',
                        references: ['CWE-74'],
                    });
                    break; // one finding per line
                }
            }
        }
        return idx;
    }

    /**
     * Check 5: Detect files that both read sensitive data and make network calls.
     */
    private checkSensitiveDataFlow(
        file: SourceFile,
        findings: Finding[],
        idx: number,
    ): number {
        let hasSensitiveRead = false;
        let hasNetworkCall = false;
        let sensitiveReadLine = -1;
        let sensitiveReadCode = '';

        const lines = file.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!hasSensitiveRead) {
                for (const pattern of SENSITIVE_READ_PATTERNS) {
                    if (pattern.test(line)) {
                        hasSensitiveRead = true;
                        sensitiveReadLine = i + 1;
                        sensitiveReadCode = line.trim();
                        break;
                    }
                }
            }
            if (!hasNetworkCall) {
                for (const pattern of NETWORK_CALL_PATTERNS) {
                    if (pattern.test(line)) {
                        hasNetworkCall = true;
                        break;
                    }
                }
            }
            if (hasSensitiveRead && hasNetworkCall) break;
        }

        if (hasSensitiveRead && hasNetworkCall) {
            findings.push({
                id: this.findingId('XSV', ++idx),
                analyzer: 'cross-server',
                severity: 'high',
                title: 'Sensitive data read with network call in same file',
                file: file.relativePath,
                line: sensitiveReadLine,
                code: sensitiveReadCode,
                recommendation:
                    'This file reads sensitive data and makes network calls. Verify that sensitive data is not being relayed to external endpoints.',
                references: ['CWE-200'],
            });
        }

        return idx;
    }

    /**
     * Check if a package name matches known MCP server package patterns.
     */
    private isMcpPackage(name: string): boolean {
        return MCP_PACKAGE_PATTERNS.some((pattern) => pattern.test(name));
    }

    /**
     * Extract Python dependency names from pythonConfig (pyproject.toml structure).
     */
    private extractPythonDependencies(server: MCPServer): string[] {
        const deps: string[] = [];
        if (!server.pythonConfig) return deps;

        // pyproject.toml: project.dependencies
        const project = server.pythonConfig.project as Record<string, unknown> | undefined;
        if (project?.dependencies && Array.isArray(project.dependencies)) {
            for (const dep of project.dependencies) {
                if (typeof dep === 'string') {
                    // Extract package name before version specifier
                    const name = dep.split(/[>=<!;\s\[]/)[0].trim();
                    if (name) deps.push(name);
                }
            }
        }

        // pyproject.toml: tool.poetry.dependencies
        const tool = server.pythonConfig.tool as Record<string, unknown> | undefined;
        const poetry = tool?.poetry as Record<string, unknown> | undefined;
        const poetryDeps = poetry?.dependencies as Record<string, unknown> | undefined;
        if (poetryDeps) {
            for (const name of Object.keys(poetryDeps)) {
                if (name !== 'python') deps.push(name);
            }
        }

        return deps;
    }
}
