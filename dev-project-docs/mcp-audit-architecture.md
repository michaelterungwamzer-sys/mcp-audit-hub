# MCP-Audit: CLI Tool Architecture

## Overview

A command-line security scanner for MCP (Model Context Protocol) servers that detects vulnerabilities, analyzes dependencies, and generates security reports.

---

## Command Interface

### Core Commands

```bash
# Scan a package from npm
mcp-audit scan @modelcontextprotocol/server-filesystem

# Scan a local directory
mcp-audit scan ./my-mcp-server

# Scan from a GitHub repo
mcp-audit scan github:anthropics/mcp-server-git

# Scan with specific checks only
mcp-audit scan ./server --checks=poisoning,injection,deps

# Generate different output formats
mcp-audit scan ./server --output=json
mcp-audit scan ./server --output=html --report=./report.html
mcp-audit scan ./server --output=sarif  # For CI integration

# Check against known CVE database
mcp-audit scan ./server --cve-check

# Watch mode for development
mcp-audit watch ./server

# Audit your MCP config file
mcp-audit config ~/.config/claude/claude_desktop_config.json
```

### Additional Commands

```bash
# Update vulnerability database
mcp-audit update-db

# List all checks
mcp-audit checks --list

# Initialize config file
mcp-audit init

# Verify a specific CVE
mcp-audit cve CVE-2025-68145

# Compare two versions
mcp-audit diff ./server@1.0.0 ./server@1.1.0
```

---

## Architecture Components

### 1. CLI Layer (`/src/cli/`)

Handles argument parsing, output formatting, and user interaction.

```
/src/cli/
├── index.ts          # Entry point, command routing
├── commands/
│   ├── scan.ts       # Main scan command
│   ├── config.ts     # Config file audit
│   ├── watch.ts      # Watch mode
│   ├── update.ts     # DB update
│   └── cve.ts        # CVE lookup
├── output/
│   ├── console.ts    # Terminal output (colors, progress)
│   ├── json.ts       # JSON output
│   ├── html.ts       # HTML report generator
│   └── sarif.ts      # SARIF for CI tools
└── utils/
    ├── spinner.ts    # Progress indicators
    └── colors.ts     # Terminal colors
```

### 2. Scanner Core (`/src/scanner/`)

Orchestrates the scanning process and aggregates results.

```
/src/scanner/
├── index.ts          # Main scanner orchestrator
├── resolver.ts       # Resolves package sources (npm, local, github)
├── parser.ts         # Parses MCP server structure
├── aggregator.ts     # Combines results from all analyzers
└── cache.ts          # Caches scan results
```

### 3. Analyzers (`/src/analyzers/`)

Individual security check modules. Each analyzer is independent and pluggable.

```
/src/analyzers/
├── index.ts                    # Analyzer registry
├── base.ts                     # Base analyzer class
├── tool-poisoning/
│   ├── index.ts                # Tool poisoning detector
│   ├── patterns.ts             # Known malicious patterns
│   └── heuristics.ts           # Suspicious behavior detection
├── command-injection/
│   ├── index.ts                # Command injection detector
│   ├── sinks.ts                # Dangerous function calls
│   └── taint.ts                # Taint analysis
├── dependency/
│   ├── index.ts                # Dependency analyzer
│   ├── npm-audit.ts            # npm audit integration
│   ├── pip-audit.ts            # Python package audit
│   └── sbom.ts                 # Software bill of materials
├── authentication/
│   ├── index.ts                # Auth configuration checker
│   └── oauth.ts                # OAuth implementation review
├── network/
│   ├── index.ts                # Network behavior analyzer
│   ├── endpoints.ts            # External endpoint detection
│   └── exfiltration.ts         # Data exfiltration patterns
├── filesystem/
│   ├── index.ts                # File access analyzer
│   ├── sensitive-paths.ts      # Sensitive file detection
│   └── traversal.ts            # Path traversal detection
└── cve/
    ├── index.ts                # CVE matcher
    └── database.ts             # CVE database interface
```

