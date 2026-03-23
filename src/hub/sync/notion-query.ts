import type { NotionTools } from '../client/notion-tools.js';
import type { HubDatabaseIds, ScanRequestEntry, OverdueServerEntry } from '../types/hub.js';
import { extractScanRequest } from '../mappers/scan-request.js';

export interface HubStatusSummary {
    connected: boolean;
    servers: {
        total: number;
        pass: number;
        warn: number;
        fail: number;
    };
    pendingRequests: number;
    recentScans: Array<{
        target: string;
        score: number;
        status: string;
        scannedAt: string;
    }>;
    overdueReviews: number;
    upcomingReviews: number;
    openEscalations: number;
}

export async function getHubStatus(
    notionTools: NotionTools,
    databases: HubDatabaseIds,
): Promise<HubStatusSummary> {
    // Query server registry
    const allServers = await notionTools.queryDatabase(databases.serverRegistry);

    let pass = 0;
    let warn = 0;
    let fail = 0;
    let overdueReviews = 0;
    let upcomingReviews = 0;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const server of allServers) {
        const props = server.properties as Record<string, Record<string, unknown>>;
        const statusProp = props.Status?.select as { name?: string } | undefined;
        const status = statusProp?.name;

        if (status === 'pass') pass++;
        else if (status === 'warn') warn++;
        else if (status === 'fail') fail++;

        const nextReviewProp = props['Next Review Due']?.date as { start?: string } | undefined;
        if (nextReviewProp?.start) {
            const reviewDate = new Date(nextReviewProp.start);
            if (reviewDate < now) {
                overdueReviews++;
            } else if (reviewDate <= sevenDaysFromNow) {
                upcomingReviews++;
            }
        }
    }

    // Query open escalations
    let openEscalations = 0;
    if (databases.escalations) {
        const escalations = await notionTools.queryDatabase(databases.escalations, {
            property: 'Status',
            select: { equals: 'open' },
        });
        openEscalations = escalations.length;
    }

    // Query pending requests
    const pendingRequests = await notionTools.queryDatabase(databases.scanRequests, {
        property: 'Status',
        select: { equals: 'requested' },
    });

    // Query recent scans
    const recentScans = await notionTools.queryDatabase(databases.scanHistory, undefined, [
        { property: 'Scanned At', direction: 'descending' },
    ]);

    const recentScanEntries = recentScans.slice(0, 5).map((scan) => {
        const props = scan.properties as Record<string, Record<string, unknown>>;
        const scanIdProp = props['Scan ID']?.title as Array<{ plain_text?: string }> | undefined;
        const scoreProp = props.Score?.number as number | undefined;
        const statusProp = props.Status?.select as { name?: string } | undefined;
        const scannedAtProp = props['Scanned At']?.date as { start?: string } | undefined;

        return {
            target: scanIdProp?.[0]?.plain_text ?? 'unknown',
            score: scoreProp ?? 0,
            status: statusProp?.name ?? 'unknown',
            scannedAt: scannedAtProp?.start ?? 'unknown',
        };
    });

    return {
        connected: true,
        servers: {
            total: allServers.length,
            pass,
            warn,
            fail,
        },
        pendingRequests: pendingRequests.length,
        recentScans: recentScanEntries,
        overdueReviews,
        upcomingReviews,
        openEscalations,
    };
}

export async function getPendingScanRequests(
    notionTools: NotionTools,
    scanRequestsDbId: string,
): Promise<ScanRequestEntry[]> {
    const pages = await notionTools.queryDatabase(scanRequestsDbId, {
        property: 'Status',
        select: { equals: 'requested' },
    });

    return pages.map(extractScanRequest);
}

export async function getOverdueServers(
    notionTools: NotionTools,
    serverRegistryDbId: string,
): Promise<OverdueServerEntry[]> {
    const allServers = await notionTools.queryDatabase(serverRegistryDbId);
    const now = new Date();
    const overdue: OverdueServerEntry[] = [];

    for (const server of allServers) {
        const props = server.properties as Record<string, Record<string, unknown>>;

        const cadenceProp = props['Review Cadence']?.select as { name?: string } | undefined;
        const cadence = cadenceProp?.name;
        if (!cadence) continue;

        const nextReviewProp = props['Next Review Due']?.date as { start?: string } | undefined;
        if (!nextReviewProp?.start) {
            const nameProp = props.Name?.title as Array<{ plain_text?: string }> | undefined;
            const name = nameProp?.[0]?.plain_text ?? 'unknown';
            process.stdout.write(
                `[${now.toLocaleTimeString()}] WARNING: ${name} has cadence "${cadence}" but no Next Review Due date. Skipping.\n`,
            );
            continue;
        }

        const reviewDate = new Date(nextReviewProp.start);
        if (reviewDate > now) continue;

        const nameProp = props.Name?.title as Array<{ plain_text?: string }> | undefined;
        const scoreProp = props['Latest Score']?.number as number | undefined;
        const statusProp = props.Status?.select as { name?: string } | undefined;

        overdue.push({
            pageId: server.id,
            target: nameProp?.[0]?.plain_text ?? 'unknown',
            reviewCadence: cadence as 'weekly' | 'monthly' | 'quarterly',
            nextReviewDue: nextReviewProp.start,
            latestScore: scoreProp ?? 0,
            latestStatus: statusProp?.name ?? 'unknown',
        });
    }

    return overdue;
}
