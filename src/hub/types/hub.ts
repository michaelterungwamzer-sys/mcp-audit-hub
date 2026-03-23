export interface HubDatabaseIds {
    serverRegistry: string;
    scanHistory: string;
    findings: string;
    scanRequests: string;
    escalations?: string;
}

export interface MCPServerConfig {
    command: string;
    args: string[];
    env?: Record<string, string>;
}

export interface WatchConfig {
    intervalSeconds: number;
}

export interface HubConfig {
    notionParentPageId: string;
    databases: HubDatabaseIds;
    mcpServer: MCPServerConfig;
    watch: WatchConfig;
}

export interface NotionPage {
    id: string;
    properties: Record<string, unknown>;
    url?: string;
}

export interface NotionDatabase {
    id: string;
    title: string;
    url?: string;
}

export interface NotionPropertySchema {
    [key: string]: {
        type: string;
        [key: string]: unknown;
    };
}

export interface SyncResult {
    serverPageId: string;
    scanHistoryPageId: string;
    findingPageIds: string[];
    notionUrl?: string;
}

export interface WatchLoopOptions {
    intervalSeconds: number;
    escalationThreshold?: number;
    onRequest?: (target: string, requestedBy: string) => void;
    onComplete?: (target: string, score: number, status: string) => void;
    onError?: (target: string, error: string) => void;
    onEscalation?: (target: string, previousScore: number, newScore: number) => void;
    signal?: AbortSignal;
}

export interface ScanRequestEntry {
    pageId: string;
    target: string;
    requestedBy: string;
    notes?: string;
}

export interface OverdueServerEntry {
    pageId: string;
    target: string;
    reviewCadence: 'weekly' | 'monthly' | 'quarterly';
    nextReviewDue: string;
    latestScore: number;
    latestStatus: string;
}

export interface EscalationTrigger {
    type: 'score-regression' | 'new-critical-finding' | 'status-downgrade';
    previousScore: number;
    newScore: number;
    delta: number;
}

export const CADENCE_INTERVALS: Record<string, number> = {
    weekly: 7,
    monthly: 30,
    quarterly: 90,
};

export const HUB_DATABASE_TITLES = {
    serverRegistry: 'MCP Server Registry',
    scanHistory: 'Scan History',
    findings: 'Findings',
    scanRequests: 'Scan Requests',
    escalations: 'Escalations',
} as const;

export const RISK_CLASSIFICATION = {
    critical: { min: 0, max: 39 },
    high: { min: 40, max: 59 },
    medium: { min: 60, max: 79 },
    low: { min: 80, max: 100 },
} as const;

export function deriveRiskClassification(score: number): string {
    if (score <= 39) return 'critical';
    if (score <= 59) return 'high';
    if (score <= 79) return 'medium';
    return 'low';
}
