# **Software Development Governance Policy (SDGP)**

### *Applicable to All Applications, Services, and Platforms*

---

## **1. Purpose of This Document**

This governance policy defines the mandatory standards, principles, and expectations applied across all applications developed in the organization. These rules ensure consistency, maintainability, security, compliance, auditability, and predictable behavior across backend, frontend, mobile, and infrastructure systems.

Every developer must understand and follow these principles before building or updating any feature.

---

# **2. Core Engineering Principles**

---

## **2.1 Security First**

Security is the baseline for every application.

**Rules:**

* Use strong authentication methods appropriate to the risk level.
* Enforce multi factor authentication for privileged roles.
* Protect all sensitive endpoints with authentication middleware.
* Never store secrets, OTPs, or sensitive tokens in plaintext.
* Rate limit authentication, OTP, and verification flows.
* Use secure storage and rotation for encryption keys.
* Validate all inbound data strictly.
* Avoid exposing sensitive data in logs or UI.

### **OWASP Top 10 Compliance**

All systems must be designed, implemented, and reviewed with OWASP Top 10 in mind:

* Broken Access Control
* Cryptographic Failures
* Injection
* Insecure Design
* Security Misconfiguration
* Vulnerable Components
* Identification and Authentication Failures
* Software/Data Integrity Failures
* Logging and Monitoring Failures
* Server Side Request Forgery

**Outcome:** Security is embedded across all layers of the system.

---

## **2.1.1 Authentication Standards**

Authentication must be secure, user-friendly, and appropriate to the access level.

**Rules:**

* **Passwordless Authentication (Default)**:
  * Use magic links (email) or OTP (SMS/email) for end-user authentication
  * Tokens must expire within 15 minutes
  * Single-use tokens only - invalidate after first use
  * Rate limit magic link/OTP requests (max 5 per hour per identifier)

* **Admin/Staff Authentication**:
  * Require Two-Factor Authentication (2FA) using TOTP authenticator apps
  * Supported authenticators: Google Authenticator, Authy, Microsoft Authenticator
  * 2FA must be enforced, not optional, for all admin roles
  * Recovery codes must be generated and securely stored during 2FA setup
  * Session timeout: 30 minutes of inactivity for admin interfaces

* **Session Management**:
  * Use secure, HTTP-only cookies for session tokens
  * Implement session invalidation on logout
  * Support "logout all devices" functionality
  * Log all authentication events (success, failure, 2FA challenges)

**Outcome:** Strong authentication without password fatigue for users, enhanced security for admin access.

---

## **2.1.2 Environment Governance**

Applications must support multiple deployment environments with clear separation.

**Environments:**

| Environment | Purpose | Email Provider | Data |
|-------------|---------|----------------|------|
| **Development** | Local development | Mailtrap (intercepted) | Seed/fake data |
| **Staging** | Pre-production testing | Mailtrap (intercepted) | Anonymized production clone |
| **Production** | Live system | Zoho ZeptoMail | Real data |

**Rules:**

* **Environment Detection**:
  * Environment must be explicitly set via `APP_ENV` variable
  * Never auto-detect environment based on hostname or other heuristics
  * Environment name must be visible in admin dashboard header

* **Environment-Specific Configuration**:
  * All environment-specific values must be stored in database (admin-configurable)
  * `.env` files provide defaults only, not production values
  * Admin dashboard must allow authorized users to switch/configure environments
  * Environment switching must require elevated permissions and audit logging

* **Email Safety**:
  * Development/Staging must NEVER send emails to real addresses
  * Use Mailtrap or similar email interception for non-production
  * Production email provider (ZeptoMail) credentials stored encrypted in database
  * Email provider configuration managed via Admin Panel, not `.env`

* **Data Isolation**:
  * Production data must never be copied to development without anonymization
  * Staging may use anonymized production snapshots
  * Development uses seed data only

**Outcome:** Clear environment separation prevents accidental production impacts and data leaks.

---

## **2.1.3 Secrets Management**

All secrets must be managed securely with proper rotation and access controls.

**Prohibited Practices:**

* Never commit secrets to version control
* Never hardcode secrets in application code
* Never log secrets or include them in error messages
* Never share secrets via email, chat, or unsecured channels

**Required Practices:**

* Store all secrets in approved vault (e.g., HashiCorp Vault, AWS Secrets Manager, Laravel encryption)
* Use environment-specific secrets
* Rotate secrets regularly according to security policy
* Audit secret access and usage
* Encrypt secrets at rest in database when vault not available

**Secret Types and Handling:**

| Type | Storage | Rotation Frequency |
|------|---------|-------------------|
| API Keys | Vault/Encrypted DB | On-demand |
| Database credentials | Vault | 90 days |
| Encryption keys | HSM/Vault | Annual |
| OAuth secrets | Vault | 90 days |
| Webhook signing keys | Vault | On partner request |
| OTP/Magic link secrets | Encrypted DB | Never (per-use) |

