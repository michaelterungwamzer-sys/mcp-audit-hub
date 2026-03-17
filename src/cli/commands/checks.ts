import { Command } from 'commander';
import { getAnalyzerDescriptions } from '../../analyzers/index.js';

export function createChecksCommand(): Command {
    const cmd = new Command('checks');

    cmd
        .description('List available security checks')
        .option('--list', 'display all available analyzers')
        .action((options: Record<string, unknown>) => {
            if (options.list !== undefined) {
                const analyzers = getAnalyzerDescriptions();

                console.log('\nAvailable security checks:\n');

                for (const { id, name, description } of analyzers) {
                    console.log(`  ${id.padEnd(22)} ${name}`);
                    console.log(`  ${''.padEnd(22)} ${description}\n`);
                }

                console.log(`Total: ${analyzers.length} checks available`);
            } else {
                cmd.help();
            }
        });

    return cmd;
}
