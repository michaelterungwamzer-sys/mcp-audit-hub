# Runbook -- MCP-Audit CLI Tool

**Document ID:** Runbook-MCP-Audit
**Version:** 0.1.0
**Status:** Draft
**Author:** Delivery & Ops Engineer (AI-assisted -- Claude Opus 4.6, P-07)
**Created:** 2026-03-17
**Last Updated:** 2026-03-17
**Parent Documents:** [PRD-MCP-Audit](/dev-project-docs/PRD-MCP-Audit.md), [TAD-MCP-Audit](/docs/solution-doc-architecture.md)

```
Acting as:      P-07 Delivery & Ops Engineer
Thinking Level: Deep
ADR Required:   No
Escalation:     None
```

---

## Document History

| Version | Date       | Author                  | Changes               |
|---------|------------|-------------------------|-----------------------|
| 0.1.0   | 2026-03-17 | Claude Opus 4.6 (P-07) | Initial runbook created for CLI tool distribution model |

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Release and Publish Procedures](#2-release-and-publish-procedures)
3. [CI/CD Pipeline](#3-cicd-pipeline)
4. [Common Issue Procedures](#4-common-issue-procedures)
5. [Routine Maintenance](#5-routine-maintenance)
6. [Security Procedures](#6-security-procedures)
7. [Contacts and Access Reference](#7-contacts-and-access-reference)

---

## 1. System Overview

### 1.1 Product Summary

MCP-Audit is a command-line static analysis tool that scans MCP (Model Context Protocol) servers for security vulnerabilities. It detects tool poisoning, command injection, dependency vulnerabilities, undisclosed network behaviour, sensitive filesystem access, and missing authentication.

**Key characteristics:**

- **No hosted infrastructure.** MCP-Audit is a CLI tool distributed via npm. There are no servers, databases, or cloud services to operate in v0.1.
- **"Production" is the user's machine.** The published npm package running on the end user's workstation is the production environment.
- **Fully offline-capable.** Core scanning works without network access. The npm registry is required only for package resolution and initial install.
- **Static analysis only.** Scanned code is never executed.

### 1.2 Architecture Summary

MCP-Audit uses a five-stage pipeline architecture:

```
resolve --> parse --> analyze --> aggregate --> report
```

| Stage       | Responsibility                                                                                   |
|-------------|--------------------------------------------------------------------------------------------------|
| **Resolve** | Accept a scan target (npm package name or local directory path) and resolve it to local source files. npm packages are downloaded and extracted to a temporary directory. |
| **Parse**   | Parse source files into ASTs using @babel/parser. Extract MCP tool definitions, resource definitions, prompt definitions, handler locations. |
| **Analyze** | Run all enabled analyzers in parallel against the parsed server structure. Analyzers: tool-poisoning, command-injection, dependency, network, filesystem, authentication. |
| **Aggregate** | Combine findings from all analyzers, deduplicate, apply allowlists, calculate security score (0--100) using the active scoring strategy (weighted-sum, co-location, or markov-chain). |
| **Report**  | Format results using the selected output formatter (console or JSON in v0.1) and write to stdout or a file. |

### 1.3 Key External Dependencies

| Dependency         | Purpose                           | Failure Impact                                              |
|--------------------|-----------------------------------|-------------------------------------------------------------|
| **npm registry**   | Package resolution for `mcp-audit scan <npm-package>` | Users cannot scan remote npm packages; local scanning unaffected |
| **GitHub Actions**  | CI/CD pipeline for tests and publishing | Cannot run automated tests or publish new versions          |
| **npm account**    | Publishing new versions to the registry | Cannot release updates                                      |

### 1.4 Environments

MCP-Audit does not have traditional server environments. The equivalent environments are:

| Environment    | Description                                                  | Access                                  |
|----------------|--------------------------------------------------------------|-----------------------------------------|
| **Development** | Local development machine. `npm run dev`, `npx vitest`.     | Developer workstation                   |
| **CI**          | GitHub Actions runners. Automated tests, lint, coverage checks on every push and PR. Matrix: Node 20 + 22, macOS + Linux + Windows. | GitHub repository                       |
| **npm publish** | The act of publishing to the npm registry. This is the "deployment" action. | npm account with publish permissions    |
| **User runtime** | The end user's machine running the published package via `npm install -g mcp-audit` or `npx mcp-audit`. This is "production". | Not controlled -- any machine with Node.js 20+ |

---

## 2. Release and Publish Procedures

### 2.1 Pre-Publish Checklist

Before running `npm publish`, verify every item on this list. Do not skip items.

```
[ ] All tests pass locally: npx vitest run
[ ] Coverage meets threshold (>= 80% overall, 100% for scoring/dedup): npx vitest run --coverage
[ ] No lint errors: npx eslint . (or equivalent)
[ ] TypeScript compiles without errors: npx tsc --noEmit
[ ] npm audit shows no high/critical vulnerabilities in mcp-audit's own dependencies: npm audit
[ ] CHANGELOG.md is updated with the new version section following Keep a Changelog format
[ ] Version in package.json matches the version in CHANGELOG.md header
[ ] All governance documents are current (feature spec approved, any required ADRs written)
[ ] Git working directory is clean -- no uncommitted changes
[ ] The build produces a clean distributable: npm run build
[ ] Smoke test passes against local test fixtures (see 2.4)
```

### 2.2 npm Publish Procedure

**Step 1 -- Version bump**

```bash
# Determine the correct version bump per SemVer (P-09 advises)
# PATCH: bug fixes only (fix: commits)
# MINOR: new features (feat: commits)
# MAJOR: breaking changes (BREAKING CHANGE: footer)
npm version <patch|minor|major>
# This updates package.json AND creates a git tag (e.g., v0.1.1)
```

**Step 2 -- Verify the CHANGELOG**

Ensure the CHANGELOG.md has an entry matching the new version:

```markdown
## [0.1.1] - 2026-03-20

### Fixed
- Resolved false positive in command injection analyzer for sanitised exec calls
```

**Step 3 -- Build**

```bash
npm run build
```

**Step 4 -- Dry run**

```bash
npm publish --dry-run
```

Review the output. Confirm:

- The package name is correct (`mcp-audit`)
- The version is correct
- The file list includes only intended files (no `.env`, no test fixtures, no `.git`)
- The package size is reasonable (< 50 MB per NFR-04)

**Step 5 -- Publish**

```bash
npm publish --access=public
```

**Step 6 -- Push tags**

```bash
git push origin main --tags
```

**Step 7 -- Post-publish smoke test (see 2.4)**

**Step 8 -- Create GitHub release**

```bash
gh release create v0.1.1 --title "v0.1.1" --notes "See CHANGELOG.md for details"
```

### 2.3 Rollback Procedure

**Within 72 hours of publish (npm unpublish is available):**

```bash
# Unpublish the specific version (NOT the entire package)
npm unpublish mcp-audit@<version>
```

npm allows unpublishing within 72 hours if:
- No other published packages depend on the version
- The version has been published for less than 72 hours

**After 72 hours (npm deprecate):**

```bash
# Mark the version as deprecated with a message directing users to a safe version
npm deprecate mcp-audit@<bad-version> "This version contains a critical issue. Please upgrade to <good-version>."
```

**After deprecating, immediately publish a patch release** with the fix.

**Rollback decision tree:**

```
Issue detected in published version
        |
        v
Is it a security vulnerability in mcp-audit itself?
        |
    Yes --> Unpublish immediately (if within 72hrs) OR deprecate + hotfix
    No  --> Is it a crash-on-startup / data-loss bug?
                |
            Yes --> Deprecate + hotfix
            No  --> Publish a patch fix at normal cadence
```

### 2.4 Post-Publish Smoke Test

After every `npm publish`, run these verification commands from a clean directory (not the development workspace):

```bash
# Test 1: npx execution works
npx mcp-audit@<version> --version
# Expected: prints the correct version number

# Test 2: Scan a local test fixture
npx mcp-audit@<version> scan ./test-fixture
# Expected: produces scan output with score, no crashes

# Test 3: Scan a known npm package
npx mcp-audit@<version> scan @modelcontextprotocol/sdk
# Expected: resolves package, scans, outputs results

# Test 4: JSON output works
npx mcp-audit@<version> scan ./test-fixture --output=json
# Expected: valid JSON output parseable by jq or similar

# Test 5: Exit code is correct
npx mcp-audit@<version> scan ./clean-fixture; echo "Exit: $?"
# Expected: Exit: 0 (for a clean fixture)
```

If any smoke test fails, initiate the rollback procedure (2.3) immediately.

---

## 3. CI/CD Pipeline

### 3.1 GitHub Actions Workflow Overview

The CI pipeline runs on every push and pull request to `main`. It validates that the code is correct, tested, and publishable.

**Workflow file:** `.github/workflows/ci.yml`

**Pipeline stages:**

```
Push / PR to main
        |
        v
[ Lint + Type Check ]  (fast feedback -- fails early)
        |
        v
[ Unit Tests ]  (matrix: Node 20 + 22, macOS + Linux + Windows)
        |
        v
[ Integration Tests ]  (matrix: same)
        |
        v
[ Coverage Report ]  (fail if < 80%)
        |
        v
[ npm audit ]  (fail on high/critical)
        |
        v
[ Build ]  (verify distributable builds cleanly)
        |
        v
[ Publish ]  (manual trigger only -- not on every push)
```

### 3.2 Matrix Testing

The CI pipeline tests across a matrix of Node.js versions and operating systems to ensure cross-platform compatibility:

| Node Version | macOS | Linux (Ubuntu) | Windows |
|-------------|-------|-----------------|---------|
| 20 (LTS)   | Yes   | Yes             | Yes     |
| 22 (LTS)   | Yes   | Yes             | Yes     |

**Why this matrix matters:** MCP-Audit uses filesystem operations (path resolution, temp directory management, file reading) and child process execution (`npm audit`). These behave differently across operating systems -- particularly Windows path separators, symlink handling, and shell execution.

### 3.3 Debugging Failed CI Runs

**Step 1 -- Identify the failing job**

```bash
# List recent workflow runs
gh run list --limit 10

# View a specific run
gh run view <run-id>

# View logs for a specific job
gh run view <run-id> --log
```

**Step 2 -- Check the matrix cell**

If only one matrix cell fails (e.g., Windows + Node 22), the issue is likely platform-specific. Common causes:

- Path separator issues (`\` vs `/`) -- see RB-002
- Line ending differences (CRLF on Windows)
- Shell command differences (e.g., `rm -rf` vs Windows equivalents)
- Filesystem case sensitivity (macOS/Windows are case-insensitive by default)

**Step 3 -- Reproduce locally**

If the failure is on a platform you have access to, reproduce it:

```bash
# Run only the failing test
npx vitest run --reporter=verbose <test-file>
```

If the failure is on a platform you cannot access, use the CI logs to understand the error and add platform-specific handling.

**Step 4 -- Check for flaky tests**

If the test passes locally but fails in CI intermittently:

- Check for timing-dependent assertions
- Check for filesystem race conditions (temp directory cleanup)
- Check for network-dependent tests that should be mocked

### 3.4 Manual Publish Trigger

Publishing to npm is **never automatic**. It requires a manual workflow dispatch:

```bash
# Trigger the publish workflow manually
gh workflow run publish.yml --ref main

# Or via the GitHub UI:
# Repository --> Actions --> Publish --> Run workflow
```

**Pre-conditions for manual publish:**

1. The `ci.yml` workflow must have passed on the same commit
2. The version in `package.json` must not already exist on npm
3. The CHANGELOG must be updated

**The publish workflow:**

1. Checks out the tagged commit
2. Runs the full test suite one more time
3. Builds the package
4. Runs `npm publish --access=public`
5. Creates a GitHub release

---

## 4. Common Issue Procedures

### RB-001: npm Publish Fails

**Symptoms:** `npm publish` exits with an error. Common error messages:

- `403 Forbidden` -- authentication or permissions issue
- `402 Payment Required` -- attempting to publish a scoped package as private without a paid account
- `409 Conflict` -- version already exists on the registry

**Procedure:**

1. **Check authentication:**
   ```bash
   npm whoami
   ```
   If this fails, the npm token has expired or is missing. See Section 6.2 for token rotation.

2. **Check version conflict:**
   ```bash
   npm view mcp-audit versions --json
   ```
   If the version already exists, you must bump the version number. Never republish the same version.

3. **Check access level:**
   ```bash
   npm publish --access=public
   ```
   Scoped packages (`@org/package`) default to private. Ensure `--access=public` is set for the open-source distribution.

4. **Check the npm status page:**
   Visit `https://status.npmjs.org/` to verify the registry is operational.

5. **Check `.npmignore` or `files` field in `package.json`:**
   Ensure the package includes all required files and excludes test fixtures, `.env`, and development-only files.

**Resolution:** Fix the root cause and retry. If publishing a hotfix, do not skip the pre-publish checklist (2.1).

---

### RB-002: CI Tests Fail on One Platform Only

**Symptoms:** Tests pass on macOS/Linux but fail on Windows, or vice versa.

**Common root causes and fixes:**

**a) Path separator issues (most common)**

Windows uses backslashes (`\`), Unix uses forward slashes (`/`). File paths in test assertions or string comparisons will differ.

Fix: Use `path.join()` or `path.resolve()` instead of string concatenation. In tests, normalise paths before assertion:

```typescript
// Bad
expect(finding.file).toBe('src/handlers/query.ts');

// Good
expect(finding.file).toBe(path.normalize('src/handlers/query.ts'));
```

**b) Line ending issues**

Git on Windows may convert LF to CRLF. Snapshot tests comparing file content will fail.

Fix: Ensure `.gitattributes` sets `* text=auto eol=lf` for source files. In tests, normalise line endings:

```typescript
const normalised = content.replace(/\r\n/g, '\n');
```

**c) Shell command differences**

`child_process.exec` behaves differently on Windows. Commands like `rm -rf`, `which`, or `chmod` do not exist.

Fix: Use cross-platform alternatives (`fs.rm` with `recursive: true`) or conditionalise platform-specific commands.

**d) Temp directory path differences**

`os.tmpdir()` returns different paths on each OS. Test assertions must not hardcode temp paths.

**Procedure:**

1. Identify the failing test and matrix cell from CI logs
2. Determine whether the root cause is (a), (b), (c), or (d) above
3. Apply the appropriate fix
4. Verify the fix passes on all matrix cells before merging

---

### RB-003: User Reports False Positive

**Symptoms:** A user reports that MCP-Audit flagged a finding that is not a real vulnerability.

**Procedure:**

1. **Collect information from the user:**
   - Which finding ID was flagged (e.g., `PSN-001`, `INJ-003`)
   - The MCP server being scanned (name/URL or code snippet)
   - The scan output (JSON output preferred: `--output=json`)
   - Why the user believes it is a false positive

2. **Reproduce the finding:**
   ```bash
   # Clone or install the target
   mcp-audit scan <target> --output=json > report.json
   ```
   Verify the finding exists and inspect the evidence.

3. **Analyse the finding:**
   - Review the flagged code in context
   - Determine whether the detection pattern is too broad
   - Check whether the code genuinely mitigates the risk (e.g., input sanitisation before `exec`)

4. **If confirmed false positive -- add to allowlist:**

   Add an entry to the appropriate allowlist file:

   ```json
   {
       "findingId": "INJ-003",
       "file": "src/handlers/safe-exec.ts",
       "reason": "Input is validated by sanitizeCommand() before reaching exec()",
       "addedBy": "maintainer",
       "addedDate": "2026-03-20"
   }
   ```

5. **If the pattern is too broad -- refine the detection:**
   - Update the pattern in `src/data/patterns/<type>.json` to be more specific
   - Add a regression test with the false positive case (must not trigger after the fix)
   - Add a regression test with a true positive case (must still trigger)

6. **Release a patch:**
   Follow the release procedure (Section 2) with a PATCH version bump.

7. **Communicate with the user:**
   - Acknowledge the report
   - Explain whether it was a false positive or not
   - If a patch was released, share the version number

---

### RB-004: User Reports Crash on Specific MCP Server

**Symptoms:** MCP-Audit crashes (unhandled exception, segfault, or hang) when scanning a specific MCP server.

**Procedure:**

1. **Collect information from the user:**
   - MCP server being scanned (name, version, or path)
   - Node.js version: `node --version`
   - Operating system and version
   - Full error output (stack trace)
   - mcp-audit version: `mcp-audit --version`

2. **Reproduce the crash:**
   ```bash
   mcp-audit scan <target> --output=json 2>&1
   ```

3. **Common crash causes and fixes:**

   **a) Malformed source file crashes the AST parser**

   @babel/parser may throw on unusual syntax (e.g., experimental decorators, non-standard extensions).

   Fix: Wrap parser calls in try/catch. Log a warning for unparseable files and continue scanning remaining files. The parser must never crash the entire scan (NFR-09).

   **b) Extremely large file causes out-of-memory**

   A source file exceeding expected size may exhaust Node.js heap.

   Fix: Add a file size check before parsing. Skip files larger than a configurable threshold (default: 5 MB) with a warning.

   **c) Circular dependency in require/import resolution**

   The parser follows imports and may loop.

   Fix: Maintain a visited-files set. Do not re-parse files already in the set.

   **d) Temp directory cleanup fails**

   On Windows, file locks may prevent temp directory deletion.

   Fix: Use `fs.rm` with `force: true, recursive: true`. If deletion fails, log a warning but do not crash.

4. **Create a minimal reproduction:**
   Strip the MCP server down to the minimum files that trigger the crash. Add this as a test fixture.

5. **Fix, test, and release:**
   - Write a regression test with the fixture
   - Fix the crash
   - Release a PATCH version

---

### RB-005: npm Audit Finds Vulnerability in MCP-Audit's Own Dependencies

**Symptoms:** Running `npm audit` on the mcp-audit repository reports a vulnerability in one of mcp-audit's direct or transitive dependencies.

**Severity response times:**

| npm audit severity | Response time      | Action                                      |
|--------------------|--------------------|---------------------------------------------|
| Critical           | Within 24 hours    | Update dependency or replace; hotfix release |
| High               | Within 72 hours    | Update dependency; patch release             |
| Moderate           | Within 1 week      | Update in next scheduled release             |
| Low                | Next release cycle | Include in routine dependency update          |

**Procedure:**

1. **Identify the vulnerable dependency:**
   ```bash
   npm audit --json
   ```

2. **Determine if it is a direct or transitive dependency:**
   ```bash
   npm ls <vulnerable-package>
   ```

3. **Check for an available fix:**
   ```bash
   npm audit fix --dry-run
   ```

4. **If `npm audit fix` resolves it:**
   ```bash
   npm audit fix
   npx vitest run   # Verify tests still pass
   ```

5. **If no fix is available:**
   - Check the vulnerability details (is it exploitable in mcp-audit's usage context?)
   - If the vulnerable code path is not reachable in mcp-audit's usage, document this in the PR and proceed with monitoring
   - If the vulnerability is exploitable, evaluate replacing the dependency
   - If replacement is not feasible, document the risk and communicate to users via a GitHub advisory

6. **Release the fix** following the standard release procedure (Section 2).

---

### RB-006: Pattern Library Update Procedure

**Context:** The pattern library (`src/data/patterns/*.json`) contains the detection rules for tool poisoning, command injection, and data exfiltration. New attack patterns must be added as they are discovered.

**Procedure to add a new pattern:**

1. **Document the pattern:**
   - What does it detect? (e.g., a new social engineering phrase in tool descriptions)
   - What is the evidence? (link to a real-world example, CVE, or research paper)
   - What severity should it have? (critical, high, medium, low)

2. **Add the pattern to the appropriate JSON file:**

   ```json
   {
       "id": "PSN-NEW-PATTERN",
       "name": "Descriptive name",
       "regex": "the\\s+regex\\s+pattern",
       "flags": "i",
       "severity": "high",
       "description": "What this pattern detects and why it matters",
       "recommendation": "What the user should do",
       "references": ["CWE-XXXX"]
   }
   ```

3. **Write test cases:**
   - At least one true positive test case (must trigger the pattern)
   - At least one true negative test case (must NOT trigger -- avoid false positives)
   - Add test cases to the appropriate fixture server

4. **Run the full test suite:**
   ```bash
   npx vitest run
   ```

5. **Verify no false positives against known-clean fixtures:**
   ```bash
   mcp-audit scan ./tests/fixtures/clean-server --output=json
   ```
   The clean server fixture must produce zero findings.

6. **Release:**
   - Pattern additions are a PATCH version bump (no user-facing API change)
   - Update CHANGELOG under `### Added` or `### Changed` as appropriate
   - Follow the standard release procedure (Section 2)

---

## 5. Routine Maintenance

### 5.1 Weekly: Dependency Updates Check

**Owner:** Project maintainer
**Day:** Monday (recommended)

```bash
# Check for outdated dependencies
npm outdated

# Check for known vulnerabilities
npm audit
```

**Action:** If vulnerabilities are found, follow RB-005. If non-security updates are available, evaluate and update during the current sprint if they are minor/patch bumps. Major bumps require an assessment of breaking changes.

### 5.2 Monthly: Pattern Library Review

**Owner:** Project maintainer
**Cadence:** First week of each month

**Tasks:**

1. Review MCP security research and disclosures published in the past month
2. Check community-submitted pattern suggestions (GitHub issues/PRs)
3. Review the false positive log (GitHub issues tagged `false-positive`)
4. Add new patterns following RB-006
5. Remove or refine patterns with a high false positive rate

**Sources to monitor:**

- MCP specification repository (for protocol changes)
- MCP-related security research (blogs, papers, CVE databases)
- GitHub issues on the mcp-audit repository
- Community Discord/forums (if applicable)

### 5.3 Per-Release: Version Consistency Check

**Owner:** P-09 Release & Version Engineer (auto-activates)

Before every release, verify:

```
[ ] package.json version matches the intended release version
[ ] CHANGELOG.md has a section header matching the version: ## [X.Y.Z] - YYYY-MM-DD
[ ] Git tag matches the version: vX.Y.Z
[ ] All entries in CHANGELOG are under the correct version header (no entries left under [Unreleased])
[ ] npm publish --dry-run shows the correct version
```

### 5.4 Quarterly: Analyzer Sensitivity Tuning

**Owner:** Project maintainer
**Cadence:** End of each quarter

**Tasks:**

1. **Collect metrics:**
   - Number of false positive reports received (GitHub issues)
   - Number of true positive confirmations
   - Distribution of findings by analyzer and severity

2. **Calculate false positive rate per analyzer:**
   ```
   FP Rate = (confirmed false positives) / (total reported findings) * 100
   ```
   Target: <= 15% across all analyzers (per PRD KPI).

3. **Adjust sensitivity:**
   - If FP rate > 15% for an analyzer, tighten the detection patterns (make regex more specific, raise severity thresholds)
   - If FP rate < 5% and there are known undetected patterns, consider loosening detection (add broader patterns at lower severity)

4. **Document changes:**
   - Record the tuning rationale in the PR description
   - Update pattern file version and `lastUpdated` fields

---

## 6. Security Procedures

### 6.1 Suspected Vulnerability in MCP-Audit Itself

**Context:** If someone discovers a security vulnerability in the mcp-audit tool itself (not in a scanned MCP server), this procedure applies.

**Responsible disclosure process:**

1. **Receive the report:**
   - Security reports should be sent to a dedicated security contact (email or GitHub Security Advisories)
   - Do NOT discuss the vulnerability in public GitHub issues

2. **Acknowledge within 48 hours:**
   Confirm receipt and provide an expected timeline for assessment.

3. **Assess severity:**

   | Severity | Criteria | Response Time |
   |----------|----------|---------------|
   | Critical | Arbitrary code execution, scanned code executed, credential exposure | Fix within 24 hours |
   | High     | Information disclosure, denial of service via crafted input | Fix within 72 hours |
   | Medium   | False negatives allowing dangerous patterns through undetected | Fix within 1 week |
   | Low      | Minor information leakage, non-exploitable edge cases | Fix in next release |

4. **Develop and test the fix:**
   - Work on a private branch (do not push to public until fix is ready)
   - Write a regression test for the vulnerability
   - Verify the fix does not break existing functionality

5. **Publish the fix:**
   - Publish the patched version to npm
   - Create a GitHub Security Advisory
   - If the vulnerability was critical/high, send a notice to npm `npm deprecate` the vulnerable version

6. **Disclose:**
   - After the fix is published, disclose the vulnerability details via GitHub Security Advisory
   - Credit the reporter (with their permission)

### 6.2 Credential Rotation

MCP-Audit uses the following secrets. Rotate them according to this schedule or immediately if compromise is suspected.

| Secret               | Location                        | Rotation Cadence | Rotation Procedure                                                 |
|----------------------|---------------------------------|-------------------|--------------------------------------------------------------------|
| **npm publish token** | GitHub Actions secret: `NPM_TOKEN` | Every 90 days     | Generate new token on npmjs.com --> Update GitHub secret --> Verify publish workflow |
| **GitHub PAT** (if used) | GitHub Actions secret: `GH_TOKEN`  | Every 90 days     | Generate new PAT in GitHub settings --> Update secret --> Verify workflows |
| **Repository deploy key** | GitHub repository settings      | Every 180 days    | Generate new SSH key pair --> Update repository deploy key           |

**Rotation procedure for npm token:**

1. Log in to `https://www.npmjs.com/`
2. Navigate to Access Tokens
3. Generate a new Automation token (for CI publishing)
4. Update the GitHub Actions secret:
   ```bash
   gh secret set NPM_TOKEN --body "<new-token>"
   ```
5. Verify the publish workflow can authenticate:
   ```bash
   gh workflow run publish.yml --ref main  # dry-run or test publish
   ```
6. Revoke the old token on npmjs.com

**Emergency rotation (suspected compromise):**

1. Immediately revoke the compromised token on the issuing platform
2. Generate a new token
3. Update all locations where the token is used
4. Audit recent actions taken with the compromised token:
   - For npm token: check `npm access ls-packages` and recent publishes
   - For GitHub token: check repository audit log
5. If a malicious publish occurred, unpublish/deprecate the affected version and notify users

### 6.3 Dependency Compromise Response

**Scenario:** A dependency used by mcp-audit is found to be compromised (supply chain attack, maintainer account takeover, malicious code injection).

**Procedure:**

1. **Confirm the compromise:**
   - Check the dependency's GitHub repository for advisories
   - Check npm advisories: `npm audit`
   - Review the advisory source (NVD, Snyk, GitHub Advisory Database)

2. **Assess impact on mcp-audit:**
   - Is the compromised code path reachable in mcp-audit's usage?
   - Was the compromised version included in any published mcp-audit release?

3. **If mcp-audit shipped with the compromised dependency:**
   - Immediately pin to a safe version or replace the dependency
   - Publish a hotfix release
   - Deprecate the affected mcp-audit versions: `npm deprecate mcp-audit@<affected> "Dependency compromise -- upgrade to <safe-version>"`
   - Notify users via GitHub advisory

4. **If mcp-audit did not ship with the compromised version:**
   - Pin the dependency to a known-safe version in `package.json`
   - Add the compromised version range to a lockfile override if applicable
   - Monitor for updates from the dependency maintainer

5. **Post-incident:**
   - Evaluate whether the dependency should be replaced entirely
   - Consider adding the dependency to a watch list for future monitoring

---

## 7. Contacts and Access Reference

### 7.1 Accounts and Access

| Resource                  | URL / Location                                  | Access Owner      | Purpose                            |
|---------------------------|-------------------------------------------------|-------------------|------------------------------------|
| GitHub repository         | `github.com/<org>/mcp-audit`                    | Project Owner     | Source code, issues, PRs, CI/CD    |
| npm package               | `npmjs.com/package/mcp-audit`                   | Project Owner     | Package distribution               |
| npm organisation (if scoped) | `npmjs.com/org/<org>`                        | Project Owner     | Package scoping and team access    |
| GitHub Actions            | Repository --> Actions tab                      | Project Owner     | CI/CD pipeline execution           |
| GitHub Secrets            | Repository --> Settings --> Secrets and variables | Project Owner    | `NPM_TOKEN`, `GH_TOKEN`           |

### 7.2 CI/CD Secrets Inventory

| Secret Name   | Purpose                           | Type            | Set By        |
|---------------|-----------------------------------|-----------------|---------------|
| `NPM_TOKEN`   | Authenticate npm publish in CI    | Automation token | Project Owner |
| `GH_TOKEN`    | GitHub API access in workflows (if needed beyond default `GITHUB_TOKEN`) | PAT | Project Owner |

### 7.3 Key Contacts

| Role               | Responsibility                                           |
|--------------------|----------------------------------------------------------|
| Project Owner      | Release decisions, npm account management, security response coordination |
| Maintainers        | Code review, pattern library updates, issue triage       |
| Community reporters | Bug reports, false positive reports, feature requests (via GitHub Issues) |

### 7.4 External Resources

| Resource                  | URL                                     | Purpose                                      |
|---------------------------|-----------------------------------------|----------------------------------------------|
| npm status page           | `https://status.npmjs.org/`             | Check npm registry availability              |
| GitHub status page        | `https://www.githubstatus.com/`         | Check GitHub/Actions availability            |
| Node.js releases          | `https://nodejs.org/en/about/releases/` | Track Node.js LTS schedule                   |
| MCP specification         | `https://modelcontextprotocol.io/`      | Monitor protocol changes                     |

---

*This document was created with AI assistance (Claude Opus 4.6, P-07 Delivery & Ops Engineer persona). It must be reviewed and approved by the Project Owner. This runbook should be updated as the project evolves -- particularly when Docker distribution (v0.2) and GitHub Action integration (v0.2) are added.*