**Outcome:** Credentials remain secure and traceable throughout their lifecycle.

---

## **2.2 Least Privilege and Permission Governance**

Access must always be intentional, minimal, and auditable.

**Rules:**

* Implement flexible roles with fine grained capabilities.
* Enforce permissions at backend first, UI second.
* Restrict access to sensitive or financial operations by default.
* Centralize permission definitions and checks.

**Outcome:** Users only access what they are explicitly allowed to.

---

## **2.3 Separation of Concerns**

Every module and component must have a defined responsibility.

**Rules:**

* Separate admin, public, partner, vendor, and consumer portals.
* Keep controllers focused on routing and validation.
* Place business logic inside dedicated services.
* Avoid mixing business rules with presentation or persistence.
* Keep domain modules independent.

**Outcome:** Codebases remain clean, modular, and maintainable.

---

## **2.4 Reusable Components and DRY Design**

Standardization reduces bugs and maintenance overhead.

**Rules:**

* Extract reusable UI components for tables, forms, modals, alerts, etc.
* Centralize validation logic and input sanitization.
* Build reusable backend services for OTP, permissions, payments, etc.
* Avoid duplication through configuration driven design.

**Outcome:** All applications behave consistently.

---

## **2.5 Consistent Routing, Naming, and Structure**

Predictability improves onboarding and development speed.

**Rules:**

* Use consistent route prefixes per portal or domain.
* Use resource based routing for CRUD operations.
* Follow consistent naming for models, services, controllers, tables.
* Avoid renaming routes or breaking URIs once live.

**Outcome:** Developers can navigate new systems quickly.

---

## **2.6 Layered Architecture**

Enforce strict separation between architecture layers.

**Layers include:**

* Database layer
* Domain or service layer (business rules)
* Transport/controller layer
* Presentation/UI layer

**Outcome:** Layers evolve independently and remain testable.

---

## **2.7 Error Handling Standards**

Consistent error handling improves debugging, security, and user experience.

**Exception Handling Rules:**

* Catch specific exceptions, not generic `Exception` or `Throwable`
* Log errors with full context (request ID, user, operation, timestamp)
* Never expose stack traces, internal paths, or system details to clients
* Always return structured error responses following API standards
* Use appropriate HTTP status codes (400 for client errors, 500 for server errors)

**Error Logging Requirements:**

Each error log must include:
* Timestamp
* Request ID / Correlation ID
* User/Actor identifier (when authenticated)
* Operation being performed
* Error message and error code
* Stack trace (internal logs only, never exposed to clients)
* Request context (method, path, IP address)
* Hyper DX or Sentry with Open Telemetry 

**Retry Logic for External Services:**

* Use exponential backoff for transient failures
* Set maximum retry limits (3-5 attempts recommended)
* Log all retry attempts with context
* Implement circuit breakers for persistently failing services
* Define timeout thresholds for external API calls

**User-Facing Error Messages:**

* Provide clear, actionable error messages
* Use localized error text where applicable
* Avoid technical jargon in user-facing messages
* Include support reference codes for debugging

**Outcome:** Consistent error handling improves system reliability and debuggability.

---

## **2.8 Dependency Management**

Third-party dependencies must be evaluated, tracked, and kept secure.

**Adding New Dependencies:**

* Evaluate security posture (CVE history, vulnerability reports)
* Check license compatibility with project requirements
* Assess maintenance status (last update, community activity, GitHub stars)
* Review dependency tree for transitive dependencies
* Require team/lead approval for new dependencies

**Dependency Updates:**

* Run dependency security audits weekly (e.g., `composer audit`, `npm audit`)
* Update patch versions automatically via automated PRs
* Review and test minor/major updates manually
* Address critical vulnerabilities within 48 hours
* Document breaking changes in update notes

**Prohibited Dependencies:**

* Dependencies with known unpatched critical vulnerabilities
* Unmaintained packages (>2 years without updates)
* Copyleft licenses (GPL, AGPL) without legal review
* Dependencies with unclear or missing licenses

**Outcome:** Dependencies remain secure, maintained, and legally compliant.

---

# **3. Data Governance**

---

## **3.1 Strong Data Modeling**

Data must be explicit, accurate, and durable.

**Rules:**

* Represent core business concepts using dedicated tables/entities.
* Use foreign keys to maintain data integrity.
* Use unique constraints where applicable.
* Keep schemas normalized to avoid data corruption.
* Avoid overloading models with unrelated concerns.

**Outcome:** Data is consistent and audit ready.

---

## **3.2 Sensitive Data and Privacy**

