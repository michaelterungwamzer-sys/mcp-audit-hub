# TAD — MCP-Audit: Solution Architecture Document

**Document ID:** TAD-MCP-Audit
**Version:** 0.1.0-draft
**Status:** Draft
**Author:** Solution Architect (AI-assisted — Claude Opus 4.6)
**Created:** 2026-03-17
**Last Updated:** 2026-03-17
**Parent Document:** [PRD-MCP-Audit](/dev-project-docs/PRD-MCP-Audit.md)
**Architecture Notes Source:** [mcp-audit-architecture.md](/dev-project-docs/mcp-audit-architecture.md)

---

## Document History

| Version | Date       | Author                 | Changes                |
|---------|------------|-----------------------|-----------------------|
| 0.1.0   | 2026-03-17 | Claude Opus 4.6 (P-02) | Initial TAD formalized from architecture notes     |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Component Design](#4-component-design)
5. [Data Flow](#5-data-flow)
6. [Scoring Architecture](#6-scoring-architecture)
7. [Data Layer & Schemas](#7-data-layer--schemas)
8. [CLI Contract & Output Schemas](#8-cli-contract--output-schemas)
9. [Security Architecture](#9-security-architecture)
10. [Infrastructure & CI/CD](#10-infrastructure--cicd)
11. [Third-Party Integrations](#11-third-party-integrations)
12. [Extensibility & Plugin Architecture](#12-extensibility--plugin-architecture)
13. [Performance & Scalability](#13-performance--scalability)
14. [ADRs Required Before Implementation](#14-adrs-required-before-implementation)

---

## 1. Overview

MCP-Audit is a command-line static analysis tool that scans MCP (Model Context Protocol) servers for security vulnerabilities. It is distributed as an npm package and operates entirely locally — no backend services, no user accounts, no data transmission in v0.1.

**Architectural style:** Pipeline architecture (resolve → parse → analyze → aggregate → report)
**Runtime:** Single-process Node.js CLI
**Language:** TypeScript (strict mode)
**Distribution:** npm package with `bin` entry point

---

## 2. Technology Stack

### 2.1 Core Runtime

| Component | Technology | Version | Rationale | Licence |
|-----------|------------|---------|-----------|---------|
| Language | TypeScript | 5.x | Type safety, strong IDE support, npm ecosystem native | Apache-2.0 |
| Runtime | Node.js | 20+ LTS | Async I/O, cross-platform, ubiquitous in target audience | MIT |
| Module system | ESM | — | Modern standard; aligns with Node.js direction | — |
| Build tool | tsup | latest | Fast bundling for CLI distribution, ESM + CJS output | MIT |

### 2.2 CLI & Output

| Component | Technology | Rationale | Licence |
|-----------|------------|-----------|---------|
| CLI framework | Commander.js | Lightweight, standard, well-documented | MIT |
| Terminal colours | chalk | De-facto standard for Node.js CLI colour output | MIT |
| Progress spinner | ora | Clean spinner with customisable messages | MIT |
| Table output | cli-table3 | Formatted tables for summary display | MIT |

### 2.3 Analysis

| Component | Technology | Rationale | Licence |
|-----------|------------|-----------|---------|
| AST parsing (JS/TS) | @babel/parser + @babel/traverse | Mature, handles all JS/TS syntax including decorators and JSX | MIT |
| AST parsing (multi-lang) | tree-sitter (v0.2+) | Multi-language support for Python, Rust, Go servers | MIT |
| Pattern matching | Custom regex engine | Patterns stored as JSON for easy community contribution | — |
| Dependency audit | npm CLI (`npm audit --json`) | Uses the user's installed npm; no additional binary required | — |

### 2.4 Data Storage

| Component | Technology | Rationale | Licence |
|-----------|------------|-----------|---------|
| CVE database (v0.2) | better-sqlite3 | Embedded, zero-config, fast reads, offline-capable | MIT |
| Pattern storage | JSON files | Human-readable, git-diffable, community-editable | — |
| Configuration | JSON file | Standard, no additional parser needed | — |
| Scan cache | In-memory Map | Session-scoped only; no persistent cache in v0.1 | — |

### 2.5 Testing

| Component | Technology | Rationale | Licence |
|-----------|------------|-----------|---------|
| Test framework | Vitest | Fast, TypeScript-native, built-in mocking, ESM support | MIT |
| HTTP mocking | msw (Mock Service Worker) | Intercepts npm registry calls in integration tests | MIT |
| Snapshot testing | Vitest built-in | Console output verification | MIT |
| Coverage | v8 (via Vitest) | Built-in, no additional tooling | — |

### 2.6 Distribution

| Channel | Technology | Phase |
|---------|------------|-------|
| npm package | `npm publish` | v0.1 |
| npx | Zero-install execution | v0.1 |
| Docker image | Alpine-based Node.js | v0.2 |
| GitHub Action | Composite action wrapping Docker | v0.2 |
| Standalone binary | `pkg` or `bun compile` | v0.3+ |

---

## 3. System Architecture

### 3.1 High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            mcp-audit CLI                                │
│                                                                         │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────────┐  │
│  │           │    │           │    │           │    │               │  │
│  │    CLI    │───▶│  Scanner  │───▶│ Analyzers │───▶│    Report     │  │
│  │   Layer   │    │   Core    │    │   Pool    │    │   Generator   │  │
│  │           │    │           │    │           │    │               │  │
│  └───────────┘    └─────┬─────┘    └─────┬─────┘    └───────┬───────┘  │
│        │                │                │                   │          │
│        │          ┌─────┴─────┐    ┌─────┴─────┐    ┌───────┴───────┐  │
│        │          │           │    │           │    │               │  │
│        ▼          │ Resolver  │    │ Aggregator│    │    Output     │  │
│  ┌───────────┐    │           │    │ + Scorer  │    │  Formatters   │  │
│  │  Config   │    └───────────┘    └───────────┘    └───────────────┘  │
│  │  Loader   │                                                         │
│  └───────────┘    ┌─────────────────────────────────────────────────┐  │
│                   │              Data Layer                          │  │
│                   │  patterns/*.json  │  allowlists/*.json          │  │
│                   │  cve/database.sqlite (v0.2)                     │  │
│                   └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Responsibilities

| Component | Responsibility | Depends On |
|-----------|---------------|------------|
| **CLI Layer** | Argument parsing, command routing, exit codes | Config Loader |
| **Config Loader** | Loads `mcp-audit.config.json`, merges with CLI flags | — |
| **Scanner Core** | Orchestrates the full scan pipeline | Resolver, Parser, Analyzer Pool, Aggregator |
| **Resolver** | Resolves scan target to local source files (npm download, local path, GitHub clone) | npm registry (network) |
| **Parser** | Parses MCP server structure from source files using AST — extracts tools, resources, prompts | @babel/parser |
| **Analyzer Pool** | Runs all enabled analyzers in parallel against parsed server structure | Individual Analyzers, Data Layer |
| **Aggregator + Scorer** | Combines findings, deduplicates, calculates severity score, applies co-location multiplier | — |
| **Report Generator** | Delegates to the selected output formatter | Output Formatters |
| **Output Formatters** | Console, JSON, SARIF (v0.2), HTML (v0.2) — each implements a common interface | — |
| **Data Layer** | Provides pattern libraries, allowlists, CVE database (v0.2) | Filesystem |

---

## 4. Component Design

### 4.1 Directory Structure

```
mcp-audit/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── mcp-audit.config.json         # Default config (shipped with package)
├── bin/
│   └── mcp-audit.ts              # CLI entry point (shebang + import)
├── src/
│   ├── index.ts                  # Public API (for programmatic use)
│   ├── cli/
│   │   ├── index.ts              # Commander setup, command routing
│   │   ├── commands/
│   │   │   ├── scan.ts           # Main scan command
│   │   │   ├── init.ts           # Config file generator
│   │   │   └── checks.ts         # List available checks
│   │   └── output/
│   │       ├── formatter.ts      # OutputFormatter interface
│   │       ├── console.ts        # Console formatter (colours, tables)
│   │       └── json.ts           # JSON formatter
│   ├── scanner/
│   │   ├── index.ts              # Scanner orchestrator
│   │   ├── resolver.ts           # Target resolver (npm, local)
│   │   ├── parser.ts             # MCP structure parser (AST-based)
│   │   └── aggregator.ts         # Finding aggregation + scoring
│   ├── analyzers/
│   │   ├── index.ts              # Analyzer registry + pool runner
│   │   ├── base.ts               # BaseAnalyzer abstract class
│   │   ├── tool-poisoning/
│   │   │   ├── index.ts          # ToolPoisoningAnalyzer
│   │   │   ├── patterns.ts       # Pattern loader + matcher
│   │   │   └── heuristics.ts     # Description vs implementation comparison
│   │   ├── command-injection/
│   │   │   ├── index.ts          # CommandInjectionAnalyzer
│   │   │   ├── sinks.ts          # Sink definitions (shell, SQL, path)
│   │   │   └── taint.ts          # Basic taint analysis (intraprocedural)
│   │   ├── dependency/
│   │   │   ├── index.ts          # DependencyAnalyzer
│   │   │   ├── npm-audit.ts      # npm audit wrapper + parser
│   │   │   └── typosquat.ts      # Typosquatting detection
│   │   ├── network/
│   │   │   ├── index.ts          # NetworkAnalyzer
│   │   │   ├── endpoints.ts      # HTTP/WS call detection
│   │   │   └── exfiltration.ts   # Exfiltration pattern matcher
│   │   ├── filesystem/
│   │   │   ├── index.ts          # FilesystemAnalyzer
│   │   │   ├── sensitive.ts      # Sensitive path definitions
│   │   │   └── traversal.ts      # Path traversal detection
│   │   └── authentication/
│   │       └── index.ts          # AuthenticationAnalyzer
│   ├── scoring/
│   │   ├── index.ts              # Score calculator (strategy pattern)
│   │   ├── weighted-sum.ts       # v0.1 — deterministic weighted scoring
│   │   ├── co-location.ts        # v0.1.x — co-location multiplier
│   │   └── markov.ts             # v0.2 — Markov chain scoring (stub)
│   ├── config/
│   │   ├── index.ts              # Config loader + validator
│   │   ├── schema.ts             # Config JSON schema definition
│   │   └── defaults.ts           # Default configuration values
│   ├── data/
│   │   ├── patterns/
│   │   │   ├── poisoning.json    # Tool poisoning regex patterns
│   │   │   ├── injection.json    # Injection sink definitions
│   │   │   └── exfiltration.json # Exfiltration patterns
│   │   └── allowlists/
│   │       ├── safe-packages.json
│   │       └── false-positives.json
│   └── types/
│       ├── index.ts              # Shared type definitions
│       ├── finding.ts            # Finding, Severity, ScanResult types
│       ├── mcp-server.ts         # MCPServer, Tool, Resource types
│       └── config.ts             # Configuration types
├── tests/
│   ├── unit/
│   │   ├── analyzers/            # Unit tests per analyzer
│   │   ├── scoring/              # Scoring logic tests
│   │   └── scanner/              # Parser, resolver tests
│   ├── integration/
│   │   ├── scan-npm.test.ts      # End-to-end npm scan
│   │   ├── scan-local.test.ts    # End-to-end local scan
│   │   └── output.test.ts        # Output format verification
│   └── fixtures/
│       ├── clean-server/         # MCP server with no issues
│       ├── poisoned-server/      # MCP server with tool poisoning
│       ├── injection-server/     # MCP server with injection sinks
│       ├── exfiltration-server/  # MCP server with data exfiltration
│       └── chained-server/       # MCP server with co-located findings
└── data/
    └── cve/                      # CVE database directory (v0.2)
```

### 4.2 Core Type Definitions

```typescript
// src/types/finding.ts

type Severity = 'critical' | 'high' | 'medium' | 'low';

type FindingType =
    | 'tool-poisoning'
    | 'command-injection'
    | 'sql-injection'
    | 'path-traversal'
    | 'dependency-vulnerability'
    | 'typosquatting'
    | 'network-exfiltration'
    | 'undisclosed-network'
    | 'sensitive-file-access'
    | 'missing-authentication'
    | 'cve';

interface Finding {
    id: string;                    // e.g., 'PSN-001', 'INJ-002'
    type: FindingType;
    severity: Severity;
    title: string;
    description: string;
    file?: string;                 // Source file path (relative)
    line?: number;                 // Line number in source file
    code?: string;                 // Code snippet (evidence)
    tool?: string;                 // MCP tool name (if applicable)
    recommendation: string;
    references?: string[];         // CWE, OWASP links
    meta?: Record<string, unknown>; // Analyzer-specific metadata
}

interface ScanResult {
    meta: {
        version: string;
        timestamp: string;
        target: string;
        targetType: 'npm' | 'local' | 'github';
        durationMs: number;
        analyzersRun: string[];
    };
    summary: {
        score: number;
        status: 'pass' | 'warn' | 'fail';
        scoringMethod: 'weighted-sum' | 'co-location' | 'markov-chain';
        findings: Record<Severity, number>;
        chains?: ChainResult[];    // Present when co-location or markov scoring is used
    };
    findings: Finding[];
    dependencies?: {
        total: number;
        vulnerable: number;
        outdated: number;
    };
}
```

```typescript
// src/types/mcp-server.ts

interface MCPServer {
    root: string;                  // Absolute path to server root
    name: string;                  // Package name or directory name
    version?: string;              // Package version (if from npm)
    tools: ToolDefinition[];
    resources: ResourceDefinition[];
    prompts: PromptDefinition[];
    sourceFiles: SourceFile[];
    dependencies: DependencyInfo[];
    packageManager: 'npm' | 'pip' | 'unknown';
}

interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    handlerFile: string;           // Relative file path
    handlerLine: number;           // Line number
    handlerEndLine: number;        // End line number
}

interface SourceFile {
    path: string;                  // Relative to server root
    absolutePath: string;
    language: 'typescript' | 'javascript' | 'python' | 'unknown';
    content: string;
    ast?: unknown;                 // Parsed AST (lazily populated)
}

interface DependencyInfo {
    name: string;
    version: string;
    isDirect: boolean;
}
```

### 4.3 Analyzer Interface

All analyzers implement this abstract class. This is the extension point for the plugin architecture (§12).

```typescript
// src/analyzers/base.ts

abstract class BaseAnalyzer {
    abstract readonly name: string;
    abstract readonly id: string;          // e.g., 'tool-poisoning'
    abstract readonly description: string;

    abstract analyze(server: MCPServer): Promise<Finding[]>;

    protected findingId(prefix: string, index: number): string {
        return `${prefix}-${String(index).padStart(3, '0')}`;
    }
}
```

```typescript
// src/analyzers/index.ts — Analyzer Registry

class AnalyzerRegistry {
    private analyzers: Map<string, BaseAnalyzer> = new Map();

    register(analyzer: BaseAnalyzer): void {
        this.analyzers.set(analyzer.id, analyzer);
    }

    getEnabled(config: AuditConfig): BaseAnalyzer[] {
        return [...this.analyzers.values()]
            .filter((a) => config.checks[a.id]?.enabled !== false);
    }

    async runAll(
        server: MCPServer,
        config: AuditConfig
    ): Promise<Finding[]> {
        const enabled = this.getEnabled(config);
        const results = await Promise.allSettled(
            enabled.map((a) => a.analyze(server))
        );

        const findings: Finding[] = [];
        for (const result of results) {
            if (result.status === 'fulfilled') {
                findings.push(...result.value);
            }
            // Failed analyzers are logged but do not crash the scan
        }

        return findings;
    }
}
```

### 4.4 Output Formatter Interface

```typescript
// src/cli/output/formatter.ts

interface OutputFormatter {
    format(result: ScanResult): string;
    write(result: ScanResult, destination?: string): Promise<void>;
}
```

Each formatter (`ConsoleFormatter`, `JsonFormatter`, etc.) implements this interface. The CLI layer selects the formatter based on the `--output` flag.

---

## 5. Data Flow

### 5.1 Scan Pipeline (Sequence)

```
User                CLI Layer           Scanner Core         Resolver
 │                     │                     │                  │
 │  mcp-audit scan X   │                     │                  │
 │────────────────────▶│                     │                  │
 │                     │  loadConfig()       │                  │
 │                     │──────────┐          │                  │
 │                     │◀─────────┘          │                  │
 │                     │                     │                  │
 │                     │  scan(target, cfg)  │                  │
 │                     │────────────────────▶│                  │
 │                     │                     │  resolve(target) │
 │                     │                     │─────────────────▶│
 │                     │                     │                  │──── npm pack / readdir
 │                     │                     │  MCPServer       │
 │                     │                     │◀─────────────────│
 │                     │                     │                  │
 │                     │                     │                  │
                    Parser              Analyzer Pool        Aggregator
                       │                     │                  │
      parse(files)     │                     │                  │
   ───────────────────▶│                     │                  │
      tools, resources │                     │                  │
   ◀───────────────────│                     │                  │
                       │  runAll(server)     │                  │
                       │────────────────────▶│                  │
                       │                     │── [parallel]     │
                       │                     │   poisoning      │
                       │                     │   injection      │
                       │                     │   dependency     │
                       │                     │   network        │
                       │                     │   filesystem     │
                       │                     │   auth           │
                       │  Finding[]          │                  │
                       │◀────────────────────│                  │
                       │                     │                  │
                       │  aggregate(findings, cfg)              │
                       │───────────────────────────────────────▶│
                       │                     ScanResult         │
                       │◀───────────────────────────────────────│
                       │                     │                  │
```

### 5.2 Resolver Strategy

```
resolve(target: string)
        │
        ├── starts with '.' or '/' or 'C:\'  ──▶  LocalResolver
        │       Validates directory exists
        │       Returns file list directly
        │
        ├── starts with 'github:'             ──▶  GitHubResolver (v0.2)
        │       git clone to temp dir
        │       Returns file list
        │
        └── else (assumed npm package)        ──▶  NpmResolver
                npm pack --dry-run to get tarball URL
                Download + extract to temp dir
                Returns file list
                Registers cleanup handler (process.on('exit'))
```

### 5.3 Parser Strategy

The parser identifies MCP SDK usage patterns via AST analysis. It does **not** execute any scanned code.

```
parse(sourceFiles: SourceFile[]): MCPServer
        │
        ├── For each .ts/.js file:
        │       Parse to AST via @babel/parser
        │       Traverse AST looking for:
        │         - server.tool() / server.addTool() calls
        │         - server.resource() / server.addResource() calls
        │         - server.prompt() / server.addPrompt() calls
        │       Extract:
        │         - Tool name (first argument or name property)
        │         - Description (description property)
        │         - Input schema (inputSchema property)
        │         - Handler function location (file + line range)
        │
        └── Return MCPServer with populated tools, resources, prompts
```

**Supported MCP SDK patterns:**

```typescript
// Pattern 1: MCP SDK v1.x — server.tool()
server.tool('toolName', 'description', { schema }, async (params) => { ... });

// Pattern 2: Object-style registration
server.addTool({
    name: 'toolName',
    description: 'description',
    inputSchema: { ... },
    handler: async (params) => { ... }
});

// Pattern 3: Class-based tools
class MyTool extends Tool {
    name = 'toolName';
    description = 'description';
    async execute(params) { ... }
}
```

The parser must handle all three patterns. Unknown patterns produce a warning but do not fail the scan.

---

## 6. Scoring Architecture

### 6.1 Strategy Pattern

The scoring module uses the **strategy pattern** to support multiple scoring algorithms without changing the aggregator.

```typescript
// src/scoring/index.ts

interface ScoringStrategy {
    readonly name: string;
    calculate(findings: Finding[]): ScoreResult;
}

interface ScoreResult {
    score: number;                 // 0–100
    status: 'pass' | 'warn' | 'fail';
    method: string;
    chains?: ChainResult[];
    breakdown: SeverityBreakdown;
}

interface ChainResult {
    findings: string[];            // Finding IDs in the chain
    chainProbability: number;      // 0.0–1.0
    escalatedSeverity: Severity;
    description: string;
}

interface SeverityBreakdown {
    critical: { count: number; weight: number };
    high: { count: number; weight: number };
    medium: { count: number; weight: number };
    low: { count: number; weight: number };
    totalWeight: number;
}

function createScoringStrategy(method: string): ScoringStrategy {
    switch (method) {
        case 'weighted-sum':
            return new WeightedSumStrategy();
        case 'co-location':
            return new CoLocationStrategy();
        case 'markov-chain':
            return new MarkovChainStrategy();
        default:
            return new WeightedSumStrategy();
    }
}
```

### 6.2 Phase 1 — Weighted Sum (v0.1)

```typescript
// src/scoring/weighted-sum.ts

const SEVERITY_WEIGHTS: Record<Severity, number> = {
    critical: 25,
    high: 15,
    medium: 5,
    low: 1,
};

class WeightedSumStrategy implements ScoringStrategy {
    readonly name = 'weighted-sum';

    calculate(findings: Finding[]): ScoreResult {
        const breakdown = this.buildBreakdown(findings);
        const score = Math.max(0, 100 - breakdown.totalWeight);
        const hasCritical = breakdown.critical.count > 0;

        return {
            score,
            status: hasCritical || score < 40 ? 'fail'
                  : score < 70 ? 'warn'
                  : 'pass',
            method: this.name,
            breakdown,
        };
    }
}
```

### 6.3 Phase 2 — Co-Location Multiplier (v0.1.x)

Extends `WeightedSumStrategy` by detecting findings that share the same handler scope and applying a 1.5× weight multiplier.

```typescript
// src/scoring/co-location.ts

class CoLocationStrategy implements ScoringStrategy {
    readonly name = 'co-location';

    calculate(findings: Finding[]): ScoreResult {
        // Group findings by file + handler range
        const groups = this.groupByHandler(findings);
        const chains: ChainResult[] = [];

        let totalWeight = 0;

        for (const [scope, group] of groups) {
            if (group.length >= 2) {
                // Co-located findings — apply 1.5× multiplier
                const chainWeight = group.reduce(
                    (sum, f) => sum + SEVERITY_WEIGHTS[f.severity] * 1.5,
                    0
                );
                totalWeight += chainWeight;

                chains.push({
                    findings: group.map((f) => f.id),
                    chainProbability: 1.0, // Deterministic in this phase
                    escalatedSeverity: this.maxSeverity(group),
                    description: `${group.length} findings co-located in ${scope}`,
                });
            } else {
                // Isolated finding — standard weight
                totalWeight += SEVERITY_WEIGHTS[group[0].severity];
            }
        }

        const score = Math.max(0, 100 - totalWeight);
        // ... classification logic same as weighted sum
    }

    private groupByHandler(findings: Finding[]): Map<string, Finding[]> {
        // Group by file path. Findings without a file are ungrouped.
        // Within a file, findings within 30 lines of each other
        // are considered co-located in the same handler.
    }
}
```

### 6.4 Phase 3 — Markov Chain Scoring (v0.2)

> **ADR Required:** An ADR must be written and approved before implementing this phase. See §14.

The Markov chain models attacker state transitions between finding types along execution paths.

**State space:** Each finding type is a state. The initial state is `clean`. The terminal states are exfiltration outcomes (data theft, credential theft, denial of service).

**Transition probability matrix (default):**

```
                        ToolPoisoning  CmdInjection  SQLInjection  PathTraversal  NetworkExfil  FileAccess  NoAuth
ToolPoisoning                  —           0.70          0.50          0.40          0.60         0.50      0.30
CmdInjection               0.20             —           0.30          0.50          0.70         0.60      0.20
SQLInjection                0.10          0.20             —           0.20          0.40         0.30      0.20
PathTraversal               0.10          0.30          0.10             —           0.30         0.80      0.20
NetworkExfil                0.50          0.40          0.20          0.20             —          0.40      0.40
FileAccess                  0.30          0.30          0.10          0.60          0.50            —       0.30
NoAuth                      0.40          0.30          0.30          0.30          0.50         0.50         —
```

**Algorithm:**

1. Identify all co-located finding pairs (same handler/file scope)
2. For each pair (A, B), look up transition probability P(A→B)
3. For chains of 3+, multiply probabilities: P(A→B→C) = P(A→B) × P(B→C)
4. Chain probability > 0.25 → escalate combined severity by one level
5. Chain probability > 0.50 → escalate by two levels (cap at critical)
6. Apply escalated weights to the standard scoring formula

**Why this works for MCP:** MCP attack vectors are inherently sequential. Tool poisoning is the entry point — it manipulates the AI into calling injection sinks, which then exfiltrate data. The Markov model captures this directionality, unlike the symmetric co-location multiplier.

**Calibration plan:** The default matrix above is based on threat modelling. It will be refined using anonymised scan telemetry (opt-in) from v0.1 users — specifically, which finding types tend to appear together in the same handler.

---

## 7. Data Layer & Schemas

### 7.1 Pattern Library Schema

All pattern files follow this structure:

```json
// data/patterns/poisoning.json
{
    "$schema": "mcp-audit-pattern-v1",
    "type": "tool-poisoning",
    "version": "1.0.0",
    "lastUpdated": "2026-03-17",
    "patterns": [
        {
            "id": "PSN-HIDDEN-INSTRUCTION",
            "name": "Hidden instruction pattern",
            "regex": "ignore\\s+(previous|prior|above)\\s+instructions?",
            "flags": "i",
            "severity": "critical",
            "description": "Attempts to override prior AI instructions",
            "recommendation": "Review full tool description for hidden instructions",
            "references": ["CWE-1021"]
        }
    ]
}
```

### 7.2 Allowlist Schema

```json
// data/allowlists/false-positives.json
{
    "$schema": "mcp-audit-allowlist-v1",
    "entries": [
        {
            "findingId": "INJ-001",
            "file": "src/handlers/safe-exec.ts",
            "reason": "Input is validated by sanitizeCommand() before reaching exec()",
            "addedBy": "developer",
            "addedDate": "2026-03-17"
        }
    ]
}
```

### 7.3 Configuration Schema

```json
// mcp-audit.config.json
{
    "version": "1.0",
    "checks": {
        "tool-poisoning": {
            "enabled": true,
            "descriptionMaxLength": 500
        },
        "command-injection": {
            "enabled": true,
            "allowedSinks": []
        },
        "dependency": {
            "enabled": true,
            "ignoreCves": [],
            "maxAge": 180
        },
        "network": {
            "enabled": true,
            "allowedDomains": []
        },
        "filesystem": {
            "enabled": true,
            "sensitivePaths": ["~/.ssh", "~/.aws", "~/.env"]
        },
        "authentication": {
            "enabled": true
        }
    },
    "scoring": {
        "method": "weighted-sum",
        "failOn": "high",
        "warnOn": "medium",
        "coLocationMultiplier": 1.5,
        "markovMatrix": null
    },
    "output": {
        "format": "console",
        "colors": true,
        "verbose": false
    },
    "allowlist": {
        "packages": [],
        "findings": []
    }
}
```

---

## 8. CLI Contract & Output Schemas

### 8.1 CLI Interface

```
mcp-audit <command> [options]

Commands:
  scan <target>       Scan an MCP server for vulnerabilities
  init                Generate default mcp-audit.config.json
  checks --list       List all available analyzers

Scan options:
  --checks <list>     Comma-separated analyzer IDs (default: all)
  --output <format>   Output format: console, json (default: console)
  --report <path>     Write output to file
  --scoring <method>  Scoring method: weighted-sum, co-location (default: weighted-sum)
  --config <path>     Path to config file (default: ./mcp-audit.config.json)
  --no-color          Disable colour output
  --verbose           Show detailed analyzer progress

Exit codes:
  0    Pass — no findings above threshold
  1    Fail — findings exceed severity threshold
  2    Error — scan could not complete
```

### 8.2 JSON Output Schema

The JSON output schema is the **public API contract** for CI/CD integrations. It must be versioned and backward-compatible.

```typescript
// JSON output conforms to ScanResult type (§4.2)
// Schema version is embedded in meta.version

interface JsonOutput {
    meta: {
        version: string;           // mcp-audit version
        schemaVersion: '1.0';      // Output schema version
        timestamp: string;         // ISO 8601
        target: string;
        targetType: 'npm' | 'local' | 'github';
        durationMs: number;
        analyzersRun: string[];
    };
    summary: {
        score: number;
        status: 'pass' | 'warn' | 'fail';
        scoringMethod: string;
        findings: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        chains?: Array<{
            findings: string[];
            probability: number;
            escalatedSeverity: string;
        }>;
    };
    findings: Array<{
        id: string;
        type: string;
        severity: string;
        title: string;
        description: string;
        file?: string;
        line?: number;
        code?: string;
        tool?: string;
        recommendation: string;
        references?: string[];
    }>;
    dependencies?: {
        total: number;
        vulnerable: number;
        outdated: number;
    };
}
```

---

## 9. Security Architecture

### 9.1 Threat Model — The Tool Itself

MCP-Audit scans potentially malicious code. The tool must not become an attack vector.

| Threat | Mitigation | Priority |
|--------|-----------|----------|
| **Scanned code execution** — malicious package triggers code execution during analysis | All analysis is AST-based. No `require()`, `import()`, or `eval()` of scanned code. No `.js` file execution. Parser operates on string content only | **Critical** |
| **Dependency confusion** — mcp-audit's own dependencies are compromised | Lock file (`package-lock.json`) committed. Dependabot enabled. All deps are MIT-licensed, well-maintained packages with >1M weekly downloads | High |
| **npm tarball manipulation** — downloaded package is tampered with | Verify npm integrity hash (shasum) from registry metadata against downloaded tarball | High |
| **Temp directory residue** — scanned code persists on disk after scan | Register cleanup handlers on `process.on('exit')`, `SIGINT`, `SIGTERM`, `uncaughtException`. Verify cleanup in integration tests | High |
| **Path traversal in scanned package** — malicious package contains `../../etc/passwd` style paths | Resolve all paths within the temp directory. Reject any resolved path that escapes the scan root | High |
| **Regex ReDoS** — malicious tool description triggers catastrophic backtracking in pattern regexes | All pattern regexes are tested against ReDoS benchmarks. Use `re2` or bounded execution time if needed | Medium |
| **Output injection** — finding content contains terminal escape sequences | Sanitise all output strings — strip ANSI escape codes from finding evidence before rendering | Medium |

### 9.2 Security Principles

1. **Never execute scanned code.** This is the #1 invariant. The tool is a static analyser. If a code path would cause execution of scanned content, it is a critical bug.
2. **Minimal permissions.** The tool needs only: read filesystem, write temp dirs, read npm registry (HTTPS). No elevated permissions, no system modification.
3. **No data collection.** v0.1 collects zero telemetry. If opt-in telemetry is added (v0.2+), it must be:
   - Disabled by default
   - Clearly documented
   - Anonymised (no package names, no file paths, no finding content)
   - Only aggregate counts (finding type × severity distributions)
4. **Scanned content never leaves the machine.** All analysis is local. No cloud APIs, no phoning home.

### 9.3 OWASP Alignment (for the tool itself)

| OWASP Category | Applicability | Control |
|----------------|---------------|---------|
| Injection | The tool must not be injectable via malicious scan targets | Input validation on target strings; no shell interpolation in npm commands |
| Broken Access Control | N/A for CLI tool | — |
| Cryptographic Failures | N/A (no secrets stored) | — |
| Insecure Design | Design must prevent code execution | AST-only analysis; no `eval`, `Function()`, `vm.runInContext()` |
| Security Misconfiguration | Temp dirs, permissions | Temp dirs use `os.tmpdir()` with random suffix; 0700 permissions |
| Vulnerable Components | Own dependencies | npm audit in CI; dependabot; lockfile |
| Software/Data Integrity | npm tarball verification | Verify integrity hash |
| Logging & Monitoring | N/A for CLI tool (no server) | — |
| SSRF | npm registry URL handling | Hardcode registry base URL; do not allow user-supplied registry URLs in v0.1 |

---

## 10. Infrastructure & CI/CD

### 10.1 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml (conceptual)
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    # ESLint + Prettier
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [20, 22]
    steps:
      - Checkout
      - Setup Node.js
      - npm ci
      - npx vitest run --coverage
      - Upload coverage to Codecov
  security:
    steps:
      - npm audit --audit-level=high
      - mcp-audit self-scan (scan own codebase)
  build:
    steps:
      - npx tsup
      - Verify bin/mcp-audit is executable
      - Smoke test: npx . scan ./tests/fixtures/clean-server
  publish:
    if: github.ref == 'refs/tags/v*'
    needs: [lint, test, security, build]
    steps:
      - npm publish
```

### 10.2 Environment Separation

| Environment | Purpose | Config |
|-------------|---------|--------|
| **Development** | Local development + testing | `NODE_ENV=development` |
| **CI** | Automated testing on every PR | `NODE_ENV=test`, all 3 OS + 2 Node versions |
| **npm publish** | Release pipeline on git tag | `NODE_ENV=production`, `NPM_TOKEN` secret |

No staging or production servers exist — this is a CLI tool. The "production" environment is the user's machine running the published npm package.

---

## 11. Third-Party Integrations

### 11.1 npm Registry API

**Purpose:** Resolve npm package names to downloadable tarballs.

**Endpoints used:**

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `GET https://registry.npmjs.org/<package>` | Package metadata (versions, tarball URLs, maintainers) | None |
| `GET https://registry.npmjs.org/<package>/-/<tarball>` | Download tarball | None |

**Error handling:**
- 404 → "Package not found on npm registry"
- 429 → Retry with exponential backoff (max 3 retries)
- Network error → "Cannot reach npm registry. Use a local path for offline scanning."

**Security:**
- HTTPS only
- Verify tarball integrity hash (sha512) from metadata
- Downloaded to `os.tmpdir()/mcp-audit-<random>/`
- Cleanup on exit

### 11.2 npm CLI (Dependency Audit)

**Purpose:** Run `npm audit` on the scanned package to detect dependency vulnerabilities.

**Invocation:**
```bash
npm audit --json --omit=dev 2>/dev/null
```

**Executed in:** The resolved package directory (temp dir or local path).

**Parsing:** JSON output parsed into `DependencyFinding[]` format. Fields mapped:
- `npm audit` severity → MCP-Audit severity (direct mapping)
- `npm audit` advisory URL → `references[]`
- `npm audit` fix recommendation → `recommendation`

**Fallback:** If `npm` is not available on PATH, skip dependency analysis with a warning.

---

## 12. Extensibility & Plugin Architecture

### 12.1 Analyzer Plugin Model

New analyzers are added by:

1. Creating a class that extends `BaseAnalyzer`
2. Registering it in the `AnalyzerRegistry`

No runtime plugin loading in v0.1 — all analyzers are compiled in. A dynamic plugin system (loading from `node_modules`) is deferred to v0.3+.

```typescript
// Adding a new analyzer:

// 1. Create src/analyzers/my-check/index.ts
class MyCheckAnalyzer extends BaseAnalyzer {
    readonly name = 'My Custom Check';
    readonly id = 'my-check';
    readonly description = 'Detects XYZ patterns';

    async analyze(server: MCPServer): Promise<Finding[]> {
        // Implementation
    }
}

// 2. Register in src/analyzers/index.ts
registry.register(new MyCheckAnalyzer());

// 3. Add config key in src/config/defaults.ts
// 4. Add tests in tests/unit/analyzers/my-check.test.ts
```

### 12.2 Pattern Library Extensibility

Patterns are stored as JSON files in `data/patterns/`. Users can add custom patterns via the config file:

```json
{
    "checks": {
        "tool-poisoning": {
            "customPatterns": [
                {
                    "regex": "my-org-specific-pattern",
                    "flags": "i",
                    "severity": "high",
                    "description": "Org-specific check"
                }
            ]
        }
    }
}
```

Custom patterns are merged with built-in patterns at scan time.

### 12.3 Output Formatter Extensibility

New output formats are added by implementing the `OutputFormatter` interface (§4.4) and registering in the CLI output router.

---

## 13. Performance & Scalability

### 13.1 Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Scan time (< 50 files) | < 10 seconds | Parallel analyzers, lazy AST parsing |
| Scan time (50–200 files) | < 30 seconds | Same + file filtering (only parse .ts/.js) |
| Memory usage | < 512 MB | Stream large files; do not load all ASTs simultaneously |
| npm resolution | < 5 seconds | Single HTTP request for metadata + tarball download |

### 13.2 Parallelism Strategy

```
Analyzers run in parallel:
  Promise.allSettled([
      poisoning.analyze(server),
      injection.analyze(server),
      dependency.analyze(server),
      network.analyze(server),
      filesystem.analyze(server),
      auth.analyze(server),
  ])
```

Each analyzer operates on the shared `MCPServer` object (read-only). ASTs are parsed lazily — only when an analyzer accesses `sourceFile.ast`.

### 13.3 Lazy AST Parsing

ASTs are expensive to produce. They are parsed on first access and cached on the `SourceFile` object:

```typescript
// src/scanner/parser.ts

function getAst(file: SourceFile): babel.File {
    if (!file.ast) {
        file.ast = babelParser.parse(file.content, {
            sourceType: 'module',
            plugins: ['typescript', 'decorators-legacy', 'jsx'],
        });
    }
    return file.ast as babel.File;
}
```

This ensures files that no analyzer needs to deep-inspect are never parsed.

---

## 14. ADRs Required Before Implementation

The following decisions require Architecture Decision Records before implementation begins:

| ADR Topic | Trigger (Rule 3) | When |
|-----------|-------------------|------|
| **Tech stack selection** — TypeScript, Commander.js, Vitest, @babel/parser | New external dependencies added | Before v0.1 implementation |
| **AST parser selection** — @babel/parser vs tree-sitter vs TypeScript compiler API | Architecture decision affecting all analyzers | Before v0.1 implementation |
| **Scoring algorithm — Markov chain model** | ML/AI scoring algorithm selection | Before v0.2 implementation |
| **CVE database selection** — better-sqlite3 vs alternative | New external dependency, data ownership | Before v0.2 implementation |
| **Telemetry design** — opt-in usage telemetry for scoring calibration | Cross-service data, privacy implications | Before v0.2 implementation |

---

## Appendix A — Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| [PRD-MCP-Audit](/dev-project-docs/PRD-MCP-Audit.md) | Parent — this TAD translates PRD requirements into engineering decisions |
| [Architecture Notes](/dev-project-docs/mcp-audit-architecture.md) | Source — informal architecture notes that this TAD formalizes |
| Feature Specs (`/docs/specs/`) | Downstream — individual feature specs reference this TAD for architecture context |
| ADRs (`/docs/adr/`) | Downstream — ADRs record specific decisions made within this architecture |

---

*This document was created with AI assistance (Claude Opus 4.6, P-02 Solution Architect persona). It must be reviewed and approved by the Project Owner before feature specs and implementation can proceed.*