### 4. Data Layer (`/src/data/`)

Manages vulnerability databases and pattern libraries.

```
/src/data/
├── cve/
│   ├── database.sqlite         # Local CVE database
│   ├── sync.ts                 # Sync with remote sources
│   └── schema.ts               # Database schema
├── patterns/
│   ├── poisoning.json          # Tool poisoning patterns
│   ├── injection.json          # Injection patterns
│   └── exfiltration.json       # Exfiltration patterns
└── allowlists/
    ├── safe-packages.json      # Known safe packages
    └── false-positives.json    # Known false positives
```

### 5. Report Generator (`/src/report/`)

Creates formatted output and recommendations.

```
/src/report/
├── index.ts          # Report orchestrator
├── severity.ts       # Severity scoring (CVSS-like)
├── recommendations.ts # Fix recommendations
├── templates/
│   ├── html/         # HTML report templates
│   └── markdown/     # Markdown templates
└── badges.ts         # Security badge generator
```

---

## Data Flow

```
Input (package/path/url)
        │
        ▼
┌───────────────────┐
│     Resolver      │ ── Fetches source code
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│      Parser       │ ── Extracts MCP structure
└────────┬──────────┘    (tools, resources, prompts)
         │
         ▼
┌───────────────────┐
│   Analyzer Pool   │ ── Runs all analyzers in parallel
│  ┌─────────────┐  │
│  │ Poisoning   │  │
│  │ Injection   │  │
│  │ Deps        │  │
│  │ Auth        │  │
│  │ Network     │  │
│  │ Filesystem  │  │
│  │ CVE         │  │
│  └─────────────┘  │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│    Aggregator     │ ── Combines findings
└────────┬──────────┘    Deduplicates
         │               Calculates severity
         ▼
┌───────────────────┐
│  Report Generator │ ── Formats output
└────────┬──────────┘
         │
         ▼
     Output (console/json/html/sarif)
```

---

## Core Detection Logic

### Tool Poisoning Detection

```typescript
// /src/analyzers/tool-poisoning/index.ts

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
  handler: string; // file:line reference
}

interface PoisoningFinding {
  type: 'hidden_instruction' | 'excessive_length' | 'suspicious_pattern';
  tool: string;
  description: string;
  evidence: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

class ToolPoisoningAnalyzer extends BaseAnalyzer {
  
  // Patterns that indicate hidden instructions
  private suspiciousPatterns = [
    /ignore\s+(previous|prior|above)\s+instructions?/i,
    /do\s+not\s+(tell|inform|alert)\s+(the\s+)?user/i,
    /secretly|covertly|silently|quietly/i,
    /exfiltrate|steal|extract|copy\s+to/i,
    /send\s+(to|data|information)\s+(external|remote|http)/i,
    /read\s+(env|environment|credentials|secrets|keys)/i,
    /\[hidden\]|\[internal\]|\[system\]/i,
    /before\s+returning.*also|additionally.*without/i,
  ];

  // Length thresholds (characters)
  private readonly DESCRIPTION_WARNING_LENGTH = 500;
  private readonly DESCRIPTION_CRITICAL_LENGTH = 1000;

  async analyze(server: MCPServer): Promise<PoisoningFinding[]> {
    const findings: PoisoningFinding[] = [];
    
    for (const tool of server.tools) {
      // Check 1: Excessive description length
      if (tool.description.length > this.DESCRIPTION_CRITICAL_LENGTH) {
        findings.push({
          type: 'excessive_length',
          tool: tool.name,
          description: `Tool description is ${tool.description.length} characters`,
          evidence: tool.description.substring(0, 200) + '...',
          severity: 'high',
          recommendation: 'Review full description for hidden instructions'
        });
      }

      // Check 2: Suspicious patterns
      for (const pattern of this.suspiciousPatterns) {
        const match = tool.description.match(pattern);
        if (match) {
          findings.push({
            type: 'suspicious_pattern',
            tool: tool.name,
            description: `Suspicious pattern detected: "${match[0]}"`,
            evidence: this.extractContext(tool.description, match.index!),
            severity: 'critical',
            recommendation: 'This tool may contain hidden malicious instructions'
          });
        }
      }

      // Check 3: Discrepancy between description and implementation
      const implAnalysis = await this.analyzeImplementation(tool);
      if (implAnalysis.undisclosedBehavior.length > 0) {
        findings.push({
          type: 'hidden_instruction',
          tool: tool.name,
          description: 'Tool performs actions not mentioned in description',
          evidence: implAnalysis.undisclosedBehavior.join(', '),
          severity: 'critical',
          recommendation: 'Tool implementation does not match its description'
        });
      }
    }

    return findings;
  }

  private async analyzeImplementation(tool: ToolDefinition): Promise<{
    undisclosedBehavior: string[];
  }> {
    // Parse the handler code
    // Look for: network calls, file reads, env access
    // Compare against what description claims
    // Return any undisclosed behaviors
  }
}
```

