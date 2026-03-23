# Video Demo Script: mcp-audit-hub

**Target length:** 2:30 to 3:30
**Setup:** Split screen or switch between VS Code terminal and Notion desktop app.
**Tone:** Confident, measured, technical. Not salesy.

---

## SCENE 1: The Problem (0:00 - 0:25)

**[Screen: Notion page, empty "MCP Audit Hub" page]**

**Narration:**

> Organisations adopting AI agents are integrating MCP servers into their workflows, but there is no standard way to assess these servers for security vulnerabilities, track findings over time, or demonstrate compliance to auditors.
> 
> Research from the University of Delaware analysed over 67,000 MCP servers and found systemic issues: servers that can be hijacked, credentials that can be exfiltrated, and tool descriptions that can manipulate AI behaviour.
> 
> mcp-audit-hub addresses this. It scans MCP servers for vulnerabilities and uses Notion MCP as the operational backbone for tracking, reporting, and triggering scans.

---

## SCENE 2: Initialisation (0:25 - 0:50)

**[Screen: VS Code terminal]**

**Narration:**

> First, I initialise the Notion workspace. A single command provisions four linked databases: a Server Registry for asset inventory, Scan History for audit trails, Findings for vulnerability tracking, and Scan Requests for the Notion-triggered workflow.

**[Type and run:]**

```bash
export NOTION_TOKEN="ntn_your_token"
mcp-audit hub init --page <page-id>
```

**[Wait for output showing 4 databases created]**

**Narration:**

> Four databases, created in seconds via the Notion MCP server. No manual setup required.

**[Switch to Notion: show the 4 databases now visible under the parent page]**

---

## SCENE 3: Scan and Sync (0:50 - 1:30)

**[Screen: VS Code terminal]**

**Narration:**

> Now I scan an MCP server and sync the results to Notion. This is Direction 1: CLI to Notion.

**[Type and run:]**

```bash
mcp-audit hub sync @modelcontextprotocol/server-filesystem
```

**[Wait for scan output: table of checks, score, then Notion sync confirmation]**

**Narration:**

> The scanner runs six analyzers using AST-based static analysis: tool poisoning, command injection, dependency vulnerabilities, undisclosed network calls, filesystem access, and missing authentication. Results display in the terminal, then sync to Notion automatically.

**[Switch to Notion: show the Server Registry with the new entry, click into it to show properties]**

**Narration:**

> In the Server Registry, the server now has a risk classification, score, and scan timestamp. This maps directly to ISO 27001 A.8.1, asset inventory.

**[Click to Scan History: show the scan entry with score breakdown]**

**Narration:**

> Scan History provides the immutable audit trail required by A.12.4.

---

## SCENE 4: Notion-Triggered Scan (1:30 - 2:30)

**[Screen: VS Code terminal]**

**Narration:**

> This is Direction 2, and the part that changes the workflow entirely. I start the watch agent, which polls Notion for scan requests.

**[Type and run:]**

```bash
mcp-audit hub watch --interval 15
```

**[Wait for "Watching Notion for scan requests" message]**

**[Switch to Notion: Scan Requests database]**

**Narration:**

> Now, anyone on the team can request a security assessment without touching a terminal. I will add a scan request directly in Notion.

**[In Notion: click "+ New", type target name (e.g. @modelcontextprotocol/server-github), set Status to "requested", fill in Requested By]**

**Narration:**

> I have added a row with the target server and set the status to "requested". The watch agent will pick this up on its next poll cycle.

**[Switch to terminal: wait for the watch loop to detect and process the request]**

**[Terminal shows:]**

```
[timestamp] New request: @modelcontextprotocol/server-github (by Mzer)
[timestamp] Status → scanning
[timestamp] Scan complete: 100/100 PASS (0 findings)
[timestamp] Status → completed ✔
```

**Narration:**

> The agent detected the request, ran the scan, synced the results, and updated the status to completed.

**[Switch to Notion: show the Scan Requests row now showing "completed" status]**

**[Click to Server Registry: show the new server entry]**

**Narration:**

> The compliance officer, the engineering lead, and the CISO can all see the results without requesting a terminal session or filing an engineering ticket. The entire workflow, from request to results, happens in Notion.

---

## SCENE 5: Recurring Scans and Escalations (2:30 - 3:15)

**[Screen: Notion, Server Registry database]**

**Narration:**

> Point-in-time audits are not sufficient for ongoing security assurance. ISO 27001 A.18.2 requires controls to be verified at planned intervals. mcp-audit-hub handles this automatically.

**[In Notion: click on the server entry from Scene 3, set Review Cadence to "weekly", set Next Review Due to today's date or yesterday]**

**Narration:**

> I set a review cadence of "weekly" and a next review date of today on this server. The watch agent, which is already running, will detect that this server is overdue and re-scan it automatically.

**[Switch to terminal: watch loop detects and processes the overdue server]**

**[Terminal shows:]**

```
[timestamp] Found 1 overdue server(s) for recurring scan
[timestamp] Recurring scan: @modelcontextprotocol/server-filesystem (cadence: weekly, due: 2026-03-23)
[timestamp] Scan complete: 72/100 WARN (3 findings)
[timestamp] Synced to Notion: Registry + History + Findings
[timestamp] Next Review Due advanced by weekly interval
[timestamp] Recurring scan complete ✔
```

**Narration:**

> The agent detected the overdue review, re-scanned the server, synced the results, and advanced the next review date by seven days. If the score had dropped significantly, an escalation entry would appear in the Escalations database, alerting the security team to the regression.

**[Switch to Notion: show the Server Registry entry with updated Next Review Due date]**

**[Briefly show the Escalations database, even if empty, to demonstrate it exists]**

**Narration:**

> The admin configures the frequency. The agent enforces it. The team sees everything in Notion. No cron jobs, no scripts, no infrastructure to maintain.

---

## SCENE 6: Close (3:15 - 3:30)

**[Screen: Notion showing all 5 databases populated]**

**Narration:**

> mcp-audit-hub turns Notion into a complete security audit system for the MCP ecosystem. Every feature maps to an ISO 27001 Annex A control. Every interaction goes through the Notion MCP server. The scanner audits MCP; MCP powers the scanner.
>
> The code is open source on GitHub. Thank you.

**[Show GitHub repo URL on screen]**

---

## Recording Tips

1. **Pre-run `hub init` once** before recording so the Notion MCP server package is cached by npx. This avoids a long download wait on camera.
2. **Pre-scan one server** so the Server Registry is not completely empty when you show it.
3. **Use a 15-second poll interval** for `hub watch` so the pickup is fast on camera.
4. **Keep the terminal font large** (16-18pt) so it reads well in the video.
5. **Rehearse the Notion clicks** so you are not hunting for databases on camera.
6. **For Scene 5**: set the `Next Review Due` to today or yesterday before starting the watch loop, so the recurring scan triggers immediately on camera.
7. **Total length target: under 3:30.** Judges watch many submissions; respect their time.
