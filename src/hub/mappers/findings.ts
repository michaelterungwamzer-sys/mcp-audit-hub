import type { Finding } from '../../types/index.js';

export function mapToFindingProperties(
    finding: Finding,
    serverPageId: string,
    scanPageId: string,
): Record<string, unknown> {
    const properties: Record<string, unknown> = {
        Title: {
            title: [{ text: { content: truncate(finding.title, 100) } }],
        },
        'Server Name': {
            rich_text: [{ text: { content: serverPageId } }],
        },
        'Scan ID': {
            rich_text: [{ text: { content: scanPageId } }],
        },
        Analyzer: {
            select: { name: finding.analyzer },
        },
        Severity: {
            select: { name: finding.severity },
        },
        'Remediation Status': {
            select: { name: 'open' },
        },
        Description: {
            rich_text: [{ text: { content: truncate(finding.description ?? '', 2000) } }],
        },
    };

    if (finding.file) {
        properties.File = {
            rich_text: [{ text: { content: finding.file } }],
        };
    }

    if (finding.line !== undefined) {
        properties.Line = {
            number: finding.line,
        };
    }

    if (finding.code) {
        properties.Evidence = {
            rich_text: [{ text: { content: truncate(finding.code, 2000) } }],
        };
    }

    return properties;
}

function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
        return str;
    }
    return str.slice(0, maxLength - 3) + '...';
}
