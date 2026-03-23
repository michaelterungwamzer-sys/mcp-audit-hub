import type { AuditConfig } from '../../types/index.js';
import type { NotionTools } from '../client/notion-tools.js';
import type { HubDatabaseIds, WatchLoopOptions, OverdueServerEntry } from '../types/hub.js';
import { scan } from '../../scanner/index.js';
import { syncToNotion } from '../sync/notion-sync.js';
import { getPendingScanRequests, getOverdueServers } from '../sync/notion-query.js';
import {
    mapRequestScanning,
    mapRequestCompleted,
    mapRequestFailed,
} from '../mappers/scan-request.js';
import { mapAdvanceReviewDate } from '../mappers/server-registry.js';
import { detectEscalationTriggers, mapToEscalationProperties } from '../mappers/escalation.js';

export async function startWatchLoop(
    notionTools: NotionTools,
    databases: HubDatabaseIds,
    auditConfig: AuditConfig,
    options: WatchLoopOptions,
): Promise<void> {
    const {
        intervalSeconds,
        escalationThreshold = 15,
        onRequest,
        onComplete,
        onError,
        onEscalation,
        signal,
    } = options;
    let pollCount = 0;

    while (!signal?.aborted) {
        try {
            // Track targets scanned this cycle (for deduplication)
            const scannedThisCycle = new Set<string>();

            // --- Phase 1: On-demand scan requests (higher priority) ---
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
                    // Set status -> scanning
                    await notionTools.updatePage(request.pageId, mapRequestScanning());
                    process.stdout.write(`[${timestamp}] Status -> scanning\n`);

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

                    // Set status -> completed
                    await notionTools.updatePage(
                        request.pageId,
                        mapRequestCompleted(syncResult.scanHistoryPageId),
                    );
                    process.stdout.write(`[${timestamp}] Status -> completed \u2714\n\n`);

                    scannedThisCycle.add(request.target);
                    onComplete?.(request.target, score, status);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    process.stdout.write(
                        `[${timestamp}] FAILED: ${request.target} -- ${errorMessage}\n\n`,
                    );

                    // Set status -> failed
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

            // --- Phase 2: Recurring scans (overdue servers) ---
            if (!signal?.aborted) {
                await processRecurringScans(
                    notionTools,
                    databases,
                    auditConfig,
                    escalationThreshold,
                    scannedThisCycle,
                    onComplete,
                    onError,
                    onEscalation,
                    signal,
                );
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

async function processRecurringScans(
    notionTools: NotionTools,
    databases: HubDatabaseIds,
    auditConfig: AuditConfig,
    escalationThreshold: number,
    scannedThisCycle: Set<string>,
    onComplete: WatchLoopOptions['onComplete'],
    onError: WatchLoopOptions['onError'],
    onEscalation: WatchLoopOptions['onEscalation'],
    signal?: AbortSignal,
): Promise<void> {
    let overdueServers: OverdueServerEntry[];
    try {
        overdueServers = await getOverdueServers(
            notionTools,
            databases.serverRegistry,
        );
    } catch (error) {
        const timestamp = new Date().toLocaleTimeString();
        const errorMessage = error instanceof Error ? error.message : String(error);
        process.stdout.write(
            `[${timestamp}] Recurring scan query error: ${errorMessage}\n`,
        );
        return;
    }

    if (overdueServers.length === 0) return;

    const timestamp = new Date().toLocaleTimeString();
    process.stdout.write(
        `[${timestamp}] Found ${overdueServers.length} overdue server(s) for recurring scan\n`,
    );

    for (const server of overdueServers) {
        if (signal?.aborted) break;

        // Skip if already scanned this cycle via on-demand request
        if (scannedThisCycle.has(server.target)) {
            process.stdout.write(
                `[${timestamp}] Skipping ${server.target}: already scanned this cycle\n`,
            );
            // Still advance the review date
            try {
                await notionTools.updatePage(
                    server.pageId,
                    mapAdvanceReviewDate(server.reviewCadence, server.nextReviewDue),
                );
            } catch { /* best effort */ }
            continue;
        }

        process.stdout.write(
            `[${timestamp}] Recurring scan: ${server.target} (cadence: ${server.reviewCadence}, due: ${server.nextReviewDue})\n`,
        );

        try {
            const scanResult = await scan(server.target, auditConfig);
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
                server.target,
            );
            process.stdout.write(
                `[${timestamp}] Synced to Notion: Registry + History + Findings\n`,
            );

            // Advance review date
            await notionTools.updatePage(
                server.pageId,
                mapAdvanceReviewDate(server.reviewCadence, server.nextReviewDue),
            );
            process.stdout.write(
                `[${timestamp}] Next Review Due advanced by ${server.reviewCadence} interval\n`,
            );

            // Check for escalation triggers
            if (databases.escalations) {
                const triggers = detectEscalationTriggers(
                    server,
                    scanResult,
                    escalationThreshold,
                );

                for (const trigger of triggers) {
                    try {
                        const escalationProps = mapToEscalationProperties(
                            server.target,
                            trigger,
                            syncResult.scanHistoryPageId,
                        );
                        const escalationPage = await notionTools.createPage(
                            databases.escalations,
                            escalationProps,
                        );
                        // Update Notes separately (some MCP servers drop rich_text on create)
                        if (escalationProps.Notes) {
                            try {
                                await notionTools.updatePage(escalationPage.id, {
                                    Notes: escalationProps.Notes,
                                });
                            } catch { /* best effort */ }
                        }
                        process.stdout.write(
                            `[${timestamp}] ESCALATION: ${trigger.type} for ${server.target} (${trigger.previousScore} -> ${trigger.newScore})\n`,
                        );
                        onEscalation?.(server.target, trigger.previousScore, trigger.newScore);
                    } catch (escError) {
                        const msg = escError instanceof Error ? escError.message : String(escError);
                        process.stdout.write(
                            `[${timestamp}] WARNING: Could not create escalation entry: ${msg}\n`,
                        );
                    }
                }
            }

            process.stdout.write(`[${timestamp}] Recurring scan complete \u2714\n\n`);
            onComplete?.(server.target, score, status);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            process.stdout.write(
                `[${timestamp}] FAILED recurring scan: ${server.target} -- ${errorMessage}\n`,
            );
            process.stdout.write(
                `[${timestamp}] Next Review Due NOT advanced (scan failed)\n\n`,
            );
            onError?.(server.target, errorMessage);
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