Protect user privacy at all times.

**Rules:**

* Encrypt sensitive fields at rest where required.
* Restrict access to sensitive data using permissions.
* Mask or avoid logging sensitive data.
* Provide lawful mechanisms for **user data deletion requests** (NDPR/GDPR).
* Implement **soft deletes by default**, unless legally or operationally required.
* Define retention policies for personal data and logs.

**Outcome:** Systems remain compliant and privacy aligned.

---

## **3.3 Auditability, User Action Logging, and Traceability**

Every significant action must be traceable.

**Rules:**

* Log all critical **user actions**, such as:

  * Login and logout attempts
  * OTP or TOTP verification outcomes
  * Account updates or security setting changes
  * Sensitive workflows (payments, withdrawals, profile updates, submissions)
* Log all **admin and staff actions**, such as:

  * User or vendor account changes
  * Role, capability, or permission updates
  * Configuration changes (payment settings, market settings, feature flags)
* Each log entry should include:

  * Actor identity
  * Timestamp
  * Action type
  * Target entity or object
  * Context (IP, user agent, request ID, country/market)
* Logs must be immutable in normal operation and stored securely.
* Provide tools or endpoints for audit log search and reporting.
* Ensure heavy audit log queries run on reporting DB, not primary.

**Outcome:** A complete audit trail supports compliance, investigations, and trust.

---

## **3.4 Operational Database vs Reporting Database**

Reporting should not degrade operational performance.

**Rules:**

* Separate the transactional DB from the reporting/analytics DB.
* Dashboards, analytics, export jobs, and audit log queries should use the reporting DB.
* Provide an admin interface to configure DB connections.
  No DB connection details should be hard coded.
* If a read replica or reporting DB is not configured, system must safely default to primary.
* Health checks must detect replica misconfiguration and degrade gracefully.

**Outcome:** Scalable performance without compromising reliability.

---

## **3.5 Database Migration Standards**

All schema changes must follow a disciplined migration process.

**Migration Requirements:**

* All schema changes via versioned migration files (never manual SQL)
* Migrations must be reversible with `up()` and `down()` methods
* No destructive changes without explicit approval and backup
* Test migrations on copy of production data before deploying
* Include migration testing in CI/CD pipeline

**Migration File Structure:**

* Use timestamp-based prefixes for ordering (e.g., `2024_12_08_120000_create_entries_table.php`)
* Descriptive names that explain the change
* Document breaking changes in migration comments
* Include rollback instructions in comments

**Migration Process:**

1. Create migration file with clear, descriptive name
2. Test locally with fresh database seed
3. Test locally with existing development data
4. Run on staging environment and verify
5. Schedule production deployment window (for high-impact changes)
6. Execute with monitoring and health checks
7. Verify application functionality post-migration
8. Keep rollback plan ready

**Prohibited Actions:**

* Never modify production schema directly via SQL client
* Never drop columns without deprecation period (use soft deprecation first)
* Never change column types without data migration plan
* Never skip migration versioning
* Never commit commented-out destructive operations without team review

**Data Migration Safety:**

* For large tables, use batched updates to avoid locks
* Test migrations with production-scale data volumes
* Monitor query performance during migration
* Have rollback script ready before executing
* Backup critical tables before destructive operations

**Outcome:** Safe, traceable, and reversible schema evolution.

---

# **4. Multi Country and Multi Market Governance**

Applications operating across multiple markets must follow additional rules.

**Rules:**

* Support market specific overrides for:

  * Tax rules
  * Onboarding flows
  * Payment methods
  * Regulatory content
  * KYC requirements
  * SMS/email providers
* Avoid embedding country logic in code.
  Use configuration files, admin panels, or rule engines.
* Standardize currency, date formats, localization bundles.
* Payment gateways must define:

  * Supported markets
  * Supported currencies
  * Whether they are global or market restricted
* Market selection must be enforced throughout the request lifecycle.

**Outcome:** One codebase can serve many markets safely and legally.

---

# **5. Domain Specific Governance**

---

## **5.1 Payments**

**Rules:**

* Store gateway configuration externally so it can be updated without redeployment.
* Enforce mapping between gateway and supported countries.
* Log all payment attempts and state transitions.
* Use secure token vaulting for card or payment tokens.
* Prevent gateway fallback unless explicitly configured.

**Outcome:** Payments behave consistently and compliantly across markets.

---

## **5.2 Raffles and Provably Fair Systems**

Where randomness or selections are involved:

**Rules:**

* Use cryptographically secure random generation.
* Implement provably fair mechanics (seeded randomness with verifiable output).
* Log all randomness seeds and draw results.
* Ensure draw logic is deterministic and repeatable for audits.
* Prevent tampering through signatures or independent randomness sources.

