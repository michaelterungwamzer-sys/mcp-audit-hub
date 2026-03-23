# mcp-audit-hub

**Security audit system for MCP servers, powered by Notion MCP.**

Scan MCP servers for vulnerabilities. Track results in Notion. Trigger scans from Notion — no terminal needed.

> Built for the [Notion MCP Challenge](https://dev.to/challenges/notion-2026-03-04) on DEV.to.

---

## The Problem

Organisations adopting MCP servers in AI applications have no structured way to:

- **Inventory** which MCP servers they use
- **Assess** them for security vulnerabilities
- **Track** findings over time
- **Prove** due diligence to auditors (ISO 27001 A.8.1, A.12.6, A.15.1)

`mcp-audit` can scan servers — but results vanish when the terminal closes. There's no audit trail, no team visibility, no workflow.

## The Solution

`mcp-audit-hub` adds a **bidirectional Notion integration** to the `mcp-audit` scanner:

```
Direction 1 (CLI → Notion):     mcp-audit hub sync → results land in Notion
Direction 2 (Notion → Scanner): Create request in Notion → agent scans → results appear
```

Notion becomes both the **dashboard** and the **trigger surface**.

---

## How It Works

### 1. Initialize — provision your Notion workspace

```bash
export NOTION_TOKEN="ntn_your_token"
mcp-audit hub init --page <notion-page-id>
```

Creates five linked databases in Notion:

| Database | Purpose | ISO 27001 |
|----------|---------|-----------|
| **MCP Server Registry** | Asset inventory of all MCP servers | A.8.1 |
| **Scan History** | Immutable audit trail of every scan | A.12.4 |
| **Findings** | Vulnerability log with severity and remediation status | A.12.6 |
| **Scan Requests** | Request queue for Notion-triggered scans | A.18.2 |
| **Escalations** | Score regressions and critical finding alerts | A.12.6, A.18.2 |

### 2. Scan + Sync — push results to Notion

```bash
# Single server
mcp-audit hub sync @modelcontextprotocol/server-filesystem

# Batch scan from dataset
mcp-audit hub sync-all --dataset servers.json
```

```
⠋ Scanning @modelcontextprotocol/server-filesystem...

  MCP Audit Report
  ────────────────────────────────
  Target:  @modelcontextprotocol/server-filesystem
  Score:   72 / 100 (WARN)

  Findings: 3 total
    ⚠  1 high    — Filesystem access to sensitive paths
    ⚠  1 medium  — No authentication mechanism detected
    ℹ  1 low     — Undisclosed network call in handler
  ────────────────────────────────

⠋ Syncing to Notion...
✔ Server Registry updated
✔ Scan History recorded
✔ 3 findings created
```

### 3. Notion-Triggered Scans — no terminal needed

Start the watch agent:

```bash
mcp-audit hub watch --interval 30
```

Then **anyone on the team** can request a scan from Notion:

1. Open the **Scan Requests** database
2. Add a row: Target = `@some/mcp-server`, Status = `requested`
3. Wait — status changes to `scanning` → `completed`
4. Click through to see the full scan results

```
[14:32:01] New request: @modelcontextprotocol/server-github (by Nora)
[14:32:01] Status → scanning
[14:32:18] Scan complete: 85/100 PASS (2 findings)
[14:32:20] Synced to Notion: Registry + History + Findings
[14:32:20] Status → completed ✔
```

Non-technical team members can trigger security assessments without CLI access.

### 4. Recurring Scans with Escalations

Set a review cadence on any server in the Notion Server Registry:

1. Open a server entry in the **Server Registry**
2. Set `Review Cadence` to `weekly`, `monthly`, or `quarterly`
3. Set `Next Review Due` to the first review date

The watch agent automatically re-scans overdue servers and advances the review date. If a server's score drops by more than the escalation threshold (default: 15 points), an **Escalation** entry is created in Notion.

```bash
mcp-audit hub watch --interval 30 --escalation-threshold 15
```

```
[09:15:00] Found 2 overdue server(s) for recurring scan
[09:15:00] Recurring scan: @mcp/server-filesystem (cadence: weekly, due: 2026-03-22)
[09:15:12] Scan complete: 52/100 WARN (4 findings)
[09:15:14] Synced to Notion: Registry + History + Findings
[09:15:14] Next Review Due advanced by weekly interval
[09:15:14] ESCALATION: score-regression for @mcp/server-filesystem (85 -> 52)
[09:15:14] Recurring scan complete ✔
```

Escalation triggers:
- **Score regression**: score drops by more than the threshold
- **Status downgrade**: server moves from `pass` to `warn` or `fail`
- **New critical finding**: scan produces a critical-severity finding

The security team reviews escalations in the **Escalations** database and tracks resolution status.

### 5. Status Check

```bash
mcp-audit hub status
```

```
  MCP Audit Hub Status
  ────────────────────────────────
  Workspace connected ✔

  Server Registry:  15 servers
    8 PASS  |  5 WARN  |  2 FAIL

  Pending Requests:  2

  Last 5 Scans:
    @mcp/server-github         85/100 PASS   2026-03-21
    @mcp/server-filesystem     72/100 WARN   2026-03-21
    ...
```

---

## What It Detects

The scanner runs 6 security analyzers via AST-based static analysis:

| Analyzer | What it finds | Severity |
|----------|--------------|----------|
| **Tool Poisoning** | Hidden instructions in tool descriptions, social engineering, undisclosed handler behaviour | Critical / High |
| **Command Injection** | Shell injection (`exec`, `spawn`), SQL injection, path traversal | Critical / High |
| **Dependencies** | Typosquatting (Levenshtein distance), npm audit vulnerabilities | High / Medium |
| **Network Analysis** | Undisclosed outbound HTTP calls, credential exfiltration via network | Critical / High |
| **Filesystem Access** | Access to `~/.ssh`, `~/.aws`, `.env`, credential files | Critical / High |
| **Authentication** | MCP servers exposing tools without any auth mechanism | High |

### Scoring

Score 0-100, calculated from findings:

| Severity | Points deducted |
|----------|----------------|
| Critical | -25 |
| High | -15 |
| Medium | -5 |
| Low | -1 |

**PASS** (>= 70, no criticals) · **WARN** (>= 40 or criticals present) · **FAIL** (< 40)

---

## ISO 27001 Compliance Alignment

Every feature maps to an ISO 27001:2022 Annex A control:

| Control | Title | How mcp-audit-hub delivers it |
|---------|-------|-------------------------------|
| **A.8.1** | Asset inventory | Server Registry = MCP server asset inventory |
| **A.8.2** | Risk classification | Auto-derived from scan score (critical/high/medium/low) |
| **A.12.4** | Logging & monitoring | Scan History — timestamped, append-only |
| **A.12.6** | Vulnerability management | 6 analyzers across tool poisoning, injection, deps, network, filesystem, auth |
| **A.14.2** | Secure development | Scan-before-adopt workflow via Approval gate |
| **A.15.1** | Supplier management | MCP servers are third-party suppliers — tracked with assessment status |
| **A.18.2** | Compliance review | Review cadence + Notion-triggered scans for continuous assessment |

---

## Setup

### Prerequisites

- **Node.js 20+**
- A **Notion workspace** with an integration token
- A **Notion page** shared with the integration (this becomes the hub parent page)

### Step 1: Create Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Create a new integration, copy the token (starts with `ntn_`)
3. Create a page in Notion (e.g., "MCP Audit Hub")
4. Share the page with your integration (page menu → Connections → add it)

### Step 2: Set Environment Variable

```bash
export NOTION_TOKEN="ntn_your_token_here"
```

### Step 3: Install and Initialize

```bash
# Clone the repo
git clone https://github.com/michaelterungwamzer-sys/mcp-audit-hub.git
cd mcp-audit-hub
npm install
npm run build

# Initialize Notion workspace
node bin/mcp-audit.js hub init --page <your-page-id>
```

The page ID is the 32-character hex string in the Notion page URL.

### Step 4: Scan

```bash
# Scan a single server
node bin/mcp-audit.js hub sync @modelcontextprotocol/server-filesystem

# Or start the watch agent for Notion-triggered scans
node bin/mcp-audit.js hub watch
```

---

## CLI Reference

```
mcp-audit hub init --page <id>          Provision Notion workspace
mcp-audit hub sync <target>             Scan + push results to Notion
mcp-audit hub sync-all --dataset <file> Batch scan from JSON file
mcp-audit hub watch [--interval <sec>]  Watch Notion for scan requests + recurring scans
                    [--escalation-threshold <pts>]
mcp-audit hub status [--json]           Workspace summary

mcp-audit scan <target> [options]       Scan only (no Notion)
mcp-audit checks --list                 List available analyzers
mcp-audit init                          Generate default config
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  CLI Commands                                            │
│  hub init / sync / sync-all / watch / status             │
└──────────┬───────────────────────────────┬──────────────┘
           │                               │
           v                               v
┌──────────────────┐            ┌──────────────────────┐
│  Scanner Engine   │            │  Hub Layer (NEW)      │
│  (6 analyzers)    │            │                       │
│                   │            │  MCP Client           │
│  resolver         │            │  ↕ stdio              │
│  parser (AST)     │            │  Notion MCP Server    │
│  aggregator       │            │  (@suekou)            │
│  scoring          │            │                       │
└──────────────────┘            │  Mappers (pure)       │
                                │  Sync (upsert)        │
                                │  Watch (poll loop)    │
                                └──────────────────────┘
                                           │
                                           v
                                ┌──────────────────────┐
                                │  Notion Workspace     │
                                │                       │
                                │  Server Registry      │
                                │  Scan History         │
                                │  Findings             │
                                │  Scan Requests        │
                                │  Escalations          │
                                └──────────────────────┘
```

**Design principles:**
- Scanner engine is untouched — hub layer is purely additive
- Both CLI sync and Notion-triggered watch call the same `scan()` function
- All Notion interactions go through MCP (not the REST API directly)
- Mappers are pure functions — fully testable without Notion

---

## How I Used Notion MCP

Notion MCP (`@suekou/mcp-notion-server`) is the core integration layer. mcp-audit-hub uses it for:

- **`notion_create_database`** — provisions the 5 databases during `hub init`
- **`notion_create_database_item`** — creates server entries, scan history records, and findings
- **`notion_update_page_properties`** — updates server scores on re-scan, updates request status
- **`notion_query_database`** — queries for existing servers (upsert), polls for scan requests, detects overdue reviews
- **`notion_search`** — workspace search for status command

The MCP server is spawned as a child process via `StdioClientTransport` from `@modelcontextprotocol/sdk`. No direct Notion API calls — everything goes through MCP.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript (ES2022, ESM) |
| Runtime | Node.js 20+ |
| MCP Client | `@modelcontextprotocol/sdk` (StdioClientTransport) |
| Notion MCP Server | `@suekou/mcp-notion-server` |
| CLI Framework | Commander.js |
| AST Parsing | Babel (JS/TS), tree-sitter (Python) |
| Build | tsup |
| Tests | Vitest (67 tests, all passing) |

---

## Development

```bash
npm install          # Install dependencies
npm run build        # Build
npm test             # Run tests (67 tests)
npm run test:watch   # Watch mode
npm run typecheck    # Type checking
```

---

## Licence

MIT
