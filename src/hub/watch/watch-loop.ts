import type { AuditConfig } from '../../types/index.js';
import type { NotionTools } from '../client/notion-tools.js';
import type { HubDatabaseIds, WatchLoopOptions } from '../types/hub.js';
import { scan } from '../../scanner/index.js';
import { syncToNotion } from '../sync/notion-sync.js';
import { getPendingScanRequests } from '../sync/notion-query.js';
import {
    mapRequestScanning,
    mapRequestCompleted,
    mapRequestFailed,
} from '../mappers/scan-request.js';

export async function startWatchLoop(
    notionTools: NotionTools,
    databases: HubDatabaseIds,
    auditConfig: AuditConfig,
    options: WatchLoopOptions,
): Promise<void> {
    const { intervalSeconds, onRequest, onComplete, onError, signal } = options;
    let pollCount = 0;

    while (!signal?.aborted) {
        try {
            const requests = await getPendingScanRequests(
                notionTools,
                databases.scanRequests,
            );

            if (requests.length === 0) {
                pollCount++;
                // Log alive message every 10 polls
                if (pollCount % 10 === 0) {
                    const timestamp = new Date().toLocaleTimeString();
                    process.stdout.write(`[${timestamp}] No new requests. Watching...\n`);
                }
            } else {
                pollCount = 0;
            }

            for (const request of requests) {
                if (signal?.aborted) break;

                const timestamp = new Date().toLocaleTimeString();
                onRequest?.(request.target, request.requestedBy);
                process.stdout.write(
                    `[${timestamp}] New request: ${request.target} (by ${request.requestedBy})\n`,
                );

                try {
                    // Set status → scanning
                    await notionTools.updatePage(request.pageId, mapRequestScanning());
                    process.stdout.write(`[${timestamp}] Status → scanning\n`);

                    // Run scan
                    const scanResult = await scan(request.target, auditConfig);

                    const score = scanResult.summary.score;
                    const status = scanResult.summary.status;
                    const findingCount = scanResult.findings.length;
                    process.stdout.write(
                        `[${timestamp}] Scan complete: ${score}/100 ${status.toUpperCase()} (${findingCount} findings)\n`,
                    );

                    // Sync to Notion
                    const syncResult = await syncToNotion(
                        notionTools,
                        databases,
                        scanResult,
                        request.target,
                    );
                    process.stdout.write(
                        `[${timestamp}] Synced to Notion: Registry + History + Findings\n`,
                    );

                    // Set status → completed
                    await notionTools.updatePage(
                        request.pageId,
                        mapRequestCompleted(syncResult.scanHistoryPageId),
                    );
                    process.stdout.write(`[${timestamp}] Status → completed ✔\n\n`);

                    onComplete?.(request.target, score, status);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    process.stdout.write(
                        `[${timestamp}] FAILED: ${request.target} — ${errorMessage}\n\n`,
                    );

                    // Set status → failed
                    try {
                        await notionTools.updatePage(
                            request.pageId,
                            mapRequestFailed(errorMessage),
                        );
                    } catch {
                        process.stdout.write(
                            `[${timestamp}] WARNING: Could not update request status to failed\n`,
                        );
                    }

                    onError?.(request.target, errorMessage);
                }
            }
        } catch (error) {
            const timestamp = new Date().toLocaleTimeString();
            const errorMessage = error instanceof Error ? error.message : String(error);
            process.stdout.write(
                `[${timestamp}] Poll error: ${errorMessage}\n`,
            );
        }

        // Wait for next poll cycle
        if (!signal?.aborted) {
            await sleep(intervalSeconds * 1000, signal);
        }
    }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve();
        }, { once: true });
    });
}