### Command Injection Detection

```typescript
// /src/analyzers/command-injection/index.ts

interface InjectionFinding {
  type: 'shell_injection' | 'sql_injection' | 'path_injection';
  file: string;
  line: number;
  code: string;
  sink: string;
  severity: 'critical' | 'high' | 'medium';
  recommendation: string;
}

class CommandInjectionAnalyzer extends BaseAnalyzer {
  
  // Dangerous sinks (functions that execute external commands)
  private shellSinks = [
    'exec', 'execSync', 'spawn', 'spawnSync',
    'execFile', 'execFileSync', 'fork',
    'child_process.exec', 'child_process.spawn',
    // Python
    'os.system', 'os.popen', 'subprocess.run',
    'subprocess.call', 'subprocess.Popen',
  ];

  private sqlSinks = [
    'query', 'execute', 'raw', 'rawQuery',
    'sequelize.query', 'knex.raw',
  ];

  async analyze(server: MCPServer): Promise<InjectionFinding[]> {
    const findings: InjectionFinding[] = [];
    
    for (const file of server.sourceFiles) {
      const ast = this.parseFile(file);
      
      // Find all calls to dangerous sinks
      const sinkCalls = this.findSinkCalls(ast, this.shellSinks);
      
      for (const call of sinkCalls) {
        // Trace arguments back to their source
        const taintResult = this.taintAnalysis(ast, call);
        
        if (taintResult.isUserControlled) {
          findings.push({
            type: 'shell_injection',
            file: file.path,
            line: call.line,
            code: call.sourceCode,
            sink: call.functionName,
            severity: 'critical',
            recommendation: `User input flows to ${call.functionName} without sanitization`
          });
        }
      }
    }

    return findings;
  }

  private taintAnalysis(ast: AST, sinkCall: CallExpression): TaintResult {
    // Backward dataflow analysis
    // Track if any argument originates from:
    // - Function parameters (user input)
    // - Environment variables
    // - File contents
    // - Network responses
  }
}
```

### Dependency Analysis

```typescript
// /src/analyzers/dependency/index.ts

interface DependencyFinding {
  package: string;
  version: string;
  vulnerability: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cve?: string;
  fixedIn?: string;
  recommendation: string;
}

class DependencyAnalyzer extends BaseAnalyzer {
  
  async analyze(server: MCPServer): Promise<DependencyFinding[]> {
    const findings: DependencyFinding[] = [];
    
    // Detect package manager
    const packageManager = this.detectPackageManager(server.root);
    
    if (packageManager === 'npm') {
      // Run npm audit
      const auditResult = await this.runNpmAudit(server.root);
      findings.push(...this.parseNpmAudit(auditResult));
    }
    
    if (packageManager === 'pip') {
      // Run pip-audit
      const auditResult = await this.runPipAudit(server.root);
      findings.push(...this.parsePipAudit(auditResult));
    }

    // Check for typosquatting
    const typosquatting = await this.checkTyposquatting(server.dependencies);
    findings.push(...typosquatting);

    // Check for recently transferred packages
    const transfers = await this.checkOwnershipTransfers(server.dependencies);
    findings.push(...transfers);

    return findings;
  }

  private async checkTyposquatting(deps: string[]): Promise<DependencyFinding[]> {
    // Compare against known legitimate packages
    // Flag packages that are 1-2 characters off from popular ones
  }

  private async checkOwnershipTransfers(deps: string[]): Promise<DependencyFinding[]> {
    // Check npm registry for recent maintainer changes
    // Flag packages with ownership transfers in last 90 days
  }
}
```

