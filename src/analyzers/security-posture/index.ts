import { BaseAnalyzer } from '../base.js';
import type { Finding, MCPServer, SourceFile } from '../../types/index.js';

/**
 * Security Posture Analyzer - checks rate limiting, audit logging,
 * and input validation practices across MCP server source files.
 *
 * Contains three toggleable sub-checks:
 *   1. Rate Limiting Detection (RL)
 *   2. Audit Logging Verification (LOG)
 *   3. Input Validation Hygiene (VAL)
 */
export class SecurityPostureAnalyzer extends BaseAnalyzer {
    readonly id = 'security-posture';
    readonly name = 'Security Posture';
    readonly description = 'Checks rate limiting, audit logging, and input validation practices';

    // ── Rate limiting indicators ──────────────────────────────────────

    private static readonly RATE_LIMIT_IMPORTS_JS = [
        'express-rate-limit',
        'rate-limiter-flexible',
        '@fastify/rate-limit',
        'koa-ratelimit',
        'bottleneck',
    ];

    private static readonly RATE_LIMIT_IMPORTS_PY = [
        'slowapi',
        'flask-limiter',
        'flask_limiter',
        'django-ratelimit',
        'django_ratelimit',
        'limits',
    ];

    private static readonly RATE_LIMIT_PATTERNS_JS = [
        'rateLimit(',
        'rateLimiter',
        'RateLimiter',
        'tokenBucket',
        'slidingWindow',
        'windowMs',
    ];

    private static readonly RATE_LIMIT_PATTERNS_PY = [
        '@limiter',
        'Limiter(',
        'rate_limit',
        'RateLimiter',
    ];

    // ── Logging indicators ────────────────────────────────────────────

    private static readonly LOGGING_IMPORTS_JS = [
        'winston',
        'pino',
        'bunyan',
        'log4js',
        'morgan',
        'loglevel',
    ];

    private static readonly LOGGING_IMPORTS_PY = [
        'logging',
        'loguru',
        'structlog',
    ];

    private static readonly LOGGING_PATTERNS_JS = [
        'logger.',
        'log.',
        'console.log',
    ];

    private static readonly LOGGING_PATTERNS_PY = [
        'logging.',
    ];

    private static readonly SENSITIVE_VAR_PATTERNS = [
        'password',
        'token',
        'secret',
        'key',
        'credential',
        'auth',
        'ssn',
        'credit_card',
    ];

    // ── Validation indicators ─────────────────────────────────────────

    private static readonly VALIDATION_IMPORTS_JS = [
        'zod',
        'joi',
        'yup',
        'ajv',
        'class-validator',
        'superstruct',
        'io-ts',
        'valibot',
    ];

    private static readonly VALIDATION_IMPORTS_PY = [
        'pydantic',
        'marshmallow',
        'cerberus',
        'voluptuous',
        'jsonschema',
        'attrs',
    ];

    private static readonly VALIDATION_PATTERNS = [
        'z.object',
        'Joi.object',
        'yup.object',
        'validate(',
        '@validator',
        '@field_validator',
        'BaseModel',
        'Schema(',
    ];

    // ── Main entry point ──────────────────────────────────────────────

    async analyze(server: MCPServer): Promise<Finding[]> {
        const findings: Finding[] = [];

        // Only check if server has tools (otherwise nothing to protect)
        if (server.tools.length === 0) return findings;

        let idx = 0;

        // Sub-check 1: Rate Limiting
        const rlFindings = this.checkRateLimiting(server, idx);
        findings.push(...rlFindings);
        idx += rlFindings.length;

        // Sub-check 2: Audit Logging
        const logFindings = this.checkAuditLogging(server, idx);
        findings.push(...logFindings);
        idx += logFindings.length;

        // Sub-check 3: Input Validation
        const valFindings = this.checkInputValidation(server, idx);
        findings.push(...valFindings);

        return findings;
    }

    // ── Sub-check 1: Rate Limiting Detection ──────────────────────────

