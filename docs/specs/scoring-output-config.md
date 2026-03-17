# Feature Specification: Scoring, Output & Configuration

**Status**: Draft
**Author**: Claude Opus 4.6 (P-03 Tech Lead)
**Date**: 2026-03-17
**Last Updated**: 2026-03-17

---

## Overview

This spec covers the post-analysis pipeline: aggregating findings from all analyzers, deduplicating, scoring, formatting output, and configuration management. The scoring system uses a deterministic weighted-sum formula for v0.1 with co-location multiplier planned for v0.1.x and Markov chain scoring for v0.2.

---

## User Flow

1. All analyzers return their findings arrays to the aggregator
2. Aggregator combines all findings, deduplicates identical findings (same file:line + same type)
3. Scoring engine calculates security score: `score = max(0, 100 - Σ severity_weights)`
4. Classifier assigns result: PASS, WARN, or FAIL
5. Allowlist applied — matching findings suppressed from output (but logged as "suppressed")
6. Output formatter renders results per `--output` flag
7. Exit code set based on classification

---

## Scope

### In Scope

- Finding aggregation from all analyzers into unified list
- Deduplication (same file:line + finding type = one finding)
- Weighted severity scoring: critical=25, high=15, medium=5, low=1
- Classification: PASS (score ≥ 70, no criticals), WARN (score ≥ 40 or criticals), FAIL (score < 40)
- Allowlist support: suppress findings by ID or pattern
- Console output: colour-coded summary table + severity-grouped findings
- JSON output: structured output matching defined schema
- Configuration file: `mcp-audit.config.json` loaded from cwd
- CLI flags override config file values
- `init` subcommand generates default config file

### Out of Scope

- SARIF output (v0.2)
- HTML report generation (v0.2)
- Co-location multiplier (v0.1.x — separate implementation ticket)
- Markov chain scoring (v0.2 — requires separate ADR)

---

## Functional Requirements

### Result Aggregation & Scoring

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-90 | Aggregate findings from all analyzers, deduplicate identical findings, sort by severity | Must |
| FR-91 | Assign security score: `score = max(0, 100 - Σ severity_weights)` where critical=25, high=15, medium=5, low=1 | Must |
| FR-92 | Classify: PASS (score ≥ 70 AND no critical findings), WARN (score ≥ 40 OR critical findings present), FAIL (score < 40) | Must |
| FR-93 | Support allowlist configuration to suppress known false positives | Must |

### Output Formats

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-100 | Console output: summary table + findings grouped by severity with ID, title, file:line, evidence, recommendation | Must |
| FR-101 | Console colour coding: red=critical, yellow=high, cyan=medium, dim=low | Must |
| FR-102 | JSON output following defined schema (meta, summary, findings array, dependencies object) | Must |

### Configuration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-110 | Load configuration from `mcp-audit.config.json` in cwd if present | Must |
| FR-111 | CLI flags override configuration file values | Must |
| FR-112 | Config supports: analyzer enable/disable, severity thresholds, output preferences, allowlists | Must |

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Aggregation + scoring + output formatting in < 500ms |
| Reliability | Handle empty findings gracefully (clean scan → score 100, PASS) |
| Reliability | Handle malformed config file gracefully (warn + use defaults) |
| Testing | **100% line coverage** on scoring and deduplication logic (per PRD NFR-10) |

---

## Data and State Changes

| Entity | Operation | Description |
|--------|-----------|-------------|
| Findings arrays | READ | From all analyzer modules |
| Config file | READ | `mcp-audit.config.json` from cwd |
| Allowlist | READ | From config file |
| Console output | CREATE | Formatted terminal output |
| JSON output | CREATE | Structured JSON to stdout or file |
| Config file | CREATE | Via `init` subcommand only |

---

## Related ADRs

- [ADR-20260317-Security-Scoring-Algorithm](../adr/ADR-20260317-Security-Scoring-Algorithm.md) — Weighted sum formula and classification thresholds

---

## Scoring Logic Detail

### Severity Weights

| Severity | Weight | Meaning |
|----------|--------|---------|
| critical | 25 | Single critical finding drops score by 25 points |
| high | 15 | Single high finding drops score by 15 points |
| medium | 5 | Single medium finding drops score by 5 points |
| low | 1 | Single low finding drops score by 1 point |

### Classification Rules (order matters)

```
1. IF score < 40                          → FAIL
2. IF any critical findings present       → WARN (even if score ≥ 70)
3. IF score ≥ 70 AND no critical findings → PASS
4. IF score ≥ 40 AND score < 70           → WARN
```

**Critical check MUST happen after score check** — a score of 35 with criticals is FAIL (not WARN).

### Deduplication Rules

- Two findings are duplicates if: same `analyzerType` + same `filePath` + same `lineNumber`
- If duplicates differ in severity → keep the higher severity
- If same file but different lines → keep both (not duplicates)
- Deduplication happens before scoring

### Allowlist Format

```json
{
  "allowlist": {
    "findings": [
      { "id": "INJ-001", "reason": "Input is validated upstream" },
      { "pattern": "DEP-*", "reason": "All dependency warnings reviewed 2026-03-15" }
    ],
    "packages": ["known-safe-internal-package"]
  }
}
```

- Allowlisted findings are removed from the findings list before scoring
- Console output shows: "N findings suppressed by allowlist"

---

## Console Output Format

