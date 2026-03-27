import { BaseAnalyzer } from '../base.js';
import type { Finding, MCPServer } from '../../types/index.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Known secret token patterns with named identifiers and severities. */
const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp; severity: 'critical' | 'high' }> = [
    // AWS
    { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'critical' },
    // GitHub
    { name: 'GitHub Personal Access Token', pattern: /ghp_[a-zA-Z0-9]{36}/, severity: 'critical' },
    { name: 'GitHub OAuth Token', pattern: /gho_[a-zA-Z0-9]{36}/, severity: 'critical' },
    { name: 'GitHub Server Token', pattern: /ghs_[a-zA-Z0-9]{36}/, severity: 'critical' },
    { name: 'GitHub Fine-Grained PAT', pattern: /github_pat_[a-zA-Z0-9_]{22,}/, severity: 'critical' },
    // OpenAI
    { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{20,}/, severity: 'critical' },
    // Slack
    { name: 'Slack Token', pattern: /xox[bpoas]-[a-zA-Z0-9-]+/, severity: 'critical' },
    // Stripe
    { name: 'Stripe Secret Key', pattern: /sk_live_[a-zA-Z0-9]{24,}/, severity: 'critical' },
    { name: 'Stripe Publishable Key', pattern: /pk_live_[a-zA-Z0-9]{24,}/, severity: 'critical' },
];

/** Regex matching variable names that commonly hold secrets. */
const SECRET_VAR_NAMES = /\b(password|passwd|secret|token|api[_-]?key|apikey|private[_-]?key|auth[_-]?token|access[_-]?token|credential|client[_-]?secret)\b/i;

