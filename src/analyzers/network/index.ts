import { BaseAnalyzer } from '../base.js';
import { findCallExpressions, containsProcessEnv, isUserControlledArgument, findStringInSource, getAst } from '../utils/ast-helpers.js';
import type { Finding, MCPServer } from '../../types/index.js';

const NETWORK_CALLS = [
    'fetch', 'request', 'get', 'post', 'put', 'patch', 'delete',
];

const NETWORK_DESCRIPTION_KEYWORDS = [
    'network', 'http', 'https', 'request', 'fetch', 'api',
    'send', 'url', 'endpoint', 'webhook', 'download', 'upload',
];

export class NetworkAnalyzer extends BaseAnalyzer {
    readonly id = 'network';
    readonly name = 'Network Analysis';
    readonly description = 'Detects undisclosed outbound network calls and data exfiltration';

    async analyze(server: MCPServer): Promise<Finding[]> {
        const findings: Finding[] = [];
        let findingIndex = 0;

        for (const sourceFile of server.sourceFiles) {
            const ast = getAst(sourceFile);
            if (!ast) continue;

            const networkCalls = findCallExpressions(ast, NETWORK_CALLS, sourceFile.path);

            // Also detect new WebSocket(...)
            const content = sourceFile.content;
            if (content.includes('new WebSocket(') || content.includes('new WebSocket (')) {
                const line = content.split('\n').findIndex((l) => l.includes('WebSocket')) + 1;
                networkCalls.push({
                    name: 'WebSocket',
                    node: null as never,
                    file: sourceFile.path,
                    line,
                    arguments: [],
                });
            }

            for (const call of networkCalls) {
                // Check for data exfiltration: process.env in arguments
                if (call.arguments.length > 0) {
                    for (const arg of call.arguments) {
                        if (containsProcessEnv(arg)) {
                            findings.push({
                                id: this.findingId('NET', ++findingIndex),
                                analyzer: 'network',
                                severity: 'critical',
                                title: `Data exfiltration: ${call.name}() sends environment variables`,
                                file: call.file,
                                line: call.line,
                                recommendation: 'Never send environment variables (process.env) to external endpoints.',
                                references: ['https://cwe.mitre.org/data/definitions/200.html'],
                            });
                        }

                        if (isUserControlledArgument(arg, ast)) {
                            findings.push({
                                id: this.findingId('NET', ++findingIndex),
                                analyzer: 'network',
                                severity: 'high',
                                title: `${call.name}() sends user data to external endpoint`,
                                file: call.file,
                                line: call.line,
                                recommendation: 'Ensure user data is not exfiltrated to unauthorized endpoints.',
                            });
                        }
                    }
                }

                // Check if network call is disclosed in any tool description
                const relatedTool = server.tools.find((t) => t.handlerFile === sourceFile.path);
                if (relatedTool) {
                    const descLower = relatedTool.description.toLowerCase();
                    if (!findStringInSource(descLower, NETWORK_DESCRIPTION_KEYWORDS)) {
                        findings.push({
                            id: this.findingId('NET', ++findingIndex),
                            analyzer: 'network',
                            severity: 'high',
                            title: `Undisclosed network call: ${call.name}() in tool "${relatedTool.name}"`,
                            file: call.file,
                            line: call.line,
                            recommendation: 'Tool description should disclose all outbound network activity.',
                        });
                    }
                }
            }
        }

        return findings;
    }
}
