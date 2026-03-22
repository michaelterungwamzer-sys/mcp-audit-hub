import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../../config/index.js';
import { scan } from '../../scanner/index.js';
import { MCPClientManager } from '../../hub/client/mcp-client.js';
import { NotionTools } from '../../hub/client/notion-tools.js';
import { initNotionWorkspace } from '../../hub/sync/notion-init.js';
import { syncToNotion } from '../../hub/sync/notion-sync.js';
import { getHubStatus } from '../../hub/sync/notion-query.js';
import { startWatchLoop } from '../../hub/watch/watch-loop.js';
import { createConsoleFormatter } from '../output/console.js';
import { createSpinner } from '../utils/spinner.js';
import type { HubConfig, MCPServerConfig } from '../../hub/types/hub.js';

const DEFAULT_MCP_SERVER_CONFIG: MCPServerConfig = {
    command: 'npx',
    args: ['-y', '@suekou/mcp-notion-server'],
    env: {
        NOTION_API_TOKEN: '${NOTION_TOKEN}',
    },
};

async function loadHubConfig(): Promise<HubConfig | null> {
    const configPath = join(process.cwd(), 'mcp-audit.config.json');
    try {
        const raw = await readFile(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return parsed.hub ?? null;
    } catch {
        return null;
    }
}

async function saveHubConfig(hubConfig: Partial<HubConfig>): Promise<void> {
    const configPath = join(process.cwd(), 'mcp-audit.config.json');
    let existing: Record<string, unknown> = {};

    try {
        const raw = await readFile(configPath, 'utf-8');
        existing = JSON.parse(raw);
    } catch {
        // No existing config
    }

    existing.hub = { ...((existing.hub as Record<string, unknown>) ?? {}), ...hubConfig };
    await writeFile(configPath, JSON.stringify(existing, null, 4), 'utf-8');
}

async function createNotionClient(mcpServerConfig?: MCPServerConfig): Promise<{
    client: MCPClientManager;
    tools: NotionTools;
}> {
    const config = mcpServerConfig ?? DEFAULT_MCP_SERVER_CONFIG;
    const client = new MCPClientManager();
    await client.connect(config);
    return { client, tools: new NotionTools(client) };
}

function createHubInitCommand(): Command {
    const cmd = new Command('init');

    cmd
        .description('Provision Notion workspace with Hub databases')
        .requiredOption('--page <id>', 'Notion parent page ID')
        .action(async (options: { page: string }) => {
            const isTTY = process.stdout.isTTY ?? false;
            const spinner = createSpinner('Connecting to Notion MCP...', isTTY);

            try {
                spinner.start();
                const { client, tools } = await createNotionClient();
                spinner.succeed('Connected to Notion via MCP');

                spinner.update('Creating databases...');
                spinner.start();
                const databases = await initNotionWorkspace(tools, options.page);
                spinner.succeed('Databases created');

                await saveHubConfig({
                    notionParentPageId: options.page,
                    databases,
                    mcpServer: DEFAULT_MCP_SERVER_CONFIG,
                    watch: { intervalSeconds: 30 },
                });

                console.log('');
                console.log('  ✔ Created database: MCP Server Registry');
                console.log('  ✔ Created database: Scan History');
                console.log('  ✔ Created database: Findings');
                console.log('  ✔ Created database: Scan Requests');
                console.log('  ✔ Saved database IDs to mcp-audit.config.json');
                console.log('');
                console.log('  Hub is ready. Run `mcp-audit hub sync <target>` to scan and sync.');

                await client.disconnect();
            } catch (error) {
                spinner.fail('Failed');
                const message = error instanceof Error ? error.message : String(error);
                console.error(`\nError: ${message}`);
                console.error('\nTroubleshooting:');
                console.error('  1. Ensure NOTION_TOKEN env var is set');
                console.error('  2. Ensure the parent page is shared with your Notion integration');
                console.error('  3. Ensure @notionhq/notion-mcp-server is accessible via npx');
                process.exit(1);
            }
        });

    return cmd;
}

function createHubSyncCommand(): Command {
    const cmd = new Command('sync');

    cmd
        .description('Scan an MCP server and push results to Notion')
        .argument('<target>', 'npm package name or local directory path')
        .action(async (target: string) => {
            const hubConfig = await loadHubConfig();
            if (!hubConfig?.databases) {
                console.error('Error: Hub not configured. Run `mcp-audit hub init --page <id>` first.');
                process.exit(1);
            }

            const isTTY = process.stdout.isTTY ?? false;
            const auditConfig = await loadConfig({});

            // Step 1: Run scan and display results
            const spinner = createSpinner('Scanning...', isTTY);
            spinner.start();
            const scanResult = await scan(target, auditConfig);
            spinner.stop();

            const formatter = createConsoleFormatter(auditConfig.output.colors);
            console.log(formatter.format(scanResult));

            // Step 2: Sync to Notion
            const syncSpinner = createSpinner('Syncing to Notion...', isTTY);
            try {
                syncSpinner.start();
                const { client, tools } = await createNotionClient(hubConfig.mcpServer);
                const result = await syncToNotion(tools, hubConfig.databases, scanResult, target);
                syncSpinner.succeed('Synced to Notion');

                console.log(`  ✔ Server Registry updated`);
                console.log(`  ✔ Scan History recorded`);
                console.log(`  ✔ ${scanResult.findings.length} findings created`);
                if (result.notionUrl) {
                    console.log(`\n  View in Notion: ${result.notionUrl}`);
                }

                await client.disconnect();
            } catch (error) {
                syncSpinner.fail('Notion sync failed');
                const message = error instanceof Error ? error.message : String(error);
                console.error(`  Warning: ${message}`);
                console.error('  Scan results displayed above are still valid.');
            }
        });

    return cmd;
}

function createHubSyncAllCommand(): Command {
    const cmd = new Command('sync-all');

    cmd
        .description('Scan all servers in a dataset file and push results to Notion')
        .requiredOption('--dataset <file>', 'JSON file with server targets')
        .action(async (options: { dataset: string }) => {
            const hubConfig = await loadHubConfig();
            if (!hubConfig?.databases) {
                console.error('Error: Hub not configured. Run `mcp-audit hub init --page <id>` first.');
                process.exit(1);
            }

            // Load dataset
            let targets: string[];
            try {
                const raw = await readFile(options.dataset, 'utf-8');
                const parsed = JSON.parse(raw);

                if (Array.isArray(parsed)) {
                    targets = parsed.map((entry) => {
                        if (typeof entry === 'string') return entry;
                        if (typeof entry === 'object' && entry !== null && 'target' in entry) {
                            return String(entry.target);
                        }
                        if (typeof entry === 'object' && entry !== null && 'name' in entry) {
                            return String(entry.name);
                        }
                        throw new Error(`Invalid entry: ${JSON.stringify(entry)}`);
                    });
                } else {
                    throw new Error('Dataset must be a JSON array');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`Error loading dataset: ${message}`);
                process.exit(1);
            }

            console.log(`  Scanning ${targets.length} servers...\n`);

            const auditConfig = await loadConfig({});
            const { client, tools } = await createNotionClient(hubConfig.mcpServer);

            let passCount = 0;
            let warnCount = 0;
            let failCount = 0;
            let errorCount = 0;

            for (const target of targets) {
                try {
                    const scanResult = await scan(target, auditConfig);
                    await syncToNotion(tools, hubConfig.databases, scanResult, target);

                    const score = scanResult.summary.score;
                    const status = scanResult.summary.status.toUpperCase();
                    const icon = status === 'PASS' ? '✔' : status === 'WARN' ? '⚠' : '✗';
                    console.log(`  ${icon}  ${target.padEnd(45)} ${score}/100 ${status}`);

                    if (scanResult.summary.status === 'pass') passCount++;
                    else if (scanResult.summary.status === 'warn') warnCount++;
                    else failCount++;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    console.log(`  ✗  ${target.padEnd(45)} ERROR: ${message}`);
                    errorCount++;
                }
            }

            console.log(`\n  ✔ Synced ${targets.length - errorCount} servers to Notion`);
            console.log(`  Summary: ${passCount} PASS | ${warnCount} WARN | ${failCount} FAIL | ${errorCount} ERROR`);

            await client.disconnect();
        });

    return cmd;
}

function createHubWatchCommand(): Command {
    const cmd = new Command('watch');

    cmd
        .description('Watch Notion for scan requests and process them')
        .option('--interval <seconds>', 'poll interval in seconds', '30')
        .action(async (options: { interval: string }) => {
            const hubConfig = await loadHubConfig();
            if (!hubConfig?.databases) {
                console.error('Error: Hub not configured. Run `mcp-audit hub init --page <id>` first.');
                process.exit(1);
            }

            const intervalSeconds = parseInt(options.interval, 10);
            if (isNaN(intervalSeconds) || intervalSeconds < 5) {
                console.error('Error: Interval must be a number >= 5 seconds.');
                process.exit(1);
            }

            const auditConfig = await loadConfig({});

            console.log(`⠋ Watching Notion for scan requests (every ${intervalSeconds}s)...\n`);

            const { client, tools } = await createNotionClient(hubConfig.mcpServer);
            const abortController = new AbortController();

            // Graceful shutdown
            const shutdown = async () => {
                console.log('\nShutting down...');
                abortController.abort();
                await client.disconnect();
                process.exit(0);
            };

            process.on('SIGINT', shutdown);
            process.on('SIGTERM', shutdown);

            await startWatchLoop(
                tools,
                hubConfig.databases,
                auditConfig,
                {
                    intervalSeconds,
                    signal: abortController.signal,
                },
            );
        });

    return cmd;
}

function createHubStatusCommand(): Command {
    const cmd = new Command('status');

    cmd
        .description('Show Hub workspace summary')
        .option('--json', 'output as JSON')
        .action(async (options: { json?: boolean }) => {
            const hubConfig = await loadHubConfig();
            if (!hubConfig?.databases) {
                console.error('Error: Hub not configured. Run `mcp-audit hub init --page <id>` first.');
                process.exit(1);
            }

            try {
                const { client, tools } = await createNotionClient(hubConfig.mcpServer);
                const status = await getHubStatus(tools, hubConfig.databases);

                if (options.json) {
                    console.log(JSON.stringify(status, null, 2));
                } else {
                    console.log('  MCP Audit Hub Status');
                    console.log('  ────────────────────────────────');
                    console.log(`  Workspace connected ✔\n`);
                    console.log(`  Server Registry:  ${status.servers.total} servers`);
                    console.log(`    ${status.servers.pass} PASS  |  ${status.servers.warn} WARN  |  ${status.servers.fail} FAIL\n`);
                    console.log(`  Pending Requests:  ${status.pendingRequests}`);

                    if (status.overdueReviews > 0) {
                        console.log(`  Overdue Reviews:   ${status.overdueReviews} ⚠`);
                    }

                    if (status.recentScans.length > 0) {
                        console.log(`\n  Last ${status.recentScans.length} Scans:`);
                        for (const entry of status.recentScans) {
                            const date = entry.scannedAt.split('T')[0] ?? entry.scannedAt;
                            console.log(`    ${entry.target.padEnd(40)} ${entry.score}/100 ${entry.status.toUpperCase().padEnd(6)} ${date}`);
                        }
                    }
                }

                await client.disconnect();
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (options.json) {
                    console.log(JSON.stringify({ connected: false, error: message }, null, 2));
                } else {
                    console.log('  MCP Audit Hub Status');
                    console.log('  ────────────────────────────────');
                    console.log(`  Workspace DISCONNECTED ✗`);
                    console.log(`  Error: ${message}`);
                }
                process.exit(1);
            }
        });

    return cmd;
}

export function createHubCommand(): Command {
    const hub = new Command('hub');

    hub.description('Notion Hub — sync scan results and process scan requests');

    hub.addCommand(createHubInitCommand());
    hub.addCommand(createHubSyncCommand());
    hub.addCommand(createHubSyncAllCommand());
    hub.addCommand(createHubWatchCommand());
    hub.addCommand(createHubStatusCommand());

    return hub;
}
