# Video Recording Guide

## Recording Tools

### Option 1: Screen recording with voiceover (recommended)

Free tools on Windows 11:

- **Xbox Game Bar** (built in): press `Win + G`, click the record button. Records your screen with microphone audio.
- **OBS Studio** (free): more control, but more setup.

Steps:
1. Open VS Code and Notion side by side
2. Press `Win + G` to open Game Bar
3. Click the microphone icon to enable mic
4. Click Record
5. Walk through the script, reading the narration as you go
6. Press `Win + G` again to stop

### Option 2: No narration, just text overlays

If you don't want to speak on camera:
1. Record the screen silently
2. Add text captions explaining each step
3. Use Clipchamp (built into Windows 11, search for it in Start menu) to add text overlays

### Option 3: Loom (easiest of all)

1. Go to https://www.loom.com and sign up (free tier)
2. Install the Chrome extension or desktop app
3. Click Record, select screen + mic
4. Walk through the demo
5. It gives you a shareable link immediately

**Recommendation:** Loom. No editing needed, gives you a link you can paste directly into the DEV.to post. You can re-record as many times as you want.

---

## Before You Record

### Step 1: Set your token (PowerShell)

```powershell
$env:NOTION_TOKEN = "ntn_your_new_token"
cd C:\wamp64\www\DevSecOps\mcp-audit-hub
```

### Step 2: Pre-cache the MCP server package

```powershell
npx -y @suekou/mcp-notion-server --help
```

### Step 3: Pre-scan a server so Registry is not empty

```powershell
node bin/mcp-audit.js hub sync @modelcontextprotocol/server-filesystem
```

### Step 4: Set up recurring scan demo

In Notion, open the Server Registry and set these fields on the server you just scanned:
- **Review Cadence**: `weekly`
- **Next Review Due**: yesterday's date (so it triggers immediately on camera)

### Step 5: Verify everything works

```powershell
# Quick test: start watch, let it pick up the overdue server, then Ctrl+C
node bin/mcp-audit.js hub watch --interval 15 --escalation-threshold 15
```

You should see the recurring scan trigger within 15 seconds.

---

## Recording Sequence (follow VIDEO-SCRIPT.md)

1. **Scene 1 (0:00 - 0:25)**: Show empty Notion page, narrate the problem
2. **Scene 2 (0:25 - 0:50)**: Run `hub init`, show 5 databases created
3. **Scene 3 (0:50 - 1:30)**: Run `hub sync`, show results in terminal and Notion
4. **Scene 4 (1:30 - 2:30)**: Start `hub watch`, create scan request in Notion, watch it complete
5. **Scene 5 (2:30 - 3:15)**: Show recurring scan: set cadence in Notion, watch agent re-scans automatically
6. **Scene 6 (3:15 - 3:30)**: Close with all 5 databases populated, GitHub URL

---

## Tips

- Keep terminal font large (16-18pt)
- Rehearse Notion clicks so you are not hunting for databases
- Use 15-second poll interval for fast pickup on camera
- Total target: under 3:30
- You can re-record as many times as you want with Loom
