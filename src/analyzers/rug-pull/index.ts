import { BaseAnalyzer } from '../base.js';
import type { Finding, MCPServer, SourceFile } from '../../types/index.js';

/** Install-time lifecycle scripts that can execute arbitrary code. */
const INSTALL_SCRIPTS = [
    'preinstall', 'postinstall', 'preuninstall', 'postuninstall',
    'prepare', 'prepublishOnly',
];

/** Known-safe install scripts that should not be flagged. */
const SAFE_INSTALL_SCRIPTS = [
    'husky install', 'patch-package', 'ngcc', 'node-gyp rebuild',
    'prebuild-install', 'esbuild', 'tsc',
];

/** Network-related tokens in install scripts → CRITICAL. */
const SCRIPT_NETWORK_PATTERNS = [
    'curl ', 'curl\t', 'wget ', 'wget\t', 'fetch(', 'http://', 'https://',
    'node -e', 'node -p', 'python -c', 'python3 -c',
];

/** Shell execution tokens in install scripts → HIGH. */
const SCRIPT_SHELL_PATTERNS = ['sh ', 'bash ', 'eval ', 'exec '];

/** Base64/encoding tokens in install scripts → CRITICAL. */
const SCRIPT_BASE64_PATTERNS = ['base64', 'atob', 'btoa', 'b64decode'];

/** Environment variable exfiltration tokens in install scripts → HIGH. */
const SCRIPT_ENV_PATTERNS = ['$env:', '%ENV%', 'process.env', '$HOME', '$USER'];

/** JS obfuscation patterns that indicate encoded payloads → CRITICAL. */
const JS_OBFUSCATION_CRITICAL = [
    'eval(atob(', 'eval(Buffer.from(', 'eval(unescape(',
    'Function(atob(', 'Function(Buffer.from(',
];

/** JS obfuscation patterns (generic eval/exec) → HIGH. */
const JS_OBFUSCATION_HIGH = [
    'eval(', 'Function(', 'new Function(', 'String.fromCharCode(',
];

/** Python obfuscation patterns that indicate encoded payloads → CRITICAL. */
const PY_OBFUSCATION_CRITICAL = [
    'exec(base64', 'exec(codecs', 'eval(base64', 'eval(codecs',
    'exec(__import__', 'eval(__import__',
];

/** Python obfuscation patterns (generic eval/exec) → HIGH. */
const PY_OBFUSCATION_HIGH = [
    'exec(', 'eval(', 'compile(', '__import__(',
];

/** Directories that are expected to contain minified/build output. */
const BUILD_OUTPUT_DIRS = ['dist/', 'build/', '.next/', '__pycache__/', 'node_modules/'];

