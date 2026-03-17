# Feature Specification: CLI & Scanner Infrastructure

**Status**: Draft
**Author**: Claude Opus 4.6 (P-03 Tech Lead)
**Date**: 2026-03-17
**Last Updated**: 2026-03-17

---

## Overview

The CLI & Scanner Infrastructure is the foundation of MCP-Audit. It provides the command-line interface, package resolution (npm registry + local directories), MCP server structure parsing (AST-based extraction of tools, resources, prompts), and the orchestrator that coordinates analyzer execution.

This is the first component to build — every other feature spec depends on it.

---

## User Flow

1. User runs `mcp-audit scan <target>` (npm package name or local path)
2. CLI parses arguments via Commander.js, validates target format
3. Resolver determines target type:
   - **npm package**: downloads tarball via npm registry API, extracts to temp directory
   - **Local path**: validates directory exists, scans in place (no copy)
4. Parser walks source files (`.ts`, `.js`), builds AST via @babel/parser
5. Parser extracts MCP tool/resource/prompt definitions (SDK usage patterns)
6. Orchestrator runs all enabled analyzers in parallel against parsed structure
7. Results collected, passed to aggregator (see scoring-output-config spec)
8. Output formatted per `--output` flag (console default, json)
9. Exit code set: 0 = pass, 1 = findings above threshold, 2 = error
10. Temp directories cleaned up (including on SIGINT/uncaught error)

---

## Scope

### In Scope

