# PRD — MCP-Audit: CLI Security Scanner for MCP Servers

**Document ID:** PRD-MCP-Audit
**Version:** 0.1.0-draft
**Status:** Draft
**Author:** Product Strategist (AI-assisted — Claude Opus 4.6)
**Created:** 2026-03-17
**Last Updated:** 2026-03-17

---

## Document History

| Version | Date       | Author                | Changes               |
|---------|------------|-----------------------|-----------------------|
| 0.1.0   | 2026-03-17 | Claude Opus 4.6 (P-01) | Initial draft created |
| 0.1.1   | 2026-03-17 | Claude Opus 4.6 (P-02) | Added phased Markov chain scoring strategy (FR-94, FR-95, FR-96) |

---

## Table of Contents

1. [Problem Statement & Objectives](#1-problem-statement--objectives)
2. [Business Rules & Constraints (BRD)](#2-business-rules--constraints-brd)
3. [User Personas & Use Cases](#3-user-personas--use-cases)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [User Stories / Epics](#6-user-stories--epics)
7. [UX Flow Descriptions](#7-ux-flow-descriptions)
8. [Integrations & Dependencies](#8-integrations--dependencies)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Out-of-Scope Items](#10-out-of-scope-items)
11. [Assumptions & Open Questions](#11-assumptions--open-questions)
12. [Success Metrics (KPIs)](#12-success-metrics-kpis)

---

## 1. Problem Statement & Objectives

### 1.1 Problem

The Model Context Protocol (MCP) ecosystem is growing rapidly. Developers integrate MCP servers into AI-powered applications — giving language models access to tools, file systems, databases, and APIs. However, **no dedicated security scanner exists for MCP servers**. This creates a critical blind spot:

- **Tool poisoning** — MCP tool descriptions can contain hidden instructions that manipulate AI behaviour, exfiltrate data, or bypass user intent. There is no automated way to detect this.
- **Command injection** — MCP server handlers frequently invoke shell commands, database queries, or file operations using user-controlled input. Without static analysis, injection sinks go unreviewed.
- **Dependency vulnerabilities** — MCP servers are npm/pip packages with dependency trees. Known CVEs in transitive dependencies are invisible without explicit auditing.
- **Undisclosed behaviour** — An MCP server's tool description may claim one behaviour while the implementation performs additional undisclosed actions (network calls, file reads, environment variable access).

Developers currently rely on manual code review — which is slow, inconsistent, and does not scale across the hundreds of community MCP servers available today.

### 1.2 Objectives

| Objective | Description |
|-----------|-------------|
| **O-1** | Provide a single CLI command that scans any MCP server (npm package, local directory, or GitHub repo) for security vulnerabilities |
| **O-2** | Detect the top MCP-specific attack vectors: tool poisoning, command injection, dependency vulnerabilities, undisclosed network/filesystem behaviour |
| **O-3** | Produce actionable output — every finding includes severity, evidence, file/line location, and a remediation recommendation |
| **O-4** | Integrate into CI/CD pipelines via JSON and SARIF output formats |
| **O-5** | Build an open-core product with a free tier sufficient for individual developers and a paid tier for teams and enterprises |

---

## 2. Business Rules & Constraints (BRD)

> *This section fulfils the BRD requirement. Per the Product Document Guidebook, the BRD is merged into the PRD as a "Business Rules & Constraints" section for non-regulated, small-team products.*

### 2.1 Business Objectives

| ID    | Objective | Success Measure |
|-------|-----------|-----------------|
| B-01  | Establish MCP-Audit as the standard security scanner for the MCP ecosystem | 1,000+ npm weekly downloads within 6 months of launch |
| B-02  | Build trust through transparency — open-source core under MIT licence | Public GitHub repo with active community contributions |
| B-03  | Generate revenue through Pro/Enterprise tiers | First paying customer within 3 months of Pro tier launch |
| B-04  | Reduce the time to audit an MCP server from hours (manual review) to seconds (automated scan) | Average scan completes in < 30 seconds for typical MCP server |

### 2.2 Business Model — Open Core

| Tier | Price | Includes |
|------|-------|----------|
| **Free (MIT)** | $0 | Core scanning, console + JSON output, all analyzers, npm audit integration |
| **Pro** | $29/month or $199/year | HTML reports, CI/CD integrations (GitHub Action, GitLab CI), CVE database with daily updates, priority pattern updates, Slack/Discord alerts, team dashboard |
| **Enterprise** | Custom pricing | On-premise deployment, custom rule development, SLA support, compliance reports (SOC2), private pattern libraries |

### 2.3 Regulatory & Compliance Constraints

- **No PII collected.** MCP-Audit scans source code and package metadata. It does not collect, store, or transmit personally identifiable information. NDPR/GDPR obligations are limited to the project website and any user accounts for Pro/Enterprise tiers.
- **No financial data handled.** The tool itself does not process payments in v0.1. Payment processing for Pro/Enterprise tiers is deferred to a later phase and will require a separate ADR when implemented.
- **Open-source licence compliance.** All dependencies must be compatible with MIT licence. GPL-licensed dependencies are prohibited in the core distribution.
- **CVE data attribution.** When the CVE database is introduced (v0.2+), data sourced from NVD, OSV, or similar databases must include proper attribution per their terms of use.

### 2.4 Business Process Flow

```
Developer installs mcp-audit (npm i -g mcp-audit)
        │
        ▼
Developer runs: mcp-audit scan <target>
        │
        ▼
Tool resolves target (npm registry / local path / GitHub URL)
        │
        ▼
Tool scans source code across all analyzer modules
        │
        ▼
Tool outputs findings with severity, evidence, and recommendations
        │
        ▼
Developer remediates findings or adds to allowlist
        │
        ▼
Developer re-scans to verify fixes
```

### 2.5 Constraints

| Constraint | Detail |
|------------|--------|
| **Timeline** | MVP (v0.1) must be feature-complete within 6 weeks |
| **Budget** | Bootstrap — no external funding. Development cost is labour only |
| **Team size** | Solo developer + AI-assisted development |
| **Platform** | Must run on Node.js 20+ across macOS, Linux, and Windows |
| **Offline capability** | Core scanning must work fully offline. CVE database sync requires connectivity but is optional |

### 2.6 Stakeholder Sign-Off Requirements

| Stakeholder | Role | Sign-Off On |
|-------------|------|-------------|
| Project Owner | Developer / Founder | PRD, TAD, Feature Specs, Release decisions |

---

## 3. User Personas & Use Cases

### 3.1 Personas

#### P1 — Individual Developer

- **Role:** Full-stack developer building AI applications with MCP
- **Goal:** Quickly verify that an MCP server is safe before integrating it into their project
- **Frustration:** Has to manually read source code of every MCP server; no standardised way to assess risk
- **Tech comfort:** High — comfortable with CLI tools, npm, CI/CD
- **Typical use:** `mcp-audit scan @modelcontextprotocol/server-filesystem` before adding to `claude_desktop_config.json`

#### P2 — Security Engineer / DevSecOps

- **Role:** Security team member responsible for reviewing third-party integrations
- **Goal:** Systematically audit all MCP servers used across the organisation; integrate into CI/CD gates
- **Frustration:** No existing tool covers MCP-specific attack vectors; general SAST tools miss tool poisoning and description-based attacks
- **Tech comfort:** Expert — needs JSON/SARIF output, CI integration, allowlists
- **Typical use:** `mcp-audit scan ./server --output=sarif` piped into security dashboard

#### P3 — MCP Server Author

- **Role:** Developer who builds and publishes MCP servers
- **Goal:** Scan their own server before publishing to ensure it passes security checks; build trust with consumers
- **Frustration:** No way to demonstrate that their MCP server has been security-reviewed
- **Tech comfort:** High — wants watch mode during development, badge for README
- **Typical use:** `mcp-audit watch ./my-mcp-server` during development; `mcp-audit scan . --output=json` in CI

### 3.2 Use Cases

| ID   | Persona | Use Case | Priority |
|------|---------|----------|----------|
| UC-1 | P1 | Scan an npm package before installing it | **Must have** |
| UC-2 | P1 | Scan a local MCP server directory | **Must have** |
| UC-3 | P2 | Scan with JSON output for pipeline integration | **Must have** |
| UC-4 | P2 | Scan with SARIF output for security dashboard | Should have |
| UC-5 | P3 | Watch mode — re-scan on file changes during development | Should have |
| UC-6 | P1 | Audit MCP config file to scan all configured servers | Should have |
| UC-7 | P2 | Generate HTML report for stakeholder review | Should have |
| UC-8 | P1 | Scan from a GitHub repository URL | Could have (v0.2) |
| UC-9 | P2 | Check against known CVE database | Could have (v0.2) |
| UC-10 | P3 | Generate security badge for README | Could have (v0.2) |

---

## 4. Functional Requirements

### 4.1 CLI Interface

| ID    | Requirement | Priority |
|-------|-------------|----------|
| FR-01 | The system shall accept a scan target as a positional argument. Supported target types: npm package name, local directory path | Must have |
| FR-02 | The system shall accept a `--checks` flag to limit scanning to specific analyzer modules (e.g., `--checks=poisoning,injection,deps`) | Must have |
| FR-03 | The system shall accept an `--output` flag supporting values: `console` (default), `json` | Must have |
| FR-04 | The system shall accept a `--report` flag to write output to a file path | Should have |
| FR-05 | The system shall provide an `init` subcommand to generate a default `mcp-audit.config.json` | Should have |
| FR-06 | The system shall provide a `checks --list` subcommand to display all available analyzers | Must have |
| FR-07 | The system shall display a progress spinner during scanning with elapsed time | Must have |
| FR-08 | The system shall exit with code 0 on success (no findings above threshold), code 1 on findings above threshold, code 2 on error | Must have |

### 4.2 Package Resolution

| ID    | Requirement | Priority |
|-------|-------------|----------|
| FR-10 | The system shall resolve npm package names by downloading and extracting the package tarball to a temporary directory | Must have |
| FR-11 | The system shall resolve local directory paths by scanning files in place (no copy) | Must have |
| FR-12 | The system shall resolve GitHub URLs (`github:owner/repo`) by cloning the repository to a temporary directory | Could have (v0.2) |
| FR-13 | The system shall cache resolved packages to avoid redundant downloads within a session | Should have |
| FR-14 | The system shall clean up all temporary directories on exit (normal or error) | Must have |

### 4.3 MCP Server Parsing

| ID    | Requirement | Priority |
|-------|-------------|----------|
| FR-20 | The system shall detect MCP server structure by parsing source files for MCP SDK usage patterns (tool definitions, resource definitions, prompt definitions) | Must have |
| FR-21 | The system shall extract tool names, descriptions, input schemas, and handler file/line references | Must have |
| FR-22 | The system shall extract resource and prompt definitions where present | Should have |
| FR-23 | The system shall support TypeScript and JavaScript source files | Must have |
| FR-24 | The system shall support Python source files | Could have (v0.2) |

### 4.4 Analyzers

#### 4.4.1 Tool Poisoning Analyzer

| ID    | Requirement | Priority |
|-------|-------------|----------|
| FR-30 | The system shall flag tool descriptions exceeding 500 characters as `medium` severity and exceeding 1,000 characters as `high` severity | Must have |
| FR-31 | The system shall detect suspicious patterns in tool descriptions: hidden instruction patterns, social engineering phrases, data exfiltration keywords (per pattern library) | Must have |
| FR-32 | The system shall detect discrepancies between tool descriptions and implementation — actions performed by the handler that are not mentioned in the description | Must have |
| FR-33 | The system shall maintain a configurable pattern library (`data/patterns/poisoning.json`) | Must have |

#### 4.4.2 Command Injection Analyzer

| ID    | Requirement | Priority |
|-------|-------------|----------|
| FR-40 | The system shall identify calls to dangerous sinks: `exec`, `execSync`, `spawn`, `spawnSync`, `execFile`, `child_process.*`, and equivalents | Must have |
| FR-41 | The system shall perform basic taint analysis — trace arguments to dangerous sinks back to function parameters (user-controlled input) | Must have |
| FR-42 | The system shall detect SQL injection sinks: `query`, `execute`, `raw`, `rawQuery`, `knex.raw`, `sequelize.query` with string interpolation | Must have |
| FR-43 | The system shall detect path traversal patterns — user input concatenated into file paths without validation | Must have |

#### 4.4.3 Dependency Analyzer

| ID    | Requirement | Priority |
|-------|-------------|----------|
| FR-50 | The system shall run `npm audit` (or equivalent) on the target's `package.json` and parse results into the unified finding format | Must have |
| FR-51 | The system shall detect potential typosquatting — flag packages whose names are within edit distance 1–2 of popular MCP/AI packages | Must have |
| FR-52 | The system shall check npm registry for recent ownership transfers (last 90 days) on dependencies | Should have |
| FR-53 | The system shall generate a basic Software Bill of Materials (SBOM) listing all direct and transitive dependencies | Should have |

#### 4.4.4 Network Analyzer

| ID    | Requirement | Priority |
|-------|-------------|----------|
| FR-60 | The system shall detect outbound network calls (HTTP/HTTPS requests, WebSocket connections) in handler code | Must have |
| FR-61 | The system shall flag data exfiltration patterns — user data or environment variables sent to external endpoints | Must have |
| FR-62 | The system shall compare detected network endpoints against tool descriptions — undisclosed network access is flagged as `high` severity | Must have |

#### 4.4.5 Filesystem Analyzer

| ID    | Requirement | Priority |
|-------|-------------|----------|
| FR-70 | The system shall detect file read/write operations in handler code | Must have |
| FR-71 | The system shall flag access to sensitive paths: `~/.ssh`, `~/.aws`, `~/.env`, credential files, private keys | Must have |
| FR-72 | The system shall detect path traversal vulnerabilities — user input used in file paths without sanitisation | Must have |

#### 4.4.6 Authentication Analyzer

| ID    | Requirement | Priority |
|-------|-------------|----------|
| FR-80 | The system shall check for the presence of authentication configuration in the MCP server setup | Must have |
| FR-81 | The system shall flag MCP servers that expose tools without any authentication mechanism | Must have |

### 4.5 Result Aggregation & Scoring

| ID    | Requirement | Priority |
|-------|-------------|----------|
| FR-90 | The system shall aggregate findings from all analyzers, deduplicate identical findings, and sort by severity | Must have |
| FR-91 | The system shall assign a security score (0–100) based on finding count and severity weights: critical=25, high=15, medium=5, low=1 — score = max(0, 100 - sum of weights) | Must have |
| FR-92 | The system shall classify the overall result as PASS (score >= 70, no critical findings), WARN (score >= 40 or critical findings present), or FAIL (score < 40) | Must have |
| FR-93 | The system shall support an allowlist configuration to suppress known false positives | Must have |
| FR-94 | The system shall apply a **co-location multiplier** (1.5×) to findings that share the same file or handler scope — two or more findings in the same handler indicate a potential attack chain and must score higher than isolated findings | Must have (v0.1.x) |
| FR-95 | The system shall support a **Markov chain scoring mode** (`--scoring=chain`) that models state transitions between finding types along execution paths. Transition probabilities define the likelihood of an attacker progressing from one vulnerability to the next (e.g., tool poisoning → injection sink → data exfiltration). The chain probability compounds to produce an escalated severity that reflects real-world exploitability, not just finding presence. **An ADR is required before implementation** (Rule 3 — ML/AI scoring algorithm selection) | Should have (v0.2) |
| FR-96 | The Markov chain scoring model shall use a **published, auditable transition probability matrix** that users can inspect and override via configuration. Default probabilities shall be calibrated from real-world scan data collected during v0.1 usage (opt-in telemetry only) | Should have (v0.2) |

### 4.6 Scoring Strategy Roadmap

The scoring system evolves across releases to move from naive independent scoring to chain-aware risk modelling:

| Phase | Version | Approach | Rationale |
|-------|---------|----------|-----------|
| **1 — Weighted sum** | v0.1 | `score = max(0, 100 - Σ severity_weights)`. Each finding contributes independently based on severity | Simple, explainable, sufficient to ship MVP |
| **2 — Co-location bonus** | v0.1.x | Findings sharing the same file or handler scope receive a 1.5× severity multiplier before summing. This is the simplest chain-aware adjustment without probabilistic formalism | Quick win that addresses the biggest blind spot — chained findings in the same handler scoring identically to isolated findings |
| **3 — Markov chain scoring** | v0.2 | Optional mode (`--scoring=chain`). State transitions model attacker progression between finding types. Chain probability compounds to escalate combined severity. Requires an ADR and calibrated transition matrix | Differentiator — no existing security scanner does chain-aware probabilistic scoring. Calibrated from v0.1 real-world scan data |
| **4 — Chain scoring default** | v0.3+ | Markov chain scoring becomes the default. Transition matrix is published and user-tuneable | After validation with real users confirms accuracy improvement over weighted sum |

**Why Markov chains and not simpler heuristics:**

Traditional scanners treat findings independently. But MCP attack vectors are inherently sequential — tool poisoning enables injection, injection enables exfiltration, missing auth removes the last barrier. A Markov chain naturally models this:

```
[Tool Poisoning] → [Injection Sink Reachable] → [Data Exfiltration]
     P=0.7               P=0.5                       P=0.8

Chain probability = 0.7 × 0.5 × 0.8 = 0.28 → escalates to CRITICAL
```

Two servers with identical individual finding counts can have vastly different real-world risk profiles depending on whether their findings chain together. The co-location multiplier (Phase 2) is the pragmatic first step; Markov scoring (Phase 3) is the full solution.

### 4.7 Output Formats

| ID     | Requirement | Priority |
|--------|-------------|----------|
| FR-100 | Console output shall display a summary table, followed by findings grouped by severity, each with ID, title, file:line, evidence snippet, and recommendation | Must have |
| FR-101 | Console output shall use colour coding: red for critical, yellow for high, cyan for medium, dim for low | Must have |
| FR-102 | JSON output shall follow the schema defined in the architecture document (meta, summary, findings array, dependencies object) | Must have |
| FR-103 | SARIF output shall comply with SARIF v2.1.0 specification for CI/CD tool ingestion | Should have (v0.2) |
| FR-104 | HTML report output shall provide a standalone HTML file with findings, charts, and recommendations | Should have (v0.2) |

### 4.8 Configuration

| ID     | Requirement | Priority |
|--------|-------------|----------|
| FR-110 | The system shall load configuration from `mcp-audit.config.json` in the current working directory if present | Must have |
| FR-111 | CLI flags shall override configuration file values | Must have |
| FR-112 | The configuration file shall support: enabling/disabling individual analyzers, severity thresholds, output preferences, and allowlists | Must have |

---

## 5. Non-Functional Requirements

| ID    | Category | Requirement | Target |
|-------|----------|-------------|--------|
| NFR-01 | **Performance** | Scan a typical MCP server (< 50 source files) | < 10 seconds |
| NFR-02 | **Performance** | Scan a large MCP server (50–200 source files) | < 30 seconds |
| NFR-03 | **Portability** | Run on Node.js 20+ across macOS, Linux, and Windows | All three platforms |
| NFR-04 | **Install size** | npm package install size (excluding optional deps) | < 50 MB |
| NFR-05 | **Offline** | All core analyzers must function without network access | Full offline capability |
| NFR-06 | **Security** | The tool itself must not introduce vulnerabilities — no `eval`, no shell injection, no arbitrary code execution from scanned packages | Zero own vulnerabilities |
| NFR-07 | **Security** | Scanned code is never executed — analysis is purely static | Static analysis only |
| NFR-08 | **Extensibility** | New analyzers can be added by implementing a base class interface without modifying core scanner code | Plugin architecture |
| NFR-09 | **Reliability** | The tool must not crash on malformed input — gracefully handle invalid packages, missing files, parse errors | Graceful degradation |
| NFR-10 | **Testing** | Minimum 80% line coverage across all modules; 100% coverage on severity scoring and finding deduplication logic | Per SDGP Rule 10 |

---

## 6. User Stories / Epics

### Epic 1 — Core CLI & Scanner Infrastructure

| ID   | Story | Acceptance Criteria |
|------|-------|---------------------|
| US-1.1 | As a developer, I want to run `mcp-audit scan <target>` so that I can scan any MCP server with a single command | CLI parses target argument, resolves source, runs all enabled analyzers, outputs results |
| US-1.2 | As a developer, I want to see a progress spinner during scanning so that I know the tool is working | Spinner displays during scan; replaced by results on completion |
| US-1.3 | As a developer, I want the tool to exit with code 1 when findings exceed my severity threshold so that I can use it as a CI gate | Exit code 0 for pass, 1 for fail, 2 for error |
| US-1.4 | As a developer, I want to scan a local directory so that I can audit MCP servers I'm developing | `mcp-audit scan ./my-server` works on local paths |
| US-1.5 | As a developer, I want to scan an npm package by name so that I can audit servers before installing them | `mcp-audit scan @scope/package-name` downloads and scans the package |

### Epic 2 — Analyzers

| ID   | Story | Acceptance Criteria |
|------|-------|---------------------|
| US-2.1 | As a developer, I want to detect tool poisoning in MCP server descriptions so that I can identify hidden malicious instructions | Suspicious patterns flagged with evidence and severity |
| US-2.2 | As a developer, I want to detect command injection vulnerabilities so that I can prevent shell/SQL injection attacks | Dangerous sinks with user-controlled input flagged |
| US-2.3 | As a developer, I want to see dependency vulnerabilities so that I can update or replace risky packages | npm audit findings mapped to unified format |
| US-2.4 | As a developer, I want to detect undisclosed network behaviour so that I can identify data exfiltration risks | Network calls not mentioned in tool descriptions flagged |
| US-2.5 | As a developer, I want to detect sensitive file access so that I can prevent credential theft | Access to ~/.ssh, ~/.aws, ~/.env etc. flagged |
| US-2.6 | As a developer, I want to detect missing authentication so that I can identify unprotected MCP servers | Servers without auth configuration flagged |

### Epic 3 — Output & Reporting

| ID   | Story | Acceptance Criteria |
|------|-------|---------------------|
| US-3.1 | As a developer, I want colour-coded console output so that I can quickly identify critical issues | Console output uses red/yellow/cyan colour coding by severity |
| US-3.2 | As a DevSecOps engineer, I want JSON output so that I can integrate findings into my security pipeline | `--output=json` produces valid JSON matching the defined schema |
| US-3.3 | As a developer, I want a security score (0–100) so that I can quickly assess overall risk | Score calculated from findings; PASS/WARN/FAIL classification displayed |

### Epic 4 — Chain-Aware Scoring

| ID   | Story | Acceptance Criteria |
|------|-------|---------------------|
| US-4.1 | As a developer, I want findings in the same handler to score higher than isolated findings so that I can prioritise real attack chains | Co-location multiplier applied; chained findings visually indicated in output |
| US-4.2 | As a security engineer, I want a Markov chain scoring mode so that the risk score reflects exploitability, not just finding count | `--scoring=chain` produces chain-aware scores; transition matrix is inspectable |
| US-4.3 | As a security engineer, I want to tune the transition probability matrix so that I can calibrate scoring to my organisation's threat model | Custom matrix loadable from config file; overrides defaults |

### Epic 5 — Configuration & Customisation

| ID   | Story | Acceptance Criteria |
|------|-------|---------------------|
| US-5.1 | As a developer, I want to configure which checks run so that I can focus on relevant risks | `--checks` flag and config file both work |
| US-5.2 | As a developer, I want to allowlist known false positives so that I can reduce noise | Allowlisted findings suppressed from output |
| US-5.3 | As a developer, I want to generate a default config file so that I can customise the tool | `mcp-audit init` creates `mcp-audit.config.json` |
| US-5.4 | As a developer, I want to select specific checks via `--checks` flag so that I can run targeted scans | `--checks=poisoning,injection` runs only those analyzers |

---

## 7. UX Flow Descriptions

### 7.1 Primary Flow — Scan an MCP Server

```
$ mcp-audit scan @example/mcp-server-db

┌─────────────────────────────────────────────────────────────┐
│  MCP-AUDIT v0.1.0                                           │
│  Scanning: @example/mcp-server-db                           │
└─────────────────────────────────────────────────────────────┘

[■■■■■■■■■■] Resolving package... done (1.2s)
[■■■■■■■■■■] Parsing MCP structure... done (0.3s)
[■■■■■■■■■■] Running analyzers... done (2.3s)

SUMMARY
═══════════════════════════════════════════════════════════════
│ Check              │ Status │ Findings │
├────────────────────┼────────┼──────────│
│ Tool Poisoning     │   ✓    │    0     │
│ Command Injection  │   ✗    │    2     │
│ Dependencies       │   ⚠    │    3     │
│ Authentication     │   ✓    │    0     │
│ Network Analysis   │   ⚠    │    1     │
│ Filesystem Access  │   ✓    │    0     │
═══════════════════════════════════════════════════════════════

CRITICAL (2)
───────────────────────────────────────────────────────────────
[INJ-001] Command injection in query handler
  File: src/handlers/query.ts:47
  Code: exec(`psql ${userQuery}`)
  Fix:  Use parameterized queries or escape input

...

Score: 35/100 (FAIL)
```

### 7.2 Clean Scan Flow

```
$ mcp-audit scan ./my-safe-server

┌─────────────────────────────────────────────────────────────┐
│  MCP-AUDIT v0.1.0                                           │
│  Scanning: ./my-safe-server                                 │
└─────────────────────────────────────────────────────────────┘

[■■■■■■■■■■] Analyzing... done (1.1s)

✓ No security issues found

Score: 100/100 (PASS)
```

---

## 8. Integrations & Dependencies

### 8.1 Runtime Dependencies

| Dependency | Purpose | Licence |
|------------|---------|---------|
| commander | CLI argument parsing | MIT |
| chalk | Terminal colour output | MIT |
| ora | Progress spinner | MIT |
| @babel/parser | JavaScript/TypeScript AST parsing | MIT |
| tree-sitter (optional) | Multi-language AST parsing | MIT |
| better-sqlite3 | Local CVE database (v0.2) | MIT |
| glob / fast-glob | File pattern matching | MIT |

### 8.2 External Service Integrations

| Service | Purpose | Phase |
|---------|---------|-------|
| npm registry API | Package resolution, metadata lookup, ownership checks | v0.1 |
| GitHub API | Repository cloning and metadata (v0.2) | v0.2 |
| NVD / OSV API | CVE database sync (v0.2) | v0.2 |

### 8.3 Distribution Channels

| Channel | Format | Phase |
|---------|--------|-------|
| npm | `npm install -g mcp-audit` | v0.1 |
| npx | `npx mcp-audit scan ...` | v0.1 |
| Docker | `docker run mcp-audit scan ...` | v0.2 |
| GitHub Action | `uses: mcp-audit/action@v1` | v0.2 |

---

## 9. Acceptance Criteria

### 9.1 MVP (v0.1) Acceptance Criteria

| ID   | Criterion | Verification |
|------|-----------|--------------|
| AC-01 | Running `mcp-audit scan <npm-package>` downloads, extracts, scans, and reports findings for a valid npm package | Integration test with a known-vulnerable test fixture |
| AC-02 | Running `mcp-audit scan <local-dir>` scans a local directory and reports findings | Integration test with local test fixtures |
| AC-03 | Tool poisoning analyzer detects all patterns in the pattern library against test fixtures | Unit tests with ≥ 10 poisoning test cases |
| AC-04 | Command injection analyzer detects `exec`, `spawn`, and SQL injection sinks with user-controlled input | Unit tests with ≥ 8 injection test cases |
| AC-05 | Dependency analyzer wraps `npm audit` and maps findings to unified format | Integration test with a package containing known vulnerabilities |
| AC-06 | Network analyzer detects undisclosed HTTP calls in handler code | Unit tests with ≥ 5 network exfiltration test cases |
| AC-07 | Filesystem analyzer detects access to sensitive paths | Unit tests with ≥ 5 filesystem test cases |
| AC-08 | Console output displays colour-coded summary table and findings | Manual verification + snapshot test |
| AC-09 | JSON output produces valid JSON matching the defined schema | Schema validation test |
| AC-10 | Security score is calculated correctly — verified against hand-calculated expected scores | Unit tests with ≥ 5 scoring scenarios |
| AC-11 | Exit code is 0 for pass, 1 for fail, 2 for error | Integration tests |
| AC-12 | Temporary directories are cleaned up on normal exit and on error/SIGINT | Integration test verifying no temp dir leaks |
| AC-13 | Tool does not execute any code from scanned packages | Code review + test verifying no `require`/`import` of scanned code |
| AC-14 | All tests pass with ≥ 80% line coverage | CI pipeline verification |

### 9.2 v0.1.x Acceptance Criteria (Co-location Scoring)

| ID    | Criterion | Verification |
|-------|-----------|--------------|
| AC-15 | Two findings in the same handler/file score higher than two identical findings in separate files | Unit test: same-handler pair scores 1.5× vs separate-file pair |
| AC-16 | Co-location multiplier is applied before the final score calculation, not after classification | Unit test verifying calculation order |
| AC-17 | Console output indicates when findings are chain-linked (co-located) | Snapshot test showing chain indicator in output |

### 9.3 Post-MVP Acceptance Criteria (v0.2)

| ID    | Criterion |
|-------|-----------|
| AC-20 | GitHub URL resolution works for public repositories |
| AC-21 | SARIF output validates against SARIF v2.1.0 schema |
| AC-22 | HTML report renders correctly in modern browsers |
| AC-23 | CVE database sync downloads and stores vulnerability data |
| AC-24 | Watch mode re-scans on file changes with debouncing |
| AC-25 | Markov chain scoring mode (`--scoring=chain`) produces different scores than weighted sum for chained vs isolated findings | Integration test with chained and isolated fixture servers |
| AC-26 | Transition probability matrix is loadable from configuration and the default matrix is published in documentation | Config validation test + docs review |
| AC-27 | ADR for Markov scoring algorithm exists and is approved before implementation begins | Governance audit |

---

## 10. Out-of-Scope Items

The following are **explicitly excluded** from v0.1 and must not be built without a feature spec:

| Item | Rationale |
|------|-----------|
| GitHub URL resolution (`github:owner/repo`) | Adds complexity around authentication, rate limiting, and large repo handling — deferred to v0.2 |
| Python/pip package scanning | Requires separate resolver and AST parser — deferred to v0.2 |
| CVE database sync and lookup | Requires database management, update mechanism, and data attribution — deferred to v0.2 |
| HTML report generation | Requires templating engine and styling — deferred to v0.2 |
| SARIF output | Requires SARIF schema compliance — deferred to v0.2 |
| Watch mode | Requires file watcher integration — deferred to v0.2 |
| Config file auditing (`mcp-audit config`) | Requires parsing multiple MCP config formats — deferred to v0.2 |
| Markov chain scoring (`--scoring=chain`) | Requires calibrated transition probability matrix from real-world scan data — deferred to v0.2. **ADR required** before implementation (Rule 3 — ML/AI scoring algorithm). Co-location multiplier (1.5×) ships in v0.1.x as interim |
| Full taint analysis (dataflow) | Basic sink detection is in scope; full interprocedural dataflow analysis is deferred |
| GitHub Action | Requires Action packaging and marketplace publishing — deferred to v0.2 |
| VS Code extension | Deferred to v0.3+ |
| Pro/Enterprise features | Payment, dashboards, team management — deferred to post-launch |
| Dynamic analysis / runtime scanning | Out of scope entirely — MCP-Audit is a static analysis tool |

---

## 11. Assumptions & Open Questions

### 11.1 Assumptions

| ID   | Assumption |
|------|------------|
| A-01 | MCP servers follow the official MCP SDK patterns for tool/resource/prompt definitions. Non-standard implementations may produce incomplete parse results |
| A-02 | The primary MCP server ecosystem is JavaScript/TypeScript on npm. Python support is secondary |
| A-03 | Users have Node.js 20+ installed (or use npx/Docker) |
| A-04 | npm registry API is available for package resolution. Offline mode uses only local scanning |
| A-05 | AST-based static analysis provides sufficient detection quality for v0.1 without full dataflow analysis |

### 11.2 Open Questions

| ID   | Question | Impact | Owner |
|------|----------|--------|-------|
| OQ-01 | Should the tool support scanning MCP servers written in Rust, Go, or other compiled languages? | Affects parser architecture — may require tree-sitter from v0.1 | Project Owner |
| OQ-02 | What is the false positive tolerance for v0.1? Should the tool err on the side of more findings (noisy) or fewer findings (risk of false negatives)? | Affects analyzer sensitivity thresholds | Project Owner |
| OQ-03 | Should the security score formula be configurable, or fixed? | Affects configuration schema and UX | Project Owner |
| OQ-04 | Is the `mcp-audit diff` command (comparing two versions) needed for v0.2, or can it be deferred further? | Affects v0.2 scope | Project Owner |
| OQ-05 | For typosquatting detection — what is the reference list of "popular" packages? Should it be curated or auto-generated from npm download counts? | Affects dependency analyzer design | Project Owner |

---

## 12. Success Metrics (KPIs)

### 12.1 Product Metrics

| Metric | Target (6 months post-launch) | Measurement |
|--------|-------------------------------|-------------|
| npm weekly downloads | 1,000+ | npm stats |
| GitHub stars | 500+ | GitHub API |
| Active monthly users (CLI telemetry opt-in) | 200+ | Anonymous usage telemetry (opt-in only) |
| Community-contributed analyzers or patterns | 5+ | GitHub PRs |

### 12.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| True positive rate (tool poisoning) | ≥ 90% | Benchmark against curated test suite |
| True positive rate (command injection) | ≥ 85% | Benchmark against curated test suite |
| False positive rate (all analyzers) | ≤ 15% | User-reported false positives / total findings |
| Average scan time (typical MCP server) | < 10 seconds | Performance benchmarks |
| Test coverage | ≥ 80% (100% for scoring/dedup) | CI coverage reports |

### 12.3 Business Metrics

| Metric | Target (12 months post-launch) | Measurement |
|--------|--------------------------------|-------------|
| Pro tier subscribers | 50+ | Payment platform |
| Enterprise inquiries | 5+ | Inbound contact form |
| Revenue (ARR) | $10,000+ | Accounting |

---

## Appendix A — Relationship to Architecture Document

The architecture document at `/dev-project-docs/mcp-audit-architecture.md` contains detailed technical design including:

- Directory structure and file layout
- TypeScript interfaces for analyzers and findings
- Detection logic pseudocode
- Data flow diagrams
- Tech stack decisions
- Configuration schema

This PRD defines **what** to build and **why**. The architecture document and the forthcoming TAD / Solution Architecture define **how** to build it. The architecture document should be formalised into the TAD at `/docs/solution-doc-architecture.md`.

---

*This document was created with AI assistance (Claude Opus 4.6, P-01 Product Strategist persona). It must be reviewed and approved by the Project Owner before downstream work (TAD, Feature Specs, ADRs) can proceed.*
