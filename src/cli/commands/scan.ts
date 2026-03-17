import { Command } from 'commander';
import { loadConfig } from '../../config/index.js';
import { scan } from '../../scanner/index.js';
import { createConsoleFormatter } from '../output/console.js';
import { createJsonFormatter } from '../output/json.js';
import { createSpinner } from '../utils/spinner.js';

export function createScanCommand(): Command {
    const cmd = new Command('scan');

    cmd
        .description('Scan an MCP server for security vulnerabilities')
        .argument('<target>', 'npm package name or local directory path')
        .option('--checks <analyzers>', 'comma-separated list of analyzers to run')
        .option('--output <format>', 'output format: console, json', 'console')
        .option('--report <path>', 'write output to file')
        .option('--no-color', 'disable coloured output')
        .option('--verbose', 'show detailed output')
        .option('--config <path>', 'path to config file')
        .action(async (target: string, options: Record<string, unknown>) => {
            try {
                const config = await loadConfig(options);

                if (typeof options.checks === 'string') {
                    const enabledChecks = (options.checks as string).split(',').map(c => c.trim());
                    for (const key of Object.keys(config.checks)) {
                        const checkKey = key as keyof typeof config.checks;
                        config.checks[checkKey] = {
                            ...config.checks[checkKey],
                            enabled: enabledChecks.includes(key),
                        };
                    }
                }

                const isTTY = process.stdout.isTTY ?? false;
                const spinner = createSpinner('Scanning...', isTTY && config.output.colors);

                spinner.start();
                const result = await scan(target, config);
                spinner.stop();

                const formatter = config.output.format === 'json'
                    ? createJsonFormatter()
                    : createConsoleFormatter(config.output.colors);

                const output = formatter.format(result);

                if (typeof options.report === 'string') {
                    const { writeFile } = await import('node:fs/promises');
                    await writeFile(options.report, output, 'utf-8');
                } else {
                    console.log(output);
                }

                process.exitCode = result.summary.status === 'pass' ? 0 : 1;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`Error: ${message}`);
                process.exitCode = 2;
            }
        });

    return cmd;
}
