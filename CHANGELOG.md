# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-27

### Changed
- Updated scanner engine documentation to reflect 12 analyzers (up from 6), aligned with defense recommendations in Li & Gao (2025) arXiv:2510.16558
- Updated ISO 27001 A.12.6 vulnerability management mapping to cover all 12 analyzer categories
- Updated architecture diagram to reflect 12 analyzers

### Added (Scanner v0.3.0)
- **TLS/Encryption Verification**: non-TLS URLs, disabled cert verification, insecure WebSockets, mixed protocols (CWE-319, CWE-295)
- **Credential Hygiene**: hardcoded secrets, credentials in URLs, weak crypto, secrets in logs (CWE-798, CWE-312, CWE-532, CWE-916)
- **Security Posture**: rate limiting, audit logging, input validation sub-checks (CWE-20, CWE-532)
- **Cross-Server Attack Detection**: MCP package deps, localhost comms, shared state, prompt injection relay (CWE-918, CWE-829, CWE-74)
- **Rug Pull Detection**: install script analysis, obfuscated code, suspicious minification, metadata red flags (CWE-506, CWE-829)
- **Tool Allowlist/Blocklist**: community blocklist, excessive tools, system command names, privileged operations

## [0.1.0] - 2026-03-17

### Added

- CLI interface with `scan`, `init`, and `checks` commands via Commander.js
- Package resolution: local directories and npm registry packages
- MCP server parser: AST-based extraction of tool/resource/prompt definitions
- Scanner orchestrator: resolve -> parse -> analyze -> aggregate pipeline
- **Tool Poisoning Analyzer**: description length checks, suspicious pattern matching (5 categories), description-implementation discrepancy detection
- **Command Injection Analyzer**: shell injection sinks, SQL injection with template literals, path traversal detection, basic intraprocedural taint analysis
- **Dependency Analyzer**: npm audit integration, Levenshtein typosquatting detection against popular package list
- **Network Analyzer**: undisclosed outbound network call detection, process.env exfiltration detection
- **Filesystem Analyzer**: sensitive path access detection (~/.ssh, ~/.aws, .env, etc.), path traversal with user input
- **Authentication Analyzer**: auth presence check (imports, middleware, token validation patterns)
- Weighted-sum security scoring (0-100) with PASS/WARN/FAIL classification
- Finding deduplication and severity-based sorting
- Allowlist support for false positive suppression
- Console output with colour-coded severity and summary table
- JSON output for CI/CD pipeline integration
- Configuration file support (`mcp-audit.config.json`)
- Pattern libraries: poisoning patterns and popular package list for typosquatting
- CI/CD pipeline (GitHub Actions) with cross-platform testing