---

## Configuration

### Config File (`mcp-audit.config.json`)

```json
{
  "version": "1.0",
  
  "checks": {
    "tool-poisoning": {
      "enabled": true,
      "descriptionMaxLength": 500,
      "customPatterns": []
    },
    "command-injection": {
      "enabled": true,
      "allowedSinks": []
    },
    "dependencies": {
      "enabled": true,
      "ignoreCves": [],
      "maxAge": 180
    },
    "authentication": {
      "enabled": true,
      "requireOAuth": false
    },
    "network": {
      "enabled": true,
      "allowedDomains": []
    },
    "filesystem": {
      "enabled": true,
      "sensitivePaths": [
        "~/.ssh",
        "~/.aws",
        "~/.env"
      ]
    }
  },

  "severity": {
    "failOn": "high",
    "warnOn": "medium"
  },

  "output": {
    "format": "console",
    "colors": true,
    "verbose": false
  },

  "allowlist": {
    "packages": [],
    "findings": []
  }
}
```

---

## Tech Stack

### Core

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Language | TypeScript | Type safety, npm ecosystem |
| Runtime | Node.js 20+ | Async, widespread |
| CLI Framework | Commander.js | Standard, lightweight |
| AST Parsing | @babel/parser (JS/TS), tree-sitter (multi-lang) | Robust parsing |
| Output | Chalk, Ora | Terminal formatting |

### Analysis

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Static Analysis | ESLint engine, custom rules | Extensible |
| Dependency Audit | npm-audit, pip-audit wrappers | Standard tools |
| CVE Database | SQLite + custom sync | Offline capability |
| Pattern Matching | Custom + Semgrep rules | Flexibility |

### Distribution

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Package | npm | Primary distribution |
| Binary | pkg or bun compile | Standalone option |
| Container | Docker image | CI/CD integration |
| GitHub Action | Custom action | Easy CI integration |

---

## Output Examples

### Console Output (Default)

```
┌─────────────────────────────────────────────────────────────┐
│  MCP-AUDIT v1.0.0                                           │
│  Scanning: @example/mcp-server-db                           │
└─────────────────────────────────────────────────────────────┘

[■■■■■■■■■■] Analyzing... done (2.3s)

SUMMARY
═══════════════════════════════════════════════════════════════
│ Check              │ Status │ Findings │
├────────────────────┼────────┼──────────│
│ Tool Poisoning     │   ✓    │    0     │
│ Command Injection  │   ✗    │    2     │
│ Dependencies       │   ⚠    │    3     │
│ Authentication     │   ✓    │    0     │
│ Network Analysis   │   ⚠    │    1     │
│ Filesystem Access  │   ✓    │    0     │
│ Known CVEs         │   ✗    │    1     │
═══════════════════════════════════════════════════════════════

CRITICAL (2)
───────────────────────────────────────────────────────────────
[INJ-001] Command injection in query handler
  File: src/handlers/query.ts:47
  Code: exec(`psql ${userQuery}`)
  Fix:  Use parameterized queries or escape input

[CVE-2025-68145] Path validation bypass  
  Package: @modelcontextprotocol/server-git@1.2.0
  Fixed:   1.2.4
  Fix:     npm update @modelcontextprotocol/server-git

HIGH (1)
───────────────────────────────────────────────────────────────
[INJ-002] Potential SQL injection
  File: src/handlers/search.ts:23
  Code: db.query(`SELECT * FROM items WHERE name = '${name}'`)
  Fix:  Use parameterized queries

MEDIUM (3)
───────────────────────────────────────────────────────────────
[DEP-001] Outdated dependency with known vulnerability
  Package: lodash@4.17.20
  CVE:     CVE-2021-23337 (Prototype Pollution)
  Fix:     npm update lodash

[DEP-002] ... 

───────────────────────────────────────────────────────────────
Score: 35/100 (FAIL)
Full report: ./mcp-audit-report.html
```

