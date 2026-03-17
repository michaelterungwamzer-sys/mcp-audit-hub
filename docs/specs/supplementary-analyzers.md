# Feature Specification: Supplementary Analyzers — Network, Filesystem & Authentication

**Status**: Draft
**Author**: Claude Opus 4.6 (P-06 Security & Compliance Reviewer)
**Date**: 2026-03-17
**Last Updated**: 2026-03-17

---

## Overview

Three security analyzers grouped into one spec because they share a common pattern: AST-based detection of specific API calls in handler code, with severity determined by context (disclosed vs undisclosed, sensitive vs non-sensitive).

1. **Network Analyzer** — detects undisclosed outbound network calls and data exfiltration patterns
2. **Filesystem Analyzer** — detects sensitive file access and path traversal vulnerabilities
3. **Authentication Analyzer** — checks for presence of authentication configuration

---

## User Flow

1. Orchestrator passes parsed MCP server structure to each analyzer
2. Each analyzer walks source file ASTs looking for its target API calls
3. Network and Filesystem analyzers cross-reference findings against tool descriptions
4. Authentication analyzer checks server configuration for auth presence
5. Each returns findings array with severity, evidence, file:line, recommendation

---

## Scope

### In Scope

**Network Analyzer:**
- Detect outbound HTTP/HTTPS calls: `fetch()`, `axios.*()`, `http.request()`, `https.request()`, `got()`, `node-fetch`, `undici`, `new WebSocket()`
- Flag data exfiltration patterns: `process.env` or user data variables passed to network call arguments
- Cross-reference detected network endpoints against tool descriptions — undisclosed network access = `high` severity

**Filesystem Analyzer:**
- Detect file read/write operations: `fs.readFile*()`, `fs.writeFile*()`, `fs.access()`, `fs.open()`, `fs.createReadStream()`, `fs.createWriteStream()`, `fs.unlink*()`
- Flag access to sensitive paths (configurable list)
- Detect path traversal: user input in file paths without validation

**Authentication Analyzer:**
- Check for auth-related imports: OAuth libraries, JWT libraries, auth middleware
- Check for auth middleware registration in server setup
- Check for token/key validation patterns
- Flag servers with no authentication mechanism = `high` severity

### Out of Scope

- Runtime network monitoring or sandboxing
- Dynamic filesystem access tracking
- OAuth flow validation (presence check only, not correctness)
- TLS certificate validation
- CORS configuration analysis

---

## Functional Requirements

### Network Analyzer

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-60 | Detect outbound network calls (HTTP/HTTPS, WebSocket) in handler code | Must |
| FR-61 | Flag data exfiltration patterns — user data or environment variables sent to external endpoints | Must |
| FR-62 | Compare detected network endpoints against tool descriptions — undisclosed network access flagged as `high` | Must |

### Filesystem Analyzer

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-70 | Detect file read/write operations in handler code | Must |
| FR-71 | Flag access to sensitive paths: `~/.ssh`, `~/.aws`, `~/.env`, credential files, private keys | Must |
| FR-72 | Detect path traversal vulnerabilities — user input used in file paths without sanitisation | Must |

### Authentication Analyzer

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-80 | Check for presence of authentication configuration in MCP server setup | Must |
| FR-81 | Flag MCP servers that expose tools without any authentication mechanism | Must |

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | All three analyzers combined < 2 seconds for typical server |
| Security | Static analysis only — never execute scanned code |
| Extensibility | Sensitive paths list configurable via config file |

---

## Data and State Changes

| Entity | Operation | Description |
|--------|-----------|-------------|
| Source file ASTs | READ | All handler files |
| Tool descriptions | READ | For network/filesystem discrepancy detection |
| Server configuration | READ | For auth presence detection |
| Sensitive paths config | READ | Loaded from config or defaults |

No writes — pure analysis functions.

---

## Related ADRs

- [ADR-20260317-AST-Parser-Selection](../adr/ADR-20260317-AST-Parser-Selection.md)

---

## Detection Targets

### Network API Calls

```javascript
// Direct calls
fetch(url, options)
axios.get(url) / axios.post(url, data) / axios(config)
http.request(url, options) / https.request(url, options)
got(url, options)
new WebSocket(url)

// Import patterns
import fetch from 'node-fetch'
const axios = require('axios')
const { request } = require('undici')
```

### Exfiltration Patterns