    private checkRateLimiting(server: MCPServer, startIdx: number): Finding[] {
        const findings: Finding[] = [];

        const hasRateLimiting = server.sourceFiles.some((sf) =>
            this.hasIndicator(sf, {
                jsImports: SecurityPostureAnalyzer.RATE_LIMIT_IMPORTS_JS,
                pyImports: SecurityPostureAnalyzer.RATE_LIMIT_IMPORTS_PY,
                jsPatterns: SecurityPostureAnalyzer.RATE_LIMIT_PATTERNS_JS,
                pyPatterns: SecurityPostureAnalyzer.RATE_LIMIT_PATTERNS_PY,
            }),
        );

        if (!hasRateLimiting) {
            findings.push({
                id: this.findingId('RL', startIdx + 1),
                analyzer: 'security-posture',
                severity: 'high',
                title: 'No rate limiting detected for MCP server tools',
                recommendation:
                    'Configure rate limiting to prevent abuse of MCP server tools',
            });
        }

        return findings;
    }

    // ── Sub-check 2: Audit Logging Verification ───────────────────────

    private checkAuditLogging(server: MCPServer, startIdx: number): Finding[] {
        const findings: Finding[] = [];
        let idx = startIdx;

        // A. Missing audit logging
        const hasLogging = server.sourceFiles.some((sf) =>
            this.hasIndicator(sf, {
                jsImports: SecurityPostureAnalyzer.LOGGING_IMPORTS_JS,
                pyImports: SecurityPostureAnalyzer.LOGGING_IMPORTS_PY,
                jsPatterns: SecurityPostureAnalyzer.LOGGING_PATTERNS_JS,
                pyPatterns: SecurityPostureAnalyzer.LOGGING_PATTERNS_PY,
            }),
        );

        if (!hasLogging) {
            findings.push({
                id: this.findingId('LOG', ++idx),
                analyzer: 'security-posture',
                severity: 'high',
                title: 'No audit logging detected for MCP server tools',
                recommendation:
                    'Add structured logging using winston, pino (JS/TS) or logging, loguru (Python)',
            });
        }

        // B. Sensitive data in logs
        for (const sf of server.sourceFiles) {
            const sensitiveLogFindings = this.detectSensitiveDataInLogs(sf, idx);
            for (const f of sensitiveLogFindings) {
                idx++;
                findings.push(f);
            }
        }

        // C. Empty catch blocks
        for (const sf of server.sourceFiles) {
            const catchFindings = this.detectEmptyCatchBlocks(sf, idx);
            for (const f of catchFindings) {
                idx++;
                findings.push(f);
            }
        }

        return findings;
    }

    /**
     * Scan a source file for logging calls that reference sensitive variable names.
     */
    private detectSensitiveDataInLogs(sf: SourceFile, startIdx: number): Finding[] {
        const findings: Finding[] = [];
        let idx = startIdx;

        // Regex to match common log function calls
        const logCallPattern =
            sf.language === 'python'
                ? /^\s*(?:logging\.\w+|logger\.\w+|log\.\w+)\s*\((.+)\)/
                : /^\s*(?:logger\.\w+|log\.\w+|console\.(?:log|warn|error|info|debug))\s*\((.+)\)/;

        const sensitiveRegex = new RegExp(
            SecurityPostureAnalyzer.SENSITIVE_VAR_PATTERNS.join('|'),
            'i',
        );

        const lines = sf.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = logCallPattern.exec(line);
            if (match) {
                const args = match[1];
                if (sensitiveRegex.test(args)) {
                    findings.push({
                        id: this.findingId('LOG', ++idx),
                        analyzer: 'security-posture',
                        severity: 'high',
                        title: 'Potential sensitive data exposure in log output',
                        file: sf.relativePath,
                        line: i + 1,
                        code: line.trim(),
                        recommendation:
                            'Avoid logging sensitive data such as passwords, tokens, or secrets. Redact or mask sensitive values before logging.',
                        references: ['CWE-532'],
                    });
                }
            }
        }