### JSON Output

```json
{
  "meta": {
    "version": "1.0.0",
    "timestamp": "2026-03-17T14:30:00Z",
    "target": "@example/mcp-server-db",
    "duration_ms": 2340
  },
  "summary": {
    "score": 35,
    "status": "fail",
    "findings": {
      "critical": 2,
      "high": 1,
      "medium": 3,
      "low": 0
    }
  },
  "findings": [
    {
      "id": "INJ-001",
      "type": "command-injection",
      "severity": "critical",
      "title": "Command injection in query handler",
      "file": "src/handlers/query.ts",
      "line": 47,
      "code": "exec(`psql ${userQuery}`)",
      "recommendation": "Use parameterized queries or escape input",
      "references": [
        "https://cwe.mitre.org/data/definitions/78.html"
      ]
    }
  ],
  "dependencies": {
    "total": 42,
    "vulnerable": 3,
    "outdated": 7
  }
}
```

---

## MVP Scope (v0.1)

### Included

- [x] Basic CLI with `scan` command
- [x] npm package resolution
- [x] Local directory scanning
- [x] Tool poisoning detection (pattern matching)
- [x] Command injection detection (sink analysis)
- [x] npm audit integration
- [x] Console output with colors
- [x] JSON output
- [x] Basic severity scoring

### Not Included (v0.2+)

- [ ] GitHub URL resolution
- [ ] Python/pip support
- [ ] CVE database sync
- [ ] HTML report generation
- [ ] SARIF output
- [ ] Watch mode
- [ ] Config file auditing
- [ ] Taint analysis (full dataflow)
- [ ] GitHub Action
- [ ] VS Code extension

---

## File Structure

```
mcp-audit/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── bin/
│   └── mcp-audit            # CLI entry point
├── src/
│   ├── index.ts
│   ├── cli/
│   ├── scanner/
│   ├── analyzers/
│   ├── data/
│   ├── report/
│   └── utils/
├── data/
│   ├── patterns/
│   └── cve/
├── tests/
│   ├── fixtures/            # Test MCP servers
│   ├── analyzers/
│   └── integration/
└── docs/
    ├── api.md
    └── checks.md
```

---

## Development Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Project setup, CI/CD
- Basic CLI structure
- Package resolver (npm, local)
- Console output formatting

### Phase 2: Core Analyzers (Weeks 3-4)
- Tool poisoning detector
- Command injection detector
- Dependency analyzer (npm audit wrapper)
- Result aggregation

### Phase 3: Polish (Weeks 5-6)
- Severity scoring
- JSON output
- Documentation
- Test suite
- npm publish

### Phase 4: Expansion (Weeks 7-8)
- HTML reports
- CVE database
- GitHub URL support
- GitHub Action

---

## Monetization Options

### Open Core Model

**Free (MIT License):**
- Core scanning functionality
- Console and JSON output
- Basic analyzers
- npm audit integration

**Pro ($29/month or $199/year):**
- HTML reports with recommendations
- CI/CD integrations (GitHub Action, GitLab CI)
- CVE database with daily updates
- Priority pattern updates
- Slack/Discord alerts
- Team dashboard

**Enterprise (Custom):**
- On-premise deployment
- Custom rule development
- SLA support
- Compliance reports (SOC2, etc.)
- Private pattern libraries

### Alternative: Fully Open Source + Services

- Tool is 100% open source
- Revenue from:
  - Security audits using the tool
  - Custom rule development
  - Training/workshops
  - Consulting
