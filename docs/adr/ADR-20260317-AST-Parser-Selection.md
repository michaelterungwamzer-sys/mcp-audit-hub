# ADR-20260317-AST-Parser-Selection

**Status**: Proposed
**Date**: 2026-03-17
**Decision Owner**: P-02 Solution Architect (Claude Opus 4.6)
**Approved By**: Pending — Project Owner

---

## Context

MCP-Audit needs to parse JavaScript and TypeScript source files into Abstract Syntax Trees (ASTs) to perform static analysis. The parser is the most critical dependency — it determines the accuracy and scope of all six analyzers.

Requirements:
- Handle modern JS/TS syntax (ES2024+, TypeScript 5.x including decorators, optional chaining, nullish coalescing, satisfies operator)
- Produce a traversable AST for identifying function calls, string patterns, imports, and data flow
- Work offline with no external service dependency
- Run on Node.js 20+ across all platforms
- MIT-compatible licence
- Reasonable install size (parser + traversal < 10 MB)
- Provide visitor-pattern AST walking for consistent analyzer implementation

---

## Decision

Use **@babel/parser** as the primary AST parser, with **@babel/traverse** for AST walking.

Configuration:
```typescript
import { parse } from '@babel/parser';

const ast = parse(sourceCode, {
    sourceType: 'module',
    plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
        'dynamicImport',
        'topLevelAwait'
    ],
    errorRecovery: true  // Continue parsing on syntax errors
});
```

---

## Options Considered

### Option 1: @babel/parser + @babel/traverse (Selected)

- **Pros**:
  - Industry standard for JS/TS parsing — used by ESLint, Prettier, and most JS tooling
  - Supports all modern syntax including TypeScript, JSX, decorators, pipeline operator
  - ESTree-compatible AST — portable if we ever need to switch parsers
  - @babel/traverse provides powerful visitor-pattern AST walking with scope tracking, path manipulation, and binding resolution
  - Enormous ecosystem: plugins, documentation, community answers
  - MIT licence
  - Actively maintained by the Babel team
  - Install size: ~2 MB (parser) + ~1 MB (traverse) = ~3 MB total
  - `errorRecovery` mode allows parsing malformed files without crashing

- **Cons**:
  - TypeScript support is parse-only — no type information (cannot resolve types, overloads, or generics)
  - Slower than native parsers (SWC, tree-sitter) for very large files (> 10K lines)
  - Babel AST has some non-standard node types (e.g., `TSTypeAnnotation`)

### Option 2: TypeScript Compiler API (ts.createSourceFile)

- **Pros**:
  - Full TypeScript type information available (resolve types, overloads, generics)
  - Official TypeScript parser — guaranteed syntax support
  - Can perform type-aware taint analysis (more accurate)
- **Cons**:
  - ~50 MB install size for the `typescript` package alone — would consume the entire install budget
  - API is complex and poorly documented for AST traversal
  - No built-in visitor pattern — requires ts-morph or custom walker
  - Type-checking requires `tsconfig.json` which scanned packages may not have
  - Significantly slower startup for our use case (full type-checker initialisation)

### Option 3: ts-morph

- **Pros**:
  - Friendlier API than raw TypeScript compiler
  - Provides navigation methods and type information
- **Cons**:
  - ~60 MB+ install size (wraps full TypeScript compiler)
  - Heavy for what we need in v0.1
  - Adds abstraction layer that may hide edge cases
  - Slower startup than Babel

### Option 4: tree-sitter (via node-tree-sitter)

- **Pros**:
  - Extremely fast (C-based incremental parser)
  - Supports many languages — useful for future Python support (v0.2)
  - Used by GitHub for code navigation and syntax highlighting
- **Cons**:
  - Requires native bindings (`node-gyp` build step) — installation friction on Windows
  - Grammar files add packaging complexity
  - AST format is tree-sitter-specific (not ESTree) — requires custom traversal code
  - Less JS ecosystem tooling compared to Babel
  - MIT licence but native dependencies complicate cross-platform distribution

### Option 5: acorn + acorn-typescript

- **Pros**:
  - Very lightweight (~200 KB)
  - Fast parsing
  - ESTree-compliant
  - Used by webpack and rollup
