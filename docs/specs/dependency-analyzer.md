# Feature Specification: Dependency Analyzer

**Status**: Draft
**Author**: Claude Opus 4.6 (P-06 Security & Compliance Reviewer)
**Date**: 2026-03-17
**Last Updated**: 2026-03-17

---

## Overview

The Dependency Analyzer audits the target MCP server's package dependencies for known vulnerabilities, typosquatting risks, and suspicious ownership changes. It wraps `npm audit` for vulnerability detection, implements Levenshtein distance comparison for typosquatting, and checks npm registry metadata for recent ownership transfers.

---

## User Flow

1. Orchestrator passes the resolved package root directory
2. Analyzer reads `package.json` and `package-lock.json`
3. Runs `npm audit --json --omit=dev` and parses results into unified finding format
4. Checks each dependency name against popular MCP/AI package list for typosquatting (edit distance 1–2)
5. Queries npm registry API for maintainer changes in last 90 days (optional — requires network)
6. Generates basic SBOM listing direct and transitive dependencies
7. Returns `DependencyFinding` array

---

## Scope

### In Scope

- `npm audit` integration: run `npm audit --json --omit=dev`, parse advisories into unified finding format
- Typosquatting detection: compare dependency names against curated list of popular packages; flag edit distance 1–2 matches
- Ownership transfer check: query npm registry API for maintainer changes in last 90 days — flag as `medium` severity
- Basic SBOM generation: list all direct and transitive dependencies with versions
- Fallback when no `package-lock.json`: read `package.json` dependencies, warn user that audit is limited

### Out of Scope

- `pip-audit` / Python dependencies (v0.2)
- CVE database sync and local lookup (v0.2)
- Licence compliance checking (future)
- Dependency graph visualisation (future)

---

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-50 | Run `npm audit` on the target's `package.json` and parse results into unified finding format | Must |
| FR-51 | Detect potential typosquatting — flag packages whose names are within edit distance 1–2 of popular MCP/AI packages | Must |
| FR-52 | Check npm registry for recent ownership transfers (last 90 days) on dependencies | Should |
| FR-53 | Generate a basic Software Bill of Materials (SBOM) listing all direct and transitive dependencies | Should |

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | `npm audit` completes in < 10 seconds; typosquatting check in < 1 second |
| Offline | Typosquatting check works offline (curated list bundled). `npm audit` and ownership checks require network |
| Security | Never install or execute dependencies — only read metadata and run `npm audit` |

---

## Data and State Changes

| Entity | Operation | Description |
|--------|-----------|-------------|
| package.json | READ | Parse dependency list, metadata |
| package-lock.json | READ | Required for `npm audit`; optional |
| npm registry API | READ | Advisory data (via npm audit), maintainer metadata (ownership checks) |
| SBOM | CREATE | Generated as part of findings output (not persisted to disk) |

---

## Related ADRs

- [ADR-20260317-Tech-Stack-Selection](../adr/ADR-20260317-Tech-Stack-Selection.md)

---

## Typosquatting Detection

### Reference Package List

Maintained at `data/patterns/popular-packages.json`:

```json
{
  "version": "1.0",
  "packages": {
    "mcp_ecosystem": [
      "@modelcontextprotocol/sdk",
      "@modelcontextprotocol/server-filesystem",
      "@modelcontextprotocol/server-git",
      "@modelcontextprotocol/server-postgres",
      "@modelcontextprotocol/server-sqlite",
      "@modelcontextprotocol/server-brave-search"
    ],
    "ai_ecosystem": [
      "@anthropic-ai/sdk",
      "openai",
      "langchain",
      "llamaindex",
      "@google/generative-ai",
      "@aws-sdk/client-bedrock"
    ],
    "commonly_mimicked": [
      "lodash",
      "express",
      "axios",
      "chalk",
      "commander",
      "dotenv",
      "jsonwebtoken",
      "bcrypt",
      "uuid"
    ]
  }
}
```

### Algorithm

- **Levenshtein distance**: compute edit distance between each dependency name and each reference package name
- **Flag when**: distance is 1 or 2 AND the dependency is NOT in a known-safe allowlist
- **Severity**: `high` for distance 1, `medium` for distance 2
- **Evidence**: show the similar package name and edit distance

### npm Audit Parsing

1. Run: `npm audit --json --omit=dev` in the resolved package directory
2. Parse JSON output `advisories` object
3. Map each advisory to unified finding:
   ```
   {
     id: "DEP-{advisory.id}",
     type: "dependency",
     severity: advisory.severity,
     title: advisory.title,
     package: advisory.module_name,
     version: advisory.findings[0].version,
     recommendation: advisory.recommendation || "Update to fixed version",
     references: [advisory.url]
   }
   ```
4. If `npm audit` fails (no lock file): warn user, fall back to package.json-only analysis

### Ownership Transfer Check

1. For each direct dependency, query: `https://registry.npmjs.org/{package}`
2. Parse `maintainers` array and `time` object
3. If the `modified` timestamp for the latest version is within 90 days AND maintainer list changed → flag as `medium`
4. Rate limit: max 10 requests per second to avoid npm registry throttling
5. Skip if offline or if registry returns error

---

## Risks and Edge Cases

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| No `package-lock.json` present | High | Medium | Fall back to package.json-only; warn user "limited audit" |
| npm CLI not installed | Low | High | Check for `npm` binary; error gracefully with instructions |
| False positive typosquatting on legitimate similar names | Medium | Medium | Allowlist for known legitimate packages; show distance for user verification |
| npm registry rate limiting on ownership checks | Medium | Low | Cache responses; fail gracefully; show "ownership check skipped" |
| Large dependency tree (>500 deps) | Medium | Low | Report count in summary; full list in JSON output only |
| Private/internal packages not on public npm | Medium | Low | Skip ownership check for packages that return 404; no typosquat check for scoped private packages |

---

## Rollback Plan

1. Disable via `--checks` flag (exclude `deps`) or config file
2. Ownership checks disabled by default in offline mode
3. Typosquatting reference list can be replaced or extended via config

---

## Dependencies

- **npm CLI** — for `npm audit` execution (child_process call with controlled arguments)
- **npm registry API** — for ownership checks (HTTPS GET, no SDK)
- **Levenshtein algorithm** — implement inline (< 20 lines) or use `fastest-levenshtein` (MIT, 0 deps)

---

## Testing Strategy

- **Unit tests:**
  - npm audit JSON parsing: valid advisory, multiple advisories, empty result
  - Typosquatting: "loash" vs "lodash" (distance 1 → flag), "express" vs "express" (distance 0 → no flag), "expresss" (distance 1 → flag)
  - Edit distance calculation: verify Levenshtein for known pairs
  - Ownership check response parsing: changed maintainer, unchanged maintainer

- **Integration tests:**
  - Full dependency analysis on test fixture with known vulnerable `package.json` + `package-lock.json`
  - Scan with no lock file (graceful degradation)

- **Test fixtures:**
  - `fixtures/vulnerable-deps/` — package.json with known vulnerable dependency
  - `fixtures/typosquat-deps/` — package.json with typosquat-like dependency name
  - `fixtures/no-lockfile/` — package.json only, no lock file

- **Edge case tests:**
  - Empty dependencies object
  - Dev-only dependencies (should be omitted with `--omit=dev`)
  - Scoped packages (`@scope/package` — edit distance calculated on full name)
