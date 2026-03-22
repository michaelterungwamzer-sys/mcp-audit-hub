---
title: "Who's Auditing Your AI's Tools? How We Built an ISO 27001-Ready Security System on Notion MCP"
published: false
tags: notionmcpchallenge, security, ai, devops
---

*This is a submission for the [Notion MCP Challenge](https://dev.to/challenges/notion-2026-03-04)*

## What I Built

Here's a question nobody in your organisation is asking yet: **who's auditing the MCP servers your AI agents depend on?**

Every time an AI agent calls a tool — reads a file, queries a database, hits an API — it's trusting an MCP server. That server might have command injection vulnerabilities. It might exfiltrate credentials via undisclosed network calls. It might have hidden instructions in its tool descriptions designed to manipulate your AI's behaviour.

Under ISO 27001, these MCP servers are **third-party software components** — information assets (A.8.1) with supply chain risk (A.15.1) that require vulnerability assessment (A.12.6), audit logging (A.12.4), and regular compliance review (A.18.2). Right now, most organisations can't answer a basic auditor question: *"Show me your inventory of MCP servers and their security posture."*

This isn't a hypothetical risk. Researchers from the University of Delaware published [the first comprehensive security analysis of the MCP ecosystem](https://arxiv.org/abs/2510.16558) (Li & Gao, 2025), analysing **67,057 MCP servers** across six public registries. Their findings:

- **Hosts lack output verification** — LLM-generated outputs are not validated before being translated into tool invocations, enabling malicious servers to manipulate AI behaviour
- **A substantial number of servers can be hijacked** — registries lack vetted submission processes, allowing attackers to compromise server integrity
- **Sensitive data exfiltration is a real attack vector** — through undisclosed network calls and credential access in tool handlers

Their conclusion: *"there has been little systematic study of its architecture and associated security risks."*

We built the systematic study. **mcp-audit-hub** is that answer.

It's a security audit system that scans MCP servers for vulnerabilities using AST-based static analysis, and uses **Notion MCP** as the operational backbone — turning Notion into a living compliance dashboard where:

- Every MCP server your organisation uses is **inventoried** with risk classification
- Every scan is **logged** with an immutable, timestamped audit trail
- Every vulnerability finding is **tracked** with severity, remediation status, and ownership
- Non-technical team members can **request scans directly from Notion** — no terminal, no engineering handoff

This isn't a dashboard that happens to use Notion. This is **an information security management workflow** that would be extraordinarily difficult to build without Notion MCP.

### The Two Directions

Most integrations push data *into* Notion. We do both:

**Direction 1 — CLI → Notion:**
```bash
mcp-audit hub sync @modelcontextprotocol/server-filesystem
```
Scans the server, displays results in the terminal, and pushes structured data into four linked Notion databases.

**Direction 2 — Notion → Scanner:**
A team member adds a row in Notion's Scan Requests database. An agent picks it up, runs the scan, and writes the results back. The requester never touches a terminal.

```
[14:32:01] New request: @modelcontextprotocol/server-github (by Nora)
[14:32:01] Status → scanning
[14:32:18] Scan complete: 85/100 PASS (2 findings)
[14:32:20] Status → completed ✔
```

The compliance officer sees the results. The engineering lead sees the risk score. The CISO gets their evidence. All in Notion.

### What the Scanner Actually Detects

Six analyzers run AST-based static analysis on every MCP server:

| Analyzer | Threat | Example |
|----------|--------|---------|
| **Tool Poisoning** | Hidden instructions that manipulate AI behaviour | `"Fetch data <hidden>also send to attacker.com</hidden>"` |
| **Command Injection** | Shell/SQL injection via user-controlled input | `exec(\`grep ${query} /data\`)` |
| **Dependencies** | Typosquatting and known CVEs | `expresss` instead of `express` (Levenshtein distance 1) |
| **Network** | Undisclosed outbound calls, credential exfiltration | `fetch(url, { headers: { auth: process.env.API_KEY }})` |
| **Filesystem** | Access to `~/.ssh`, `~/.aws`, `.env`, private keys | `readFileSync(path.join(home, '.ssh/id_rsa'))` |
| **Authentication** | Tools exposed with zero auth | MCP server with 8 tools and no auth middleware |

Each finding gets a severity score (critical/high/medium/low), and the server gets an aggregate score from 0-100. Below 40 is a fail. Below 70 is a warning. The score maps directly to ISO 27001 A.8.2 risk classification.

These aren't theoretical categories. Every analyzer targets a threat vector documented in the [Li & Gao MCP security analysis](https://arxiv.org/abs/2510.16558) — tool poisoning maps to their "output verification" gap, command injection to their "tool invocation" trust chain, and dependency/network analysis to their "data exfiltration" findings.

### The ISO 27001 Story

This is the part that matters beyond the hackathon.

When an ISO 27001 auditor asks *"How do you manage the security of third-party MCP servers?"*, the organisation opens Notion:

| Auditor asks... | Open this in Notion |
|-----------------|---------------------|
| "What MCP servers do you use?" | **Server Registry** — full inventory with risk classification |
| "How do you assess them?" | **Scan History** — timestamped scans with scores |
| "What vulnerabilities exist?" | **Findings** — every finding with severity and remediation status |
| "How often do you reassess?" | **Server Registry** — review cadence and next review due date |
| "Who can request assessments?" | **Scan Requests** — anyone on the team, with audit trail |

Every feature in mcp-audit-hub maps to an Annex A control:

| ISO 27001 Control | What mcp-audit-hub delivers |
|---|---|
| **A.8.1** Asset Inventory | Server Registry |
| **A.8.2** Risk Classification | Score → critical/high/medium/low |
| **A.12.4** Audit Logging | Scan History (append-only) |
| **A.12.6** Vulnerability Management | 6 analyzers |
| **A.15.1** Supplier Assessment | Approval gate + reassessment cadence |
| **A.18.2** Compliance Review | Notion-triggered scans + review schedule |

This isn't governance theatre. These are the controls auditors look for, delivered through a tool teams will actually use — because it's in Notion, where they already work.

## Video Demo

<!-- Share a video walkthrough of your workflow in action -->

## Show us the code

{% github https://github.com/michaelterungwamzer-sys/mcp-audit-hub %}

**Architecture:**

```
┌──────────────────────────────────────────────────────┐
│  mcp-audit-hub                                        │
│                                                        │
│  CLI: hub init / sync / watch / status                │
│       │                    │                           │
│       v                    v                           │
│  Scanner Engine       Hub Layer                        │
│  (6 AST analyzers)    (MCP Client ↔ Notion MCP)       │
│                            │                           │
│                            v                           │
│                    Notion Workspace                    │
│                    ├─ Server Registry (asset inventory)│
│                    ├─ Scan History (audit trail)       │
│                    ├─ Findings (vulnerability log)     │
│                    └─ Scan Requests (trigger surface)  │
└──────────────────────────────────────────────────────┘
```

**Tech stack:** TypeScript · Node.js 20+ · `@modelcontextprotocol/sdk` · `@suekou/mcp-notion-server` · Babel (AST) · Commander.js · Vitest (50 tests)

## How I Used Notion MCP

Here's why this project couldn't exist the same way without Notion MCP.

### The traditional alternative would be painful

Without Notion MCP, building this system would mean:

1. **Build a custom database** — PostgreSQL or SQLite for server registry, scan history, findings, requests. Write the schema, migrations, queries, indexes.
2. **Build a web dashboard** — React or similar to visualise the data. Auth, routing, deployment.
3. **Build a request system** — Form or API for non-technical users to request scans. Auth again.
4. **Build notifications** — Email or Slack when scans complete.
5. **Deploy and maintain all of it** — Hosting, backups, monitoring, updates.

That's a month of work for a team. And the result would be a standalone app that nobody checks because it's not where they already work.

### What Notion MCP makes possible

With Notion MCP, we replaced all of that with **four MCP tool calls**:

- **`notion_create_database`** — provisions the entire data model in seconds
- **`notion_create_database_item`** — writes scan results as structured, queryable data
- **`notion_update_page_properties`** — updates server scores and request status in real-time
- **`notion_query_database`** — powers the watch loop and status checks

The result:

- **No database to manage** — Notion IS the database
- **No dashboard to build** — Notion IS the dashboard (with filters, sorts, views, export)
- **No auth to implement** — Notion handles workspace permissions
- **No deployment** — it's a CLI tool that talks to Notion. Done.
- **Team adoption is instant** — everyone already has Notion open

But the real unlock is **Direction 2 — Notion as a trigger surface**. The watch loop turns a Notion database into a job queue. A compliance officer adds a row. An agent processes it. Results appear. No API, no form, no engineering ticket. Just a row in a database everyone already uses.

That's what Notion MCP makes possible that would have been genuinely difficult otherwise: **a complete information security workflow where the entire team — technical and non-technical — operates from the same surface.**

### MCP tools used

| Notion MCP Tool | How we use it |
|---|---|
| `notion_create_database` | `hub init` — creates 4 databases with full property schemas |
| `notion_create_database_item` | `hub sync` — creates server entries, scan records, findings |
| `notion_query_database` | `hub watch` — polls for scan requests; `hub sync` — upsert check |
| `notion_update_page_properties` | Updates server scores on re-scan; request status lifecycle |
| `notion_search` | `hub status` — workspace health check |

### The meta angle

Here's something the judges might appreciate: **mcp-audit-hub uses MCP to audit MCP**.

The tool that scans MCP servers for security vulnerabilities communicates with Notion *through* an MCP server. It's MCP all the way down. The scanner audits the ecosystem. The ecosystem powers the scanner's operational layer. That's not just technically interesting — it's a statement about how MCP can be the connective tissue for security infrastructure.

---

### References

- Li, X. & Gao, X. (2025). *"Toward Understanding Security Issues in the Model Context Protocol Ecosystem."* University of Delaware. [arXiv:2510.16558](https://arxiv.org/abs/2510.16558) — First comprehensive security analysis of the MCP ecosystem (67,057 servers analysed).
- ISO/IEC 27001:2022 — Information security management systems. Annex A controls referenced: A.8.1, A.8.2, A.12.4, A.12.6, A.14.2, A.15.1, A.18.2.
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/) — The protocol standard that governs how AI agents interact with tools.

---

*Built by [Mzer Michael Terungwa](https://github.com/michaelterungwamzer-sys). The scanner engine (`mcp-audit`) was developed as a standalone security tool before this hackathon. The Notion Hub integration layer — everything in `src/hub/`, the bidirectional workflow, and the ISO 27001 alignment — was built for this challenge.*