Flag when network call arguments contain:
- `process.env.*` — environment variable exfiltration
- Function parameter variables — user data exfiltration
- String literals matching sensitive data patterns (API keys, tokens)

### Filesystem API Calls

```javascript
fs.readFile(path), fs.readFileSync(path)
fs.writeFile(path, data), fs.writeFileSync(path, data)
fs.access(path), fs.open(path)
fs.createReadStream(path), fs.createWriteStream(path)
fs.unlink(path), fs.unlinkSync(path)
fs.readdir(path), fs.readdirSync(path)
// Also: fs-extra, graceful-fs equivalents
```

### Sensitive Paths (Default — Configurable)

```json
[
  "~/.ssh", "~/.ssh/id_rsa", "~/.ssh/id_ed25519", "~/.ssh/known_hosts",
  "~/.aws", "~/.aws/credentials", "~/.aws/config",
  "~/.env", ".env", ".env.local", ".env.production", ".env.staging",
  "~/.npmrc", "~/.yarnrc",
  "~/.gitconfig", "~/.git-credentials",
  "~/.config/gcloud", "~/.docker/config.json", "~/.kube/config",
  "/etc/passwd", "/etc/shadow", "/etc/hosts",
  "*.pem", "*.key", "*.p12", "*.pfx",
  "id_rsa", "id_ed25519", "id_ecdsa"
]
```

### Authentication Detection Patterns

**Positive indicators** (auth is present):
```javascript
// Import patterns
import { OAuth2Server } from '...'
require('passport'), require('jsonwebtoken'), require('express-jwt')
require('@auth/core'), require('lucia')

// Middleware patterns
server.use(authMiddleware)
app.use(authenticate)
server.setRequestHandler(... token ...)

// Validation patterns
jwt.verify(), verifyToken(), validateApiKey()
request.headers.authorization
```

**Negative indicators** (no auth):
- No auth-related imports found
- No middleware registration
- No token validation in any handler
- Server exposes tools directly without any guard

---

## Risks and Edge Cases

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| False positive: legitimate disclosed network call | Medium | Medium | Cross-reference with description; only flag undisclosed |
| Obfuscated network calls (dynamic URL) | Medium | High | Flag dynamic URL construction as suspicious |
| Auth in separate config file not scanned | High | Medium | Document limitation; recommend scanning full project |
| Filesystem via third-party library (not `fs`) | High | Medium | Check common libs (`fs-extra`, `graceful-fs`); extensible pattern list |
| Sensitive path detection on Windows vs Unix | Medium | Low | Normalise paths; check both `/` and `\` patterns |
| Auth pattern not recognised | High | Medium | Conservative: only flag "no auth" when zero indicators found |

---

## Rollback Plan

1. Each analyzer independently disableable via `--checks` or config
2. False positives suppressed via allowlist (FR-93)
3. Sensitive paths list customisable via config — can add/remove paths

---

## Dependencies

- **@babel/parser** + **@babel/traverse** — AST analysis
- No additional external dependencies

---

## Testing Strategy

- **Unit tests — Network Analyzer** (≥ 5 test cases per PRD AC-06):
  - Undisclosed `fetch()` in handler → `high`
  - Disclosed network call (description mentions API) → no finding
  - `process.env.API_KEY` sent via `fetch()` → `critical` exfiltration
  - WebSocket connection → finding
  - Conditional network call (in if block) → finding

- **Unit tests — Filesystem Analyzer** (≥ 5 test cases per PRD AC-07):
  - `fs.readFile("~/.ssh/id_rsa")` → `critical`
  - `fs.readFile("./data/config.json")` → no finding
  - `fs.readFile(userInput)` with no path validation → `high` traversal
  - `fs.writeFile(".env", data)` → `critical`
  - `fs.readFile(path.resolve(base, input))` with startsWith check → no finding

- **Unit tests — Authentication Analyzer:**
  - Server with JWT middleware → no finding
  - Server with no auth imports or middleware → `high`
  - Server with OAuth configuration → no finding
  - Server with API key validation → no finding

- **Test fixtures:**
  - `fixtures/undisclosed-network/` — handler with hidden fetch call
  - `fixtures/sensitive-files/` — handler accessing ~/.ssh
  - `fixtures/no-auth-server/` — MCP server with zero auth
  - `fixtures/auth-server/` — MCP server with proper JWT auth