- **Cons**:
  - TypeScript support via `acorn-typescript` is less mature than Babel's
  - Fewer advanced syntax features supported (e.g., decorators, pipeline)
  - Smaller community for TypeScript-specific edge cases
  - `acorn-walk` (traversal) is basic — no scope tracking or path manipulation

### Option 6: SWC (@swc/core)

- **Pros**:
  - Very fast (Rust-based parser)
  - Supports TypeScript natively
- **Cons**:
  - AST format is SWC-specific (not ESTree) — all analyzer code would be SWC-specific
  - Native binary — same installation friction as tree-sitter
  - AST traversal tooling is immature compared to Babel ecosystem
  - Primarily designed for transpilation, not static analysis

---

## Rationale

@babel/parser is the optimal choice because:

1. **Handles all JS/TS syntax** we'll encounter in MCP servers without requiring `tsconfig.json` or type resolution
2. **@babel/traverse** provides the visitor-pattern AST walking that all analyzers need — `enter`/`exit` callbacks, scope tracking, path manipulation, binding resolution
3. **Install size is manageable** — ~3 MB total (parser + traverse), well within the 50 MB budget
4. **ESTree-compatible AST** means our analysis code is portable if we ever need to switch parsers
5. **We don't need type information for v0.1** — our taint analysis is basic (intraprocedural, parameter-to-sink tracing). Type-aware analysis can be added in v0.2 with TypeScript compiler as a supplementary data source
6. **Ecosystem advantage** — contributors writing new analyzer rules will find abundant documentation and examples for Babel AST manipulation
7. **Error recovery mode** — malformed files produce partial ASTs instead of crashes, which is critical for scanning untrusted code

The TypeScript Compiler was rejected primarily on install size (would consume the entire 50 MB budget) and complexity. tree-sitter was rejected on installation friction (native bindings). SWC and acorn were rejected on AST tooling maturity.

---

## Consequences

### Positive

- All analyzers use @babel/traverse visitors — consistent, well-documented analysis pattern
- Supports every JS/TS syntax feature in the current MCP ecosystem
- Small dependency footprint (~3 MB)
- Rich documentation and community support
- Error recovery handles malformed source files gracefully

### Negative

- No type information — limits taint analysis accuracy (e.g., cannot resolve which overload of a function is called, cannot trace through generic types)
- Parser errors on non-standard syntax (e.g., Flow types) — mitigated by `errorRecovery: true` and try/catch

### Neutral

- When Python support is added (v0.2), a separate parser will be needed — tree-sitter becomes a candidate at that point
- Babel AST has some node types not in the ESTree spec — document which ones our analyzers rely on to aid future migration

---

## Security and Risk Notes

- @babel/parser is a well-audited, widely-used package (10M+ weekly npm downloads) — low supply chain risk
- Parser must never execute code — it only parses text into a tree structure. No `eval()`, no `Function()` constructor
- Pin @babel/parser and @babel/traverse to exact versions in `package-lock.json`
- Audit before updating — parser updates can change AST shape, which could break analyzer detection patterns
- `errorRecovery` mode is essential — it prevents the scanner from crashing on adversarial or malformed input

---

## Review Triggers

- If Python support is added (v0.2), evaluate tree-sitter for multi-language parsing under a unified AST interface
- If type-aware analysis is needed (v0.2+), consider adding TypeScript compiler as a supplementary data source (not a replacement for Babel)
- If @babel/parser drops TypeScript support or becomes unmaintained
- If a new JS/TS parser emerges with significantly better performance and equivalent tooling

---

## ISO 27001 Mapping

- [x] A.8.25 - Secure Development
- [x] A.5 - Risk Assessment
- [x] A.5.37 - Documented Procedures

---

## Related ADRs

- [ADR-20260317-Tech-Stack-Selection](ADR-20260317-Tech-Stack-Selection.md)

## References

- @babel/parser documentation: https://babeljs.io/docs/babel-parser
- @babel/traverse documentation: https://babeljs.io/docs/babel-traverse
- ESTree specification: https://github.com/estree/estree
- Babel AST Explorer: https://astexplorer.net/
