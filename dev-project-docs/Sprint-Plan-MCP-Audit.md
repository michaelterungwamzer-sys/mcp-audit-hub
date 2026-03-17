# Sprint Plan — MCP-Audit: CLI Security Scanner for MCP Servers

**Document ID:** Sprint-Plan-MCP-Audit
**Version:** 0.1.0
**Status:** Draft
**Author:** Tech Lead (AI-assisted — Claude Opus 4.6, P-03)
**Created:** 2026-03-17
**Last Updated:** 2026-03-17
**Parent Documents:**
- [PRD-MCP-Audit](/dev-project-docs/PRD-MCP-Audit.md)
- [TAD-MCP-Audit](/docs/solution-doc-architecture.md)

---

## Document History

| Version | Date       | Author                  | Changes               |
|---------|------------|-------------------------|-----------------------|
| 0.1.0   | 2026-03-17 | Claude Opus 4.6 (P-03)  | Initial sprint plan created — Sprint 1 detailed, Sprints 2-3 outlined |

---

## Table of Contents

1. [Team and Sprint Basics](#1-team-and-sprint-basics)
2. [Sprint 1 Goal](#2-sprint-1-goal)
3. [Definition of Done](#3-definition-of-done)
4. [Definition of Ready](#4-definition-of-ready)
5. [Sprint 1 Backlog](#5-sprint-1-backlog)
6. [Story Detail Cards — Sprint 1](#6-story-detail-cards--sprint-1)
7. [Full Product Backlog — All Sprints](#7-full-product-backlog--all-sprints)
8. [Dependencies and Blockers](#8-dependencies-and-blockers)
9. [Risks](#9-risks)
10. [Sprint Metrics](#10-sprint-metrics)

---

## 1. Team and Sprint Basics

| Field               | Value                                                    |
|---------------------|----------------------------------------------------------|
| **Product**         | MCP-Audit — CLI Security Scanner for MCP Servers         |
| **Release target**  | v0.1.0 (MVP)                                             |
| **Release date**    | 2026-04-28 (6 weeks from 2026-03-17)                    |
| **Total sprints**   | 3 (2 weeks each)                                         |
| **Current sprint**  | Sprint 1 of 3 — Foundation                               |
| **Sprint dates**    | 2026-03-17 to 2026-03-30                                 |
| **Team**            | 1 solo developer + AI-assisted development (Claude Code) |
| **Velocity basis**  | No historical velocity — estimated at 40 story points per sprint (solo + AI acceleration) |
| **Sprint cadence**  | 2-week sprints, no formal ceremonies (solo dev); daily self-review of progress against plan |
| **Tech stack**      | TypeScript 5.x, Node.js 20+, Commander.js, @babel/parser, Vitest, chalk, ora, cli-table3 |
| **Repository**      | To be created — GitHub, MIT licence                      |
| **Branch strategy** | Enhanced GitHub Flow per SDGP §7.4                       |

---

## 2. Sprint 1 Goal

> **Establish the project foundation: repository, CI/CD pipeline, CLI skeleton, package resolver (npm + local), console output formatting, config loader, and all required ADRs. By the end of Sprint 1, `mcp-audit scan <target>` resolves a target and runs through the full pipeline with a placeholder analyzer, producing formatted console output with a score of 100/100 (no findings).**

This sprint delivers the structural scaffolding upon which all analyzers (Sprint 2) and polish features (Sprint 3) will build. No analyzer logic is implemented in Sprint 1 — the focus is on the pipeline architecture: resolve, parse, analyze (stub), aggregate, and report.

---

## 3. Definition of Done

A story is **Done** when ALL of the following are satisfied:

| # | Criterion |
|---|-----------|
| 1 | Code compiles with zero TypeScript errors (`tsc --noEmit`) |
| 2 | All unit tests pass (`npx vitest run`) |
| 3 | All integration tests pass (where applicable) |
| 4 | Test coverage meets thresholds: general >= 80%, scoring/dedup = 100% |
| 5 | Code follows `/governance-docs/coding-standards.md` — 4-space indentation, single quotes, camelCase, strict comparisons, no magic numbers, no commented-out code |
| 6 | ESLint passes with zero warnings |
| 7 | Feature branch merged to `main` via squash merge with conventional commit message |
| 8 | CHANGELOG.md updated under `## [Unreleased]` |
| 9 | Any required ADR is written and placed in `/docs/adr/` before implementation begins |
| 10 | No hardcoded secrets, no `eval`, no `var`, no loose comparisons |
| 11 | Functions are <= 30 lines; nesting <= 3 levels deep |

---

## 4. Definition of Ready

A story is **Ready** for implementation when ALL of the following are satisfied:

| # | Criterion |
|---|-----------|
| 1 | Story has a clear description and acceptance criteria |
| 2 | PRD functional requirement(s) are referenced |
| 3 | TAD component(s) are identified |
| 4 | Dependencies on other stories are identified and resolved (or the dependency is already Done) |
| 5 | Required ADR (if any) is identified |
| 6 | Story is estimated in story points |
| 7 | Test approach is defined (unit, integration, or both) |

---

## 5. Sprint 1 Backlog

### 5.1 Summary

| Story ID | Title                                        | Points | Priority | PRD Refs           | TAD Refs       | ADR Required |
|----------|----------------------------------------------|--------|----------|--------------------|----------------|--------------|
| S1-01    | Repository initialisation and project setup  | 5      | P0       | NFR-03, NFR-04     | §2, §4.1       | Yes (ADR-001: Tech Stack) |
| S1-02    | CI/CD pipeline (GitHub Actions)              | 5      | P0       | NFR-10             | §10.1          | No           |
| S1-03    | ADR — Tech stack selection                   | 3      | P0       | —                  | §14            | **Is the ADR** |
| S1-04    | ADR — AST parser selection                   | 3      | P0       | —                  | §14            | **Is the ADR** |
| S1-05    | Core type definitions                        | 3      | P0       | FR-90              | §4.2           | No           |
| S1-06    | CLI skeleton with Commander.js               | 5      | P0       | FR-01 to FR-08     | §4.1, §8.1     | No           |
| S1-07    | Config loader                                | 5      | P1       | FR-110 to FR-112   | §4.1, §7.3     | No           |
| S1-08    | Package resolver — local directory           | 3      | P0       | FR-11              | §3.2, §4.1     | No           |
| S1-09    | Package resolver — npm registry              | 5      | P1       | FR-10, FR-13, FR-14 | §3.2, §11.1   | No           |
| S1-10    | Console output formatter                     | 5      | P1       | FR-100, FR-101     | §4.1, §8.1     | No           |
| S1-11    | Scanner orchestrator (pipeline skeleton)     | 5      | P1       | FR-01, FR-07, FR-08 | §3.1, §3.2    | No           |
| **Total** |                                             | **47** |          |                    |                |              |

### 5.2 Sprint Capacity Assessment

| Item                   | Value                                    |
|------------------------|------------------------------------------|
| Available working days | 10 (2 weeks, no holidays)                |
| Estimated velocity     | 40-50 points (solo dev + AI assistance)  |
| Committed points       | 47                                       |
| Buffer                 | ~6% stretch — acceptable for Sprint 1    |
| Risk mitigation        | S1-09 (npm resolver) can slip to Sprint 2 Day 1 if needed without blocking analyzer work |

---

## 6. Story Detail Cards — Sprint 1

### S1-01: Repository Initialisation and Project Setup

| Field              | Value |
|--------------------|-------|
| **Story ID**       | S1-01 |
| **Points**         | 5 |
| **Priority**       | P0 — blocks all other stories |
| **PRD Refs**       | NFR-03 (cross-platform), NFR-04 (install size) |
| **TAD Refs**       | §2 (Technology Stack), §4.1 (Directory Structure) |
| **ADR Required**   | Yes — S1-03 (Tech Stack ADR) must be written first |
| **Depends On**     | S1-03 |

**Description:**
As a developer, I want the project repository initialised with the correct directory structure, TypeScript configuration, ESM module system, build tooling, and development dependencies so that all subsequent work has a stable foundation.

**Acceptance Criteria:**

- [ ] GitHub repository created with MIT licence
- [ ] `package.json` configured with:
    - `name`: `mcp-audit`
    - `type`: `module` (ESM)
    - `engines`: `{ "node": ">=20.0.0" }`
    - `bin`: `{ "mcp-audit": "./bin/mcp-audit.js" }`
    - Scripts: `build`, `test`, `test:coverage`, `lint`, `typecheck`
- [ ] `tsconfig.json` configured with strict mode, ESM output, Node.js 20 target
- [ ] `vitest.config.ts` configured with v8 coverage provider
- [ ] `.eslintrc.cjs` or `eslint.config.js` configured with TypeScript support, single quotes, 4-space indentation
- [ ] `.prettierrc` configured to match coding standards (single quotes, 4-space indent, no trailing commas)
- [ ] `.gitignore` includes `node_modules/`, `dist/`, `coverage/`, `.env`, `*.tgz`
- [ ] Directory structure matches TAD §4.1: `bin/`, `src/cli/`, `src/scanner/`, `src/analyzers/`, `src/scoring/`, `src/config/`, `src/types/`, `src/data/`, `tests/unit/`, `tests/integration/`, `tests/fixtures/`
- [ ] `npm install` completes without errors
- [ ] `npm run build` produces output in `dist/`
- [ ] `npm run typecheck` passes with zero errors

**Test Approach:** Smoke test — `npm run build && npm run typecheck` pass. No unit tests for this story.

**Tasks:**
1. Create GitHub repository with MIT licence and `.gitignore`
2. Run `npm init` and configure `package.json`
3. Install dev dependencies: `typescript`, `tsup`, `vitest`, `eslint`, `prettier`, `@types/node`
4. Install runtime dependencies: `commander`, `chalk`, `ora`, `cli-table3`, `@babel/parser`, `@babel/traverse`, `fast-glob`
5. Configure `tsconfig.json` (strict, ESM, `src/` root, `dist/` output)
6. Configure `vitest.config.ts` with v8 coverage
7. Configure ESLint and Prettier
8. Create directory scaffold per TAD §4.1
9. Create placeholder `src/index.ts` and `bin/mcp-audit.ts`
10. Verify build and typecheck pass

---

### S1-02: CI/CD Pipeline (GitHub Actions)

| Field              | Value |
|--------------------|-------|
| **Story ID**       | S1-02 |
| **Points**         | 5 |
| **Priority**       | P0 — required for all PRs |
| **PRD Refs**       | NFR-10 (testing, 80% coverage) |
| **TAD Refs**       | §10.1 (CI/CD Pipeline) |
| **ADR Required**   | No |
| **Depends On**     | S1-01 |

**Description:**
As a developer, I want a CI/CD pipeline that runs lint, typecheck, tests, and build on every push and PR so that code quality is enforced automatically from day one.

**Acceptance Criteria:**

- [ ] `.github/workflows/ci.yml` exists and runs on push to `main` and on all PRs
- [ ] Pipeline jobs:
    - `lint` — ESLint passes with zero warnings
    - `typecheck` — `tsc --noEmit` passes
    - `test` — `npx vitest run --coverage` passes on matrix: `[ubuntu-latest, macos-latest, windows-latest]` x `[node 20, node 22]`
    - `build` — `npx tsup` produces `dist/` output
    - `security` — `npm audit --audit-level=high` passes
- [ ] Coverage report uploaded (Codecov or as artifact)
- [ ] Pipeline blocks merge if any job fails
- [ ] Branch protection rule on `main`: require CI pass + PR review (self-review acceptable for solo dev)

**Test Approach:** Pipeline validates itself — first PR triggers the workflow. Verify all matrix cells pass.

**Tasks:**
1. Create `.github/workflows/ci.yml` with lint, typecheck, test (matrix), build, and security jobs
2. Configure branch protection on `main`
3. Add Codecov integration (or coverage artifact upload)
4. Create initial passing test (`tests/unit/smoke.test.ts`) to validate pipeline
5. Open and merge first PR to verify pipeline

---

### S1-03: ADR — Tech Stack Selection

| Field              | Value |
|--------------------|-------|
| **Story ID**       | S1-03 |
| **Points**         | 3 |
| **Priority**       | P0 — governance prerequisite for S1-01 |
| **PRD Refs**       | §8.1 (Runtime Dependencies) |
| **TAD Refs**       | §2 (Technology Stack), §14 (ADRs Required) |
| **ADR Required**   | **This IS the ADR** |
| **Depends On**     | None |

**Description:**
As a tech lead, I need to record the decision to use TypeScript, Node.js 20+, Commander.js, chalk, ora, cli-table3, @babel/parser, fast-glob, and Vitest as the core technology stack so that the rationale is documented and auditable per governance Rule 3 (new external dependencies).

**Acceptance Criteria:**

- [ ] ADR created at `/docs/adr/ADR-20260317-Tech-Stack-Selection.md` using the ADR template at `/docs/adr/_template.md`
- [ ] ADR documents:
    - Context: MCP-Audit is a CLI static analysis tool; needs cross-platform Node.js runtime, TypeScript for type safety, AST parsing for JS/TS, terminal UX libraries
    - Decision: Full tech stack with version constraints
    - Alternatives considered: JavaScript (no types), Deno (smaller ecosystem), Python (different target audience), Rust (development speed vs runtime speed tradeoff)
    - Consequences: locked to Node.js ecosystem, ESM module system, MIT-compatible dependencies only
- [ ] ADR status is `Accepted`
- [ ] All runtime and dev dependencies listed with licence verification (all MIT-compatible)

**Test Approach:** Governance review — ADR follows template, all sections populated, no MIT licence violations.

**Tasks:**
1. Read ADR template at `/docs/adr/_template.md`
2. Draft ADR covering all dependencies from TAD §2
3. Verify licence compatibility for each dependency
4. Document alternatives considered with rationale for rejection
5. Set status to Accepted

---

### S1-04: ADR — AST Parser Selection

| Field              | Value |
|--------------------|-------|
| **Story ID**       | S1-04 |
| **Points**         | 3 |
| **Priority**       | P0 — governance prerequisite for parser implementation |
| **PRD Refs**       | FR-20, FR-21, FR-23 |
| **TAD Refs**       | §2.3 (Analysis), §4.3 (Analyzer Interface), §13.3 (Lazy AST Parsing), §14 (ADRs Required) |
| **ADR Required**   | **This IS the ADR** |
| **Depends On**     | None |

**Description:**
As a tech lead, I need to record the decision to use @babel/parser (with @babel/traverse) as the primary AST parser for JavaScript and TypeScript source files, deferring tree-sitter to v0.2+ for multi-language support. This decision affects every analyzer module and must be documented per governance Rule 3 (architecture decision affecting all analyzers).

**Acceptance Criteria:**

- [ ] ADR created at `/docs/adr/ADR-20260317-AST-Parser-Selection.md` using the ADR template
- [ ] ADR documents:
    - Context: all analyzers depend on AST parsing; need full JS/TS syntax support including decorators, JSX, and TypeScript type annotations; must handle parse errors gracefully
    - Decision: @babel/parser + @babel/traverse for v0.1; tree-sitter deferred to v0.2 for Python/Rust/Go support
    - Alternatives considered:
        - TypeScript Compiler API (`ts.createSourceFile`) — heavier, TypeScript-only, slower for large files
        - tree-sitter — multi-language but requires native binaries, complicates cross-platform distribution
        - Acorn — faster but lacks TypeScript support without plugins
        - swc — Rust-based, fast, but JavaScript API less mature for AST traversal
    - Consequences: locked to @babel/parser for v0.1 analyzers; lazy parsing strategy per TAD §13.3; tree-sitter migration path documented for v0.2
- [ ] ADR status is `Accepted`

**Test Approach:** Governance review — ADR follows template, alternatives substantiated, migration path to tree-sitter documented.

**Tasks:**
1. Read ADR template
2. Research and document parse performance characteristics of each alternative
3. Draft ADR with full alternatives analysis
4. Document lazy parsing strategy and its impact on analyzer design
5. Document tree-sitter migration path for v0.2
6. Set status to Accepted

---

### S1-05: Core Type Definitions

| Field              | Value |
|--------------------|-------|
| **Story ID**       | S1-05 |
| **Points**         | 3 |
| **Priority**       | P0 — all modules depend on shared types |
| **PRD Refs**       | FR-90 (result aggregation schema) |
| **TAD Refs**       | §4.2 (Core Type Definitions) |
| **ADR Required**   | No |
| **Depends On**     | S1-01 |

**Description:**
As a developer, I want shared TypeScript type definitions for `Finding`, `Severity`, `ScanResult`, `MCPServer`, `ToolDefinition`, `SourceFile`, `AuditConfig`, and all supporting types so that every module works against a single type contract.

**Acceptance Criteria:**

- [ ] `src/types/index.ts` — re-exports all types
- [ ] `src/types/finding.ts` — `Finding`, `Severity`, `FindingType`, `ScanResult`, `ChainResult` types matching TAD §4.2
- [ ] `src/types/mcp-server.ts` — `MCPServer`, `ToolDefinition`, `ResourceDefinition`, `PromptDefinition`, `SourceFile`, `DependencyInfo` types matching TAD §4.2
- [ ] `src/types/config.ts` — `AuditConfig`, `CheckConfig`, `ScoringConfig`, `OutputConfig`, `AllowlistConfig` types matching TAD §7.3
- [ ] All types use strict TypeScript — no `any`, no implicit types
- [ ] `Severity` is a union type: `'critical' | 'high' | 'medium' | 'low'`
- [ ] `FindingType` is a union type covering all analyzer finding types per TAD §4.2
- [ ] Types compile cleanly with `tsc --noEmit`

**Test Approach:** Type compilation is the test — `npm run typecheck` passes. Additionally, one unit test per exported type verifying it can be instantiated (type guard tests).

**Tasks:**
1. Create `src/types/finding.ts` with `Severity`, `FindingType`, `Finding`, `ScanResult`, `ChainResult`
2. Create `src/types/mcp-server.ts` with `MCPServer`, `ToolDefinition`, `ResourceDefinition`, `PromptDefinition`, `SourceFile`, `DependencyInfo`
3. Create `src/types/config.ts` with `AuditConfig` and sub-types
4. Create `src/types/index.ts` barrel export
5. Write type guard utility functions and unit tests

---

### S1-06: CLI Skeleton with Commander.js

| Field              | Value |
|--------------------|-------|
| **Story ID**       | S1-06 |
| **Points**         | 5 |
| **Priority**       | P0 — user-facing entry point |
| **PRD Refs**       | FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08 |
| **TAD Refs**       | §4.1 (CLI Layer), §8.1 (CLI Contract) |
| **ADR Required**   | No (Commander.js covered by S1-03 Tech Stack ADR) |
| **Depends On**     | S1-01, S1-05 |

**Description:**
As a developer, I want the `mcp-audit` CLI to accept commands (`scan`, `init`, `checks --list`), parse all flags (`--checks`, `--output`, `--report`, `--scoring`, `--config`, `--no-color`, `--verbose`), validate arguments, display help text, and route to the correct handler so that the CLI contract defined in TAD §8.1 is fully operational.

**Acceptance Criteria:**

- [ ] `bin/mcp-audit.ts` is the entry point with Node.js shebang (`#!/usr/bin/env node`)
- [ ] `src/cli/index.ts` configures Commander.js with:
    - Program name: `mcp-audit`
    - Version from `package.json`
    - `scan <target>` command with all flags per TAD §8.1
    - `init` command (stub handler — prints "Config file created" placeholder)
    - `checks` command with `--list` flag (stub handler — prints placeholder list)
- [ ] `--checks` accepts comma-separated analyzer IDs
- [ ] `--output` accepts `console` (default) and `json`
- [ ] `--report` accepts a file path
- [ ] `--scoring` accepts `weighted-sum` (default) and `co-location`
- [ ] `--config` accepts a file path (default: `./mcp-audit.config.json`)
- [ ] `--no-color` disables chalk colour output
- [ ] `--verbose` enables detailed progress logging
- [ ] `mcp-audit --help` displays all commands and options
- [ ] `mcp-audit scan` (no target) displays an error with usage hint
- [ ] Exit codes: 0 (success), 1 (findings above threshold), 2 (error) — wired to scan handler
- [ ] Progress spinner (ora) displays during scan with elapsed time

**Test Approach:**
- Unit tests: command parsing returns correct options object for various flag combinations
- Integration test: `mcp-audit --help` exits with code 0 and contains expected text
- Integration test: `mcp-audit scan` (no target) exits with code 2

**Tasks:**
1. Create `bin/mcp-audit.ts` with shebang and import
2. Create `src/cli/index.ts` with Commander.js setup
3. Create `src/cli/commands/scan.ts` — scan command definition and option parsing
4. Create `src/cli/commands/init.ts` — init command stub
5. Create `src/cli/commands/checks.ts` — checks command stub
6. Wire ora spinner for scan progress
7. Implement exit code logic
8. Write unit tests for command parsing
9. Write integration tests for help and error cases

---

### S1-07: Config Loader

| Field              | Value |
|--------------------|-------|
| **Story ID**       | S1-07 |
| **Points**         | 5 |
| **Priority**       | P1 |
| **PRD Refs**       | FR-110, FR-111, FR-112 |
| **TAD Refs**       | §4.1 (Config Loader), §7.3 (Configuration Schema) |
| **ADR Required**   | No |
| **Depends On**     | S1-01, S1-05 |

**Description:**
As a developer, I want MCP-Audit to load configuration from `mcp-audit.config.json` (if present), merge it with CLI flags (CLI takes precedence), and fall back to sensible defaults so that the tool works out of the box and is fully configurable.

**Acceptance Criteria:**

- [ ] `src/config/defaults.ts` — exports a complete default `AuditConfig` object matching TAD §7.3
- [ ] `src/config/schema.ts` — exports a validation function that checks config structure and value types
- [ ] `src/config/index.ts` — exports `loadConfig(cliOptions)` that:
    1. Reads `mcp-audit.config.json` from CWD (or path specified by `--config`)
    2. Validates the file against the schema; warns on invalid keys (does not crash)
    3. Deep-merges file config with defaults
    4. Overrides with CLI flags (CLI wins)
    5. Returns a validated `AuditConfig` object
- [ ] Missing config file is not an error — defaults are used silently
- [ ] Invalid JSON in config file produces a clear error message and exits with code 2
- [ ] Unknown keys in config file produce a warning but do not block scanning
- [ ] `mcp-audit init` generates a valid `mcp-audit.config.json` with all default values and comments

**Test Approach:**
- Unit tests (>= 8 cases):
    - Load defaults when no config file exists
    - Load and merge config file values
    - CLI flags override config file values
    - CLI flags override defaults
    - Invalid JSON produces error
    - Unknown keys produce warning but load succeeds
    - Missing optional fields filled from defaults
    - Nested merge (e.g., `checks.tool-poisoning.enabled` overrides correctly)
- 100% coverage on the merge logic

**Tasks:**
1. Create `src/config/defaults.ts` with full default config
2. Create `src/config/schema.ts` with validation function
3. Create `src/config/index.ts` with `loadConfig()` — file read, validate, merge, override
4. Implement `init` command handler — writes default config as JSON
5. Write unit tests for all merge and validation scenarios

---

### S1-08: Package Resolver — Local Directory

| Field              | Value |
|--------------------|-------|
| **Story ID**       | S1-08 |
| **Points**         | 3 |
| **Priority**       | P0 |
| **PRD Refs**       | FR-11 |
| **TAD Refs**       | §3.2 (Resolver), §4.1 (scanner/resolver.ts) |
| **ADR Required**   | No |
| **Depends On**     | S1-01, S1-05 |

**Description:**
As a developer, I want `mcp-audit scan ./my-server` to resolve a local directory path, discover all TypeScript and JavaScript source files within it, read `package.json` for metadata and dependency information, and return a populated resolver result so that the scanner pipeline can operate on local MCP servers.

**Acceptance Criteria:**

- [ ] `src/scanner/resolver.ts` exports a `resolveTarget(target: string)` function
- [ ] Detects that the target is a local path (starts with `.`, `/`, or is a valid absolute path on the current OS)
- [ ] Validates that the path exists and is a directory; exits with code 2 and clear message if not
- [ ] Discovers `.ts` and `.js` files recursively using fast-glob (excludes `node_modules/`, `dist/`, `.git/`)
- [ ] Reads `package.json` if present — extracts `name`, `version`, `dependencies`, `devDependencies`
- [ ] Returns a resolver result containing: root path, package metadata, list of source file paths
- [ ] Handles edge cases: empty directory (warns, returns empty file list), directory with no `.ts`/`.js` files (warns)

**Test Approach:**
- Unit tests (>= 5 cases):
    - Valid directory with `.ts` files resolves correctly
    - Valid directory with mixed `.ts` and `.js` files
    - Non-existent path returns error
    - Path is a file (not directory) returns error
    - Empty directory returns warning + empty file list
- Test fixtures: `tests/fixtures/clean-server/` (valid MCP server structure)

**Tasks:**
1. Create `src/scanner/resolver.ts` with `resolveTarget()` and `resolveLocal()` internal function
2. Implement path detection logic (local vs npm vs future GitHub)
3. Implement file discovery with fast-glob
4. Implement `package.json` reading and metadata extraction
5. Create test fixture: `tests/fixtures/clean-server/` with minimal MCP server structure
6. Write unit tests

---

### S1-09: Package Resolver — npm Registry

| Field              | Value |
|--------------------|-------|
| **Story ID**       | S1-09 |
| **Points**         | 5 |
| **Priority**       | P1 |
| **PRD Refs**       | FR-10, FR-13, FR-14 |
| **TAD Refs**       | §3.2 (Resolver), §11.1 (npm Registry API), §9.1 (Temp Directory Cleanup) |
| **ADR Required**   | No |
| **Depends On**     | S1-08 (shares resolver interface) |

**Description:**
As a developer, I want `mcp-audit scan @scope/package-name` to download the latest version of an npm package, extract it to a temporary directory, and resolve it as if it were a local directory so that I can scan npm packages before installing them.

**Acceptance Criteria:**

- [ ] Detects that the target is an npm package name (not a local path — starts with `@` or contains no path separators and is not a local directory)
- [ ] Fetches package metadata from `https://registry.npmjs.org/<package>`
- [ ] Downloads the tarball URL from the `latest` version's `dist.tarball` field
- [ ] Extracts the tarball to a temporary directory under `os.tmpdir()` with a unique suffix
- [ ] Delegates to the local resolver logic (S1-08) for file discovery
- [ ] Implements session cache — scanning the same package twice in one invocation does not re-download
- [ ] Registers cleanup handlers for the temp directory on `process.on('exit')`, `SIGINT`, `SIGTERM`, and `uncaughtException`
- [ ] Cleanup is verified — no temp directories remain after normal or error exit
- [ ] Network errors produce a clear error message and exit with code 2
- [ ] Package not found (404) produces a clear error message and exit with code 2

**Test Approach:**
- Unit tests with mocked HTTP (msw or manual mock):
    - Valid package name resolves and downloads
    - Package not found returns 404 error
    - Network error handled gracefully
    - Session cache prevents re-download
    - Cleanup removes temp directory
- Integration test (optional, network-dependent): scan a real small npm package

**Tasks:**
1. Implement `resolveNpm()` in `src/scanner/resolver.ts`
2. Implement npm registry metadata fetch (native `fetch` — Node.js 20+ built-in)
3. Implement tarball download and extraction (tar + zlib or `tar` npm package)
4. Implement temp directory management with cleanup handlers
5. Implement session cache (in-memory `Map`)
6. Write unit tests with mocked HTTP responses
7. Write cleanup verification test

---

### S1-10: Console Output Formatter

| Field              | Value |
|--------------------|-------|
| **Story ID**       | S1-10 |
| **Points**         | 5 |
| **Priority**       | P1 |
| **PRD Refs**       | FR-100, FR-101 |
| **TAD Refs**       | §4.1 (cli/output/), §8.1 (CLI Contract) |
| **ADR Required**   | No |
| **Depends On**     | S1-05 (types), S1-06 (CLI skeleton) |

**Description:**
As a developer, I want the console output to display a branded header, a summary table showing each analyzer's status and finding count, findings grouped by severity with colour coding (red = critical, yellow = high, cyan = medium, dim = low), a security score, and a PASS/WARN/FAIL classification so that I can quickly understand the scan results.

**Acceptance Criteria:**

- [ ] `src/cli/output/formatter.ts` — exports the `OutputFormatter` interface with `format(result: ScanResult): string` method
- [ ] `src/cli/output/console.ts` — implements `ConsoleFormatter`:
    - Header: `MCP-AUDIT v{version}` + `Scanning: {target}` in a bordered box
    - Summary table (cli-table3): analyzer name, status icon (checkmark / X / warning), finding count
    - Findings grouped by severity (critical first, then high, medium, low)
    - Each finding: ID, title, file:line, code snippet (evidence), recommendation
    - Colour coding: red for critical, yellow for high, cyan for medium, dim/grey for low
    - Score line: `Score: {score}/100 ({PASS|WARN|FAIL})`
    - PASS is green, WARN is yellow, FAIL is red
- [ ] `--no-color` disables all colour output (chalk respects `NO_COLOR` env var)
- [ ] Empty findings: displays `"No security issues found"` with green checkmark
- [ ] Output is readable on 80-column terminals (no line wrapping for standard fields)

**Test Approach:**
- Unit tests (>= 6 cases):
    - Clean scan (no findings) produces correct output
    - Single critical finding formatted correctly
    - Multiple findings across severities grouped and ordered correctly
    - No-colour mode strips ANSI codes
    - Long code snippets are truncated
    - Score line shows correct PASS/WARN/FAIL
- Snapshot tests for console output format stability

**Tasks:**
1. Create `src/cli/output/formatter.ts` — `OutputFormatter` interface
2. Create `src/cli/output/console.ts` — `ConsoleFormatter` implementation
3. Implement header rendering with chalk
4. Implement summary table with cli-table3
5. Implement findings rendering grouped by severity
6. Implement score and status rendering
7. Write unit tests and snapshot tests

---

### S1-11: Scanner Orchestrator (Pipeline Skeleton)

| Field              | Value |
|--------------------|-------|
| **Story ID**       | S1-11 |
| **Points**         | 5 |
| **Priority**       | P1 |
| **PRD Refs**       | FR-01, FR-07, FR-08, FR-90, FR-91, FR-92 |
| **TAD Refs**       | §3.1 (System Architecture), §3.2 (Component Responsibilities), §4.3 (Analyzer Interface), §6.1 (Weighted Sum), §13.2 (Parallelism) |
| **ADR Required**   | No |
| **Depends On**     | S1-05, S1-06, S1-07, S1-08, S1-10 |

**Description:**
As a developer, I want the scanner orchestrator to wire together the full pipeline — resolve target, parse MCP structure (stub), run analyzers (empty pool), aggregate findings, calculate score, and produce output — so that `mcp-audit scan <target>` executes end-to-end with a score of 100/100 and the pipeline is ready for real analyzers in Sprint 2.

**Acceptance Criteria:**

- [ ] `src/scanner/index.ts` — exports `scan(target: string, config: AuditConfig): Promise<ScanResult>`
- [ ] Pipeline sequence: resolve → parse → analyze → aggregate → format → return
- [ ] `src/scanner/parser.ts` — stub MCP server parser that returns an `MCPServer` with empty tools/resources/prompts and populated source file list
- [ ] `src/scanner/aggregator.ts` — aggregator that:
    - Deduplicates findings by `id` + `file` + `line`
    - Sorts findings by severity (critical first)
    - Calculates weighted sum score: `max(0, 100 - sum(weights))` where critical=25, high=15, medium=5, low=1
    - Classifies result: PASS (score >= 70, no critical), WARN (score >= 40 or critical present), FAIL (score < 40)
- [ ] `src/analyzers/base.ts` — `BaseAnalyzer` abstract class matching TAD §4.3
- [ ] `src/analyzers/index.ts` — `AnalyzerRegistry` with `register()`, `getEnabled()`, `runAll()` methods; runs analyzers in parallel with `Promise.allSettled()`
- [ ] `src/scoring/weighted-sum.ts` — weighted sum scorer (v0.1 default)
- [ ] `src/scoring/index.ts` — scorer factory that returns the correct strategy based on config
- [ ] With no analyzers registered, `scan()` returns score 100, status PASS, empty findings array
- [ ] Scan command handler (`src/cli/commands/scan.ts`) calls `scan()`, formats output, sets exit code
- [ ] `mcp-audit scan ./tests/fixtures/clean-server` runs end-to-end and displays `Score: 100/100 (PASS)`

**Test Approach:**
- Unit tests for aggregator (>= 5 cases, **100% coverage on scoring**):
    - Empty findings → score 100, PASS
    - One critical finding → score 75, WARN (critical present)
    - Mixed findings → correct sum calculation
    - Deduplication removes exact duplicates
    - Boundary cases: score exactly 70, exactly 40, exactly 0
- Unit tests for analyzer registry:
    - Empty registry returns no findings
    - Registered analyzer is called
    - Disabled analyzer is skipped
    - Failed analyzer does not crash pipeline (Promise.allSettled)
- Integration test:
    - `mcp-audit scan ./tests/fixtures/clean-server` exits with code 0

**Tasks:**
1. Create `src/analyzers/base.ts` — `BaseAnalyzer` abstract class
2. Create `src/analyzers/index.ts` — `AnalyzerRegistry`
3. Create `src/scoring/weighted-sum.ts` — weighted sum calculator
4. Create `src/scoring/index.ts` — scorer factory
5. Create `src/scanner/parser.ts` — stub MCP parser
6. Create `src/scanner/aggregator.ts` — finding dedup, sort, score
7. Create `src/scanner/index.ts` — orchestrator
8. Wire scan command handler to orchestrator and console formatter
9. Write unit tests for aggregator (100% coverage)
10. Write unit tests for registry
11. Write integration test for end-to-end scan

---

## 7. Full Product Backlog — All Sprints

### 7.1 Sprint 1 — Foundation (Weeks 1-2: 2026-03-17 to 2026-03-30)

| Story ID | Title                                        | Points | Status  |
|----------|----------------------------------------------|--------|---------|
| S1-01    | Repository initialisation and project setup  | 5      | To Do   |
| S1-02    | CI/CD pipeline (GitHub Actions)              | 5      | To Do   |
| S1-03    | ADR — Tech stack selection                   | 3      | To Do   |
| S1-04    | ADR — AST parser selection                   | 3      | To Do   |
| S1-05    | Core type definitions                        | 3      | To Do   |
| S1-06    | CLI skeleton with Commander.js               | 5      | To Do   |
| S1-07    | Config loader                                | 5      | To Do   |
| S1-08    | Package resolver — local directory           | 3      | To Do   |
| S1-09    | Package resolver — npm registry              | 5      | To Do   |
| S1-10    | Console output formatter                     | 5      | To Do   |
| S1-11    | Scanner orchestrator (pipeline skeleton)     | 5      | To Do   |
|          | **Sprint 1 Total**                           | **47** |         |

**Sprint 1 Exit Criteria:**
- `mcp-audit scan ./tests/fixtures/clean-server` runs end-to-end → `Score: 100/100 (PASS)`
- `mcp-audit scan <npm-package>` downloads, extracts, and scans → `Score: 100/100 (PASS)` (no analyzers yet)
- CI/CD pipeline green on all matrix cells
- Both ADRs (tech stack, AST parser) written and accepted
- Test coverage >= 80%

---

### 7.2 Sprint 2 — Core Analyzers (Weeks 3-4: 2026-03-31 to 2026-04-13)

| Story ID | Title                                          | Points | PRD Refs                | Status  |
|----------|-------------------------------------------------|--------|-------------------------|---------|
| S2-01    | MCP server parser (AST-based)                  | 8      | FR-20, FR-21, FR-22, FR-23 | To Do   |
| S2-02    | Tool poisoning analyzer                        | 5      | FR-30, FR-31, FR-32, FR-33 | To Do   |
| S2-03    | Poisoning pattern library (JSON)               | 3      | FR-33                   | To Do   |
| S2-04    | Command injection analyzer                     | 8      | FR-40, FR-41, FR-42, FR-43 | To Do   |
| S2-05    | Dependency analyzer (npm audit wrapper)        | 5      | FR-50, FR-51            | To Do   |
| S2-06    | Network analyzer                               | 5      | FR-60, FR-61, FR-62     | To Do   |
| S2-07    | Filesystem analyzer                            | 3      | FR-70, FR-71, FR-72     | To Do   |
| S2-08    | Authentication analyzer                        | 3      | FR-80, FR-81            | To Do   |
| S2-09    | Test fixtures — vulnerable MCP servers         | 5      | AC-03 to AC-07          | To Do   |
| S2-10    | Result aggregation and weighted sum scoring    | 3      | FR-90, FR-91, FR-92, FR-93 | To Do   |
|          | **Sprint 2 Total**                             | **48** |                         |         |

**Sprint 2 Exit Criteria:**
- All 6 analyzers produce findings against test fixtures
- `mcp-audit scan ./tests/fixtures/poisoned-server` produces tool poisoning findings
- `mcp-audit scan ./tests/fixtures/injection-server` produces injection findings
- Scoring is correct per hand-calculated expected values (AC-10)
- Allowlist suppresses configured findings (FR-93)
- Test coverage >= 80% (100% on scoring and dedup)

---

### 7.3 Sprint 3 — Polish and Release (Weeks 5-6: 2026-04-14 to 2026-04-28)

| Story ID | Title                                          | Points | PRD Refs                | Status  |
|----------|-------------------------------------------------|--------|-------------------------|---------|
| S3-01    | JSON output formatter                          | 5      | FR-102                  | To Do   |
| S3-02    | Co-location scoring multiplier (1.5x)          | 5      | FR-94, AC-15 to AC-17   | To Do   |
| S3-03    | Feature spec — co-location scoring             | 2      | FR-94                   | To Do   |
| S3-04    | `checks --list` command implementation         | 2      | FR-06                   | To Do   |
| S3-05    | `init` command full implementation             | 2      | FR-05                   | To Do   |
| S3-06    | Typosquatting detection                        | 3      | FR-51                   | To Do   |
| S3-07    | Full test suite — acceptance criteria sweep    | 8      | AC-01 to AC-14          | To Do   |
| S3-08    | Performance benchmarks                         | 3      | NFR-01, NFR-02          | To Do   |
| S3-09    | npm publish preparation                        | 3      | §8.3 Distribution       | To Do   |
| S3-10    | CHANGELOG, README, and release tagging (v0.1.0) | 5     | Rule 5                  | To Do   |
| S3-11    | Self-scan (mcp-audit scans its own codebase)   | 2      | NFR-06                  | To Do   |
|          | **Sprint 3 Total**                             | **40** |                         |         |

**Sprint 3 Exit Criteria (MVP Release Criteria):**
- All 14 acceptance criteria (AC-01 to AC-14) pass
- `mcp-audit scan <npm-package>` end-to-end with real findings
- JSON output validates against schema
- Co-location multiplier applied and verified
- Performance: < 10s for typical server, < 30s for large server
- Test coverage >= 80% (100% on scoring/dedup)
- `npm publish --dry-run` succeeds
- CHANGELOG has `## [0.1.0] - 2026-04-28` entry
- Git tag `v0.1.0` created
- Self-scan of mcp-audit codebase produces no critical findings

---

### 7.4 Backlog Summary

| Sprint   | Dates                     | Theme               | Points | Stories |
|----------|---------------------------|----------------------|--------|---------|
| Sprint 1 | 2026-03-17 to 2026-03-30 | Foundation           | 47     | 11      |
| Sprint 2 | 2026-03-31 to 2026-04-13 | Core Analyzers       | 48     | 10      |
| Sprint 3 | 2026-04-14 to 2026-04-28 | Polish and Release   | 40     | 11      |
| **Total** |                          |                      | **135** | **32** |

---

## 8. Dependencies and Blockers

### 8.1 Internal Dependencies (Story-to-Story)

```
S1-03 (ADR Tech Stack) ──────┐
S1-04 (ADR AST Parser) ──────┤
                              ▼
S1-01 (Repo Setup) ──────────┬─▶ S1-02 (CI/CD)
                              │
                              ├─▶ S1-05 (Types) ──────────┬─▶ S1-06 (CLI) ─────┐
                              │                            │                     │
                              ├─▶ S1-07 (Config) ─────────┤                     │
                              │                            │                     ▼
                              └─▶ S1-08 (Local Resolver) ─┤             S1-11 (Orchestrator)
                                       │                   │                     ▲
                                       ▼                   │                     │
                                 S1-09 (npm Resolver)      └─▶ S1-10 (Console) ─┘
```

**Critical path:** S1-03 → S1-01 → S1-05 → S1-06 → S1-11

### 8.2 External Dependencies

| Dependency          | Type     | Risk    | Mitigation |
|---------------------|----------|---------|------------|
| npm registry API    | Network  | Low     | Only needed for S1-09; local resolver (S1-08) works offline. Integration tests can use msw mocks |
| GitHub Actions      | Service  | Low     | Well-established; fallback is local `npm test` |
| Node.js 20+ LTS    | Runtime  | None    | Stable, widely adopted |
| @babel/parser       | Library  | Low     | Mature, 15M+ weekly downloads, MIT licence |

### 8.3 Current Blockers

| # | Blocker | Impact | Owner | Status |
|---|---------|--------|-------|--------|
| 1 | None identified | — | — | — |

---

## 9. Risks

| ID   | Risk                                                    | Probability | Impact | Mitigation                                                        | Owner |
|------|---------------------------------------------------------|-------------|--------|-------------------------------------------------------------------|-------|
| R-01 | Solo developer velocity lower than estimated (47 pts)   | Medium      | Medium | S1-09 (npm resolver) can defer to Sprint 2 Day 1 without blocking analyzers. AI assistance accelerates boilerplate tasks | Dev   |
| R-02 | @babel/parser does not handle all MCP SDK patterns      | Low         | High   | ADR S1-04 documents parser limitations. Test against real MCP servers early. Fallback: tree-sitter in Sprint 2 | Dev   |
| R-03 | npm tarball extraction fails on Windows paths           | Medium      | Medium | Test on Windows in CI matrix (S1-02). Use `path.posix` for archive paths, `path` for OS paths | Dev   |
| R-04 | ESM module resolution issues with dependencies          | Medium      | Low    | Use tsup for bundling which handles CJS/ESM interop. Test early in S1-01 | Dev   |
| R-05 | Scope creep — temptation to start analyzer work early   | Medium      | Low    | Sprint plan is the contract. Analyzers are Sprint 2. Foundation must be solid first | Dev   |
| R-06 | Test fixture MCP servers do not represent real-world servers | Low     | Medium | Research popular MCP servers on npm/GitHub during Sprint 1. Use patterns from real servers in fixtures | Dev   |
| R-07 | CI/CD pipeline takes too long (6-matrix job)            | Low         | Low    | Parallelize jobs. Cache `node_modules`. Cancel-in-progress for PR updates | Dev   |

---

## 10. Sprint Metrics

### 10.1 Sprint 1 Metrics (to be filled at sprint close)

| Metric                        | Target   | Actual |
|-------------------------------|----------|--------|
| Stories committed              | 11       |        |
| Stories completed              | 11       |        |
| Story points committed         | 47       |        |
| Story points completed         | —        |        |
| Velocity                       | —        |        |
| Test coverage (line)           | >= 80%   |        |
| Test coverage (scoring/dedup)  | 100%     |        |
| CI pipeline pass rate          | 100%     |        |
| ADRs written                   | 2        |        |
| Governance deviations          | 0        |        |
| Bugs found in sprint           | —        |        |
| Bugs fixed in sprint           | —        |        |

### 10.2 Sprint 1 Burndown (to be updated daily)

| Day   | Date       | Points Remaining | Notes |
|-------|------------|------------------|-------|
| Day 1 | 2026-03-17 | 47               |       |
| Day 2 | 2026-03-18 | —                |       |
| Day 3 | 2026-03-19 | —                |       |
| Day 4 | 2026-03-20 | —                |       |
| Day 5 | 2026-03-21 | —                |       |
| Day 6 | 2026-03-24 | —                |       |
| Day 7 | 2026-03-25 | —                |       |
| Day 8 | 2026-03-26 | —                |       |
| Day 9 | 2026-03-27 | —                |       |
| Day 10 | 2026-03-28 | —               |       |

### 10.3 Cumulative Velocity Tracker

| Sprint   | Committed | Completed | Velocity | Notes |
|----------|-----------|-----------|----------|-------|
| Sprint 1 | 47        | —         | —        |       |
| Sprint 2 | 48        | —         | —        |       |
| Sprint 3 | 40        | —         | —        |       |

---

## Appendix A — Story-to-PRD Traceability Matrix

| Story ID | PRD Functional Requirements          | PRD User Stories | PRD Acceptance Criteria |
|----------|--------------------------------------|------------------|------------------------|
| S1-01    | NFR-03, NFR-04                       | —                | —                      |
| S1-02    | NFR-10                               | —                | AC-14                  |
| S1-03    | —                                    | —                | — (governance)         |
| S1-04    | —                                    | —                | — (governance)         |
| S1-05    | FR-90                                | —                | —                      |
| S1-06    | FR-01 to FR-08                       | US-1.1, US-1.2, US-1.3 | AC-11              |
| S1-07    | FR-110, FR-111, FR-112               | US-5.1, US-5.3   | —                      |
| S1-08    | FR-11                                | US-1.4           | AC-02                  |
| S1-09    | FR-10, FR-13, FR-14                  | US-1.5           | AC-01, AC-12           |
| S1-10    | FR-100, FR-101                       | US-3.1, US-3.3   | AC-08                  |
| S1-11    | FR-01, FR-07, FR-08, FR-90 to FR-92 | US-1.1, US-1.2, US-1.3 | AC-10, AC-11     |

---

## Appendix B — Recommended Daily Plan (Sprint 1)

This is a suggested sequencing for a solo developer. Adjust based on actual progress.

| Day   | Date       | Focus                                                      | Stories     |
|-------|------------|------------------------------------------------------------|-------------|
| Day 1 | 2026-03-17 | Write both ADRs; begin repo setup                          | S1-03, S1-04, S1-01 (start) |
| Day 2 | 2026-03-18 | Complete repo setup; configure CI/CD                       | S1-01 (finish), S1-02 (start) |
| Day 3 | 2026-03-19 | Complete CI/CD; core type definitions                      | S1-02 (finish), S1-05 |
| Day 4 | 2026-03-20 | CLI skeleton — Commander.js setup, commands, flags          | S1-06 (start) |
| Day 5 | 2026-03-21 | CLI skeleton — tests, spinner, exit codes                   | S1-06 (finish) |
| Day 6 | 2026-03-24 | Config loader — defaults, schema, merge logic               | S1-07 |
| Day 7 | 2026-03-25 | Local directory resolver + test fixtures                    | S1-08 |
| Day 8 | 2026-03-26 | npm registry resolver — fetch, extract, cleanup             | S1-09 |
| Day 9 | 2026-03-27 | Console output formatter — header, table, findings, score   | S1-10 |
| Day 10 | 2026-03-28 | Scanner orchestrator — wire pipeline end-to-end; integration tests | S1-11 |

**Buffer:** Days 29-30 (weekend) available if any story slips. Sprint 1 review on 2026-03-30.

---

*This document was created with AI assistance (Claude Opus 4.6, P-03 Tech Lead persona). It must be reviewed and approved by the Project Owner before sprint execution begins.*
