import chalk from 'chalk';
import Table from 'cli-table3';
import type { ScanResult, Finding, Severity, ScanStatus } from '../../types/index.js';
import type { OutputFormatter } from './formatter.js';

const SEVERITY_COLORS: Record<Severity, (text: string) => string> = {
    critical: chalk.red,
    high: chalk.yellow,
    medium: chalk.cyan,
    low: chalk.dim,
};

const STATUS_ICONS: Record<string, string> = {
    pass: chalk.green('✓'),
    warn: chalk.yellow('⚠'),
    fail: chalk.red('✗'),
    error: chalk.red('!'),
    skipped: chalk.dim('-'),
};

const SCORE_COLORS: Record<ScanStatus, (text: string) => string> = {
    pass: chalk.green,
    warn: chalk.yellow,
    fail: chalk.red,
};

function formatFinding(finding: Finding, useColor: boolean): string {
    const colorFn = useColor ? SEVERITY_COLORS[finding.severity] : (t: string) => t;
    const lines: string[] = [];

    lines.push(colorFn(`[${finding.id}] ${finding.title}`));

    if (finding.file) {
        const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
        lines.push(`  File: ${location}`);
    }

    if (finding.code) {
        lines.push(`  Code: ${finding.code}`);
    }

    lines.push(`  Fix:  ${finding.recommendation}`);

    return lines.join('\n');
}

class ConsoleFormatter implements OutputFormatter {
    constructor(private useColor: boolean) {}

    format(result: ScanResult): string {
        const lines: string[] = [];

        // Header
        lines.push('');
        lines.push(`  MCP-AUDIT v${result.meta.version}`);
        lines.push(`  Scanning: ${result.meta.target}`);
        lines.push('');

        // Summary table
        const table = new Table({
            head: ['Check', 'Status', 'Findings'],
            style: { head: this.useColor ? ['cyan'] : [] },
        });

        for (const [id, info] of Object.entries(result.analyzers)) {
            if (info.status === 'skipped') continue;

            const statusIcon = STATUS_ICONS[info.status] ?? info.status;
            table.push([id, statusIcon, info.findings.toString()]);
        }

        if (table.length > 0) {
            lines.push(table.toString());
            lines.push('');
        }

        // Findings by severity
        if (result.findings.length === 0) {
            const msg = this.useColor
                ? chalk.green('✓ No security issues found')
                : '✓ No security issues found';
            lines.push(msg);
        } else {
            for (const severity of ['critical', 'high', 'medium', 'low'] as Severity[]) {
                const severityFindings = result.findings.filter((f) => f.severity === severity);
                if (severityFindings.length === 0) continue;

                const colorFn = this.useColor ? SEVERITY_COLORS[severity] : (t: string) => t;
                lines.push(colorFn(`${severity.toUpperCase()} (${severityFindings.length})`));
                lines.push('─'.repeat(60));

                for (const finding of severityFindings) {
                    lines.push(formatFinding(finding, this.useColor));
                    lines.push('');
                }
            }
        }

        // Suppressed findings
        if (result.summary.suppressed > 0) {
            lines.push(
                chalk.dim(`${result.summary.suppressed} finding(s) suppressed by allowlist`),
            );
            lines.push('');
        }

        // Score line
        const status = result.summary.status.toUpperCase();
        const scoreLine = `Score: ${result.summary.score}/100 (${status})`;
        const scoreColorFn = this.useColor
            ? SCORE_COLORS[result.summary.status]
            : (t: string) => t;
        lines.push(scoreColorFn(scoreLine));
        lines.push('');

        return lines.join('\n');
    }
}

export function createConsoleFormatter(useColor = true): OutputFormatter {
    return new ConsoleFormatter(useColor);
}
