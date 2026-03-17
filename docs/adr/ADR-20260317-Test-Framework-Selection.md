# ADR-20260317-Test-Framework-Selection

**Status**: Proposed
**Date**: 2026-03-17
**Decision Owner**: P-05 SDET (Claude Opus 4.6)
**Approved By**: Pending — Project Owner

---

## Context

MCP-Audit requires a test framework before any implementation begins (per governance Rule 10). The framework must support:

- Unit tests for analyzer logic and scoring (80%+ coverage required; **100% for scoring and deduplication**)
- Integration tests for full scan pipelines
- Snapshot tests for console output verification
- Mocking for npm registry API calls and child_process (npm audit)
- TypeScript support without separate compilation step
- Fast execution — developer runs tests frequently during 6-week sprint
- Coverage reporting (line, branch, function)
- Watch mode for TDD workflow

The SDGP coding standards (`/governance-docs/coding-standards.md`) specify **Vitest** as the preferred framework for TypeScript projects.

---

## Decision

Adopt **Vitest** as the test framework for MCP-Audit.

**Configuration**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            thresholds: {
                lines: 80,
                branches: 80,
                functions: 80,
                statements: 80
            },
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.d.ts', 'src/**/index.ts']
        },
        include: ['tests/**/*.test.ts'],
        testTimeout: 30000,  // Integration tests may be slower
    }
});
```

---

## Options Considered

### Option 1: Vitest (Selected)

- **Pros**:
  - Native TypeScript support — no separate compilation step (uses esbuild transform)
  - Built-in coverage via v8/istanbul
  - Built-in mocking (`vi.mock`, `vi.fn`, `vi.spyOn`)
  - Built-in snapshot testing (`expect(output).toMatchSnapshot()`)
  - Watch mode for TDD development
  - Jest-compatible API — easy for developers familiar with Jest
  - Fast execution (esbuild-based transform, parallel test runner)
  - Built-in assertion library
  - SDGP-recommended for TypeScript projects
  - Single dependency covers testing, mocking, snapshots, and coverage

- **Cons**:
  - Younger than Jest (less Stack Overflow coverage — mitigated by Jest API compatibility)
  - Requires `vitest.config.ts` configuration file

### Option 2: Jest

- **Pros**:
  - Most popular JS test framework; massive ecosystem
  - Extensive plugin system and community
  - Well-documented with abundant examples
- **Cons**:
  - Requires `ts-jest` or `babel-jest` for TypeScript — extra config, slower transforms
  - Heavier install size (~30 MB vs ~15 MB for Vitest)
  - Slower test execution for TypeScript projects due to compilation step
  - Not SDGP-recommended (Vitest is preferred)

### Option 3: Node.js built-in test runner (node:test)

- **Pros**:
  - Zero dependency — built into Node.js 20+
  - Fastest startup (no framework overhead)
- **Cons**:
  - No built-in coverage (needs `c8` separately)
  - No built-in mocking (needs separate library)
  - No snapshot testing
  - Limited ecosystem; immature compared to Vitest/Jest
  - No TypeScript support without separate compilation
  - No watch mode

---

## Rationale

Vitest is the clear choice because:

1. **SDGP-recommended** — the coding standards specify Vitest for TypeScript projects
2. **Zero-config TypeScript** — tests mirror source code exactly, no compilation step
3. **All-in-one** — mocking, snapshots, and coverage eliminate additional dependencies
4. **Jest-compatible API** — the team can leverage existing Jest knowledge and documentation
5. **Fastest option** for TypeScript test execution — esbuild-based transform
6. **100% coverage requirement** on scoring/dedup makes integrated coverage tooling essential (not a separate tool)

---

## Consequences

### Positive

- Single dependency covers all testing needs (testing, mocking, snapshots, coverage)
- Native TypeScript means tests mirror source code — no type assertion workarounds
- Fast feedback loop during development (watch mode + esbuild transforms)
- Coverage thresholds enforceable in CI (fail build if coverage drops below 80%)

### Negative

- Slightly less Stack Overflow coverage than Jest (mitigated by Jest API compatibility — most Jest answers apply directly)
- `vitest.config.ts` adds one more configuration file to the project

### Neutral

- If the project ever migrates to Jest, the migration is trivial due to API compatibility
- Test files use `.test.ts` extension — standard across both Vitest and Jest

---

## Security and Risk Notes

- Vitest is a **dev dependency only** — not shipped to users in the npm package
- Tests must **never execute scanned MCP server code** — test fixtures are static files only
- Coverage reports should not be committed to the repository (add to `.gitignore`)
- Mock implementations must accurately represent real API behaviour — do not mock away security-relevant code paths

---

## Review Triggers

- If Vitest is deprecated or unmaintained
- If Node.js built-in test runner reaches feature parity (coverage, mocking, snapshots, TypeScript)
- If a significant performance regression is discovered in Vitest

---

## ISO 27001 Mapping

- [x] A.8.25 - Secure Development
- [x] A.5.37 - Documented Procedures

---

## Related ADRs

- [ADR-20260317-Tech-Stack-Selection](ADR-20260317-Tech-Stack-Selection.md)

## References

- Vitest documentation: https://vitest.dev/
- SDGP coding standards: `/governance-docs/coding-standards.md`
- Vitest coverage: https://vitest.dev/guide/coverage

---

## Test Structure

Per SDGP coding standards §7:

```
tests/
├── unit/
│   ├── analyzers/
│   │   ├── tool-poisoning.test.ts
│   │   ├── command-injection.test.ts
│   │   ├── dependency.test.ts
│   │   ├── network.test.ts
│   │   ├── filesystem.test.ts
│   │   └── auth.test.ts
│   ├── scanner/
│   │   ├── resolver.test.ts
│   │   ├── parser.test.ts
│   │   └── aggregator.test.ts
│   └── scoring/
│       ├── severity.test.ts          ← 100% coverage required
│       └── deduplication.test.ts     ← 100% coverage required
├── integration/
│   ├── scan-npm-package.test.ts
│   ├── scan-local-directory.test.ts
│   └── full-pipeline.test.ts
├── snapshots/
│   └── console-output.test.ts
└── fixtures/
    ├── vulnerable-server/            ← MCP server with known vulnerabilities
    ├── clean-server/                 ← MCP server with zero findings
    ├── malformed-server/             ← Invalid/unparseable files
    ├── poisoned-server/              ← Tool poisoning patterns
    ├── injection-server/             ← Command injection sinks
    ├── undisclosed-network/          ← Hidden network calls
    ├── sensitive-files/              ← Sensitive path access
    └── no-auth-server/               ← No authentication configured
```

## Execution Commands

| Action | Command |
|--------|---------|
| Run all tests | `npx vitest run` |
| Run with coverage | `npx vitest run --coverage` |
| Watch mode (TDD) | `npx vitest` |
| Run specific file | `npx vitest run tests/unit/analyzers/tool-poisoning.test.ts` |
| Run by pattern | `npx vitest run --grep "scoring"` |
| Update snapshots | `npx vitest run --update` |
