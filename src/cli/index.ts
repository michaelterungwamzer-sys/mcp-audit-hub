import { Command } from 'commander';
import { createScanCommand } from './commands/scan.js';
import { createInitCommand } from './commands/init.js';
import { createChecksCommand } from './commands/checks.js';

const VERSION = '0.1.0';

export function createProgram(): Command {
    const program = new Command();

    program
        .name('mcp-audit')
        .description('CLI security scanner for MCP (Model Context Protocol) servers')
        .version(VERSION);

    program.addCommand(createScanCommand());
    program.addCommand(createInitCommand());
    program.addCommand(createChecksCommand());

    return program;
}

export async function run(argv: string[]): Promise<void> {
    const program = createProgram();
    await program.parseAsync(argv);
}