- CLI argument parsing with Commander.js (`scan` command, `--checks`, `--output`, `--report` flags)
- `init` subcommand — generates default `mcp-audit.config.json`
- `checks --list` subcommand — displays all available analyzers
- Progress spinner (ora) with elapsed time during scan phases
- Exit code behaviour (0/1/2)
- npm package resolution (download tarball, extract to temp dir, validate structure)
- Local directory resolution (validate path exists, is directory, contains source files)
- Session caching of resolved packages (avoid redundant downloads within same CLI run)
- Temp directory cleanup on normal exit, error, and SIGINT
- MCP server structure parsing via @babel/parser AST
- TypeScript and JavaScript source file support (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`)
- Extraction of tool names, descriptions, input schemas, handler file:line references
- Extraction of resource and prompt definitions
- Orchestrator that runs analyzers in parallel and collects results

### Out of Scope

- GitHub URL resolution (`github:owner/repo`) — v0.2
- Python source file support — v0.2
- Watch mode (`mcp-audit watch`) — v0.2
- Config file auditing (`mcp-audit config`) — v0.2
- MCP config file scanning — v0.2

---

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Accept scan target as positional argument. Supported types: npm package name (e.g., `@scope/pkg`), local directory path (e.g., `./server`) | Must |
| FR-02 | Accept `--checks` flag to limit scanning to specific analyzer modules (e.g., `--checks=poisoning,injection,deps`) | Must |
| FR-03 | Accept `--output` flag supporting values: `console` (default), `json` | Must |
| FR-04 | Accept `--report` flag to write output to a file path | Should |
| FR-05 | `init` subcommand generates default `mcp-audit.config.json` in current directory | Should |
| FR-06 | `checks --list` subcommand displays all available analyzers with descriptions | Must |
| FR-07 | Display progress spinner with elapsed time during resolve, parse, and analyze phases | Must |
| FR-08 | Exit with code 0 on pass, 1 on findings above threshold, 2 on error | Must |
| FR-10 | Resolve npm package names by downloading tarball via npm registry API and extracting to temp directory | Must |
| FR-11 | Resolve local directory paths by scanning files in place (no copy) | Must |
| FR-13 | Cache resolved packages within a session to avoid redundant downloads | Should |
| FR-14 | Clean up all temporary directories on exit (normal, error, SIGINT) | Must |
| FR-20 | Detect MCP server structure by parsing source files for MCP SDK usage patterns (tool definitions, resource definitions, prompt definitions) | Must |
| FR-21 | Extract tool names, descriptions, input schemas, and handler file:line references | Must |
| FR-22 | Extract resource and prompt definitions where present | Should |
| FR-23 | Support TypeScript and JavaScript source files | Must |

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Scan a typical MCP server (< 50 source files) in < 10 seconds end-to-end |
| Performance | Scan a large MCP server (50–200 source files) in < 30 seconds |
| Portability | Run on Node.js 20+ across macOS, Linux, and Windows |
| Install size | npm package install size < 50 MB (excluding optional deps) |
| Security | Never execute scanned code — analysis is purely static. No `require()`, `import()`, or `eval()` of scanned files |
| Reliability | Graceful handling of malformed input: invalid package names, missing directories, unparseable files, missing package.json |
| Reliability | Temp directory cleanup must succeed even on unhandled exceptions (use process.on handlers) |

---

## Data and State Changes

| Entity | Operation | Description |
|--------|-----------|-------------|
| Temp directory | CREATE | Created for npm package extraction; unique per session |
| Session cache | CREATE | In-memory map of resolved packages to avoid re-download |
| Source files | READ | Read from target directory or extracted package |
| package.json | READ | Read from target for metadata and dependency list |
| npm registry API | READ | HTTP GET for package tarball and metadata |
| Temp directory | DELETE | Cleaned up on exit via cleanup handler |

---

## Related ADRs

- [ADR-20260317-Tech-Stack-Selection](../adr/ADR-20260317-Tech-Stack-Selection.md) — TypeScript, Node.js, Commander.js
- [ADR-20260317-AST-Parser-Selection](../adr/ADR-20260317-AST-Parser-Selection.md) — @babel/parser for AST parsing

---

## Risks and Edge Cases

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| npm registry unavailable | Medium | High — cannot resolve npm packages | Graceful error message; local scanning unaffected |
| Malformed package.json in target | Medium | Medium — metadata extraction fails | Try/catch with informative error; continue scan without metadata |
| Very large package (>1000 files) | Low | Medium — slow scan | Configurable file limit; warn user; progress spinner shows file count |
| Non-standard MCP SDK usage patterns | High | Medium — missed tool definitions | Document supported patterns; make parser extensible for new patterns |
| Temp dir not cleaned on SIGKILL | Low | Low — orphaned temp dir | Use `os.tmpdir()` so OS cleans eventually; temp dirs are small |
| Package name collision (npm package vs local dir) | Low | Medium — wrong target resolved | Check if path exists on filesystem first; npm resolution only if no local match |
| Scoped packages with special characters | Medium | Low — URL encoding issues | Use npm registry API correctly; test with scoped packages |

---

## Rollback Plan

1. CLI tool — users downgrade via `npm install -g mcp-audit@<previous-version>`
2. No persistent state to roll back — the tool is stateless
3. If a specific version has a regression, publish a patch release

---

## Dependencies

- **commander** — CLI argument parsing and subcommand routing
- **@babel/parser** — JavaScript/TypeScript AST parsing
- **@babel/traverse** — AST visitor-pattern walking
- **ora** — Progress spinner with elapsed time
- **chalk** — Terminal colour output
- **fast-glob** — File pattern matching for source file discovery
- **npm registry API** — Package tarball download (HTTPS, no SDK needed)

---

## Testing Strategy

- **Unit tests:**
  - Argument parsing: valid/invalid targets, flag combinations, subcommands
  - Target type detection: npm package name vs local path disambiguation
  - MCP structure extraction: tool/resource/prompt extraction from known AST shapes
  - Temp directory cleanup: verify cleanup on normal exit, error, SIGINT
  - Session cache: verify cache hit avoids re-download

- **Integration tests:**
  - Full scan of test fixture npm package (mock registry response)
  - Full scan of local test fixture directory
  - Scan with `--checks` flag limiting analyzers
  - Scan with `--output=json` producing valid JSON
  - Exit code verification: pass, fail, error scenarios

- **E2E tests:**
  - CLI invocation via child_process with various flag combinations
  - Verify console output format (snapshot tests)
  - Verify exit codes match expectations

- **Regression tests:**
  - One test per resolved bug
