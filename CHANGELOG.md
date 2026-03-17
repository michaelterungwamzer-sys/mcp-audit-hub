# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
