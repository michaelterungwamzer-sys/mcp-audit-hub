import type { ScanResult } from '../../types/index.js';
import type { NotionTools } from '../client/notion-tools.js';
import type { HubDatabaseIds, SyncResult } from '../types/hub.js';
import {
    mapToNewRegistryProperties,
    mapToUpdateRegistryProperties,
} from '../mappers/server-registry.js';
import { mapToHistoryProperties } from '../mappers/scan-history.js';
import { mapToFindingProperties } from '../mappers/findings.js';

export async function syncToNotion(
    notionTools: NotionTools,
    databases: HubDatabaseIds,
    scanResult: ScanResult,
    target: string,
): Promise<SyncResult> {
    // Step 1: Upsert Server Registry
    const serverPageId = await upsertServerRegistry(
        notionTools,
        databases.serverRegistry,
        scanResult,
        target,
    );

    // Step 2: Create Scan History entry
    const historyProperties = mapToHistoryProperties(scanResult, target, serverPageId);
    const historyPage = await notionTools.createPage(
        databases.scanHistory,
        historyProperties,
    );

    // Step 3: Create Finding entries
    const findingPageIds: string[] = [];
    const scanId = (historyProperties['Scan ID'] as { title: Array<{ text: { content: string } }> }).title[0].text.content;
    for (const finding of scanResult.findings) {
        const findingProperties = mapToFindingProperties(
            finding,
            target,
            scanId,
        );
        const findingPage = await notionTools.createPage(
            databases.findings,
            findingProperties,
        );
        findingPageIds.push(findingPage.id);
    }

    return {
        serverPageId,
        scanHistoryPageId: historyPage.id,
        findingPageIds,
        notionUrl: historyPage.url,
    };
}

async function upsertServerRegistry(
    notionTools: NotionTools,
    registryDbId: string,
    scanResult: ScanResult,
    target: string,
): Promise<string> {
    // Query for existing server by name
    const existing = await notionTools.queryDatabase(registryDbId, {
        property: 'Name',
        title: { equals: target },
    });

    if (existing.length > 0) {
        // Update existing entry
        const existingPage = existing[0];
        const scanCountProp = existingPage.properties as Record<string, Record<string, unknown>>;
        const scanCount = (scanCountProp['Scan Count']?.number as number) ?? 0;

        const updateProperties = mapToUpdateRegistryProperties(scanResult, scanCount);
        await notionTools.updatePage(existingPage.id, updateProperties);
        return existingPage.id;
    }

    // Create new entry
    const newProperties = mapToNewRegistryProperties(scanResult, target);
    const newPage = await notionTools.createPage(registryDbId, newProperties);
    return newPage.id;
}
