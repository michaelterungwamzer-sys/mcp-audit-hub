# Feature Specification: Command Injection Analyzer

**Status**: Draft
**Author**: Claude Opus 4.6 (P-06 Security & Compliance Reviewer)
**Date**: 2026-03-17
**Last Updated**: 2026-03-17

---

## Overview

The Command Injection Analyzer detects dangerous code execution sinks in MCP server handler code where user-controlled input flows without sanitisation. This covers three injection types:

1. **Shell command injection** — `exec()`, `spawn()`, and related child_process calls with user input
2. **SQL injection** — `query()`, `raw()`, and related database calls with string interpolation
3. **Path traversal** — user input concatenated into file paths without validation

The analyzer uses AST-based sink detection with basic intraprocedural taint analysis to trace arguments back to function parameters (user-controlled input).

---

## User Flow

1. Orchestrator passes parsed MCP server structure
2. Analyzer walks all source file ASTs
3. Identifies calls to dangerous sinks (shell, SQL, filesystem)
4. For each sink call, performs backward taint analysis within the function scope
5. If any argument traces to a function parameter (user input) without sanitisation → flag
6. Returns `InjectionFinding` array with type, severity, file:line, code evidence, sink name, and recommendation

---

## Scope

### In Scope

- Shell injection sink detection: `exec`, `execSync`, `spawn`, `spawnSync`, `execFile`, `execFileSync`, `fork`, `child_process.*`
- SQL injection sink detection: `query`, `execute`, `raw`, `rawQuery`, `knex.raw`, `sequelize.query` — with string interpolation/concatenation detection
- Path traversal detection: user input concatenated into file paths via `fs.*` calls, `path.join()` with unvalidated input
- Basic taint analysis: intraprocedural (single function scope), tracing sink arguments backward through variable assignments to function parameters
- Template literal detection: flag `exec(\`command ${userInput}\`)` patterns
- String concatenation detection: flag `query("SELECT * FROM x WHERE id = '" + userInput + "'")` patterns
- Severity assignment: critical for shell injection, high for SQL injection, high for path traversal

### Out of Scope

- Full interprocedural dataflow analysis (deferred — requires call graph construction)
- Dynamic taint tracking (runtime analysis)
- Python injection sinks (v0.2)
- Framework-specific ORM detection (e.g., Prisma — safe by default)

---

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-40 | Identify calls to dangerous shell sinks (`exec`, `execSync`, `spawn`, `spawnSync`, `execFile`, `child_process.*`) with user-controlled input | Must |
| FR-41 | Perform basic taint analysis — trace arguments to dangerous sinks back to function parameters | Must |
| FR-42 | Detect SQL injection sinks (`query`, `execute`, `raw`, `rawQuery`, `knex.raw`, `sequelize.query`) with string interpolation or concatenation | Must |
| FR-43 | Detect path traversal patterns — user input concatenated into file paths without validation | Must |

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Analyze all source files in < 3 seconds for a typical server |
| Security | Static analysis only — never execute scanned code |
| Accuracy | Target ≥ 85% true positive rate per PRD KPI (Section 12.2) |

---

## Data and State Changes

| Entity | Operation | Description |
|--------|-----------|-------------|
| Source file ASTs | READ | All `.ts`/`.js` files parsed by infrastructure spec |
| Function parameters | READ | Extracted from AST to identify user-controlled inputs |
| Call expressions | READ | Identified and matched against sink lists |

No writes — pure analysis function.

---

## Related ADRs

- [ADR-20260317-AST-Parser-Selection](../adr/ADR-20260317-AST-Parser-Selection.md) — @babel/parser + @babel/traverse

---

## Detection Logic Detail

### Shell Sinks

```
exec, execSync, spawn, spawnSync, execFile, execFileSync, fork
child_process.exec, child_process.spawn, child_process.execSync
require('child_process').exec, import { exec } from 'child_process'
```

### SQL Sinks

```
.query(), .execute(), .raw(), .rawQuery()
knex.raw(), sequelize.query(), pool.query()
connection.query(), db.query()
```

Flag when argument contains:
- Template literal with embedded expression: `` `SELECT * FROM x WHERE id = ${userId}` ``
- String concatenation with variable: `"SELECT * FROM x WHERE id = '" + userId + "'"`

Do NOT flag:
- Parameterised queries: `.query("SELECT * FROM x WHERE id = ?", [userId])`
- Prepared statements: `.prepare("SELECT * FROM x WHERE id = $1")`

### Path Traversal

```
fs.readFile(userInput), fs.readFileSync(userInput)
fs.writeFile(path.join(base, userInput), ...)
fs.createReadStream(userInput)
```

Flag when file path argument traces to function parameter without validation.

Do NOT flag if path is validated:
- `path.resolve(base, userInput)` followed by `.startsWith(base)` check
- Input validated against allowlist

### Taint Analysis (Basic — Intraprocedural)

1. Find all calls to dangerous sinks in the AST
2. For each argument to the sink:
   - **Literal string** → safe (not user-controlled)
   - **Variable referencing a literal** → safe
   - **Template literal with expressions** → trace each expression
   - **Function parameter** → tainted (user input)
   - **Variable assignment** → walk backward through assignments in same scope
3. Walk assignment chain within the same function scope only
4. If any part of the argument traces to a function parameter → flag as user-controlled
5. Check for common sanitisation patterns:
   - `escapeShellArg()`, `shellEscape()` → mark as sanitised
   - Parameterised query binding → mark as sanitised
   - `path.resolve()` + `.startsWith()` → mark as validated

---

## Risks and Edge Cases

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| False positives on sanitised input | High | Medium | Check for common sanitisation patterns; allowlist support |
| Missed injection via multi-function flow | High | Medium | Document limitation; log "limited analysis" note; full dataflow deferred |
| Obfuscated sink calls (dynamic require, computed property) | Medium | Medium | Flag `require(variable)` and `obj[computedKey]()` as suspicious |
| Wrapper functions around dangerous sinks | High | Medium | Check 1 level of function indirection (if function body contains sink, flag call to wrapper) |
| Destructured parameters | Medium | Low | Handle `const { input } = args` pattern in taint tracing |
| Arrow functions and callbacks | Medium | Low | Traverse into arrow function expressions and callbacks passed to handlers |

---

## Rollback Plan

1. Disable via `--checks` flag (exclude `injection`) or config file
2. False positives suppressed via allowlist (FR-93)

---

## Dependencies

- **@babel/parser** — Source file AST generation
- **@babel/traverse** — AST walking, scope analysis, binding resolution

---

## Testing Strategy

- **Unit tests** (≥ 8 test cases per PRD AC-04):
  - `exec()` with template literal containing user input → critical
  - `exec()` with hardcoded string → no finding
  - `execSync()` with variable traced to function parameter → critical
  - `query()` with string concatenation → high
  - `query()` with parameterised binding → no finding
  - `fs.readFile()` with user input in path → high
  - `path.join()` with validated input (startsWith check) → no finding
  - `spawn()` with sanitised (escaped) argument → no finding

- **Test fixtures:**
  - `fixtures/injection-server/` — MCP server with known injection vulnerabilities
  - `fixtures/safe-server/` — MCP server using parameterised queries and sanitised exec

- **Edge case tests:**
  - Nested function calls: `exec(buildCommand(userInput))`
  - Destructured parameters: `const { query } = args; exec(query)`
  - Rest parameters: `function handler(...args) { exec(args[0]) }`
  - Multiple sinks in same handler
  - Sink in callback: `db.transaction(tx => tx.query(unsafeInput))`
