import type { NotionTools } from '../client/notion-tools.js';
import type { HubDatabaseIds } from '../types/hub.js';
import { HUB_DATABASE_TITLES } from '../types/hub.js';

const REGISTRY_PROPERTIES: Record<string, unknown> = {
    Name: { title: {} },
    Source: {
        select: {
            options: [
                { name: 'npm', color: 'blue' },
                { name: 'local', color: 'gray' },
                { name: 'github', color: 'default' },
            ],
        },
    },
    Language: {
        select: {
            options: [
                { name: 'typescript', color: 'blue' },
                { name: 'javascript', color: 'yellow' },
                { name: 'python', color: 'green' },
            ],
        },
    },
    'Latest Score': { number: { format: 'number' } },
    Status: {
        select: {
            options: [
                { name: 'pass', color: 'green' },
                { name: 'warn', color: 'yellow' },
                { name: 'fail', color: 'red' },
            ],
        },
    },
    Approval: {
        select: {
            options: [
                { name: 'pending', color: 'yellow' },
                { name: 'approved', color: 'green' },
                { name: 'blocked', color: 'red' },
            ],
        },
    },
    Owner: { rich_text: {} },
    'Last Scanned': { date: {} },
    'Scan Count': { number: { format: 'number' } },
    'Risk Classification': {
        select: {
            options: [
                { name: 'critical', color: 'red' },
                { name: 'high', color: 'orange' },
                { name: 'medium', color: 'yellow' },
                { name: 'low', color: 'green' },
                { name: 'unclassified', color: 'gray' },
            ],
        },
    },
    'Review Cadence': {
        select: {
            options: [
                { name: 'weekly', color: 'red' },
                { name: 'monthly', color: 'yellow' },
                { name: 'quarterly', color: 'green' },
            ],
        },
    },
    'Next Review Due': { date: {} },
};

function createHistoryProperties(_registryDbId: string): Record<string, unknown> {
    return {
        'Scan ID': { title: {} },
        'Server Name': { rich_text: {} },
        Score: { number: { format: 'number' } },
        Status: {
            select: {
                options: [
                    { name: 'pass', color: 'green' },
                    { name: 'warn', color: 'yellow' },
                    { name: 'fail', color: 'red' },
                ],
            },
        },
        'Findings Count': { number: { format: 'number' } },
        Critical: { number: { format: 'number' } },
        High: { number: { format: 'number' } },
        Medium: { number: { format: 'number' } },
        Low: { number: { format: 'number' } },
        'Duration ms': { number: { format: 'number' } },
        'Scanned At': { date: {} },
        'Scanner Version': { rich_text: {} },
    };
}

function createFindingsProperties(
    _registryDbId: string,
    _historyDbId: string,
): Record<string, unknown> {
    return {
        Title: { title: {} },
        'Server Name': { rich_text: {} },
        'Scan ID': { rich_text: {} },
        Analyzer: {
            select: {
                options: [
                    { name: 'tool-poisoning', color: 'red' },
                    { name: 'command-injection', color: 'red' },
                    { name: 'dependency', color: 'orange' },
                    { name: 'network', color: 'yellow' },
                    { name: 'filesystem', color: 'yellow' },
                    { name: 'authentication', color: 'blue' },
                ],
            },
        },
        Severity: {
            select: {
                options: [
                    { name: 'critical', color: 'red' },
                    { name: 'high', color: 'orange' },
                    { name: 'medium', color: 'yellow' },
                    { name: 'low', color: 'gray' },
                ],
            },
        },
        'Remediation Status': {
            select: {
                options: [
                    { name: 'open', color: 'red' },
                    { name: 'in-progress', color: 'yellow' },
                    { name: 'resolved', color: 'green' },
                    { name: 'accepted', color: 'blue' },
                ],
            },
        },
        File: { rich_text: {} },
        Line: { number: { format: 'number' } },
        Description: { rich_text: {} },
        Evidence: { rich_text: {} },
    };
}

function createEscalationsProperties(): Record<string, unknown> {
    return {
        Title: { title: {} },
        'Server Name': { rich_text: {} },
        'Previous Score': { number: { format: 'number' } },
        'New Score': { number: { format: 'number' } },
        Delta: { number: { format: 'number' } },
        Severity: {
            select: {
                options: [
                    { name: 'critical', color: 'red' },
                    { name: 'high', color: 'orange' },
                    { name: 'medium', color: 'yellow' },
                    { name: 'low', color: 'gray' },
                ],
            },
        },
        Trigger: {
            select: {
                options: [
                    { name: 'score-regression', color: 'red' },
                    { name: 'new-critical-finding', color: 'orange' },
                    { name: 'status-downgrade', color: 'yellow' },
                ],
            },
        },
        Status: {
            select: {
                options: [
                    { name: 'open', color: 'red' },
                    { name: 'acknowledged', color: 'yellow' },
                    { name: 'investigating', color: 'blue' },
                    { name: 'resolved', color: 'green' },
                ],
            },
        },
        'Scan History ID': { rich_text: {} },
        'Created At': { date: {} },
        Notes: { rich_text: {} },
    };
}

function createScanRequestsProperties(_historyDbId: string): Record<string, unknown> {
    return {
        Target: { title: {} },
        Status: {
            select: {
                options: [
                    { name: 'requested', color: 'blue' },
                    { name: 'scanning', color: 'yellow' },
                    { name: 'completed', color: 'green' },
                    { name: 'failed', color: 'red' },
                ],
            },
        },
        'Requested By': { rich_text: {} },
        'Requested At': { date: {} },
        'Completed At': { date: {} },
        'Scan Result ID': { rich_text: {} },
        Error: { rich_text: {} },
        Notes: { rich_text: {} },
    };
}

export async function initNotionWorkspace(
    notionTools: NotionTools,
    parentPageId: string,
): Promise<HubDatabaseIds> {
    const registry = await notionTools.createDatabase(
        parentPageId,
        HUB_DATABASE_TITLES.serverRegistry,
        REGISTRY_PROPERTIES,
    );

    const history = await notionTools.createDatabase(
        parentPageId,
        HUB_DATABASE_TITLES.scanHistory,
        createHistoryProperties(registry.id),
    );

    const findings = await notionTools.createDatabase(
        parentPageId,
        HUB_DATABASE_TITLES.findings,
        createFindingsProperties(registry.id, history.id),
    );

    const scanRequests = await notionTools.createDatabase(
        parentPageId,
        HUB_DATABASE_TITLES.scanRequests,
        createScanRequestsProperties(history.id),
    );

    const escalations = await notionTools.createDatabase(
        parentPageId,
        HUB_DATABASE_TITLES.escalations,
        createEscalationsProperties(),
    );

    return {
        serverRegistry: registry.id,
        scanHistory: history.id,
        findings: findings.id,
        scanRequests: scanRequests.id,
        escalations: escalations.id,
    };
}