**Outcome:** Raffle and draw based systems remain transparent, fair, and auditable.

---

# **6. UX and Flow Governance**

---

## **6.1 Clear Critical Flows**

Users must always understand what is happening.

**Rules:**

* Show steps for login, OTP, 2FA, submissions, approvals.
* Confirm irreversible actions.
* Standardize UI patterns for forms, errors, and confirmations.
* Provide meaningful, human readable error messages.

**Outcome:** Predictable and intuitive user experience.

---

## **6.2 Localization Readiness**

All systems must assume multilingual use.

**Rules:**

* Store all user facing text in translation files.
* Support user specific language preferences.
* Ensure layouts can adjust to different text lengths.
* Avoid hardcoding language strings.

**Outcome:** Apps are ready for multi region deployment.

---

# **7. Delivery and Lifecycle Governance**

---

## **7.1 Feature Spec Governance**

Every feature must be documented before and after implementation.

**Rules:**

* All new features or changes must be reflected in updated product spec documents.
* Specs must include:

  * Purpose and description
  * User flows
  * Permissions and roles
  * Logging and audit requirements
  * Edge cases and fallback behavior
* Code must not ship before documentation is updated.

**Outcome:** Product documentation remains accurate and authoritative.

---

## **7.2 Phased Delivery**

Delivery should be structured in vertical slices.

**Rules:**

* Build features in complete layers:
  Database → Services → API → UI → Logs → Tests → Documentation.
* Each phase must remain deployable.
* Avoid partially implemented flows in production.

**Outcome:** Continuous delivery without breaking functionality.

---

## **7.3 Observability and System Health**

Systems must expose their operational state.

**Rules:**

* Implement health checks (DB, cache, queue, external API).
* Log errors with enough context for debugging.
* Monitor latency, failure rates, throughput.
* Provide visibility dashboards for engineering and operations.

**Outcome:** Problems surface early and are diagnosable.

---

## **7.4 Git Workflow and Branch Protection (MANDATORY)**

All code changes must follow an **Enhanced GitHub Flow** branching model with pull request reviews. This model uses `main` as the stable trunk, short-lived feature branches for all work, optional `release/` branches for stabilisation, and `hotfix/` branches for emergency production fixes.

**Rules:**

* **Never push directly to main/master**:
  * All changes MUST go through feature branches and pull requests
  * Direct commits to protected branches are FORBIDDEN
  * This applies to ALL changes including documentation, config, and hotfixes
  * Violations must be reverted and re-submitted via proper PR workflow

* **Branch Naming Convention**:

  | Type | Pattern | Example |
  |------|---------|---------|
  | Feature | `feature/<ticket>-<description>` | `feature/SMB-42-entry-validator` |
  | Bugfix | `fix/<ticket>-<description>` | `fix/SMB-58-webhook-signature` |
  | Release | `release/v<version>` | `release/v2.1.0` |
  | Hotfix | `hotfix/<description>` | `hotfix/rate-limiter-bypass` |
  | Documentation | `docs/<description>` | `docs/api-webhook-examples` |

* **Pull Request Requirements**:
  * Descriptive title following conventional commits format
  * Summary of changes in PR body
  * Link to related tickets/issues where applicable
  * All CI checks must pass before merge
  * At least one approval required (when team size permits)
  * **Passing test report is mandatory.** Attach or link the test run output and coverage report in the PR body. PRs without a passing test report must not be approved. Bypassing this requirement is a governance deviation and must be recorded in `/docs/deviations/`
  * Coverage must meet minimum thresholds: 80% general code, 100% for money movement, authentication, authorization, and PII handling

* **Protected Branches**:

  | Branch | Protection Level |
  |--------|------------------|
  | `main` | No direct push, PR required, CI must pass |
  | `staging` | No direct push, PR required |
  | `production` | No direct push, PR + approval required |

* **Commit Message Format** (Conventional Commits):
  ```
  <type>(<scope>): <description>

  [optional body]

  [optional footer]
  ```
  Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

* **AI-Assisted Development**:
  * AI tools (Claude Code, Copilot, etc.) must also follow this workflow
  * AI must never commit directly to main - always use branches
  * AI-generated commits must be clearly marked

* **Merge Strategy**:

  | Branch Type | Merge Method | Rationale |
  |-------------|-------------|-----------|
  | `feature/*`, `fix/*`, `docs/*` → `main` | **Squash merge** | One clean commit per feature/fix; keeps `main` history linear and bisectable |
  | `release/*` → `main` | **Merge commit** (no squash) | Preserves the full stabilisation history for auditability |
  | `hotfix/*` → `main` | **Merge commit** (no squash) | Preserves hotfix traceability; cherry-pick to active `release/` branch if one exists |

  * Squash merge commit messages must follow conventional commits format: `<type>(<scope>): <description>`
  * The PR title becomes the squash commit message — enforce descriptive PR titles
  * Force-pushing to shared branches (`main`, `staging`, `production`, any `release/*`) is **FORBIDDEN**

