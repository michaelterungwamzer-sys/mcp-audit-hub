import type { MCPClientManager } from './mcp-client.js';
import type { NotionPage, NotionDatabase } from '../types/hub.js';

/**
 * Typed wrappers for the @suekou/mcp-notion-server MCP tools.
 *
 * Tool name mapping:
 *   notion_create_database      — create a database under a page
 *   notion_create_database_item — create a page/row in a database
 *   notion_query_database       — query a database with filters/sorts
 *   notion_update_page_properties — update a page's properties
 *   notion_search               — search across workspace
 */
export class NotionTools {
    constructor(private client: MCPClientManager) {}

    async createDatabase(
        parentPageId: string,
        title: string,
        properties: Record<string, unknown>,
    ): Promise<NotionDatabase> {
        const result = await this.client.callTool('notion_create_database', {
            parent: { type: 'page_id', page_id: parentPageId },
            title: [{ type: 'text', text: { content: title } }],
            properties,
            format: 'json',
        }) as Record<string, unknown>;

        return {
            id: result.id as string,
            title,
            url: result.url as string | undefined,
        };
    }

    async createPage(
        databaseId: string,
        properties: Record<string, unknown>,
    ): Promise<NotionPage> {
        const result = await this.client.callTool('notion_create_database_item', {
            database_id: databaseId,
            properties,
            format: 'json',
        }) as Record<string, unknown>;

        return {
            id: result.id as string,
            properties: result.properties as Record<string, unknown> ?? {},
            url: result.url as string | undefined,
        };
    }

    async updatePage(
        pageId: string,
        properties: Record<string, unknown>,
    ): Promise<NotionPage> {
        const result = await this.client.callTool('notion_update_page_properties', {
            page_id: pageId,
            properties,
            format: 'json',
        }) as Record<string, unknown>;

        return {
            id: result.id as string,
            properties: result.properties as Record<string, unknown> ?? {},
            url: result.url as string | undefined,
        };
    }

    async queryDatabase(
        databaseId: string,
        filter?: Record<string, unknown>,
        sorts?: Array<Record<string, unknown>>,
    ): Promise<NotionPage[]> {
        const args: Record<string, unknown> = {
            database_id: databaseId,
            format: 'json',
        };
        if (filter) {
            args.filter = filter;
        }
        if (sorts) {
            args.sorts = sorts;
        }

        const result = await this.client.callTool('notion_query_database', args) as Record<string, unknown>;

        const results = result.results as Array<Record<string, unknown>> | undefined;
        if (!results) {
            return [];
        }

        return results.map((page) => ({
            id: page.id as string,
            properties: page.properties as Record<string, unknown> ?? {},
            url: page.url as string | undefined,
        }));
    }

    async search(query: string): Promise<NotionPage[]> {
        const result = await this.client.callTool('notion_search', {
            query,
            format: 'json',
        }) as Record<string, unknown>;

        const results = result.results as Array<Record<string, unknown>> | undefined;
        if (!results) {
            return [];
        }

        return results.map((page) => ({
            id: page.id as string,
            properties: page.properties as Record<string, unknown> ?? {},
            url: page.url as string | undefined,
        }));
    }
}
