import type { ScanRequestEntry, NotionPage } from '../types/hub.js';

export function extractScanRequest(page: NotionPage): ScanRequestEntry {
    const properties = page.properties as Record<string, Record<string, unknown>>;

    const targetProp = properties.Target as Record<string, unknown> | undefined;
    const titleArray = targetProp?.title as Array<{ plain_text?: string }> | undefined;
    const target = titleArray?.[0]?.plain_text ?? '';

    const requestedByProp = properties['Requested By'] as Record<string, unknown> | undefined;
    const richTextArray = requestedByProp?.rich_text as Array<{ plain_text?: string }> | undefined;
    const requestedBy = richTextArray?.[0]?.plain_text ?? 'unknown';

    const notesProp = properties.Notes as Record<string, unknown> | undefined;
    const notesArray = notesProp?.rich_text as Array<{ plain_text?: string }> | undefined;
    const notes = notesArray?.[0]?.plain_text;

    return {
        pageId: page.id,
        target,
        requestedBy,
        notes,
    };
}

export function mapRequestScanning(): Record<string, unknown> {
    return {
        Status: {
            select: { name: 'scanning' },
        },
    };
}

export function mapRequestCompleted(
    scanHistoryPageId: string,
): Record<string, unknown> {
    return {
        Status: {
            select: { name: 'completed' },
        },
        'Completed At': {
            date: { start: new Date().toISOString() },
        },
        'Scan Result ID': {
            rich_text: [{ text: { content: scanHistoryPageId } }],
        },
    };
}

export function mapRequestFailed(error: string): Record<string, unknown> {
    return {
        Status: {
            select: { name: 'failed' },
        },
        'Completed At': {
            date: { start: new Date().toISOString() },
        },
        Error: {
            rich_text: [{ text: { content: truncate(error, 2000) } }],
        },
    };
}

function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
        return str;
    }
    return str.slice(0, maxLength - 3) + '...';
}
