# Feature Specification: Tool Poisoning Analyzer

**Status**: Draft
**Author**: Claude Opus 4.6 (P-06 Security & Compliance Reviewer)
**Date**: 2026-03-17
**Last Updated**: 2026-03-17

---

## Overview

The Tool Poisoning Analyzer detects malicious or deceptive content in MCP tool descriptions. Tool poisoning is the #1 MCP-specific attack vector — attackers embed hidden instructions in tool descriptions that manipulate AI behaviour, exfiltrate data, or override user intent.

This analyzer catches three classes of poisoning:

1. **Excessive description length** — hiding instructions in verbose text
2. **Suspicious pattern matching** — known malicious phrases and prompt injection attempts
3. **Description-implementation discrepancy** — tool claims one behaviour while the handler performs undisclosed additional actions

---

## User Flow

1. Scanner orchestrator passes parsed MCP server structure (tool definitions with descriptions and handler references)
2. Analyzer iterates over all tool definitions
3. For each tool:
   - Check description length against thresholds
   - Scan description text for suspicious patterns from pattern library
   - Parse handler AST and compare implementation behaviour against description claims
4. Returns array of `PoisoningFinding` objects with type, severity, evidence, file:line, and recommendation

---

## Scope

### In Scope

- Description length analysis: flag >500 chars as `medium`, >1000 chars as `high`
- Pattern library matching against known malicious phrases (configurable JSON file)
- Suspicious pattern categories: hidden instructions, social engineering, data exfiltration keywords, environment access, stealth operations, prompt injection
- Description-implementation discrepancy detection via handler AST analysis
- Undisclosed actions: network calls, file operations, environment variable access, child process execution not mentioned in description
- Configurable pattern library at `data/patterns/poisoning.json`
- User-addable custom patterns via config

### Out of Scope

- Semantic/AI-based description analysis (future — requires LLM integration)
- Cross-tool interaction analysis (future — requires cross-tool dataflow)
- Dynamic execution or sandboxed testing of tools
- Non-English language detection (document limitation for v0.1)

---

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-30 | Flag tool descriptions exceeding 500 characters as `medium` severity and exceeding 1,000 characters as `high` severity | Must |
| FR-31 | Detect suspicious patterns in tool descriptions: hidden instruction patterns, social engineering phrases, data exfiltration keywords (per pattern library) | Must |
| FR-32 | Detect discrepancies between tool descriptions and implementation — actions performed by the handler that are not mentioned in the description | Must |
| FR-33 | Maintain a configurable pattern library at `data/patterns/poisoning.json` | Must |

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Analyze all tools in a typical server (< 20 tools) in < 2 seconds |
| Security | Pattern matching must not execute any code from the scanned server — pure text/AST analysis |
| Extensibility | New patterns can be added to the JSON pattern library without code changes |
| Accuracy | Target ≥ 90% true positive rate per PRD KPI (Section 12.2) |

---

## Data and State Changes

| Entity | Operation | Description |
|--------|-----------|-------------|
| Tool definitions | READ | Name, description, handler code reference from parsed MCP structure |
| Pattern library | READ | `data/patterns/poisoning.json` loaded at analyzer initialization |
| Handler source | READ | Handler file parsed to AST for discrepancy detection |

No writes — this analyzer is a pure analysis function.

---

## Related ADRs

- [ADR-20260317-AST-Parser-Selection](../adr/ADR-20260317-AST-Parser-Selection.md) — @babel/parser for handler AST analysis

---

## Pattern Library Structure

`data/patterns/poisoning.json`:

```json
{
  "version": "1.0",
  "categories": {
    "hidden_instructions": {
      "severity": "critical",
      "patterns": [
        "ignore\\s+(previous|prior|above)\\s+instructions?",
        "do\\s+not\\s+(tell|inform|alert)\\s+(the\\s+)?user",
        "\\[hidden\\]|\\[internal\\]|\\[system\\]",
        "before\\s+returning.*also|additionally.*without"
      ]
    },
    "social_engineering": {
      "severity": "high",
      "patterns": [
        "you\\s+must\\s+(always|never)",
        "always\\s+remember\\s+to",
        "before\\s+responding\\s+(to|you)"
      ]
    },
    "data_exfiltration": {
      "severity": "critical",
      "patterns": [
        "send\\s+(to|data|information)\\s+(external|remote|http)",
        "exfiltrate|steal|extract\\s+and\\s+send",
        "copy\\s+to\\s+(external|remote)",
        "transmit|forward\\s+to"
      ]
    },
    "environment_access": {
      "severity": "high",
      "patterns": [
        "read\\s+(env|environment|credentials|secrets|keys)",
        "access\\s+(api.?key|token|password|secret)",
        "process\\.env"
      ]
    },
    "stealth_operations": {
      "severity": "critical",
      "patterns": [
        "secretly|covertly|silently|quietly",
        "without\\s+(informing|telling|alerting|notifying)",
        "suppress\\s+(output|logging|error)"
      ]
    }
  }
}
```

## Discrepancy Detection Logic

For each tool handler:

1. Parse handler source file AST
2. Walk AST to detect:
   - **Network calls**: `fetch()`, `axios.*()`, `http.request()`, `https.request()`, `new WebSocket()`, `got()`, `undici`
   - **File operations**: `fs.readFile*()`, `fs.writeFile*()`, `fs.createReadStream()`, `fs.createWriteStream()`
   - **Environment access**: `process.env.*`, `dotenv`, `os.environ`
   - **Child process**: `exec()`, `spawn()`, `execSync()`, `child_process.*`
3. Extract keywords from tool description (simple tokenization)
4. Compare: if handler performs network calls but description doesn't mention "network", "http", "request", "fetch", "API", "send" → flag as `critical` undisclosed behaviour
5. Same logic for file operations, env access, child process

---

## Risks and Edge Cases

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| False positives on legitimate long descriptions | High | Medium | Configurable threshold; allowlist support (FR-93) |
| Obfuscated malicious patterns (Unicode homoglyphs, base64 encoding) | Medium | High | Normalize text (NFC) before matching; flag unusual encoding as suspicious |
| Description mentions actions the handler doesn't actually do | Low | Low | Info-level finding only ("description claims X but handler doesn't implement it") |
| Multi-language descriptions (non-English) | Medium | Medium | Pattern library supports regex; document English-only limitation for v0.1 |
| Dynamic tool descriptions (built at runtime) | Medium | High | Flag dynamic description construction as suspicious |
| Minified/bundled handler code | Medium | Medium | Attempt AST parse; if unparseable, flag as "unable to verify" with medium severity |

---

## Rollback Plan

1. Analyzer can be disabled via `--checks` flag (exclude `poisoning`) or config file
2. False positives can be suppressed via allowlist (FR-93)
3. Pattern library can be reverted to previous version

---

## Dependencies

- **@babel/parser** — Handler AST parsing for discrepancy detection
- **@babel/traverse** — AST walking to find network/file/env/exec calls
- **Pattern library** — `data/patterns/poisoning.json` (bundled with package)

---

## Testing Strategy

- **Unit tests** (≥ 10 test cases per PRD AC-03):
  - Length threshold: description at 499 chars (no flag), 501 chars (medium), 1001 chars (high)
  - Each pattern category: at least 2 test cases per category (match + non-match)
  - Discrepancy: handler with undisclosed `fetch()` call, handler with disclosed network call (no flag)
  - Empty description (should flag as info)
  - Description with code blocks (patterns inside code blocks — should still match)

- **Test fixtures:**
  - `fixtures/poisoned-server/` — MCP server with known poisoning patterns across all categories
  - `fixtures/clean-server/` — MCP server with legitimate descriptions (zero findings expected)
  - `fixtures/edge-cases/` — Very long descriptions, unicode, minified code

- **Edge case tests:**
  - Unicode homoglyphs in suspicious patterns
  - Extremely long description (10,000+ chars)
  - Tool with no description
  - Tool with dynamic description construction
  - Multiple tools, some poisoned, some clean