* **Release Branches** (when stabilisation is needed):

  A `release/` branch is created when a set of features on `main` needs a stabilisation period before production deployment (e.g., QA hardening, final integration testing, documentation finalisation).

  * **Create** from `main`: `git checkout -b release/v2.1.0 main`
  * **Only bug fixes** are committed to a release branch — no new features
  * **Merge back to `main`** when the release is tagged and deployed: use a merge commit (no squash)
  * The version tag is created on the release branch before merging back
  * If no stabilisation is needed, releases may be tagged directly on `main` (the common case)

* **Hotfix Procedure**:

  Hotfixes address critical production issues that cannot wait for the normal feature branch cycle.

  1. **Branch from `main`:** `git checkout -b hotfix/rate-limiter-bypass main`
  2. **Fix the issue.** Include a regression test (per Rule 10 — SDET mandate)
  3. **Open a PR to `main`.** All normal PR requirements apply (CI, review, test report)
  4. **Merge to `main`** using a merge commit (no squash) for traceability
  5. **Cherry-pick to active `release/` branch** if one exists: `git cherry-pick <hotfix-commit>`
  6. **Tag and deploy** following the normal release procedure (PATCH bump per SemVer)

  Hotfixes are never deployed without a PR and passing tests. Bypassing this is a governance deviation (Rule 8).

* **Branch Lifecycle**:
  * **Auto-delete after merge:** Feature, fix, and docs branches must be deleted after their PR is merged. Configure repository settings to enable automatic branch deletion on merge
  * **Stale branch policy:** Branches with no commits for **14 days** are considered stale. Repository maintainers should review and delete stale branches monthly. AI agents should flag stale branches when detected during session startup
  * **Release branches** are deleted after merge back to `main` and successful deployment
  * **Never reuse branch names.** Once a branch is merged and deleted, do not create a new branch with the same name

* **Branch-to-Environment Mapping**:

  | Branch | Deploys To | Trigger | Notes |
  |--------|-----------|---------|-------|
  | `feature/*`, `fix/*` | Development / Preview | Push (CI only) | CI runs tests and linting; no deployment to shared environments |
  | `main` | Staging | Automatic on merge | All merged features deploy to staging for integration testing |
  | `release/v*` | Staging → Production | Manual promotion | QA on staging; senior engineer approval for production |
  | `hotfix/*` | Staging → Production | Expedited PR + approval | Fast-tracked but never without tests and review |
  | Tag (`v*`) | Production | Manual trigger | Annotated git tag triggers production deployment pipeline |

* **Dual-Origin Repository Configuration (MANDATORY)**:
  * All repositories **MUST** have GitHub as a git remote origin
  * Repositories hosted on non-GitHub platforms (e.g., AWS CodeCommit, Azure DevOps, GitLab, Bitbucket) **MUST** configure a dual-origin setup with GitHub as the second remote
  * GitHub serves as the canonical origin for CI/CD pipeline execution, code review automation, and Sentinel AI Code Reviewer integration
  * The dual-origin configuration ensures all repositories benefit from GitHub-native tooling (Actions, Dependabot, Sentinel) regardless of primary hosting platform
  * Minimum remote configuration:
    * If GitHub is the primary host: `origin` → GitHub (single origin is sufficient)
    * If hosted elsewhere: `origin` → primary host + `github` → GitHub mirror
  * Push hooks or CI scripts **must** ensure both origins stay synchronized on every push
  * Branch protection rules defined in this section apply to **both** origins

**Outcome:** Clean git history via squash merges, traceable changes, clear promotion path from development to production, no accidental production impacts. All repositories are accessible on GitHub for unified CI/CD and Sentinel integration.

---

## **7.5 Code Review Standards**

All code changes require peer review before merging to ensure quality and knowledge sharing.

**Review Requirements:**

* All code changes require pull request review before merge
* Minimum one approval from team member (not the author)
* Author cannot approve their own PR
* Security-sensitive changes require additional review from security-aware team member
* Changes affecting critical paths (payments, auth, raffles) require senior engineer review

**Reviewer Responsibilities:**

* Verify adherence to SDGP principles and standards
* Check for security vulnerabilities (OWASP Top 10)
* **Validate test coverage.** Confirm the test report is attached and passing. Verify coverage meets thresholds (80% general; 100% for money movement, auth, and PII). Reject the PR if either condition is not met — this is not optional
* Assess performance implications
* Ensure documentation updates are included
* Verify error handling is implemented correctly
* Check for proper logging and audit trails
* Confirm secrets are not exposed