/** Placeholder / example values that should NOT be flagged. */
const PLACEHOLDER_VALUES = /^['"`]?(your[_-]?api[_-]?key[_-]?here|xxx+|changeme|placeholder|example|CHANGE_ME|TODO|INSERT|REPLACE)[_-]?.*['"`]?$/i;

/** Credentials embedded in URLs: http(s)://user:pass@host */
const CREDENTIALS_IN_URL = /https?:\/\/([^:/?#\s]+):([^@/?#\s]+)@/;

// JS/TS log functions
const JS_LOG_FUNCTIONS = [
    'console.log', 'console.error', 'console.warn', 'console.info', 'console.debug',
    'logger.info', 'logger.debug', 'logger.error', 'logger.warn',
    'log.info', 'log.debug', 'log.error', 'log.warn',
];

// Python log functions
const PYTHON_LOG_FUNCTIONS = [
    'print',
    'logging.info', 'logging.debug', 'logging.error', 'logging.warning',
    'logger.info', 'logger.debug', 'logger.error', 'logger.warning',
];

/** Weak hash algorithms (case-insensitive matching handled at call-site). */
const WEAK_HASH_JS = /createHash\(\s*['"](?:md5|sha1)['"]\s*\)/i;
const WEAK_HASH_PYTHON = /(?:hashlib\.(?:md5|sha1)|(?<!\w)md5\(|(?<!\w)sha1\()/i;
const WEAK_CIPHER = /\b(DES|RC4|ECB)\b/;

/** Password-like context words used to narrow weak-crypto findings. */
const PASSWORD_CONTEXT = /\b(password|passwd|credential|secret|token|auth)\b/i;

/** Pattern for generic high-entropy string assignment to secret-like variables. */
const GENERIC_SECRET_ASSIGNMENT = /\b(password|passwd|secret|token|api[_-]?key|apikey|private[_-]?key|auth[_-]?token|access[_-]?token|credential|client[_-]?secret)\s*[:=]\s*['"`]([^'"`\s]{8,})['"`]/i;

/** Logging call pattern builder. */
function buildLogPattern(functions: string[]): RegExp {
    const escaped = functions.map(f => f.replace('.', '\\.'));
    return new RegExp(`(?:${escaped.join('|')})\\s*\\(`);
}

const JS_LOG_REGEX = buildLogPattern(JS_LOG_FUNCTIONS);
const PYTHON_LOG_REGEX = buildLogPattern(PYTHON_LOG_FUNCTIONS);

/** localStorage.setItem with secret-like key name. */
const LOCAL_STORAGE_SECRET = /localStorage\.setItem\(\s*['"]([^'"]*(?:password|passwd|secret|token|api[_-]?key|apikey|private[_-]?key|auth[_-]?token|access[_-]?token|credential|client[_-]?secret)[^'"]*)['"]/i;

/** Cookie setting patterns (document.cookie or Set-Cookie header). */
const COOKIE_SET_PATTERN = /(?:document\.cookie\s*=|['""]Set-Cookie['""]?\s*[:,=])\s*[`'"]/i;
const COOKIE_SECRET_NAME = /\b(?:password|passwd|secret|token|api[_-]?key|apikey|private[_-]?key|auth[_-]?token|access[_-]?token|credential|client[_-]?secret)\b/i;

/** File write with secret-like variable. */
const FILE_WRITE_JS = /(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream)\s*\(/;
const FILE_WRITE_PYTHON = /(?:\.write\(|write_text\(|write_bytes\()/;

// ---------------------------------------------------------------------------
// Analyzer
// ---------------------------------------------------------------------------

/**
 * Credential Hygiene Analyzer.
 *
 * Scans MCP server source files for hardcoded secrets, credentials in URLs,
 * weak cryptographic usage near password context, secrets leaked through
 * logging calls, and insecure credential storage patterns.
 */
export class CredentialHygieneAnalyzer extends BaseAnalyzer {
    readonly id = 'credential-hygiene';
    readonly name = 'Credential Hygiene';
    readonly description = 'Detects hardcoded secrets, weak cryptography, and credential exposure';

    async analyze(server: MCPServer): Promise<Finding[]> {
        const findings: Finding[] = [];
        let idx = 0;

        for (const sourceFile of server.sourceFiles) {
            // Skip non-source files
            if (sourceFile.language === 'unknown') continue;

            const lines = sourceFile.content.split('\n');
            const isPython = sourceFile.language === 'python';

            for (let lineNum = 0; lineNum < lines.length; lineNum++) {
                const line = lines[lineNum];
                const lineNo = lineNum + 1; // 1-based

                // Skip comment-only lines (simple heuristic)
                const trimmed = line.trim();
                if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
                    continue;
                }

                // 1. Hardcoded secrets – known token patterns
                for (const sp of SECRET_PATTERNS) {
                    const match = sp.pattern.exec(line);
                    if (match) {
                        findings.push({
                            id: this.findingId('CRED', ++idx),
                            analyzer: 'credential-hygiene',
                            severity: sp.severity,
                            title: `Hardcoded ${sp.name} detected`,
                            file: sourceFile.relativePath,
                            line: lineNo,
                            code: this.redactLine(line.trim(), match[0]),
                            recommendation: 'Remove hardcoded secrets and use environment variables or a secrets manager instead.',
                            references: ['https://cwe.mitre.org/data/definitions/798.html'],
                        });
                    }
                }

                // 1b. Generic high-entropy secret assignment
                const genericMatch = GENERIC_SECRET_ASSIGNMENT.exec(line);
                if (genericMatch) {
                    const value = genericMatch[2];
                    if (!PLACEHOLDER_VALUES.test(value) && this.looksLikeSecret(value)) {
                        findings.push({
                            id: this.findingId('CRED', ++idx),
                            analyzer: 'credential-hygiene',
                            severity: 'critical',
                            title: `Hardcoded secret in variable '${genericMatch[1]}'`,
                            file: sourceFile.relativePath,
                            line: lineNo,
                            code: this.redactLine(line.trim(), value),
                            recommendation: 'Remove hardcoded secrets and use environment variables or a secrets manager instead.',
                            references: ['https://cwe.mitre.org/data/definitions/798.html'],
                        });
                    }
                }

                // 2. Credentials in URLs
                const urlMatch = CREDENTIALS_IN_URL.exec(line);
                if (urlMatch) {
                    findings.push({
                        id: this.findingId('CRED', ++idx),
                        analyzer: 'credential-hygiene',
                        severity: 'critical',
                        title: 'Credentials embedded in URL',
                        file: sourceFile.relativePath,
                        line: lineNo,
                        code: this.redactCredentialsInUrl(line.trim()),
                        recommendation: 'Remove credentials from URLs. Use environment variables and configure authentication separately.',
                        references: ['https://cwe.mitre.org/data/definitions/798.html'],
                    });
                }

                // 3. Weak cryptographic usage
                const weakHashMatch = isPython ? WEAK_HASH_PYTHON.test(line) : WEAK_HASH_JS.test(line);
                if (weakHashMatch) {
                    // Check surrounding context (5 lines above/below) for password-related words
                    const context = this.getSurroundingContext(lines, lineNum, 5);
                    if (PASSWORD_CONTEXT.test(context) || PASSWORD_CONTEXT.test(line)) {
                        findings.push({
                            id: this.findingId('CRED', ++idx),
                            analyzer: 'credential-hygiene',
                            severity: 'high',
                            title: 'Weak hash algorithm used in credential context',
                            file: sourceFile.relativePath,
                            line: lineNo,
                            code: trimmed,
                            recommendation: 'Use a strong password hashing algorithm such as bcrypt, scrypt, or Argon2 instead of MD5/SHA1.',
                            references: [
                                'https://cwe.mitre.org/data/definitions/916.html',
                                'https://cwe.mitre.org/data/definitions/327.html',
                            ],
                        });
                    }
                }

                if (WEAK_CIPHER.test(line)) {
                    findings.push({
                        id: this.findingId('CRED', ++idx),
                        analyzer: 'credential-hygiene',
                        severity: 'high',
                        title: 'Weak or insecure cipher/mode detected',
                        file: sourceFile.relativePath,
                        line: lineNo,
                        code: trimmed,
                        recommendation: 'Avoid DES, RC4, and ECB mode. Use AES-GCM or ChaCha20-Poly1305 instead.',
                        references: ['https://cwe.mitre.org/data/definitions/327.html'],
                    });
                }

                // 4. Secrets in logging
                const logRegex = isPython ? PYTHON_LOG_REGEX : JS_LOG_REGEX;
                if (logRegex.test(line) && SECRET_VAR_NAMES.test(line)) {
                    findings.push({
                        id: this.findingId('CRED', ++idx),
                        analyzer: 'credential-hygiene',
                        severity: 'high',
                        title: 'Potential secret leaked through logging',
                        file: sourceFile.relativePath,
                        line: lineNo,
                        code: trimmed,
                        recommendation: 'Never log sensitive values. Mask or omit credentials before logging.',
                        references: ['https://cwe.mitre.org/data/definitions/532.html'],
                    });
                }

                // 5. Insecure credential storage
                // 5a. localStorage with secret-like key
                const lsMatch = LOCAL_STORAGE_SECRET.exec(line);
                if (lsMatch) {
                    findings.push({
                        id: this.findingId('CRED', ++idx),
                        analyzer: 'credential-hygiene',
                        severity: 'high',
                        title: `Credential stored in localStorage ('${lsMatch[1]}')`,
                        file: sourceFile.relativePath,
                        line: lineNo,
                        code: trimmed,
                        recommendation: 'Do not store credentials in localStorage. Use secure, httpOnly cookies or a server-side session.',
                        references: ['https://cwe.mitre.org/data/definitions/312.html'],
                    });
                }

                // 5b. Cookie setting without secure/httpOnly flags for credential-named cookies
                if (COOKIE_SET_PATTERN.test(line) && COOKIE_SECRET_NAME.test(line)) {
                    const hasSecure = /secure/i.test(line);
                    const hasHttpOnly = /httponly/i.test(line);
                    if (!hasSecure || !hasHttpOnly) {
                        const missingFlags = [];
                        if (!hasSecure) missingFlags.push('Secure');
                        if (!hasHttpOnly) missingFlags.push('HttpOnly');
                        findings.push({
                            id: this.findingId('CRED', ++idx),
                            analyzer: 'credential-hygiene',
                            severity: 'high',
                            title: `Credential cookie missing ${missingFlags.join(' and ')} flag`,
                            file: sourceFile.relativePath,
                            line: lineNo,
                            code: trimmed,
                            recommendation: 'Always set Secure and HttpOnly flags on cookies that contain credentials.',
                            references: ['https://cwe.mitre.org/data/definitions/312.html'],
                        });
                    }
                }

                // 5c. Writing secrets to files
                const fileWriteMatch = isPython ? FILE_WRITE_PYTHON.test(line) : FILE_WRITE_JS.test(line);
                if (fileWriteMatch && SECRET_VAR_NAMES.test(line)) {
                    findings.push({
                        id: this.findingId('CRED', ++idx),
                        analyzer: 'credential-hygiene',
                        severity: 'high',
                        title: 'Potential secret written to file',
                        file: sourceFile.relativePath,
                        line: lineNo,
                        code: trimmed,
                        recommendation: 'Do not write secrets to plaintext files. Use a secrets manager or encrypted storage.',
                        references: ['https://cwe.mitre.org/data/definitions/312.html'],
                    });
                }
            }
        }

        return findings;
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /**
     * Redact a known secret value within a code line.
     * Shows first 4 characters followed by `****` and last 2 characters.
     */
    private redactSecret(value: string): string {
        if (value.length <= 8) return '****';
        return value.substring(0, 4) + '****' + value.substring(value.length - 2);
    }

    /** Replace the matched secret token in a line with its redacted form. */
    private redactLine(line: string, secret: string): string {
        return line.replace(secret, this.redactSecret(secret));
    }

    /** Redact user:pass portion from URLs in a line. */
    private redactCredentialsInUrl(line: string): string {
        return line.replace(CREDENTIALS_IN_URL, (_, user: string, pass: string) => {
            const redactedUser = this.redactSecret(user);
            const redactedPass = this.redactSecret(pass);
            return `https://${redactedUser}:${redactedPass}@`;
        });
    }

    /** Get surrounding lines as a single string for context checks. */
    private getSurroundingContext(lines: string[], currentIndex: number, range: number): string {
        const start = Math.max(0, currentIndex - range);
        const end = Math.min(lines.length - 1, currentIndex + range);
        return lines.slice(start, end + 1).join('\n');
    }

    /**
     * Heuristic to decide if a string value looks like a real secret
     * (as opposed to a placeholder or normal configuration value).
     * Checks for minimum entropy / character diversity.
     */
    private looksLikeSecret(value: string): boolean {
        if (value.length < 8) return false;
        // Must contain a mix of character classes
        const hasUpper = /[A-Z]/.test(value);
        const hasLower = /[a-z]/.test(value);
        const hasDigit = /[0-9]/.test(value);
        const hasSpecial = /[^a-zA-Z0-9]/.test(value);
        const classCount = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
        // At least 2 character classes and reasonable length
        return classCount >= 2 && value.length >= 12;
    }
}