/** JS patterns for code that runs at import/require time. */
const JS_AUTO_EXEC_PATTERNS = [
    /\(function\s*\(.*?\)\s*\{/,       // IIFE: (function(){ ... })()
    /\(\(\)\s*=>\s*\{/,                 // IIFE arrow: (() => { ... })()
    /require\s*\(\s*['"]child_process/, // require('child_process')
];

/** Top-level JS patterns that should not appear outside function/class bodies. */
const JS_TOPLEVEL_DANGEROUS = [
    /^\s*fetch\s*\(/,
    /^\s*exec\s*\(/,
    /^\s*execSync\s*\(/,
    /^\s*spawn\s*\(/,
    /^\s*spawnSync\s*\(/,
];

/** Python top-level patterns for code that runs at import time. */
const PY_TOPLEVEL_DANGEROUS = [
    /^\s*requests\./,
    /^\s*urllib/,
    /^\s*subprocess\./,
    /^\s*os\.system\s*\(/,
    /^\s*os\.popen\s*\(/,
];

/**
 * Security analyzer that detects supply chain attack indicators commonly seen in
 * "rug pull" packages: malicious install scripts, obfuscated code, suspicious
 * minification, missing metadata, and dual-purpose entry points.
 */
export class RugPullAnalyzer extends BaseAnalyzer {
    readonly id = 'rug-pull';
    readonly name = 'Rug Pull Detection';
    readonly description = 'Detects supply chain attack indicators: install scripts, obfuscation, and suspicious patterns';

    /**
     * Analyze an MCP server for rug pull / supply chain attack indicators.
     * @param server - The parsed MCP server to analyze.
     * @returns A list of security findings.
     */
    async analyze(server: MCPServer): Promise<Finding[]> {
        const findings: Finding[] = [];
        let idx = 0;

        // Check 1: Install script analysis
        const installFindings = this.checkInstallScripts(server, idx);
        findings.push(...installFindings);
        idx = findings.length;

        // Check 2: Obfuscated code
        const obfuscationFindings = this.checkObfuscation(server, idx);
        findings.push(...obfuscationFindings);
        idx = findings.length;

        // Check 3: Suspicious minification
        const minificationFindings = this.checkMinification(server, idx);
        findings.push(...minificationFindings);
        idx = findings.length;

        // Check 4: Package metadata
        const metadataFindings = this.checkMetadata(server, idx);
        findings.push(...metadataFindings);
        idx = findings.length;

        // Check 5: Dual-purpose entry points
        const entryFindings = this.checkEntryPoints(server, idx);
        findings.push(...entryFindings);

        return findings;
    }

    // ─── Check 1: Install Script Analysis ────────────────────────────────

    private checkInstallScripts(server: MCPServer, startIdx: number): Finding[] {
        const findings: Finding[] = [];
        let idx = startIdx;

        // Check package.json scripts
        if (server.packageJson?.scripts && typeof server.packageJson.scripts === 'object') {
            const scripts = server.packageJson.scripts as Record<string, string>;

            for (const scriptName of INSTALL_SCRIPTS) {
                const scriptValue = scripts[scriptName];
                if (!scriptValue || typeof scriptValue !== 'string') continue;

                // Skip known-safe scripts
                if (SAFE_INSTALL_SCRIPTS.some((safe) => scriptValue.includes(safe))) continue;

                // Check for network calls → CRITICAL
                for (const pattern of SCRIPT_NETWORK_PATTERNS) {
                    if (scriptValue.toLowerCase().includes(pattern.toLowerCase())) {
                        findings.push({
                            id: this.findingId('RUG', ++idx),
                            analyzer: 'rug-pull',
                            severity: 'critical',
                            title: `Suspicious install script "${scriptName}" contains network call`,
                            file: 'package.json',
                            code: `"${scriptName}": "${this.truncate(scriptValue, 120)}"`,
                            recommendation: 'Install scripts with network calls or shell execution are a common supply chain attack vector. Review carefully.',
                            references: ['https://cwe.mitre.org/data/definitions/829.html'],
                        });
                        break; // One finding per category per script
                    }
                }

                // Check for shell execution → HIGH
                for (const pattern of SCRIPT_SHELL_PATTERNS) {
                    if (scriptValue.includes(pattern)) {
                        findings.push({
                            id: this.findingId('RUG', ++idx),
                            analyzer: 'rug-pull',
                            severity: 'high',
                            title: `Install script "${scriptName}" executes shell commands`,
                            file: 'package.json',
                            code: `"${scriptName}": "${this.truncate(scriptValue, 120)}"`,
                            recommendation: 'Install scripts with network calls or shell execution are a common supply chain attack vector. Review carefully.',
                            references: ['https://cwe.mitre.org/data/definitions/829.html'],
                        });
                        break;
                    }
                }

                // Check for base64 → CRITICAL
                for (const pattern of SCRIPT_BASE64_PATTERNS) {
                    if (scriptValue.toLowerCase().includes(pattern.toLowerCase())) {
                        findings.push({
                            id: this.findingId('RUG', ++idx),
                            analyzer: 'rug-pull',
                            severity: 'critical',
                            title: `Install script "${scriptName}" contains base64 encoding/decoding`,
                            file: 'package.json',
                            code: `"${scriptName}": "${this.truncate(scriptValue, 120)}"`,
                            recommendation: 'Install scripts with network calls or shell execution are a common supply chain attack vector. Review carefully.',
                            references: ['https://cwe.mitre.org/data/definitions/829.html'],
                        });
                        break;
                    }
                }

                // Check for env exfiltration → HIGH
                for (const pattern of SCRIPT_ENV_PATTERNS) {
                    if (scriptValue.includes(pattern)) {
                        findings.push({
                            id: this.findingId('RUG', ++idx),
                            analyzer: 'rug-pull',
                            severity: 'high',
                            title: `Install script "${scriptName}" accesses environment variables`,
                            file: 'package.json',
                            code: `"${scriptName}": "${this.truncate(scriptValue, 120)}"`,
                            recommendation: 'Install scripts with network calls or shell execution are a common supply chain attack vector. Review carefully.',
                            references: ['https://cwe.mitre.org/data/definitions/829.html'],
                        });
                        break;
                    }
                }
            }
        }

        // Check Python setup.py
        const setupPy = server.sourceFiles.find((f) =>
            f.relativePath === 'setup.py' || f.relativePath.endsWith('/setup.py'),
        );
        if (setupPy) {
            findings.push(...this.checkPythonSetupScript(setupPy, idx));
            idx = startIdx + findings.length;
        }

        // Check pyproject.toml build scripts
        const pyprojectToml = server.sourceFiles.find((f) =>
            f.relativePath === 'pyproject.toml' || f.relativePath.endsWith('/pyproject.toml'),
        );
        if (pyprojectToml) {
            findings.push(...this.checkPyprojectBuildScripts(pyprojectToml, idx));
        }

        return findings;
    }

    private checkPythonSetupScript(file: SourceFile, startIdx: number): Finding[] {
        const findings: Finding[] = [];
        let idx = startIdx;
        const content = file.content;

        const allPatterns = [
            ...SCRIPT_NETWORK_PATTERNS,
            ...SCRIPT_BASE64_PATTERNS,
            ...SCRIPT_SHELL_PATTERNS,
            ...SCRIPT_ENV_PATTERNS,
            'subprocess', 'os.system', 'os.popen',
        ];

        for (const pattern of allPatterns) {
            if (content.toLowerCase().includes(pattern.toLowerCase())) {
                const severity = SCRIPT_NETWORK_PATTERNS.includes(pattern) || SCRIPT_BASE64_PATTERNS.includes(pattern)
                    ? 'critical' as const
                    : 'high' as const;
                findings.push({
                    id: this.findingId('RUG', ++idx),
                    analyzer: 'rug-pull',
                    severity,
                    title: `setup.py contains suspicious pattern: "${pattern.trim()}"`,
                    file: file.path,
                    recommendation: 'Install scripts with network calls or shell execution are a common supply chain attack vector. Review carefully.',
                    references: ['https://cwe.mitre.org/data/definitions/829.html'],
                });
            }
        }

        return findings;
    }

    private checkPyprojectBuildScripts(file: SourceFile, startIdx: number): Finding[] {
        const findings: Finding[] = [];
        let idx = startIdx;
        const content = file.content;

        // Look for build-system scripts in pyproject.toml
        const allPatterns = [
            ...SCRIPT_NETWORK_PATTERNS,
            ...SCRIPT_BASE64_PATTERNS,
            ...SCRIPT_SHELL_PATTERNS,
        ];

        for (const pattern of allPatterns) {
            if (content.toLowerCase().includes(pattern.toLowerCase())) {
                const severity = SCRIPT_NETWORK_PATTERNS.includes(pattern) || SCRIPT_BASE64_PATTERNS.includes(pattern)
                    ? 'critical' as const
                    : 'high' as const;
                findings.push({
                    id: this.findingId('RUG', ++idx),
                    analyzer: 'rug-pull',
                    severity,
                    title: `pyproject.toml contains suspicious pattern: "${pattern.trim()}"`,
                    file: file.path,
                    recommendation: 'Install scripts with network calls or shell execution are a common supply chain attack vector. Review carefully.',
                    references: ['https://cwe.mitre.org/data/definitions/829.html'],
                });
            }
        }

        return findings;
    }

    // ─── Check 2: Obfuscated Code Detection ─────────────────────────────

    private checkObfuscation(server: MCPServer, startIdx: number): Finding[] {
        const findings: Finding[] = [];
        let idx = startIdx;

        for (const file of server.sourceFiles) {
            const lines = file.content.split('\n');

            for (let lineNum = 0; lineNum < lines.length; lineNum++) {
                const line = lines[lineNum];

                // Skip comment lines
                if (this.isCommentLine(line, file.language)) continue;

                const isJsLike = file.language === 'javascript' || file.language === 'typescript';
                const isPython = file.language === 'python';

                // Check critical obfuscation patterns (eval with encoded payloads)
                const criticalPatterns = isJsLike
                    ? JS_OBFUSCATION_CRITICAL
                    : isPython ? PY_OBFUSCATION_CRITICAL : [];

                for (const pattern of criticalPatterns) {
                    if (line.includes(pattern)) {
                        findings.push({
                            id: this.findingId('RUG', ++idx),
                            analyzer: 'rug-pull',
                            severity: 'critical',
                            title: `Obfuscated code detected: ${pattern.replace('(', '')}`,
                            file: file.path,
                            line: lineNum + 1,
                            code: this.truncate(line.trim(), 120),
                            recommendation: 'Obfuscated code is a strong indicator of malicious intent. Review the decoded content.',
                            references: ['https://cwe.mitre.org/data/definitions/506.html'],
                        });
                        break; // One finding per line for critical
                    }
                }

                // Check high-severity obfuscation patterns (generic eval/exec)
                const highPatterns = isJsLike
                    ? JS_OBFUSCATION_HIGH
                    : isPython ? PY_OBFUSCATION_HIGH : [];

                for (const pattern of highPatterns) {
                    if (line.includes(pattern)) {
                        // Skip if already caught by critical pattern
                        const alreadyCritical = criticalPatterns.some((cp) => line.includes(cp));
                        if (alreadyCritical) break;

                        findings.push({
                            id: this.findingId('RUG', ++idx),
                            analyzer: 'rug-pull',
                            severity: 'high',
                            title: `Dynamic code execution: ${pattern.replace('(', '')}`,
                            file: file.path,
                            line: lineNum + 1,
                            code: this.truncate(line.trim(), 120),
                            recommendation: 'Obfuscated code is a strong indicator of malicious intent. Review the decoded content.',
                            references: ['https://cwe.mitre.org/data/definitions/506.html'],
                        });
                        break; // One finding per line for high
                    }
                }

                // Check for long hex strings (>10 occurrences of \xNN on one line)
                const hexMatches = line.match(/\\x[0-9a-fA-F]{2}/g);
                if (hexMatches && hexMatches.length > 10) {
                    findings.push({
                        id: this.findingId('RUG', ++idx),
                        analyzer: 'rug-pull',
                        severity: 'critical',
                        title: 'Long hex-encoded string detected',
                        file: file.path,
                        line: lineNum + 1,
                        code: this.truncate(line.trim(), 120),
                        recommendation: 'Obfuscated code is a strong indicator of malicious intent. Review the decoded content.',
                        references: ['https://cwe.mitre.org/data/definitions/506.html'],
                    });
                }

                // Check for long base64 strings assigned to variables
                const base64Match = line.match(/[A-Za-z0-9+/=]{100,}/);
                if (base64Match && (line.includes('=') || line.includes('('))) {
                    // Make sure it looks like an assignment or function argument, not just a long identifier
                    const beforeMatch = line.slice(0, line.indexOf(base64Match[0]));
                    if (beforeMatch.includes('=') || beforeMatch.includes('(') || beforeMatch.includes(',')) {
                        findings.push({
                            id: this.findingId('RUG', ++idx),
                            analyzer: 'rug-pull',
                            severity: 'critical',
                            title: 'Long base64-encoded string detected',
                            file: file.path,
                            line: lineNum + 1,
                            code: this.truncate(line.trim(), 120),
                            recommendation: 'Obfuscated code is a strong indicator of malicious intent. Review the decoded content.',
                            references: ['https://cwe.mitre.org/data/definitions/506.html'],
                        });
                    }
                }
            }
        }

        return findings;
    }

    // ─── Check 3: Suspicious Minification ────────────────────────────────

    private checkMinification(server: MCPServer, startIdx: number): Finding[] {
        const findings: Finding[] = [];
        let idx = startIdx;

        for (const file of server.sourceFiles) {
            // Skip files in known build output directories
            if (BUILD_OUTPUT_DIRS.some((dir) => file.relativePath.includes(dir))) continue;

            const lines = file.content.split('\n');
            const longLines = lines.filter((l) => l.length > 1000);

            if (longLines.length > 0) {
                findings.push({
                    id: this.findingId('RUG', ++idx),
                    analyzer: 'rug-pull',
                    severity: 'medium',
                    title: `Suspicious minification in source file (${longLines.length} lines >1000 chars)`,
                    file: file.path,
                    recommendation: 'Source files should be human-readable. Minified source in an npm/pip package may indicate an attempt to hide behavior.',
                });
            }
        }

        return findings;
    }

    // ─── Check 4: Package Metadata Red Flags ─────────────────────────────

    private checkMetadata(server: MCPServer, startIdx: number): Finding[] {
        const findings: Finding[] = [];
        let idx = startIdx;

        if (server.packageJson) {
            const pkg = server.packageJson;

            // Missing repository
            if (!pkg.repository) {
                findings.push({
                    id: this.findingId('RUG', ++idx),
                    analyzer: 'rug-pull',
                    severity: 'medium',
                    title: 'Package metadata: missing "repository" field',
                    file: 'package.json',
                    recommendation: 'Legitimate packages typically have complete metadata. Missing metadata may indicate a hastily created attack package.',
                });
            }

            // Missing license
            if (!pkg.license) {
                findings.push({
                    id: this.findingId('RUG', ++idx),
                    analyzer: 'rug-pull',
                    severity: 'medium',
                    title: 'Package metadata: missing "license" field',
                    file: 'package.json',
                    recommendation: 'Legitimate packages typically have complete metadata. Missing metadata may indicate a hastily created attack package.',
                });
            }

            // Empty or very short description
            if (!pkg.description || (typeof pkg.description === 'string' && pkg.description.length < 10)) {
                findings.push({
                    id: this.findingId('RUG', ++idx),
                    analyzer: 'rug-pull',
                    severity: 'medium',
                    title: 'Package metadata: missing or very short "description"',
                    file: 'package.json',
                    recommendation: 'Legitimate packages typically have complete metadata. Missing metadata may indicate a hastily created attack package.',
                });
            }

            // Package name similarity check (basic typosquatting indicators)
            const name = pkg.name as string | undefined;
            if (name) {
                const typosquatResult = this.checkTyposquatting(name);
                if (typosquatResult) {
                    findings.push({
                        id: this.findingId('RUG', ++idx),
                        analyzer: 'rug-pull',
                        severity: 'high',
                        title: `Package name "${name}" resembles known package "${typosquatResult}"`,
                        file: 'package.json',
                        recommendation: 'Legitimate packages typically have complete metadata. Missing metadata may indicate a hastily created attack package.',
                    });
                }
            }
        }

        // Python metadata checks
        if (server.packageManager === 'pip') {
            const setupPy = server.sourceFiles.find((f) =>
                f.relativePath === 'setup.py' || f.relativePath.endsWith('/setup.py'),
            );
            const pyprojectToml = server.sourceFiles.find((f) =>
                f.relativePath === 'pyproject.toml' || f.relativePath.endsWith('/pyproject.toml'),
            );

            const metaSource = setupPy?.content ?? pyprojectToml?.content ?? '';
            const metaFile = setupPy?.path ?? pyprojectToml?.path;

            if (metaFile) {
                if (!metaSource.includes('license') && !metaSource.includes('License')) {
                    findings.push({
                        id: this.findingId('RUG', ++idx),
                        analyzer: 'rug-pull',
                        severity: 'medium',
                        title: 'Python package metadata: missing license information',
                        file: metaFile,
                        recommendation: 'Legitimate packages typically have complete metadata. Missing metadata may indicate a hastily created attack package.',
                    });
                }

                if (!metaSource.includes('url') && !metaSource.includes('repository') && !metaSource.includes('homepage')) {
                    findings.push({
                        id: this.findingId('RUG', ++idx),
                        analyzer: 'rug-pull',
                        severity: 'medium',
                        title: 'Python package metadata: missing repository/homepage URL',
                        file: metaFile,
                        recommendation: 'Legitimate packages typically have complete metadata. Missing metadata may indicate a hastily created attack package.',
                    });
                }
            }
        }

        return findings;
    }

    // ─── Check 5: Dual-Purpose Entry Point Detection ─────────────────────

    private checkEntryPoints(server: MCPServer, startIdx: number): Finding[] {
        const findings: Finding[] = [];
        let idx = startIdx;

        for (const file of server.sourceFiles) {
            // Skip files in build output directories
            if (BUILD_OUTPUT_DIRS.some((dir) => file.relativePath.includes(dir))) continue;

            const lines = file.content.split('\n');
            const isJsLike = file.language === 'javascript' || file.language === 'typescript';
            const isPython = file.language === 'python';

            if (isJsLike) {
                // Check for IIFEs and auto-executing patterns
                for (let lineNum = 0; lineNum < lines.length; lineNum++) {
                    const line = lines[lineNum];
                    if (this.isCommentLine(line, file.language)) continue;

                    for (const pattern of JS_AUTO_EXEC_PATTERNS) {
                        if (pattern.test(line)) {
                            // require('child_process') is always suspicious
                            if (line.includes('child_process')) {
                                findings.push({
                                    id: this.findingId('RUG', ++idx),
                                    analyzer: 'rug-pull',
                                    severity: 'high',
                                    title: 'Import-time code execution: child_process loaded at top level',
                                    file: file.path,
                                    line: lineNum + 1,
                                    code: this.truncate(line.trim(), 120),
                                    recommendation: 'Code that executes at import time can perform malicious actions before the user invokes any tool.',
                                    references: ['https://cwe.mitre.org/data/definitions/829.html'],
                                });
                                break;
                            }
                        }
                    }

                    // Check for top-level dangerous calls (not inside a function)
                    for (const pattern of JS_TOPLEVEL_DANGEROUS) {
                        if (pattern.test(line)) {
                            findings.push({
                                id: this.findingId('RUG', ++idx),
                                analyzer: 'rug-pull',
                                severity: 'high',
                                title: 'Code executes at import/require time',
                                file: file.path,
                                line: lineNum + 1,
                                code: this.truncate(line.trim(), 120),
                                recommendation: 'Code that executes at import time can perform malicious actions before the user invokes any tool.',
                                references: ['https://cwe.mitre.org/data/definitions/829.html'],
                            });
                            break;
                        }
                    }
                }
            }

            if (isPython) {
                // For Python, detect top-level network/subprocess calls outside function/class defs
                let insideBlock = false;
                let blockIndent = 0;

                for (let lineNum = 0; lineNum < lines.length; lineNum++) {
                    const line = lines[lineNum];
                    const stripped = line.trimStart();

                    if (this.isCommentLine(line, file.language)) continue;
                    if (stripped.length === 0) continue;

                    const currentIndent = line.length - stripped.length;

                    // Track if we're inside a function/class definition
                    if (/^(def |class |async def )/.test(stripped)) {
                        insideBlock = true;
                        blockIndent = currentIndent;
                        continue;
                    }

                    if (insideBlock) {
                        if (currentIndent > blockIndent) continue;
                        insideBlock = false;
                    }

                    // At top level — check for dangerous patterns
                    for (const pattern of PY_TOPLEVEL_DANGEROUS) {
                        if (pattern.test(line)) {
                            findings.push({
                                id: this.findingId('RUG', ++idx),
                                analyzer: 'rug-pull',
                                severity: 'high',
                                title: 'Code executes at import time (top-level)',
                                file: file.path,
                                line: lineNum + 1,
                                code: this.truncate(line.trim(), 120),
                                recommendation: 'Code that executes at import time can perform malicious actions before the user invokes any tool.',
                                references: ['https://cwe.mitre.org/data/definitions/829.html'],
                            });
                            break;
                        }
                    }
                }
            }
        }

        return findings;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    /**
     * Check if a line is a comment.
     */
    private isCommentLine(line: string, language: string): boolean {
        const trimmed = line.trimStart();
        if (language === 'python') {
            return trimmed.startsWith('#');
        }
        // JS/TS
        return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
    }

    /**
     * Basic typosquatting check against well-known MCP server package names.
     * Returns the name of the legitimate package if a match is suspected, or null.
     */
    private checkTyposquatting(name: string): string | null {
        const knownPackages = [
            '@modelcontextprotocol/server',
            'mcp-server',
            'claude-mcp',
            '@anthropic/mcp',
            'express', 'axios', 'lodash', 'react', 'next',
            'typescript', 'webpack', 'babel', 'eslint', 'prettier',
        ];

        const normalized = name.toLowerCase().replace(/[_.-]/g, '');

        for (const known of knownPackages) {
            const knownNorm = known.toLowerCase().replace(/[_.-]/g, '');

            // Skip exact matches — those are the real packages
            if (normalized === knownNorm) continue;

            // Check if name is suspiciously close (edit distance 1-2 or contains the known name with extra chars)
            if (normalized.length >= 3 && knownNorm.length >= 3) {
                // Contains the known name with small prefix/suffix additions
                if (normalized.includes(knownNorm) && normalized.length <= knownNorm.length + 4) {
                    return known;
                }
                // Known name contains this name (subset match)
                if (knownNorm.includes(normalized) && knownNorm.length <= normalized.length + 4) {
                    return known;
                }
                // Simple Levenshtein-like check: off by 1-2 characters for short names
                if (Math.abs(normalized.length - knownNorm.length) <= 2 && normalized.length <= 15) {
                    const distance = this.levenshtein(normalized, knownNorm);
                    if (distance > 0 && distance <= 2) {
                        return known;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Compute Levenshtein edit distance between two strings.
     */
    private levenshtein(a: string, b: string): number {
        const m = a.length;
        const n = b.length;
        const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                dp[i][j] = a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }

        return dp[m][n];
    }

    /**
     * Truncate a string to a maximum length, appending '...' if truncated.
     */
    private truncate(str: string, maxLen: number): string {
        return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
    }
}
