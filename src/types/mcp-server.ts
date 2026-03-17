export interface MCPTool {
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    handlerFile: string;
    handlerLine: number;
}

export interface MCPResource {
    name: string;
    description: string;
    uri: string;
    handlerFile: string;
    handlerLine: number;
}

export interface MCPPrompt {
    name: string;
    description: string;
    handlerFile: string;
    handlerLine: number;
}

export interface SourceFile {
    path: string;
    relativePath: string;
    content: string;
    ast?: unknown;
}

export interface MCPServer {
    root: string;
    tools: MCPTool[];
    resources: MCPResource[];
    prompts: MCPPrompt[];
    sourceFiles: SourceFile[];
    packageJson?: Record<string, unknown>;
    packageManager: 'npm' | 'pip' | 'unknown';
}