```
┌─────────────────────────────────────────────────────────────┐
│  MCP-AUDIT v0.1.0                                           │
│  Scanning: <target>                                         │
└─────────────────────────────────────────────────────────────┘

[■■■■■■■■■■] Resolving package... done (Xs)
[■■■■■■■■■■] Parsing MCP structure... done (Xs)
[■■■■■■■■■■] Running analyzers... done (Xs)

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

CRITICAL (2)                                          [red]
───────────────────────────────────────────────────────────────
[INJ-001] Command injection in query handler
  File: src/handlers/query.ts:47
  Code: exec(`psql ${userQuery}`)
  Fix:  Use parameterised queries or escape input

HIGH (1)                                              [yellow]
───────────────────────────────────────────────────────────────
[INJ-002] Potential SQL injection
  File: src/handlers/search.ts:23
  Code: db.query(`SELECT * FROM items WHERE name = '${name}'`)
  Fix:  Use parameterised queries

MEDIUM (3)                                            [cyan]
───────────────────────────────────────────────────────────────
...

LOW (0)                                               [dim]
───────────────────────────────────────────────────────────────
(none)

Score: 35/100 (FAIL)
```

### Clean Scan Output

```
✓ No security issues found

Score: 100/100 (PASS)
```

---

## JSON Output Schema

```json
{
  "meta": {
    "version": "0.1.0",
    "timestamp": "2026-03-17T14:30:00Z",
    "target": "@example/mcp-server-db",
    "targetType": "npm",
    "duration_ms": 2340
  },
  "summary": {
    "score": 35,
    "status": "FAIL",
    "findings": {
      "critical": 2,
      "high": 1,
      "medium": 3,
      "low": 0,
      "total": 6
    },
    "suppressed": 0
  },
  "findings": [
    {
      "id": "INJ-001",
      "analyzer": "command-injection",
      "severity": "critical",
      "title": "Command injection in query handler",
      "file": "src/handlers/query.ts",
      "line": 47,
      "code": "exec(`psql ${userQuery}`)",
      "recommendation": "Use parameterised queries or escape input",
      "references": ["https://cwe.mitre.org/data/definitions/78.html"]
    }
  ],
  "dependencies": {
    "total": 42,
    "direct": 12,
    "vulnerable": 3,
    "outdated": 7
  },
  "analyzers": {
    "tool-poisoning": { "status": "pass", "findings": 0, "duration_ms": 120 },
    "command-injection": { "status": "fail", "findings": 2, "duration_ms": 340 },
    "dependencies": { "status": "warn", "findings": 3, "duration_ms": 1200 },
    "authentication": { "status": "pass", "findings": 0, "duration_ms": 50 },
    "network": { "status": "warn", "findings": 1, "duration_ms": 180 },
    "filesystem": { "status": "pass", "findings": 0, "duration_ms": 90 }
  }
}
```

---

## Configuration File Schema

`mcp-audit.config.json` (generated by `mcp-audit init`):

```json
{
  "$schema": "https://mcp-audit.dev/schema/config-v1.json",
  "version": "1.0",
  "checks": {
    "tool-poisoning": { "enabled": true, "descriptionMaxLength": 500, "customPatterns": [] },
    "command-injection": { "enabled": true, "allowedSinks": [] },
    "dependencies": { "enabled": true, "ignoreCves": [], "checkOwnership": true },
    "authentication": { "enabled": true },
    "network": { "enabled": true, "allowedDomains": [] },
    "filesystem": { "enabled": true, "sensitivePaths": [] }
  },
  "severity": {
    "failThreshold": 40,
    "passThreshold": 70
  },
  "output": {
    "format": "console",
    "colors": true,
    "verbose": false
  },
  "allowlist": {
    "findings": [],
    "packages": []
  }
}
```

---

## Risks and Edge Cases

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| All findings allowlisted — confusing zero score | Low | Low | Show "N findings suppressed by allowlist" in output |
| Config file malformed JSON | Medium | Medium | JSON parse with try/catch; warn user; use defaults |
| Score boundary: exactly 70 or 40 | Low | Low | Unit tests for exact boundary values |
| No findings at all (clean server) | Medium | Low | Display "No security issues found" + score 100/100 (PASS) |
| Very many findings (>100) | Low | Medium | Truncate console output; full list in JSON output |
| Config file in parent directory (monorepo) | Medium | Low | Only check cwd; document limitation |

---

## Rollback Plan

1. Config file can be deleted — tool uses built-in defaults
2. npm version downgrade for code changes
3. Scoring weights are constants — easy to revert

---

## Dependencies

- **chalk** — Terminal colour output
- No external dependencies for scoring, aggregation, or JSON output

---

## Testing Strategy

- **Unit tests — Scoring** (100% coverage required):
  - Clean scan: zero findings → score 100, PASS
  - All critical: 4 criticals → score 0, FAIL
  - Mixed: 1 critical + 2 high + 3 medium → score = max(0, 100 - 25 - 30 - 15) = 30, FAIL
  - Boundary at 70: score exactly 70 with no criticals → PASS
  - Boundary at 70 with critical: score 75 + 1 critical → WARN (not PASS)
  - Boundary at 40: score exactly 40 → WARN
  - Below 40: score 39 → FAIL
  - Allowlisted findings removed before scoring

- **Unit tests — Deduplication:**
  - Same file:line + same type → deduplicated to one finding
  - Same file:line + same type + different severity → keep higher
  - Same file + different line → keep both
  - Different file + same type → keep both

- **Unit tests — JSON Output:**
  - Schema validation: output matches expected structure
  - Empty findings: valid JSON with empty arrays
  - All field types correct (numbers, strings, arrays)

- **Integration tests:**
  - Full scan producing console output against test fixture (snapshot test)
  - Full scan producing JSON output against test fixture (schema validation)
  - Config file loaded and applied correctly

- **Config tests:**
  - Valid config loaded successfully
  - Malformed config → defaults used + warning
  - CLI flags override config values
  - Missing config file → defaults used (no error)
