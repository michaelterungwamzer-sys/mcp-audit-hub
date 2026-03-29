# Video Demo Script: mcp-audit-hub

**Target length:** 2:45 - 3:00
**Setup:** VS Code terminal + Notion browser side-by-side (or quick switch)
**Tone:** Confident, measured, technical. Not salesy.

---

## INTRO (0:00 - 0:15)

**[Screen: Terminal or title card]**

**Narration:**

> In this video, I'm going to demonstrate mcp-audit-hub — a tool that scans MCP servers for security vulnerabilities and syncs results directly to Notion. You'll see three things: workspace setup, a scan with automatic sync, and a Notion-triggered scan where anyone can request an audit without touching the terminal.

---

## SETUP NOTE (0:15 - 0:20)

**[Screen: Terminal showing prompt]**

**Narration:**

> I've already created a Notion integration and exported my token — that setup takes two minutes, and I've linked it in the README. Let's see what the tool does.

---

## SCENE 1: Init (0:20 - 0:45)

**[Screen: VS Code terminal]**

**[Type and run:]**

```bash
node bin/mcp-audit.js hub init --page YOUR_PAGE_ID
```

**[Wait for output showing 5 databases created]**

**Narration:**

> One command provisions the entire Notion workspace — Server Registry, Scan History, Findings, Scan Requests, and Escalations.

**[Switch to Notion: show the 5 databases now visible under the parent page]**

---

## SCENE 2: Scan + Sync (0:45 - 1:45)

**[Screen: VS Code terminal]**

**[Type and run:]**

```bash
node bin/mcp-audit.js hub sync @modelcontextprotocol/server-filesystem
```

**[Wait for scan output: table of checks, score, then Notion sync confirmation]**

**Narration:**

> The scanner runs 12 security analyzers. Results sync to Notion automatically — this is the audit trail.

**[Switch to Notion: show the Server Registry with the new entry, click into it to show properties]**

**Narration (optional, if time allows):**

> The server now has a risk classification, score, and scan timestamp. Findings are linked. This maps to ISO 27001 asset inventory and audit logging controls.

---

## SCENE 3: Notion-Triggered Scan (1:45 - 2:45)

**[Screen: VS Code terminal]**

**[Type and run:]**

```bash
node bin/mcp-audit.js hub watch --interval 15
```

**[Wait for "Watching Notion for scan requests..." message]**

**[Switch to Notion: Scan Requests database]**

**Narration:**

> Anyone can request a scan from Notion. No terminal access needed.

**[In Notion: click "+ New", type target name (e.g. @modelcontextprotocol/server-github), set Status to "requested"]**

**Narration:**

> I add a row with the target server and set status to "requested".

**[Switch to terminal: wait for the watch loop to detect and process the request (~15 seconds)]**

**[Terminal shows scan processing and completion]**

**[Switch to Notion: show the Scan Requests row now showing "completed" status]**

**Narration:**

> The agent detected the request, ran the scan, and synced the results. The compliance team sees everything without touching a terminal.

---

## CLOSE (2:45 - 2:55)

**[Screen: Notion showing databases populated]**

**Narration:**

> mcp-audit-hub turns Notion into a security audit system for MCP servers. The code is open source. Thank you.

---

## Recording Tips

1. **Pre-run commands once** before recording so npm packages are cached
2. **Use 15-second poll interval** for `hub watch` so pickup is fast on camera
3. **Terminal font: 16-18pt** so it reads well in video
4. **Rehearse Notion clicks** so you're not hunting for databases on camera
5. **Total target: under 2:45** — judges watch many submissions

---

## What to Skip (mention in written submission instead)

- Detailed Notion integration setup (link to README)
- Recurring scans and escalations
- ISO 27001 control mappings
- Multiple servers / batch scans
