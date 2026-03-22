import { describe, it, expect } from 'vitest';
import {
    extractScanRequest,
    mapRequestScanning,
    mapRequestCompleted,
    mapRequestFailed,
} from '../../../../src/hub/mappers/scan-request.js';
import type { NotionPage } from '../../../../src/hub/types/hub.js';

describe('extractScanRequest', () => {
    it('extracts target and requester from Notion page', () => {
        const page: NotionPage = {
            id: 'page-123',
            properties: {
                Target: {
                    title: [{ plain_text: '@modelcontextprotocol/server-filesystem' }],
                },
                'Requested By': {
                    rich_text: [{ plain_text: 'Nora' }],
                },
                Notes: {
                    rich_text: [{ plain_text: 'Please check this server' }],
                },
            },
        };

        const request = extractScanRequest(page);

        expect(request.pageId).toBe('page-123');
        expect(request.target).toBe('@modelcontextprotocol/server-filesystem');
        expect(request.requestedBy).toBe('Nora');
        expect(request.notes).toBe('Please check this server');
    });

    it('handles missing optional fields', () => {
        const page: NotionPage = {
            id: 'page-456',
            properties: {
                Target: {
                    title: [{ plain_text: 'some-server' }],
                },
                'Requested By': {
                    rich_text: [],
                },
            },
        };

        const request = extractScanRequest(page);

        expect(request.target).toBe('some-server');
        expect(request.requestedBy).toBe('unknown');
        expect(request.notes).toBeUndefined();
    });
});

describe('mapRequestScanning', () => {
    it('returns scanning status properties', () => {
        const props = mapRequestScanning();
        expect(props.Status).toEqual({ select: { name: 'scanning' } });
    });
});

describe('mapRequestCompleted', () => {
    it('returns completed status with scan history ID', () => {
        const props = mapRequestCompleted('history-page-id');

        expect(props.Status).toEqual({ select: { name: 'completed' } });
        expect(props['Scan Result ID']).toEqual({ rich_text: [{ text: { content: 'history-page-id' } }] });
        expect(props['Completed At']).toBeDefined();
    });
});

describe('mapRequestFailed', () => {
    it('returns failed status with error message', () => {
        const props = mapRequestFailed('Package not found');

        expect(props.Status).toEqual({ select: { name: 'failed' } });
        expect(props.Error).toEqual({
            rich_text: [{ text: { content: 'Package not found' } }],
        });
        expect(props['Completed At']).toBeDefined();
    });

    it('truncates long error messages', () => {
        const longError = 'E'.repeat(3000);
        const props = mapRequestFailed(longError);
        const error = props.Error as { rich_text: Array<{ text: { content: string } }> };

        expect(error.rich_text[0].text.content.length).toBeLessThanOrEqual(2000);
    });
});
