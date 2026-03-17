import { BaseAnalyzer } from '../base.js';
import { findImports, getAst } from '../utils/ast-helpers.js';
import type { Finding, MCPServer } from '../../types/index.js';

const AUTH_MODULES = [
    'passport', 'jsonwebtoken', 'express-jwt', '@auth/core',
    'lucia', 'oauth2-server', 'express-oauth-server',
    'koa-passport', 'fastify-jwt', '@fastify/jwt',
    'bcrypt', 'bcryptjs', 'argon2',
];

const AUTH_PATTERNS = [
    'authMiddleware', 'authenticate', 'authorization',
    'jwt.verify', 'verifyToken', 'validateApiKey', 'validateToken',
    'headers.authorization', 'bearer', 'apiKey',
    'isAuthenticated', 'requireAuth', 'checkAuth',
    'passport.authenticate',
];

export class AuthenticationAnalyzer extends BaseAnalyzer {
    readonly id = 'authentication';
    readonly name = 'Authentication';
    readonly description = 'Checks for presence of authentication configuration';

    async analyze(server: MCPServer): Promise<Finding[]> {
        const findings: Finding[] = [];
        let authIndicators = 0;

        for (const sourceFile of server.sourceFiles) {
            const ast = getAst(sourceFile);
            if (!ast) continue;

            // Check for auth-related imports
            const authImports = findImports(ast, AUTH_MODULES, sourceFile.path);
            authIndicators += authImports.length;

            // Check for auth patterns in source code
            const contentLower = sourceFile.content.toLowerCase();
            for (const pattern of AUTH_PATTERNS) {
                if (contentLower.includes(pattern.toLowerCase())) {
                    authIndicators++;
                }
            }
        }

        if (authIndicators === 0 && server.tools.length > 0) {
            findings.push({
                id: this.findingId('AUTH', 1),
                analyzer: 'authentication',
                severity: 'high',
                title: 'No authentication mechanism detected',
                recommendation: 'Configure authentication (OAuth, API keys, or JWT) to protect MCP server tools from unauthorized access.',
                references: ['https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/'],
            });
        }

        return findings;
    }
}
