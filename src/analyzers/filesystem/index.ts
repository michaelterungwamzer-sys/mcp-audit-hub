import { BaseAnalyzer } from '../base.js';
import { findCallExpressions, isUserControlledArgument, getStringValue, getAst } from '../utils/ast-helpers.js';
import type { Finding, MCPServer } from '../../types/index.js';

const FS_CALLS = [
    'readFile', 'readFileSync', 'writeFile', 'writeFileSync',
    'access', 'accessSync', 'open', 'openSync',
    'createReadStream', 'createWriteStream',
    'unlink', 'unlinkSync', 'readdir', 'readdirSync',
];

const SENSITIVE_PATHS = [
    '~/.ssh', '.ssh/id_rsa', '.ssh/id_ed25519', '.ssh/known_hosts',
    '~/.aws', '.aws/credentials', '.aws/config',
    '~/.env', '.env', '.env.local', '.env.production', '.env.staging',
    '~/.npmrc', '.npmrc', '~/.yarnrc',
    '~/.gitconfig', '.git-credentials',
    '~/.config/gcloud', '.docker/config.json', '.kube/config',
    '/etc/passwd', '/etc/shadow', '/etc/hosts',
    '.pem', '.key', '.p12', '.pfx',
    'id_rsa', 'id_ed25519', 'id_ecdsa',
    'private.key', 'server.key',
];

export class FilesystemAnalyzer extends BaseAnalyzer {
    readonly id = 'filesystem';
    readonly name = 'Filesystem Access';
    readonly description = 'Detects sensitive file access and path traversal vulnerabilities';

    async analyze(server: MCPServer): Promise<Finding[]> {
        const findings: Finding[] = [];
        let findingIndex = 0;

        for (const sourceFile of server.sourceFiles) {
            const ast = getAst(sourceFile);
            if (!ast) continue;

            const fsCalls = findCallExpressions(ast, FS_CALLS, sourceFile.path);

            for (const call of fsCalls) {
                if (call.arguments.length === 0) continue;

                const firstArg = call.arguments[0];

                // Check for sensitive path access
                const pathValue = getStringValue(firstArg);
                if (pathValue) {
                    const isSensitive = SENSITIVE_PATHS.some((sp) =>
                        pathValue.includes(sp),
                    );

                    if (isSensitive) {
                        findings.push({
                            id: this.findingId('FS', ++findingIndex),
                            analyzer: 'filesystem',
                            severity: 'critical',
                            title: `Sensitive file access: ${call.name}("${pathValue}")`,
                            file: call.file,
                            line: call.line,
                            code: `${call.name}("${pathValue}")`,
                            recommendation: 'Avoid accessing sensitive files like credentials, keys, and configuration.',
                            references: ['https://cwe.mitre.org/data/definitions/538.html'],
                        });
                        continue;
                    }
                }

                // Check for path traversal: user input in file path
                if (isUserControlledArgument(firstArg, ast)) {
                    findings.push({
                        id: this.findingId('FS', ++findingIndex),
                        analyzer: 'filesystem',
                        severity: 'high',
                        title: `Path traversal risk: ${call.name}() with user-controlled path`,
                        file: call.file,
                        line: call.line,
                        recommendation: 'Validate and sanitize file paths. Use path.resolve() with a base directory check.',
                        references: ['https://cwe.mitre.org/data/definitions/22.html'],
                    });
                }
            }
        }

        return findings;
    }
}
