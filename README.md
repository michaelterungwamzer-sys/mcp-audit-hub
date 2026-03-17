# mcp-audit

CLI security scanner for [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) servers. Detects tool poisoning, command injection, dependency vulnerabilities, undisclosed network/filesystem access, and missing authentication.

## Installation

```bash
npm install -g mcp-audit
```

Or run without installing:

```bash
npx mcp-audit scan <target>
```

## Quick Start

```bash
# Scan a local MCP server directory
mcp-audit scan ./my-mcp-server

# Scan an npm package
mcp-audit scan @modelcontextprotocol/server-filesystem

# Output as JSON (for CI/CD pipelines)
mcp-audit scan ./server --output=json

# Run specific checks only
mcp-audit scan ./server --checks=poisoning,injection

# Write report to file
mcp-audit scan ./server --output=json --report=report.json
```

## What It Detects

| Check | What it finds | Severity |
|-------|--------------|----------|
| **Tool Poisoning** | Hidden instructions in tool descriptions, social engineering, data exfiltration keywords, undisclosed handler behaviour | Critical / High |
| **Command Injection** | Shell injection (`exec`, `spawn`), SQL injection (string interpolation in queries), path traversal | Critical / High |
| **Dependencies** | Typosquatting (similar names to popular packages), npm audit vulnerabilities | High / Medium |
| **Network Analysis** | Undisclosed outbound HTTP calls, environment variable exfiltration via network | Critical / High |
| **Filesystem Access** | Access to `~/.ssh`, `~/.aws`, `.env`, credential files, path traversal with user input | Critical / High |
| **Authentication** | MCP servers exposing tools without any authentication mechanism | High |

## Example Output

```
  MCP-AUDIT v0.1.0
  Scanning: ./vulnerable-server

┌───────────────────┬────────┬──────────┐
│ Check             │ Status │ Findings │
├───────────────────┼────────┼──────────┤
│ tool-poisoning    │ ⚠      │ 3        │
│ command-injection │ ✗      │ 2        │
│ dependencies      │ ✓      │ 0        │
│ network           │ ⚠      │ 1        │
│ filesystem        │ ✗      │ 1        │
│ authentication    │ ⚠      │ 1        │
└───────────────────┴────────┴──────────┘

CRITICAL (2)
────────────────────────────────────────────────────────
[INJ-001] Shell injection: exec() with user-controlled input
  File: src/handlers/query.ts:47
  Code: exec(`grep -r ${query} /data`)
  Fix:  Use parameterized commands or shell escaping.

[FS-001] Sensitive file access: readFileSync("~/.ssh/id_rsa")
  File: src/handlers/config.ts:12
  Fix:  Avoid accessing sensitive credential files.

Score: 15/100 (FAIL)
```

## CLI Reference

```
mcp-audit scan <target> [options]

Arguments:
  target              npm package name or local directory path

Options:
  --checks <list>     comma-separated analyzer list (e.g., poisoning,injection,deps)
  --output <format>   output format: console (default), json
  --report <path>     write output to file
  --config <path>     path to config file
  --no-color          disable coloured output
  --verbose           show detailed output
  -V, --version       output version number
  -h, --help          display help

mcp-audit init        generate default mcp-audit.config.json
mcp-audit checks      list available security checks
```

## Configuration

Generate a config file:

```bash
mcp-audit init
```

This creates `mcp-audit.config.json`:

```json
{
    "checks": {
        "tool-poisoning": { "enabled": true },
        "command-injection": { "enabled": true },
        "dependencies": { "enabled": true },
        "network": { "enabled": true },
        "filesystem": { "enabled": true },
        "authentication": { "enabled": true }
    },
    "severity": {
        "failThreshold": 40,
        "passThreshold": 70
    },
    "allowlist": {
        "findings": [],
        "packages": []
    }
}
```

## Scoring

Security score (0-100) calculated from findings:

| Severity | Points deducted |
|----------|----------------|
| Critical | 25 |
| High | 15 |
| Medium | 5 |
| Low | 1 |

**Classification:**
- **PASS** (score >= 70, no critical findings)
- **WARN** (score >= 40, or critical findings present)
- **FAIL** (score < 40)

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | PASS — no findings above threshold |
| 1 | FAIL or WARN — findings detected |
| 2 | Error — scan could not complete |

## CI/CD Integration

```yaml
# GitHub Actions
- name: Security scan
  run: npx mcp-audit scan ./server --output=json --report=security-report.json

- name: Upload report
  uses: actions/upload-artifact@v4
  with:
    name: security-report
    path: security-report.json
```

## Programmatic API

```typescript
import { scan } from 'mcp-audit';

const result = await scan('./my-mcp-server', {
    checks: { 'tool-poisoning': { enabled: true } },
    severity: { failThreshold: 40, passThreshold: 70, weights: { critical: 25, high: 15, medium: 5, low: 1 } },
    output: { format: 'json', colors: false, verbose: false },
    allowlist: { findings: [], packages: [] },
});

console.log(`Score: ${result.summary.score}/100 (${result.summary.status})`);
```

## Requirements

- Node.js 20+

## Licence

MIT
