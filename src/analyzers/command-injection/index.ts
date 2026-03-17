import { BaseAnalyzer } from '../base.js';
import {
    findCallExpressions,
    isUserControlledArgument,
    hasTemplateExpressions,
    getAst,
} from '../utils/ast-helpers.js';
import type { Finding, MCPServer, SourceFile } from '../../types/index.js';

const SHELL_SINKS = [
    'exec', 'execSync', 'spawn', 'spawnSync',
    'execFile', 'execFileSync', 'fork',
];

const SQL_SINKS = [
    'query', 'execute', 'raw', 'rawQuery',
];

const FS_SINKS = [
    'readFile', 'readFileSync', 'writeFile', 'writeFileSync',
    'createReadStream', 'createWriteStream', 'access', 'open',
    'unlink', 'unlinkSync',
];

export class CommandInjectionAnalyzer extends BaseAnalyzer {
    readonly id = 'command-injection';
    readonly name = 'Command Injection';
    readonly description = 'Detects command injection, SQL injection, and path traversal vulnerabilities';

    async analyze(server: MCPServer): Promise<Finding[]> {
        const findings: Finding[] = [];
        let findingIndex = 0;

        for (const sourceFile of server.sourceFiles) {
            const ast = getAst(sourceFile);
            if (!ast) continue;

            // Shell injection
            const shellCalls = findCallExpressions(ast, SHELL_SINKS, sourceFile.path);
            for (const call of shellCalls) {
                if (call.arguments.length === 0) continue;

                const firstArg = call.arguments[0];

                // Template literal with expressions: exec(`cmd ${input}`)
                if (hasTemplateExpressions(firstArg)) {
                    if (isUserControlledArgument(firstArg, ast)) {
                        findings.push({
                            id: this.findingId('INJ', ++findingIndex),
                            analyzer: 'command-injection',
                            severity: 'critical',
                            title: `Shell injection: ${call.name}() with user-controlled template literal`,
                            file: call.file,
                            line: call.line,
                            code: this.extractCode(sourceFile, call.line),
                            recommendation: `Avoid passing user input to ${call.name}(). Use parameterized commands or shell escaping.`,
                            references: ['https://cwe.mitre.org/data/definitions/78.html'],
                        });
                        continue;
                    }
                }

                // Identifier that traces to function parameter
                if (isUserControlledArgument(firstArg, ast)) {
                    findings.push({
                        id: this.findingId('INJ', ++findingIndex),
                        analyzer: 'command-injection',
                        severity: 'critical',
                        title: `Shell injection: ${call.name}() with user-controlled argument`,
                        file: call.file,
                        line: call.line,
                        code: this.extractCode(sourceFile, call.line),
                        recommendation: `Avoid passing user input to ${call.name}(). Use parameterized commands or shell escaping.`,
                        references: ['https://cwe.mitre.org/data/definitions/78.html'],
                    });
                }
            }

            // SQL injection
            const sqlCalls = findCallExpressions(ast, SQL_SINKS, sourceFile.path);
            for (const call of sqlCalls) {
                if (call.arguments.length === 0) continue;

                const firstArg = call.arguments[0];

                // Template literal with expressions: query(`SELECT * FROM x WHERE id = ${id}`)
                if (hasTemplateExpressions(firstArg)) {
                    findings.push({
                        id: this.findingId('INJ', ++findingIndex),
                        analyzer: 'command-injection',
                        severity: 'high',
                        title: `SQL injection: ${call.name}() with template literal interpolation`,
                        file: call.file,
                        line: call.line,
                        code: this.extractCode(sourceFile, call.line),
                        recommendation: 'Use parameterized queries instead of string interpolation.',
                        references: ['https://cwe.mitre.org/data/definitions/89.html'],
                    });
                    continue;
                }

                // String concatenation: query("SELECT * FROM x WHERE id = '" + input + "'")
                if (firstArg.type === 'BinaryExpression' && (firstArg as { operator: string }).operator === '+') {
                    if (isUserControlledArgument(firstArg, ast)) {
                        findings.push({
                            id: this.findingId('INJ', ++findingIndex),
                            analyzer: 'command-injection',
                            severity: 'high',
                            title: `SQL injection: ${call.name}() with string concatenation`,
                            file: call.file,
                            line: call.line,
                            code: this.extractCode(sourceFile, call.line),
                            recommendation: 'Use parameterized queries instead of string concatenation.',
                            references: ['https://cwe.mitre.org/data/definitions/89.html'],
                        });
                    }
                }
            }

            // Path traversal via filesystem calls
            const fsCalls = findCallExpressions(ast, FS_SINKS, sourceFile.path);
            for (const call of fsCalls) {
                if (call.arguments.length === 0) continue;

                const firstArg = call.arguments[0];

                if (isUserControlledArgument(firstArg, ast)) {
                    findings.push({
                        id: this.findingId('INJ', ++findingIndex),
                        analyzer: 'command-injection',
                        severity: 'high',
                        title: `Path traversal: ${call.name}() with user-controlled path`,
                        file: call.file,
                        line: call.line,
                        code: this.extractCode(sourceFile, call.line),
                        recommendation: 'Validate and sanitize file paths. Use path.resolve() with a startsWith() check.',
                        references: ['https://cwe.mitre.org/data/definitions/22.html'],
                    });
                }
            }
        }

        return findings;
    }

    private extractCode(sourceFile: SourceFile, line: number): string {
        const lines = sourceFile.content.split('\n');
        const lineIdx = line - 1;
        if (lineIdx >= 0 && lineIdx < lines.length) {
            return lines[lineIdx].trim();
        }
        return '';
    }
}
