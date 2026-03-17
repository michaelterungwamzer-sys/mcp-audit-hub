import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_CONFIG } from '../../config/defaults.js';

export function createInitCommand(): Command {
    const cmd = new Command('init');

    cmd
        .description('Generate a default mcp-audit.config.json')
        .action(async () => {
            const configPath = join(process.cwd(), 'mcp-audit.config.json');

            try {
                const content = JSON.stringify(DEFAULT_CONFIG, null, 4);
                await writeFile(configPath, content, 'utf-8');
                console.log(`Created ${configPath}`);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`Error creating config: ${message}`);
                process.exitCode = 2;
            }
        });

    return cmd;
}
