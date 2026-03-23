/**
 * One-time script to add the Escalations database to an existing workspace.
 * Run: npx tsx scripts/add-escalations-db.ts
 */
import { MCPClientManager } from '../src/hub/client/mcp-client.js';
import { NotionTools } from '../src/hub/client/notion-tools.js';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ESCALATION_PROPERTIES = {
    Title: { title: {} },
    'Server Name': { rich_text: {} },
    'Previous Score': { number: { format: 'number' } },
    'New Score': { number: { format: 'number' } },
    Delta: { number: { format: 'number' } },
    Severity: {
        select: {
            options: [
                { name: 'critical', color: 'red' },
                { name: 'high', color: 'orange' },
                { name: 'medium', color: 'yellow' },
                { name: 'low', color: 'gray' },
            ],
        },
    },
    Trigger: {
        select: {
            options: [
                { name: 'score-regression', color: 'red' },
                { name: 'new-critical-finding', color: 'orange' },
                { name: 'status-downgrade', color: 'yellow' },
            ],
        },
    },
    Status: {
        select: {
            options: [
                { name: 'open', color: 'red' },
                { name: 'acknowledged', color: 'yellow' },
                { name: 'investigating', color: 'blue' },
                { name: 'resolved', color: 'green' },
            ],
        },
    },
    'Scan History ID': { rich_text: {} },
    'Created At': { date: {} },
    Notes: { rich_text: {} },
};

async function main() {
    const configPath = join(process.cwd(), 'mcp-audit.config.json');
    const raw = await readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);

    if (config.hub?.databases?.escalations) {
        console.log('Escalations database already configured:', config.hub.databases.escalations);
        return;
    }

    const parentPageId = config.hub?.notionParentPageId;
    if (!parentPageId) {
        console.error('No parent page ID found in config. Run hub init first.');
        process.exit(1);
    }

    const mcpConfig = config.hub.mcpServer;
    const client = new MCPClientManager();

    console.log('Connecting to Notion MCP...');
    await client.connect(mcpConfig);
    const tools = new NotionTools(client);

    console.log('Creating Escalations database...');
    const db = await tools.createDatabase(parentPageId, 'Escalations', ESCALATION_PROPERTIES);
    console.log('Created:', db.id);

    config.hub.databases.escalations = db.id;
    await writeFile(configPath, JSON.stringify(config, null, 4), 'utf-8');
    console.log('Saved to mcp-audit.config.json');

    await client.disconnect();
    console.log('Done.');
}

main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
