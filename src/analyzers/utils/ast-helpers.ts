import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { Node, CallExpression, StringLiteral, TemplateLiteral } from '@babel/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse: any = (_traverse as any).default ?? _traverse;

export type ParsedAST = ReturnType<typeof parse>;

export interface CallInfo {
    name: string;
    node: CallExpression;
    file: string;
    line: number;
    arguments: Node[];
}

export interface ImportInfo {
    source: string;
    specifiers: string[];
    file: string;
    line: number;
}

export function parseSource(code: string): ReturnType<typeof parse> | null {
    try {
        return parse(code, {
            sourceType: 'module',
            plugins: [
                'typescript',
                'jsx',
                'decorators-legacy',
                'classProperties',
                'optionalChaining',
                'nullishCoalescingOperator',
                'dynamicImport',
                'topLevelAwait',
            ],
            errorRecovery: true,
        });
    } catch {
        return null;
    }
}

export function getStringValue(node: Node): string | null {
    if (node.type === 'StringLiteral') {
        return (node as StringLiteral).value;
    }
    if (node.type === 'TemplateLiteral') {
        const tl = node as TemplateLiteral;
        if (tl.expressions.length === 0 && tl.quasis.length === 1) {
            return tl.quasis[0].value.cooked ?? tl.quasis[0].value.raw;
        }
    }
    return null;
}

export function hasTemplateExpressions(node: Node): boolean {
    return node.type === 'TemplateLiteral' && (node as TemplateLiteral).expressions.length > 0;
}

export function findCallExpressions(
    ast: ReturnType<typeof parse>,
    functionNames: string[],
    filePath: string,
): CallInfo[] {
    const results: CallInfo[] = [];
    const nameSet = new Set(functionNames);

    traverse(ast, {
        CallExpression(path: { node: CallExpression }) {
            const { node } = path;
            let name: string | null = null;

            // Direct call: exec(...)
            if (node.callee.type === 'Identifier' && nameSet.has(node.callee.name)) {
                name = node.callee.name;
            }

            // Member call: child_process.exec(...) or db.query(...)
            if (
                node.callee.type === 'MemberExpression' &&
                node.callee.property.type === 'Identifier'
            ) {
                const methodName = node.callee.property.name;
                if (nameSet.has(methodName)) {
                    name = methodName;
                }

                // Also check object.method pattern
                if (node.callee.object.type === 'Identifier') {
                    const fullName = `${node.callee.object.name}.${methodName}`;
                    if (nameSet.has(fullName)) {
                        name = fullName;
                    }
                }
            }

            if (name) {
                results.push({
                    name,
                    node,
                    file: filePath,
                    line: node.loc?.start.line ?? 0,
                    arguments: [...node.arguments],
                });
            }
        },
    });

    return results;
}

export function findImports(
    ast: ReturnType<typeof parse>,
    moduleNames: string[],
    filePath: string,
): ImportInfo[] {
    const results: ImportInfo[] = [];
    const nameSet = new Set(moduleNames);

    traverse(ast, {
        ImportDeclaration(path: { node: { source: { value: string }; specifiers: Array<{ type: string; local: { name: string } }>; loc?: { start: { line: number } } } }) {
            const source = path.node.source.value;
            if (nameSet.has(source)) {
                results.push({
                    source,
                    specifiers: path.node.specifiers.map((s: { type: string; local: { name: string } }) => {
                        if (s.type === 'ImportDefaultSpecifier') return s.local.name;
                        if (s.type === 'ImportNamespaceSpecifier') return `* as ${s.local.name}`;
                        return s.local.name;
                    }),
                    file: filePath,
                    line: path.node.loc?.start.line ?? 0,
                });
            }
        },
        CallExpression(path: { node: CallExpression }) {
            // require('module')
            const { node } = path;
            if (
                node.callee.type === 'Identifier' &&
                node.callee.name === 'require' &&
                node.arguments.length === 1 &&
                node.arguments[0].type === 'StringLiteral'
            ) {
                const source = (node.arguments[0] as StringLiteral).value;
                if (nameSet.has(source)) {
                    results.push({
                        source,
                        specifiers: [],
                        file: filePath,
                        line: node.loc?.start.line ?? 0,
                    });
                }
            }
        },
    });

    return results;
}

export function isUserControlledArgument(
    argNode: Node,
    ast: ReturnType<typeof parse>,
): boolean {
    // Check if the argument traces to a function parameter
    if (argNode.type === 'Identifier') {
        // Walk up to find containing function and check if this identifier is a parameter
        let found = false;

        traverse(ast, {
            'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(path: { node: { params: Node[] } }) {
                const params = path.node.params;
                for (const param of params) {
                    if (param.type === 'Identifier' && param.name === (argNode as { name: string }).name) {
                        found = true;
                    }
                    // Destructured params: { input } = args
                    if (param.type === 'ObjectPattern') {
                        for (const prop of param.properties) {
                            if (
                                prop.type === 'ObjectProperty' &&
                                prop.value.type === 'Identifier' &&
                                prop.value.name === (argNode as { name: string }).name
                            ) {
                                found = true;
                            }
                        }
                    }
                }
            },
        });

        return found;
    }

    // Template literal with expressions — check each expression
    if (argNode.type === 'TemplateLiteral') {
        for (const expr of (argNode as TemplateLiteral).expressions) {
            if (isUserControlledArgument(expr, ast)) {
                return true;
            }
        }
    }

    // Binary expression (string concatenation): "prefix" + userInput
    if (argNode.type === 'BinaryExpression' && (argNode as { operator: string }).operator === '+') {
        const binExpr = argNode as { left: Node; right: Node };
        return (
            isUserControlledArgument(binExpr.left, ast) ||
            isUserControlledArgument(binExpr.right, ast)
        );
    }

    // Member expression: process.env.X → not user controlled but sensitive
    if (
        argNode.type === 'MemberExpression' &&
        (argNode as { object: Node }).object.type === 'MemberExpression'
    ) {
        const inner = (argNode as { object: { object: Node } }).object.object;
        if (inner.type === 'Identifier' && (inner as { name: string }).name === 'process') {
            return false; // process.env is not user-controlled but handled separately
        }
    }

    return false;
}

export function containsProcessEnv(node: Node): boolean {
    let found = false;

    function walk(n: Node): void {
        if (
            n.type === 'MemberExpression' &&
            (n as { object: Node }).object.type === 'MemberExpression'
        ) {
            const inner = (n as { object: { object: Node; property: Node } }).object;
            if (
                inner.object.type === 'Identifier' &&
                (inner.object as { name: string }).name === 'process' &&
                inner.property.type === 'Identifier' &&
                (inner.property as { name: string }).name === 'env'
            ) {
                found = true;
                return;
            }
        }

        // Walk children
        for (const key of Object.keys(n)) {
            if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
            const val = (n as unknown as Record<string, unknown>)[key];
            if (val && typeof val === 'object' && 'type' in (val as Record<string, unknown>)) {
                walk(val as Node);
            }
            if (Array.isArray(val)) {
                for (const item of val) {
                    if (item && typeof item === 'object' && 'type' in item) {
                        walk(item as Node);
                    }
                }
            }
        }
    }

    walk(node);
    return found;
}

export function getAst(sourceFile: { content: string; ast?: unknown }): ParsedAST | null {
    if (sourceFile.ast) return sourceFile.ast as ParsedAST;
    return parseSource(sourceFile.content);
}

export function findStringInSource(content: string, patterns: string[]): boolean {
    const lower = content.toLowerCase();
    return patterns.some((p) => lower.includes(p.toLowerCase()));
}