**Review Turnaround SLAs:**

| PR Type | Target Response Time | Notes |
|---------|---------------------|-------|
| Standard PRs | 24 business hours | Feature work, refactoring |
| Hotfixes | 4 hours | Production issues |
| Security patches | 2 hours | Critical vulnerabilities |
| Documentation | 48 business hours | Non-blocking changes |

**Review Feedback Guidelines:**

* Provide constructive, specific feedback
* Distinguish between blocking issues and suggestions
* Use conventional comments: "blocking:", "nit:", "suggestion:", "question:"
* Approve only when all blocking issues are resolved
* Request changes when significant issues exist

**Outcome:** High code quality through collaborative review and knowledge sharing.

---

## **7.6 CI/CD Pipeline Standards**

Automated pipelines ensure consistent quality and safe deployments.

**GitHub as Mandatory CI/CD Origin (MANDATORY):**

All CI/CD pipelines **MUST** originate from GitHub, regardless of where the repository is primarily hosted. This requirement exists to:

* Leverage the **Sentinel AI Code Reviewer** dependent workflow, which is GitHub-native and may not be feasible or supported on AWS CodeCommit, Azure DevOps, or other git hosting platforms
* Ensure a unified pipeline execution environment across all projects
* Enable consistent use of GitHub Actions, GitHub-hosted runners, and GitHub-native security scanning

**Rules:**

* **GitHub Actions is the default CI/CD engine.** All pipeline definitions must live in `.github/workflows/`
* Repositories hosted on non-GitHub platforms must trigger GitHub Actions via webhook, mirror push, or scheduled sync — the pipeline always runs on GitHub
* The Sentinel AI Code Reviewer workflow must be included as a **required status check** on all pull requests. Sentinel integration details are maintained in the Sentinel repository
* CI/CD pipelines on non-GitHub platforms (e.g., AWS CodePipeline, Azure Pipelines) may exist for **deployment orchestration only** (i.e., deploying artifacts to platform-specific infrastructure), but all quality gates (linting, testing, security scanning, code review) must execute on GitHub
* Pipeline secrets for non-GitHub deployments must be stored in GitHub Actions Secrets or an approved vault — never in the non-GitHub platform's native secret store alone

**Pipeline Requirements:**

All CI/CD pipelines must include these stages:

1. **Linting and Code Style**
   * Run code formatter checks (Pint for PHP, ESLint for JS)
   * Static analysis (PHPStan level 5+, TypeScript strict mode)
   * Fail pipeline on style violations

2. **Testing**
   * Unit test execution
   * Integration test execution
   * Code coverage reporting (minimum 80% for new code)
   * Fail pipeline if coverage drops below threshold

3. **Security Scanning**
   * Static Application Security Testing (SAST)
   * Dependency vulnerability scanning
   * Secrets detection (prevent committed secrets)
   * Fail pipeline on critical/high vulnerabilities

4. **Build and Artifacts**
   * Compile/build application
   * Create deployable artifacts
   * Tag with version and commit SHA

