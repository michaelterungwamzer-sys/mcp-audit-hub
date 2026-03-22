import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { MCPServerConfig } from '../types/hub.js';

export class MCPClientManager {
    private client: Client | null = null;
    private transport: StdioClientTransport | null = null;

    async connect(config: MCPServerConfig): Promise<void> {
        if (this.client) {
            return;
        }

        const env: Record<string, string> = { ...process.env as Record<string, string> };
        if (config.env) {
            for (const [key, value] of Object.entries(config.env)) {
                const resolved = value.replace(/\$\{(\w+)\}/g, (_, varName) => {
                    return process.env[varName] ?? '';
                });
                env[key] = resolved;
            }
        }

        this.transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env,
        });

        this.client = new Client(
            { name: 'mcp-audit-hub', version: '0.1.0' },
            { capabilities: {} },
        );

        await this.client.connect(this.transport);
    }

    async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
        if (!this.client) {
            throw new Error('MCP client not connected. Call connect() first.');
        }

        const result = await this.client.callTool({ name, arguments: args });

        if (result.isError) {
            const contentArray = Array.isArray(result.content) ? result.content : [];
            const errorText = contentArray
                .map((c) => (c as { type: string; text?: string }).type === 'text' ? (c as { text?: string }).text : '')
                .join('\n') || 'Unknown MCP tool error';
            throw new Error(`Notion MCP tool "${name}" failed: ${errorText}`);
        }

        const contentArray = Array.isArray(result.content) ? result.content : [];
        const textContent = contentArray
            .filter((c) => (c as { type: string }).type === 'text')
            .map((c) => (c as { text?: string }).text ?? '')
            .join('\n');

        if (textContent) {
            try {
                return JSON.parse(textContent);
            } catch {
                return textContent;
            }
        }

        return result.content;
    }

    async disconnect(): Promise<void> {
        if (this.transport) {
            await this.transport.close();
            this.transport = null;
        }
        this.client = null;
    }

    isConnected(): boolean {
        return this.client !== null;
    }
}
