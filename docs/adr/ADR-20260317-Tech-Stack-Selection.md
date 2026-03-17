# ADR-20260317-Tech-Stack-Selection

**Status**: Proposed
**Date**: 2026-03-17
**Decision Owner**: P-02 Solution Architect (Claude Opus 4.6)
**Approved By**: Pending — Project Owner

---

## Context

MCP-Audit is a CLI security scanner for MCP (Model Context Protocol) servers. It performs static analysis on MCP server source code to detect vulnerabilities (tool poisoning, command injection, dependency issues, undisclosed network/filesystem access).

Constraints:
- Must run on Node.js 20+ across macOS, Linux, and Windows
- Distributed via npm (primary channel for target audience)
- Must parse JavaScript/TypeScript ASTs
- Coloured terminal output with progress indicators
- Install size under 50 MB
- Primary MCP ecosystem is JavaScript/TypeScript on npm
- Solo developer + AI-assisted development
- Bootstrap budget (zero external funding)
- 6-week MVP timeline

---

## Decision

Adopt the following tech stack for MCP-Audit v0.1:

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | TypeScript (strict mode) | 5.x |
| Runtime | Node.js (LTS) | 20+ |
| CLI Framework | Commander.js | 12.x |
| Terminal Output | Chalk | 5.x |
| Progress Spinner | Ora | 8.x |
| AST Parsing | @babel/parser + @babel/traverse | 7.x (see ADR-20260317-AST-Parser-Selection) |
| File Matching | fast-glob | 3.x |
| Build Tool | tsup (esbuild-based) | 8.x |
| Package Manager | npm | 10.x |
| Distribution | npm registry (global install + npx) | — |

---

## Options Considered

### Option 1: TypeScript + Node.js + Commander.js (Selected)

- **Pros**:
  - Native to the MCP ecosystem — most MCP servers are TypeScript/JavaScript
  - npm distribution is zero-friction for target users (`npx mcp-audit scan ...`)
  - Rich AST tooling available (@babel/parser, @babel/traverse, estree ecosystem)
  - Commander.js is the standard Node.js CLI framework (44K+ GitHub stars, battle-tested)
  - Developer expertise aligned with project needs
  - Fast development velocity — achievable in 6-week timeline
  - Same language as what the tool scans — simplifies community contributions

- **Cons**:
  - Node.js startup time (~100ms overhead)
  - Single-threaded (mitigated by async/await for I/O)
  - Larger install footprint than compiled binary

### Option 2: Rust + Clap

- **Pros**:
  - Fastest execution; smallest binary; no runtime dependency
  - Excellent for CLI tools (ripgrep, fd, bat)
- **Cons**:
  - Slower development velocity for solo developer
  - No native npm distribution (requires separate binary publishing via GitHub releases)
  - JS/TS AST parsing requires tree-sitter bindings — adds complexity
  - Alien to the target user community (JS/TS developers)
  - 6-week timeline not feasible

### Option 3: Go + Cobra

- **Pros**:
  - Fast compilation; single binary distribution
  - Good CLI ecosystem (Cobra is well-established)
- **Cons**:
  - Same distribution problem as Rust (not native npm)
  - Weaker JS/TS AST tooling
  - Alien to MCP ecosystem
  - Verbose error handling adds development time

### Option 4: Python + Click

- **Pros**:
  - Rapid prototyping; rich analysis libraries
- **Cons**:
  - Python CLI distribution is notoriously poor (pip install friction, virtualenv)
  - MCP ecosystem is primarily JS/TS
  - Slower execution than Node.js for I/O-bound work
  - Dependency management adds user friction

---

## Rationale

TypeScript + Node.js is the only option that is:
1. **Native to the target ecosystem** — MCP SDK is TypeScript; MCP servers are JS/TS
2. **Distributable via npm** — the same package manager users already use
3. **Equipped with first-class AST parsing** for the languages being analysed
4. **Achievable in 6 weeks** by a solo developer with AI assistance

Commander.js was selected over yargs and oclif because it has the simplest API for the command structure needed (`scan`, `init`, `checks --list`), adds minimal dependency weight, and is the most widely adopted Node.js CLI framework.

Chalk + Ora are the de facto standard for Node.js CLI terminal output — MIT-licensed, well-maintained, and familiar to the target audience.

tsup was selected as the build tool because it uses esbuild under the hood (fast builds), handles TypeScript natively, and produces both ESM and CJS outputs.

---

## Consequences

### Positive

- Zero-friction distribution via npm/npx to the exact audience that needs this tool
- Shared language with MCP servers enables community contributions
- Rich AST tooling ecosystem for JS/TS analysis
- Fast development velocity for solo developer
- Dog-fooding: the scanner can scan itself

### Negative

- Node.js startup overhead (~100ms) — acceptable for a security scanner (not a hot-path tool)
- Larger install size than compiled binary — mitigated by keeping dependencies minimal (< 50 MB target)
- Cannot easily distribute as standalone binary without Node.js — mitigated by npx support and future Docker/pkg options

### Neutral

- TypeScript strict mode adds initial setup time but prevents bugs long-term
- npm ecosystem dependency management requires vigilance (ironic for a security tool — mitigated by pinned versions and self-scanning)

---

## Security and Risk Notes

- The scanner must not introduce its own vulnerabilities. All dependencies must be MIT-licensed and audited
- No `eval()`, no dynamic `require()` of scanned code, no `child_process` usage except for `npm audit` integration (controlled arguments only)
- Dependencies must be pinned to exact versions in `package-lock.json`
- The tool must run `mcp-audit` on itself (dog-fooding) before each release
- Supply chain risk mitigated by minimal dependency count and regular `npm audit` on the project itself

---

## Review Triggers

- If MCP ecosystem shifts to Python-primary, reconsider language choice
- If install size exceeds 50 MB, evaluate dependency tree and consider tree-shaking
- If performance becomes an issue (> 30s for large servers), consider Rust rewrite for hot-path modules (parser, taint analysis)
- If npm distribution becomes insufficient (enterprise users need standalone binary), add Docker and pkg as distribution channels

---

## ISO 27001 Mapping

- [x] A.8 - Change Management
- [x] A.8.25 - Secure Development
- [x] A.5.37 - Documented Procedures

---

## Related ADRs

- [ADR-20260317-AST-Parser-Selection](ADR-20260317-AST-Parser-Selection.md)
- [ADR-20260317-Test-Framework-Selection](ADR-20260317-Test-Framework-Selection.md)

## References

- Commander.js: https://github.com/tj/commander.js
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Chalk: https://github.com/chalk/chalk
- Ora: https://github.com/sindresorhus/ora
- tsup: https://github.com/egoist/tsup
- fast-glob: https://github.com/mrmlnc/fast-glob
