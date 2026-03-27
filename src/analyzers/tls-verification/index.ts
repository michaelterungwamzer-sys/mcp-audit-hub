import { BaseAnalyzer } from '../base.js';
import type { Finding, MCPServer } from '../../types/index.js';

/**
 * Localhost and loopback patterns excluded from insecure-URL findings.
 * URLs targeting these hosts are considered safe for development use.
 */
const LOCALHOST_PATTERNS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '[::1]',
    '::1',
];

/**
 * Regex matching private/internal IP address ranges (RFC 1918 + link-local).
 * Used to classify non-localhost internal URLs as medium severity.
 */
const PRIVATE_IP_REGEX = /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})$/;

/**
 * Regex matching http:// URLs in source code string contexts.
 * Captures the host portion for localhost/private-IP classification.
 */
const HTTP_URL_REGEX = /(?:['"`])http:\/\/([^\s'"`:\/]+)/g;

/**
 * Regex matching ws:// (insecure WebSocket) URLs in source code.
 * Captures the host portion for localhost exclusion.
 */
const WS_URL_REGEX = /(?:['"`])ws:\/\/([^\s'"`:\/]+)/g;

/**
 * Patterns indicating disabled certificate verification in JS/TS code.
 */
const JS_CERT_DISABLE_PATTERNS = [
    /rejectUnauthorized\s*:\s*false/,
    /NODE_TLS_REJECT_UNAUTHORIZED['"]\s*[,)]\s*['"]0['"]/,
    /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]/,
    /process\.env\s*\[\s*['"]NODE_TLS_REJECT_UNAUTHORIZED['"]\s*\]\s*=\s*['"]0['"]/,
    /process\.env\.NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]/,
];

/**
 * Patterns indicating disabled certificate verification in Python code.
 */
const PYTHON_CERT_DISABLE_PATTERNS = [
    /verify\s*=\s*False/,
    /ssl\._create_unverified_context/,
    /CERT_NONE/,
];

/**
 * Checks whether a URL host matches a localhost/loopback address.
 * @param host - The hostname extracted from a URL.
 * @returns True if the host is a localhost pattern.
 */
function isLocalhost(host: string): boolean {
    return LOCALHOST_PATTERNS.some((pattern) => host === pattern);
}

/**
 * Checks whether a host is a private/internal IP address.
 * @param host - The hostname extracted from a URL.
 * @returns True if the host falls within RFC 1918 private ranges.
 */
function isPrivateIp(host: string): boolean {
    return PRIVATE_IP_REGEX.test(host);
}

/**
 * Security analyzer that verifies TLS usage and detects insecure transport configurations.
 *
 * Performs four categories of checks:
 * 1. Non-TLS URL detection (http:// instead of https://)
 * 2. Disabled certificate verification (rejectUnauthorized: false, verify=False, etc.)
 * 3. Insecure WebSocket detection (ws:// instead of wss://)
 * 4. Mixed protocol detection (both http:// and https:// in the same file)
 */
export class TlsVerificationAnalyzer extends BaseAnalyzer {
    readonly id = 'tls-verification';
    readonly name = 'TLS/Encryption Verification';
    readonly description = 'Verifies TLS usage and detects insecure transport configurations';

    /**
     * Analyze an MCP server for insecure transport layer configurations.
     * @param server - The parsed MCP server to analyze.
     * @returns A list of findings for TLS/encryption issues.
     */
    async analyze(server: MCPServer): Promise<Finding[]> {
        const findings: Finding[] = [];
        let idx = 0;

        for (const sourceFile of server.sourceFiles) {
            if (sourceFile.language === 'unknown') continue;

            const content = sourceFile.content;
            const lines = content.split('\n');
            const isPython = sourceFile.language === 'python';

            // Track external http/https URLs per file for mixed-protocol detection
            const externalHttpLines: number[] = [];
            const externalHttpsLines: number[] = [];

            // --- Check 1: Non-TLS URLs (http://) ---
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineNum = i + 1;

                // Skip comment-only lines
                if (this.isCommentLine(line, isPython)) continue;

                HTTP_URL_REGEX.lastIndex = 0;
                let match: RegExpExecArray | null;
                while ((match = HTTP_URL_REGEX.exec(line)) !== null) {
                    const host = match[1];

                    if (isLocalhost(host)) continue;

                    if (isPrivateIp(host)) {
                        findings.push({
                            id: this.findingId('TLS', ++idx),
                            analyzer: 'tls-verification',
                            severity: 'medium',
                            title: `Non-TLS URL targeting internal network: http://${host}`,
                            file: sourceFile.path,
                            line: lineNum,
                            code: line.trim(),
                            recommendation: 'Use HTTPS even for internal network communication to prevent credential sniffing and MITM attacks.',
                            references: ['https://cwe.mitre.org/data/definitions/319.html'],
                        });
                    } else {
                        findings.push({
                            id: this.findingId('TLS', ++idx),
                            analyzer: 'tls-verification',
                            severity: 'high',
                            title: `Non-TLS URL detected: http://${host}`,
                            file: sourceFile.path,
                            line: lineNum,
                            code: line.trim(),
                            recommendation: 'Replace http:// with https:// to encrypt data in transit and prevent eavesdropping.',
                            references: ['https://cwe.mitre.org/data/definitions/319.html'],
                        });
                        externalHttpLines.push(lineNum);
                    }
                }

                // Track https:// external URLs for mixed-protocol detection
                if (/['"`]https:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|::1)/.test(line)) {
                    externalHttpsLines.push(lineNum);
                }
            }

            // --- Check 2: Disabled Certificate Verification ---
            const certPatterns = isPython ? PYTHON_CERT_DISABLE_PATTERNS : JS_CERT_DISABLE_PATTERNS;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineNum = i + 1;

                if (this.isCommentLine(line, isPython)) continue;

                for (const pattern of certPatterns) {
                    if (pattern.test(line)) {
                        findings.push({
                            id: this.findingId('TLS', ++idx),
                            analyzer: 'tls-verification',
                            severity: 'critical',
                            title: 'Disabled certificate verification',
                            file: sourceFile.path,
                            line: lineNum,
                            code: line.trim(),
                            recommendation: 'Never disable TLS certificate verification in production. This allows man-in-the-middle attacks.',
                            references: ['https://cwe.mitre.org/data/definitions/295.html'],
                        });
                        break; // One finding per line is sufficient
                    }
                }
            }

            // --- Check 3: Insecure WebSocket (ws://) ---
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineNum = i + 1;

                if (this.isCommentLine(line, isPython)) continue;

                WS_URL_REGEX.lastIndex = 0;
                let wsMatch: RegExpExecArray | null;
                while ((wsMatch = WS_URL_REGEX.exec(line)) !== null) {
                    const host = wsMatch[1];

                    if (isLocalhost(host)) continue;

                    findings.push({
                        id: this.findingId('TLS', ++idx),
                        analyzer: 'tls-verification',
                        severity: 'high',
                        title: `Insecure WebSocket URL detected: ws://${host}`,
                        file: sourceFile.path,
                        line: lineNum,
                        code: line.trim(),
                        recommendation: 'Replace ws:// with wss:// to encrypt WebSocket communication.',
                        references: ['https://cwe.mitre.org/data/definitions/319.html'],
                    });
                }
            }

            // --- Check 4: Mixed Protocol Detection ---
            if (externalHttpLines.length > 0 && externalHttpsLines.length > 0) {
                findings.push({
                    id: this.findingId('TLS', ++idx),
                    analyzer: 'tls-verification',
                    severity: 'medium',
                    title: 'Mixed HTTP/HTTPS protocols in same file',
                    file: sourceFile.path,
                    line: externalHttpLines[0],
                    code: `http:// on line(s) ${externalHttpLines.join(', ')} alongside https:// on line(s) ${externalHttpsLines.join(', ')}`,
                    recommendation: 'Standardize on HTTPS for all external URLs. Mixed protocols may indicate incomplete migration to TLS.',
                    references: ['https://cwe.mitre.org/data/definitions/319.html'],
                });
            }
        }

        return findings;
    }

    /**
     * Determine whether a line is a comment-only line.
     * @param line - The source line to check.
     * @param isPython - Whether the file is Python (uses # comments).
     * @returns True if the line appears to be a comment.
     */
    private isCommentLine(line: string, isPython: boolean): boolean {
        const trimmed = line.trim();
        if (isPython) {
            return trimmed.startsWith('#');
        }
        return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
    }
}