        return findings;
    }

    /**
     * Detect empty catch/except blocks that swallow errors without logging.
     */
    private detectEmptyCatchBlocks(sf: SourceFile, startIdx: number): Finding[] {
        const findings: Finding[] = [];
        let idx = startIdx;

        if (sf.language === 'python') {
            // Python: except ... :\n    pass
            const pyEmptyExcept = /except[^:]*:\s*\n\s*pass/g;
            let match: RegExpExecArray | null;
            while ((match = pyEmptyExcept.exec(sf.content)) !== null) {
                const line = sf.content.substring(0, match.index).split('\n').length;
                findings.push({
                    id: this.findingId('LOG', ++idx),
                    analyzer: 'security-posture',
                    severity: 'medium',
                    title: 'Empty except block swallows errors without logging',
                    file: sf.relativePath,
                    line,
                    code: match[0].trim(),
                    recommendation:
                        'Log or re-raise exceptions in except blocks instead of silently passing.',
                });
            }
        } else if (sf.language === 'javascript' || sf.language === 'typescript') {
            // JS/TS: catch (...) { } or catch (...) { /* comment */ }
            const jsEmptyCatch = /catch\s*\([^)]*\)\s*\{\s*(\/\/[^\n]*)?\s*\}/g;
            let match: RegExpExecArray | null;
            while ((match = jsEmptyCatch.exec(sf.content)) !== null) {
                const line = sf.content.substring(0, match.index).split('\n').length;
                findings.push({
                    id: this.findingId('LOG', ++idx),
                    analyzer: 'security-posture',
                    severity: 'medium',
                    title: 'Empty catch block swallows errors without logging',
                    file: sf.relativePath,
                    line,
                    code: match[0].trim(),
                    recommendation:
                        'Log or re-throw errors in catch blocks instead of silently ignoring them.',
                });
            }
        }

        return findings;
    }

    // ── Sub-check 3: Input Validation Hygiene ─────────────────────────

    private checkInputValidation(server: MCPServer, startIdx: number): Finding[] {
        const findings: Finding[] = [];
        let idx = startIdx;

        // A. Missing validation framework
        const hasValidation = server.sourceFiles.some((sf) =>
            this.hasIndicator(sf, {
                jsImports: SecurityPostureAnalyzer.VALIDATION_IMPORTS_JS,
                pyImports: SecurityPostureAnalyzer.VALIDATION_IMPORTS_PY,
                jsPatterns: SecurityPostureAnalyzer.VALIDATION_PATTERNS,
                pyPatterns: SecurityPostureAnalyzer.VALIDATION_PATTERNS,
            }),
        );

        if (!hasValidation) {
            findings.push({
                id: this.findingId('VAL', ++idx),
                analyzer: 'security-posture',
                severity: 'high',
                title: 'No input validation framework detected for MCP server tools',
                recommendation:
                    'Add input validation using zod, joi (JS/TS) or pydantic, marshmallow (Python)',
            });
        }

        // B. Unconstrained tool input schemas
        for (const tool of server.tools) {
            if (!tool.inputSchema) continue;

            const properties = tool.inputSchema.properties as
                | Record<string, Record<string, unknown>>
                | undefined;
            if (!properties) continue;

            for (const [propName, propSchema] of Object.entries(properties)) {
                if (propSchema.type === 'string' && !propSchema.maxLength) {
                    findings.push({
                        id: this.findingId('VAL', ++idx),
                        analyzer: 'security-posture',
                        severity: 'medium',
                        title: `Tool "${tool.name}" has unconstrained string input "${propName}" without maxLength`,
                        file: tool.handlerFile,
                        line: tool.handlerLine,
                        recommendation:
                            'Add maxLength constraints to string properties in tool input schemas to prevent excessively large inputs.',
                        references: ['CWE-20'],
                    });
                }
            }
        }

        return findings;
    }

    // ── Shared helpers ────────────────────────────────────────────────

    /**
     * Check whether a source file contains any of the given indicators
     * (import names or content patterns), appropriate to its language.
     */
    private hasIndicator(
        sf: SourceFile,
        opts: {
            jsImports: string[];
            pyImports: string[];
            jsPatterns: string[];
            pyPatterns: string[];
        },
    ): boolean {
        const isJS = sf.language === 'javascript' || sf.language === 'typescript';
        const isPy = sf.language === 'python';

        const imports = isJS ? opts.jsImports : isPy ? opts.pyImports : [];
        const patterns = isJS ? opts.jsPatterns : isPy ? opts.pyPatterns : [];

        const content = sf.content;

        for (const imp of imports) {
            if (content.includes(imp)) return true;
        }

        for (const pat of patterns) {
            if (content.includes(pat)) return true;
        }

        return false;
    }
}
