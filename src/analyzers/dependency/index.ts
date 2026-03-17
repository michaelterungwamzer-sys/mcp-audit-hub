import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
import { BaseAnalyzer } from '../base.js';
import type { Finding, MCPServer, Severity } from '../../types/index.js';

const execAsync = promisify(execCb);

interface PopularPackages {
    packages: Record<string, string[]>;
}

function levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1,
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

export class DependencyAnalyzer extends BaseAnalyzer {
    readonly id = 'dependencies';
    readonly name = 'Dependencies';
    readonly description = 'Audits dependencies for vulnerabilities and typosquatting';

    private popularPackages: string[];

    constructor() {
        super();
        this.popularPackages = this.loadPopularPackages();
    }

    private loadPopularPackages(): string[] {
        try {
            const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'data', 'patterns');
            const raw = readFileSync(join(dataDir, 'popular-packages.json'), 'utf-8');
            const data: PopularPackages = JSON.parse(raw);
            return Object.values(data.packages).flat();
        } catch {
            return [];
        }
    }

    async analyze(server: MCPServer): Promise<Finding[]> {
        const findings: Finding[] = [];
        let findingIndex = 0;

        if (!server.packageJson) return findings;

        const deps = {
            ...(server.packageJson.dependencies as Record<string, string> | undefined ?? {}),
        };

        // Typosquatting check
        for (const depName of Object.keys(deps)) {
            for (const popular of this.popularPackages) {
                if (depName === popular) continue;

                const distance = levenshtein(depName, popular);

                if (distance === 1) {
                    findings.push({
                        id: this.findingId('DEP', ++findingIndex),
                        analyzer: 'dependencies',
                        severity: 'high',
                        title: `Possible typosquatting: "${depName}" is 1 character away from "${popular}"`,
                        recommendation: `Verify that "${depName}" is the intended package. It is very similar to the popular package "${popular}".`,
                    });
                } else if (distance === 2) {
                    findings.push({
                        id: this.findingId('DEP', ++findingIndex),
                        analyzer: 'dependencies',
                        severity: 'medium',
                        title: `Possible typosquatting: "${depName}" is 2 characters away from "${popular}"`,
                        recommendation: `Verify that "${depName}" is the intended package. It resembles the popular package "${popular}".`,
                    });
                }
            }
        }

        // npm audit (only if package is local and has lock file)
        try {
            const { stdout } = await execAsync('npm audit --json --omit=dev', {
                cwd: server.root,
                timeout: 30000,
            });

            const auditResult = JSON.parse(stdout);
            const vulnerabilities = auditResult.vulnerabilities ?? {};

            for (const [pkgName, vuln] of Object.entries(vulnerabilities)) {
                const v = vuln as Record<string, unknown>;
                const severity = (v.severity as string) ?? 'medium';
                const via = v.via as unknown[];

                const title = Array.isArray(via) && via.length > 0 && typeof via[0] === 'object'
                    ? ((via[0] as Record<string, string>).title ?? `Vulnerability in ${pkgName}`)
                    : `Vulnerability in ${pkgName}`;

                const mappedSeverity: Severity =
                    severity === 'critical' ? 'critical' :
                        severity === 'high' ? 'high' :
                            severity === 'moderate' ? 'medium' : 'low';

                findings.push({
                    id: this.findingId('DEP', ++findingIndex),
                    analyzer: 'dependencies',
                    severity: mappedSeverity,
                    title: `${title} (${pkgName})`,
                    recommendation: (v.fixAvailable as boolean) ? `Run npm update to fix.` : `Review and consider replacing ${pkgName}.`,
                });
            }
        } catch {
            // npm audit failed — no lock file or npm not available
            // This is expected for many scanned packages
        }

        return findings;
    }
}