5. **Version Tagging (SemVer)**
   * All releases follow [Semantic Versioning 2.0.0](https://semver.org/) as defined in `/governance-docs/coding-standards.md` §6.3
   * CI/CD pipeline should derive the version bump from conventional commit messages:
     * `fix:` → PATCH bump
     * `feat:` → MINOR bump
     * `BREAKING CHANGE:` or `!` suffix → MAJOR bump
   * Annotated git tags (`v1.2.0`) are the canonical version source
   * Tags must be pushed to all configured remotes (per dual-origin policy)
   * Update the project manifest file (`package.json`, `composer.json`, `pubspec.yaml`) to match the tagged version
   * Pre-release versions (`alpha`, `beta`, `rc`) must not be deployed to production
   * Breaking changes (MAJOR bumps) require an approved ADR before the release tag is created

6. **Deployment to Staging**
   * Automatic deployment to staging environment
   * Run smoke tests against staging
   * Verify health checks pass

**Deployment Gates:**

Before deployment, all conditions must be met:
* All pipeline tests passed
* No critical or high security vulnerabilities
* Code review approved
* Documentation updated (for feature changes)
* Database migrations tested (if applicable)
* Version tag created and follows SemVer (for releases)
* CHANGELOG entry matches the version being deployed
* MAJOR version bumps have an approved ADR

**Environment Deployment Strategy:**

| Environment | Trigger | Approval Required | Rollback Strategy |
|-------------|---------|-------------------|-------------------|
| Development / Preview | Push to feature/fix branch (CI only) | No | N/A |
| Staging | Merge to main or release branch | No | Automatic |
| Production | Annotated version tag (`v*`) or manual trigger | Yes (senior engineer) | Manual with runbook |

**Pipeline Monitoring:**

* Track pipeline success rates
* Monitor build times (alert if >10 min)
* Log all deployment attempts
* Alert on repeated failures

**Outcome:** Consistent, automated quality checks and safe deployment process.

---

## **7.7 Performance Testing Standards**

Performance must be validated before production deployment.

**When Performance Testing is Required:**

* New API endpoints (especially with database queries)
* Database query changes or new indexes
* Significant feature additions affecting core flows
* Before major releases
* After infrastructure changes

**Test Types:**

1. **Load Testing**
   * Simulate expected traffic patterns
   * Target: Normal operating conditions
   * Duration: 30 minutes minimum
   * Verify SLOs are met

2. **Stress Testing**
   * Simulate 2x expected peak traffic
   * Identify breaking points
   * Duration: 15 minutes
   * Verify graceful degradation

3. **Soak Testing**
   * Extended duration testing (24 hours)
   * Identify memory leaks
   * Verify no resource exhaustion
   * Check log growth rates

4. **Spike Testing**
   * Sudden traffic increases (0 to peak in 1 minute)
   * Verify auto-scaling works
   * Check rate limiting behavior

**Acceptance Criteria:**

* API response times within SLOs (95th percentile):
  * Read operations: < 200ms
  * Write operations: < 500ms
  * Complex operations: < 2s
* No memory leaks (memory usage stable over time)
* Error rate < 0.1% under load
* Resource utilization < 80% at expected peak
* Database connection pool not exhausted

**Performance Testing Tools:**

* API load testing: k6, Apache JMeter, or Artillery
* Database query profiling: Laravel Telescope, MySQL slow query log
* Application profiling: Xdebug, Blackfire

**Outcome:** Performance issues identified and resolved before production impact.

---

## **7.8 Rollback Procedures**

Every deployment must have a tested rollback plan.

**Deployment Rollback:**

* All deployments must support instant rollback to previous version
* Keep previous 3 versions deployable and accessible
* Document rollback steps per service in deployment runbook
* Test rollback procedure quarterly (minimum)
* Rollback should complete within 5 minutes

**Database Rollback:**

* All migrations must have functional `down()` method
* Backup database before destructive operations
* Test rollback migrations in staging before production
* Document data recovery procedures
* For irreversible migrations, provide data export before change

**Rollback Decision Criteria:**

Initiate rollback immediately if:
* Error rate increases above 1%
* P1/P2 incident reported within 30 minutes of deployment
* Core functionality broken or inaccessible
* Data integrity concerns identified
* Security vulnerability introduced

**Rollback Process:**

1. Declare rollback decision (senior engineer or on-call)
2. Notify team via incident channel
3. Execute rollback procedure
4. Verify application health checks pass
5. Monitor error rates for 15 minutes
6. Document rollback reason and timeline
7. Schedule post-mortem

**Post-Rollback Actions:**

* Investigate root cause
* Fix issue in feature branch
* Add tests to prevent regression
* Re-deploy through normal CI/CD pipeline

**Outcome:** Fast recovery from problematic deployments with minimal user impact.

---

## **7.9 Incident Response and On-Call**

Production incidents require rapid, coordinated response.

**Incident Severity Levels:**

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| **P1** | Service down, data loss, security breach | 15 minutes | API completely down, database corrupted, auth bypass |
| **P2** | Major feature broken, significant user impact | 1 hour | Payment processing failing, login intermittent |
| **P3** | Minor feature degraded, some users affected | 4 hours | Report generation slow, non-critical UI bug |
| **P4** | Low impact, cosmetic issues | Next business day | Typos, minor styling issues |

**On-Call Responsibilities:**

* Monitor alerting channels (PagerDuty, Slack, email)
* Acknowledge incidents within response time SLA
* Assess severity and coordinate response
* Escalate if unable to resolve
* Communicate status updates every 30 minutes for P1/P2
* Document incident timeline and actions
* Complete post-mortem for P1/P2 incidents

**Escalation Path:**

1. **On-call engineer** - First responder, initial triage
2. **Team lead** - Coordinate resources, technical decisions
3. **Engineering manager** - Resource allocation, stakeholder communication
4. **CTO** - P1 incidents only, executive escalation

**Incident Communication:**

* Create incident channel (e.g., #incident-2024-12-08)
* Post status updates in channel
* Notify affected stakeholders
* Update status page if external impact
* Post resolution message when resolved

**Post-Mortem Requirements:**

All P1/P2 incidents require post-mortem within 48 hours:

* **Timeline of events** - Detailed chronology
* **Root cause analysis** - 5 whys technique
* **Impact assessment** - Users affected, duration, data impact
* **Action items** - Preventive measures with owners and deadlines
* **Lessons learned** - What went well, what to improve

**Outcome:** Rapid incident response with clear accountability and continuous improvement.

---

## **7.10 Technical Debt Management**

Technical debt must be tracked, prioritized, and systematically addressed.

**Debt Identification:**

Technical debt includes:
* Shortcuts taken to meet deadlines
* Code that violates SDGP standards
* Missing tests or documentation
* Deprecated dependencies
* Performance optimization opportunities
* Security improvements needed

**Tracking Requirements:**

* Document all known technical debt in issue tracker
* Assign severity: High (blocks new features), Medium (impacts velocity), Low (minor improvement)
* Estimate remediation effort (S/M/L sizing)
* Link to affected components/files
* Tag with `tech-debt` label

**Debt Prioritization:**

High priority debt:
* Security vulnerabilities
* Performance bottlenecks affecting users
* Debt blocking new feature development
* Code causing frequent bugs

**Debt Allocation:**

* Reserve 20% of sprint capacity for debt reduction
* Address high-priority debt before adding new features
* Review debt backlog monthly in team meetings
* Track debt trends (increasing/decreasing)

**Debt Prevention:**

* Address all code review feedback before merging
* Refactor during feature work when practical
* Document shortcuts with TODO comments including ticket reference
* Never ship code you're not proud of

**Debt Metrics:**

Track these metrics over time:
* Number of debt items (by severity)
* Age of oldest debt items
* Debt resolved per sprint
* Debt created vs debt resolved ratio

**Outcome:** Sustainable codebase that doesn't deteriorate over time.

---

# **8. Documentation Discipline**

Every system must maintain:

* Architecture diagrams
* Role and capability definitions
* Product specs updated with each feature change
* Database schema and migration notes
* API route documentation
* Market configuration documentation
* Audit and logging behavior documentation

**Outcome:** Fast onboarding and consistent knowledge sharing.

---

# **9. Future Friendly Design**

Systems must be designed to scale and evolve.

**Rules:**

* Assume more roles, countries, features, and integrations.
* Avoid logic that breaks when expanding.
* Use configuration driven behavior where possible.
* Keep environment specific values out of code.

**Outcome:** Systems grow without requiring rewrites.

---

# **10. Developer Responsibilities**

Every developer must:

* Understand and adhere to this governance policy.
* Apply security, audit, and permission rules correctly.
* Ensure required user and admin action logs are implemented.
* Update product specs whenever behavior changes.
* Raise flags when design choices violate governance standards.

---

# **11. Governance Review Checklist**

Use this during onboarding, design reviews, code reviews, and release reviews:

## **Security & Access Control**
* Security and OWASP compliance verified
* Least privilege enforced for all roles
* Authentication standards implemented (passwordless/2FA)
* Secrets management policy followed (no hardcoded secrets)
* Secrets stored securely with rotation schedule
* Environment governance enforced (dev/staging/prod separation)

## **Code Quality & Process**
* Code review completed with approval
* Separation of concerns adhered to
* Reusable components and services used
* Error handling implemented correctly
* No stack traces exposed to clients
* Dependencies evaluated and approved
* No vulnerable or unmaintained dependencies
* Git workflow followed (Enhanced GitHub Flow — feature branches, squash merge, PRs)
* Merge strategy correct (squash for features/fixes, merge commit for releases/hotfixes)
* Branches deleted after merge (no stale branches)
* Dual-origin configured (GitHub remote present on all repos)
* CI/CD pipelines originate from GitHub (GitHub Actions)
* Conventional commit messages used
* Semantic Versioning (SemVer 2.0.0) followed for releases
* Git tags annotated and pushed to all remotes
* CHANGELOG version headers match git tags

## **Data Governance**
* Data modeled with proper constraints
* Sensitive data protected and encrypted
* Database migrations versioned and reversible
* Migration tested in staging before production
* Reporting DB vs primary separation implemented
* DB connections configurable, no hardcoding
* Safe fallback to primary DB if replicas missing
* User deletion (NDPR) supported
* Soft deletes used appropriately

## **Multi-Market & Domain Logic**
* Multi country/market rules enforced
* Payment gateway market restrictions handled
* Raffle systems provably fair (if applicable)

## **Observability & Operations**
* Logging of user and admin actions implemented
* Logs stored securely and auditable
* Error logging includes proper context
* Monitoring and health checks in place
* Performance tested (if required)
* Performance SLOs met
* Rollback procedure documented
* Incident response plan understood

## **Delivery & Documentation**
* CI/CD pipeline configured with all gates (originating from GitHub)
* Sentinel AI Code Reviewer workflow included as required status check
* All pipeline checks passing
* Product specs updated for every feature
* API documentation updated (if applicable)
* Localization ready
* Feature delivered in complete vertical slices
* Technical debt documented (if any shortcuts taken)
* Documentation complete and accurate

---

