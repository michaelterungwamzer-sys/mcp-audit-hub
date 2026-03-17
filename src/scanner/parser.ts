import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import _traverse from '@babel/traverse';
import type { MCPServer, MCPTool, MCPResource, MCPPrompt, SourceFile } from '../types/index.js';
import type { ResolverResult } from './resolver.js';
import { parseSource, getStringValue } from '../analyzers/utils/ast-helpers.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse: any = (_traverse as any).default ?? _traverse;

/**
 * Parse MCP server source files to extract tool, resource, and prompt definitions.
 * Uses @babel/parser for AST generation and @babel/traverse for walking.
 */
export async function parseMCPServer(resolved: ResolverResult): Promise<MCPServer> {
    const sourceFiles: SourceFile[] = [];
    const tools: MCPTool[] = [];
    const resources: MCPResource[] = [];
    const prompts: MCPPrompt[] = [];

    for (const filePath of resolved.sourceFiles) {
        let content: string;
        try {
            content = await readFile(filePath, 'utf-8');
        } catch {
            continue; // Skip unreadable files
        }

        const ast = parseSource(content);
        const relativePath = relative(resolved.root, filePath);

        sourceFiles.push({
            path: filePath,
            relativePath,
            content,
            ast: ast ?? undefined,
        });

        if (!ast) continue;

        // Walk AST looking for MCP SDK patterns
        try {
            traverse(ast, {
                CallExpression(path: { node: { callee: any; arguments: any[]; loc?: { start: { line: number } } } }) {
                    const { node } = path;

                    // Match: server.tool(name, description, schema, handler)
                    // or: server.tool(name, description, handler)
                    if (
                        node.callee.type === 'MemberExpression' &&
                        node.callee.property.type === 'Identifier'
                    ) {
                        const methodName = node.callee.property.name;
                        const args = node.arguments;
                        const line = node.loc?.start.line ?? 0;

                        if (methodName === 'tool' && args.length >= 2) {
                            const name = getStringValue(args[0]);
                            const description = getStringValue(args[1]);

                            if (name) {
                                tools.push({
                                    name,
                                    description: description ?? '',
                                    inputSchema: args.length >= 3 && args[2].type === 'ObjectExpression'
                                        ? {} // Simplified — extract schema shape later
                                        : undefined,
                                    handlerFile: filePath,
                                    handlerLine: line,
                                });
                            }
                        }

                        if (methodName === 'resource' && args.length >= 2) {
                            const name = getStringValue(args[0]);
                            const description = args.length >= 3 ? getStringValue(args[1]) : null;

                            if (name) {
                                resources.push({
                                    name,
                                    description: description ?? '',
                                    uri: name,
                                    handlerFile: filePath,
                                    handlerLine: line,
                                });
                            }
                        }

                        if (methodName === 'prompt' && args.length >= 2) {
                            const name = getStringValue(args[0]);
                            const description = getStringValue(args[1]);

                            if (name) {
                                prompts.push({
                                    name,
                                    description: description ?? '',
                                    handlerFile: filePath,
                                    handlerLine: line,
                                });
                            }
                        }
                    }

                    // Match: addTool({ name: ..., description: ..., handler: ... })
                    // Alternative pattern sometimes used
                    if (
                        node.callee.type === 'MemberExpression' &&
                        node.callee.property.type === 'Identifier' &&
                        node.callee.property.name === 'addTool' &&
                        node.arguments.length >= 1 &&
                        node.arguments[0].type === 'ObjectExpression'
                    ) {
                        const obj = node.arguments[0];
                        let name: string | null = null;
                        let description = '';

                        for (const prop of obj.properties) {
                            if (prop.type !== 'ObjectProperty' || prop.key.type !== 'Identifier') continue;

                            if (prop.key.name === 'name') {
                                name = getStringValue(prop.value);
                            }
                            if (prop.key.name === 'description') {
                                description = getStringValue(prop.value) ?? '';
                            }
                        }

                        if (name) {
                            tools.push({
                                name,
                                description,
                                handlerFile: filePath,
                                handlerLine: node.loc?.start.line ?? 0,
                            });
                        }
                    }
                },
            });
        } catch {
            // AST traversal failed — skip this file
        }
    }

    const packageManager = resolved.packageJson ? 'npm' as const : 'unknown' as const;

    return {
        root: resolved.root,
        tools,
        resources,
        prompts,
        sourceFiles,
        packageJson: resolved.packageJson,
        packageManager,
    };
}
