# 🎬 Demo Video Cheat Sheet
**Print this and keep next to your screen**

---

## Pre-Recording Checklist
- [ ] Loom desktop app open
- [ ] Terminal font: 16-18pt
- [ ] Notion open in browser (logged in)
- [ ] `NOTION_TOKEN` exported
- [ ] Notifications OFF (Slack, email, Teams)
- [ ] Pre-run commands once (cache npm)

---

## Intro Hook (10 seconds)

**Show:** Terminal with env var already set

**Say:**
> "I've already created a Notion integration and set my token. Setup takes 2 minutes — instructions are in the README. Let's see what the tool does."

---

## Scene 1: Init (30 seconds)

**Terminal command:**
```
node bin/mcp-audit.js hub init --page YOUR_PAGE_ID
```

**Show:** Switch to Notion → 5 databases created

**Say:**
> "One command provisions the entire Notion workspace — Server Registry, Scan History, Findings, Scan Requests, and Escalations."

---

## Scene 2: Scan + Sync (60 seconds)

**Terminal command:**
```
node bin/mcp-audit.js hub sync @modelcontextprotocol/server-filesystem
```

**Show:** 
1. Terminal output (wait for completion)
2. Switch to Notion → click into Server Registry entry

**Say:**
> "The scanner runs 12 security analyzers. Results sync to Notion automatically — this is the audit trail."

---

## Scene 3: Notion-Triggered Scan (60 seconds)

**Terminal command:**
```
node bin/mcp-audit.js hub watch --interval 15
```

**Show:**
1. Switch to Notion → add new row in Scan Requests
2. Wait for terminal to process (~15 sec)
3. Show completed status in Notion

**Say:**
> "Anyone can request a scan from Notion. No terminal access needed."

---

## 💡 Recording Tips
- Speak **slower** than you think
- Mistakes are fine — Loom trims start/end
- One take is enough — don't over-polish
- **Total time target: 2.5 minutes**

---

## After Recording
1. Copy Loom link
2. Paste into dev.to:
   ```
   {% embed https://www.loom.com/share/YOUR_VIDEO_ID %}
   ```

---

*Good luck! 🚀*
