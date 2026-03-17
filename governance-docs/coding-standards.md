# Coding Standards

### *Mandatory Standards for All Code Written or Suggested by Developers and AI Agents*

**Reference Document:** Software Development Governance Policy (SDGP)

---

## 1. Purpose

This document defines the coding standards that apply across all CashToken projects. These standards are enforced by AI agents (CLAUDE.md, copilot-instructions.md, .cursorrules) and must be followed by all developers and any AI-assisted code generation.

These standards complement the SDGP (security, authentication, data governance) and API Governance (REST design, response envelopes, pagination). This document focuses on code-level conventions.

---

## 2. General Rules (All Languages)

### 2.1 Language and Formatting

- **Language:** American English for all code, comments, commit messages, and branch names
- **String quotes in code:** Single quotes (`'`) for PHP, JavaScript, and CSS. Double quotes only when the string contains a single quote or requires interpolation
- **Text quotes:** Straight quotes only (`'` and `"`). Never use typographic/smart quotes
- **Indentation:** 4 spaces. No tabs
- **Line length:** 120 characters maximum for code. 80 characters for comments and documentation
- **Trailing whitespace:** Remove all trailing whitespace
- **Final newline:** Every file ends with a single newline

### 2.2 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Variables | camelCase | `$userName`, `totalAmount`, `isActive` |
| Functions/Methods | camelCase | `getUserById()`, `calculateTotal()` |
| Classes | UpperCamelCase | `PaymentProcessor`, `UserService` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| Database tables | snake_case (plural) | `user_accounts`, `payment_transactions` |
| Database columns | snake_case | `created_at`, `is_active`, `user_id` |
| Config keys / routes | snake_case | `api_timeout`, `user.profile.show` |
| CSS classes | kebab-case | `nav-header`, `btn-primary`, `card-body` |
| File names (PHP classes) | UpperCamelCase matching class name | `PaymentProcessor.php` |
| File names (views/templates) | snake_case | `user_profile.blade.php`, `order_detail.twig` |
| File names (JS/CSS) | kebab-case | `user-dashboard.js`, `main-layout.css` |
| Branch names | kebab-case | `feature/add-payment-flow`, `fix/login-timeout` |

### 2.3 Comments

- Comments explain **why**, not **what**. The code should be self-explanatory
- Only add comments for complex, unintuitive, or non-obvious logic
- Do not use comments as section separators (e.g., `// === Section ===`)
- Do not leave commented-out code in the codebase. Delete it; Git has the history
- Inline comments: lowercase start, no trailing period
- Block comments / docblocks: proper sentences with capitalization and periods

### 2.4 Error Handling

- Handle exceptions explicitly. No empty catch blocks. No silent failures
- Exception messages must be concise, precise, and actionable. Include class names, file paths, or IDs that help with debugging
- Exception messages: start with capital letter, end with period
- Never expose internal error details (stack traces, SQL, file paths) to end users
- Log the full error internally; return a safe, generic message to the client

### 2.5 Security (Code-Level)

These extend the OWASP requirements in the SDGP:

- **No hardcoded secrets.** API keys, passwords, tokens, and connection strings go in environment variables
- **Validate all input** at system boundaries (user input, API requests, file uploads, URL parameters)
- **Sanitize all output** before rendering in HTML, SQL, shell commands, or log files
- **Use parameterized queries** or ORM methods. Never concatenate user input into SQL
- **Escape output** in templates to prevent XSS. Use framework-provided escaping (Blade `{{ }}`, Twig `{{ }}`)
- **CSRF protection** on all state-changing endpoints
- **Prevent mass assignment.** Explicitly define fillable/guarded fields (Laravel `$fillable`) or use form objects
- **Rate limit** authentication, OTP, password reset, and high-value endpoints
- **Never trust client-side validation alone.** Always validate server-side

### 2.6 Do Not Edit (Framework-Managed Files)

AI agents must never modify these directories or files:

| Path | Reason |
|------|--------|
| `vendor/` | Managed by Composer |
| `node_modules/` | Managed by npm/yarn |
| `*.lock` files | Only update via package manager commands |
| `.env` files | Environment-specific, never committed |
| `storage/` (Laravel) / `runtime/` (Yii) | Framework cache/logs |
| `public/build/` or `dist/` | Generated assets |

### 2.7 Anti-Patterns (Never Do This)

- Do not use `else` / `elseif` after `return` or `throw`. Return early instead
- Do not use magic numbers or magic strings. Define constants or enums
- Do not hardcode user-facing text. Use localization/translation (`__()` in Laravel, `Yii::t()` in Yii, i18n in Node.js)
- Do not use `var` in JavaScript. Use `const` by default, `let` only when reassignment is needed
- Do not suppress errors (`@` in PHP, empty catch blocks, `.catch(() => {})`)
- Do not use loose comparisons (`==`, `!=`). Use strict comparisons (`===`, `!==`) in all languages
- Do not commit `.env`, credentials, API keys, or secrets. Check `.gitignore` first
- Do not write functions longer than 30 lines. Refactor into smaller, focused functions
- Do not nest conditionals more than 3 levels deep. Use early returns or extract methods

---

## 3. PHP Standards

### 3.1 Version and Syntax

- **Minimum version:** PHP 8.1
- Use constructor property promotion where it simplifies the class
- Use enums instead of class constants for fixed sets of values
- Use named arguments when calling functions with many parameters or boolean flags
- Use match expressions instead of switch when returning values
- Use null coalescing (`??`) and nullsafe operator (`?->`) instead of verbose null checks
- Always use parentheses when instantiating: `new Foo()` not `new Foo`

### 3.2 PSR Compliance

All PHP code must follow:

- **PSR-1:** Basic coding standard
- **PSR-4:** Autoloading standard (namespace matches directory structure)
- **PSR-12:** Extended coding style (braces, spacing, imports)

### 3.3 Type Safety

- Declare parameter types and return types on all methods
- Use `return null;` for nullable returns, `return;` for void methods
- Add `void` return type to all test methods
- Use union types (`string|int`) over docblock `@param string|int`
- Prefer typed properties over docblock `@var`

### 3.4 Class Organization

```
1. Constants
2. Properties (public, protected, private)
3. Constructor
4. Public methods
5. Protected methods
6. Private methods
```

### 3.5 Formatting

- Braces required for all control structures, even single-line bodies
- Trailing commas in multi-line arrays, function parameters, and function calls
- One blank line before `return` statements (unless the only statement in a block)
- Use `sprintf()` for building exception messages: `sprintf('User %s not found.', $userId)`

### 3.6 Laravel-Specific

When the project uses Laravel:

- Follow Laravel conventions for directory structure, naming, and patterns
- Use Eloquent relationships, scopes, and accessors/mutators as designed
- Use Form Request classes for validation, not inline validation in controllers
- Use Policies for authorization logic, not inline checks
- Use config values and constants instead of hardcoded strings: `config('app.name')`, not `'MyApp'`
- Use Laravel's built-in features before adding packages (queues, cache, mail, notifications)
- Migrations must be reversible (`down()` method implemented)
- Use database transactions for multi-step operations that must be atomic
- Route model binding over manual `find()` calls
- Use resource controllers and API resources for consistent response formatting

### 3.7 Yii-Specific

When the project uses Yii:

- Follow Yii conventions for directory structure and naming
- Use ActiveRecord relationships and behaviors as designed
- Use form models for validation
- Use RBAC for authorization
- Use Yii components and application configuration over custom globals
- Migrations must include `safeUp()` and `safeDown()` methods
- Use Yii's built-in caching, logging, and queue mechanisms

---

## 4. JavaScript / Node.js Standards

### 4.1 Syntax

- **ES6+ syntax required.** Use modern features: arrow functions, destructuring, template literals, spread operator, optional chaining
- `const` by default. `let` only when reassignment is necessary. Never `var`
- Use `async/await` over `.then()` chains. Handle errors with try/catch
- Use template literals for string interpolation: `` `Hello, ${name}` `` not `'Hello, ' + name`
- Use optional chaining (`?.`) and nullish coalescing (`??`) instead of verbose null checks
- Strict equality only: `===`, `!==`

### 4.2 Functions

- Prefer arrow functions for callbacks and anonymous functions
- Use named functions for top-level declarations (better stack traces)
- Destructure function parameters when there are more than 2-3 related parameters
- Default parameters over conditional assignment inside the function body

### 4.3 Modules

- Use ES modules (`import`/`export`) in frontend code
- Use CommonJS (`require`/`module.exports`) only in Node.js when ESM is not supported
- One class or primary export per file
- Group imports: built-in modules, third-party packages, local modules (separated by blank lines)

### 4.4 Error Handling

- Always handle promise rejections. Never leave `.catch()` empty
- Use custom error classes for domain-specific errors
- In Express/Koa/Fastify: use centralized error handling middleware, not try/catch in every route
- Log errors with context (request ID, user ID, operation name)

### 4.5 Node.js Specific

- Use environment variables for configuration (`process.env`). Never hardcode connection strings, ports, or secrets
- Use `dotenv` or framework-native config loading. Never commit `.env` files
- Validate environment variables at startup. Fail fast if required values are missing
- Use a process manager (PM2, systemd) in production. Never run `node app.js` directly
- Handle `uncaughtException` and `unhandledRejection` — log and exit gracefully

---

## 5. CSS Standards

### 5.1 Syntax and Formatting

- **Standard CSS only.** Do not use SCSS, LESS, or other preprocessors unless the project explicitly requires it and it is documented in a Project-Specific Notes section
- 4-space indentation
- One declaration per line
- Opening brace on the same line as the selector
- Closing brace on its own line
- One blank line between rule sets

### 5.2 Naming and Selectors

- kebab-case for class names: `.nav-header`, `.user-card`, `.btn-submit`
- Do not use IDs for styling. IDs are for JavaScript hooks and anchor targets
- Keep selectors flat. Do not nest rules (maximum 2 levels of specificity)
- Prefer class selectors over element selectors for styling
- Use BEM naming when component structure requires it: `.block__element--modifier`

### 5.3 Layout and Responsiveness

- Responsive design is mandatory. All UI must work at standard breakpoints:
  - Medium (md): 768px and above
  - Large (lg): 992px and above
  - Extra large (xl): 1200px and above
- Use CSS logical properties where supported: `margin-block-end` instead of `margin-bottom`, `padding-inline-start` instead of `padding-left`
- Use Flexbox and CSS Grid for layout. Avoid float-based layouts
- Use relative units (`rem`, `em`, `%`, `vh`, `vw`) over fixed pixels for fonts and spacing

### 5.4 Bootstrap

When Bootstrap is used:

- Use Bootstrap utility classes before writing custom CSS
- Follow Bootstrap's breakpoint system. Do not introduce custom breakpoints
- Use Bootstrap's color system and CSS custom properties for theming
- Do not override Bootstrap classes directly. Use custom classes that extend them

---

## 6. Git and Commit Standards

### 6.1 Commit Messages

- **Imperative mood:** "Add feature" not "Added feature" or "Adds feature"
- **First line:** Concise summary, 50 characters maximum
- **No period** at the end of the subject line
- Reference issues when applicable: `Fix #123`, `Part of #45`
- If AI-assisted: include `Co-Authored-By` line

### 6.2 Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<short-description>` | `feature/add-payment-flow` |
| Bug fix | `fix/<issue-number-or-description>` | `fix/123-login-timeout` |
| Hotfix | `hotfix/<description>` | `hotfix/payment-null-pointer` |
| Documentation | `docs/<description>` | `docs/update-api-specs` |

- Lowercase with hyphens
- Keep branch names short and descriptive

### 6.3 Semantic Versioning (SemVer)

All projects must follow [Semantic Versioning 2.0.0](https://semver.org/) for release numbering.

**Version format:** `MAJOR.MINOR.PATCH`

| Segment | Incremented When | Example |
|---------|-----------------|---------|
| **MAJOR** | A breaking change is introduced — any change that requires consumers (other services, clients, users) to modify their code, configuration, or expectations to continue working | `1.4.2` → `2.0.0` |
| **MINOR** | New functionality is added in a backward-compatible manner | `1.4.2` → `1.5.0` |
| **PATCH** | A backward-compatible bug fix, security patch, or documentation correction is applied | `1.4.2` → `1.4.3` |

**Rules:**

- When MAJOR is incremented, MINOR and PATCH reset to zero
- When MINOR is incremented, PATCH resets to zero
- Version `0.x.y` indicates initial development — the API/interface is not yet stable and breaking changes may occur without a MAJOR bump. Use this until the first production release
- Version `1.0.0` marks the first stable, production-ready release. After 1.0.0, SemVer rules apply strictly

**Conventional Commits → Version Bumps:**

The conventional commit types used in this project (see §6.1) map directly to version increments:

| Commit Type / Indicator | Version Bump | Example Commit |
|------------------------|-------------|----------------|
| `fix:` | PATCH | `fix(auth): correct token expiry check` |
| `docs:`, `chore:`, `refactor:`, `test:` | PATCH (or no release) | `docs: update API endpoint examples` |
| `feat:` | MINOR | `feat(payments): add Paystack webhook handler` |
| Any commit with `BREAKING CHANGE:` in the footer, or `!` after the type | MAJOR | `feat(api)!: change response envelope structure` |

**Breaking Change Protocol:**

A breaking change is any change that:
- Removes or renames a public API endpoint, method, class, or configuration key
- Changes the type, structure, or semantics of an existing response, parameter, or return value
- Removes or changes default behavior that consumers depend on
- Requires a database migration that is not backward-compatible
- Changes authentication, authorization, or security boundaries

Breaking changes **require**:
1. An ADR (per SDGP Rule 3 — architecture change)
2. A `BREAKING CHANGE:` footer in the commit message describing what changed and how consumers should migrate
3. A `### Breaking Changes` section in the CHANGELOG entry
4. A deprecation notice in the previous MINOR release when feasible (deprecate first, remove in next MAJOR)

**Pre-Release Versions:**

Pre-release versions use hyphenated labels appended to the version:

| Label | Meaning | Example |
|-------|---------|---------|
| `alpha` | Internal development, incomplete features, unstable | `2.0.0-alpha.1` |
| `beta` | Feature-complete for the release, under testing, may have bugs | `2.0.0-beta.1` |
| `rc` | Release candidate — believed ready for production, final validation | `2.0.0-rc.1` |

- Pre-release versions have lower precedence than the associated release: `2.0.0-alpha.1` < `2.0.0`
- Increment the numeric suffix for successive pre-releases: `alpha.1`, `alpha.2`, `alpha.3`
- Pre-release versions must not be deployed to production

**Git Tags:**

Git tags are the **canonical source of truth** for version numbers.

- Tag every release: `git tag -a v1.2.0 -m "Release v1.2.0"`
- Tags use the `v` prefix: `v1.0.0`, `v2.3.1-beta.1`
- Tags must be annotated (not lightweight) — annotated tags store author, date, and message
- Tags must be pushed to **all** configured remotes (per dual-origin policy): `git push origin --tags && git push github --tags`
- Never delete or move a published tag. If a release is defective, publish a new PATCH
- CI/CD pipelines should create tags automatically from conventional commits (see SDGP §7.6)

**Version in Project Files:**

Keep the version number in the project's manifest file in sync with git tags:

| Stack | File | Field |
|-------|------|-------|
| PHP (Composer) | `composer.json` | `"version": "1.2.0"` |
| Node.js | `package.json` | `"version": "1.2.0"` |
| Flutter | `pubspec.yaml` | `version: 1.2.0+<build-number>` |
| Python | `pyproject.toml` | `version = "1.2.0"` |
| General | — | Git tag is sufficient if no manifest exists |

**Version in CHANGELOG:**

Every versioned release must have a corresponding entry in `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/) format. The CHANGELOG version headers must match git tags exactly (without the `v` prefix): `## [1.2.0] - 2026-03-09`.

**AI Agent as Version Lifecycle Manager:**

AI agents operating under the **P-09 Release & Version Engineer** persona (Rule 11) and Rule 5 are the designated version lifecycle managers. P-09 auto-activates whenever version-relevant work is detected. They are responsible for:

- Determining and recommending the correct version bump based on commit analysis
- Drafting CHANGELOG entries as work progresses
- Validating version consistency across tags, manifests, and CHANGELOG
- Enforcing all SemVer rules defined in this section

**If a developer contradicts the agent's version recommendation** (e.g., requests a PATCH when a MINOR is warranted, skips a tag, deploys a pre-release to production, or overrides a breaking change assessment), the agent must: (1) explain the contradiction, (2) request justification, (3) log the deviation in `/docs/deviations/` per the governance deviation tracking process, and (4) proceed after logging. The deviation record must include the agent's recommendation, the developer's request, the justification, and a risk assessment. See agent instruction files Rule 5 §5.3 for the full list of triggering actions.

---

### 6.4 Pre-Commit Checklist

Before submitting a PR, verify:

**If PHP code changed:**
- [ ] Static analysis passes (PHPStan / Psalm / Larastan)
- [ ] Code style passes (PHP CS Fixer / Pint)
- [ ] Tests pass with 80% minimum coverage

**If JavaScript code changed:**
- [ ] Linting passes (ESLint)
- [ ] Formatting passes (Prettier, if configured)
- [ ] Tests pass

**If CSS changed:**
- [ ] No lint errors (Stylelint, if configured)
- [ ] Responsive design verified at all breakpoints
- [ ] Build/compilation succeeds (if using a build tool)

**If templates changed:**
- [ ] No hardcoded user-facing text (all text uses translation functions)

---

## 7. Testing Standards

Tests are mandatory for all implementation work. No feature, bug fix, refactor, or utility function is complete without corresponding tests. Test reports are a prerequisite for PR approval. Violations are tracked in `/docs/deviations/`.

AI agents acting on this codebase operate as an embedded **SDET (Software Development Engineer in Test)**. They proactively identify when testing is required, request permission from the developer, and write tests before and alongside implementation — not as an afterthought. See agent rule files (CLAUDE.md, .cursorrules, copilot-instructions.md) Rule 10 for the full SDET protocol.

### 7.1 Structure and Test Types

Four test types are required across all projects:

| Type | Purpose | Directories |
|------|---------|-------------|
| **Unit** | Isolated component tests — no database, no network, no I/O | `tests/Unit/` (PHP), `__tests__/unit/` (JS/TS) |
| **Integration** | Component interaction tests — DB, queues, service-to-service | `tests/Feature/` (Laravel), `tests/Functional/` (Yii), `__tests__/integration/` (JS/TS) |
| **Functional** | End-to-end user-facing behaviour — HTTP lifecycle, UI flows, API contracts | `tests/e2e/` or framework-designated directory |
| **Regression** | Guard against re-introduction of fixed bugs — one test per confirmed bug fix | Co-located with the most appropriate test type |

- Test file mirrors source file structure: `src/Services/PaymentService.php` → `tests/Unit/Services/PaymentServiceTest.php`
- One test class per source class. One test method per behavior

### 7.2 Frameworks

Select a framework before writing any implementation code. An ADR is required when selecting a framework for a new project or switching frameworks.

| Stack | Unit / Component | E2E / HTTP Layer | Mocking | Install |
|-------|-----------------|------------------|---------|---------|
| PHP / Laravel | Pest (preferred) or PHPUnit | Laravel HTTP helpers | Pest mocking / Mockery | `composer require pestphp/pest --dev` |
| PHP / Yii | PHPUnit | — | PHPUnit mocks / Mockery | `composer require phpunit/phpunit --dev` |
| TypeScript | Vitest | Supertest (if Node.js) | Vitest built-in | `npm install --save-dev vitest` |
| Node.js / Express | Vitest (preferred) or Jest | Supertest | Vitest built-in | `npm install --save-dev vitest supertest` |
| JavaScript (Vite) | Vitest | — | Vitest built-in | `npm install --save-dev vitest` |
| JavaScript (non-Vite) | Jest | — | Jest built-in | `npm install --save-dev jest` |
| React Native | Jest + RNTL | Detox | Jest built-in | `npm install --save-dev jest @testing-library/react-native` |
| Flutter | flutter_test (built-in) | integration_test (built-in) | mockito (Dart) | `flutter pub add --dev mockito build_runner` |

> RNTL = React Native Testing Library. Detox requires separate native setup per the Detox docs.

**Why Vitest over Jest for TypeScript/Node.js:** Vitest understands TypeScript natively — no ts-jest or transpiler config. Significantly faster. API is intentionally identical to Jest so migration is trivial. Use Jest only when the project is CommonJS-only or already committed to Jest's ecosystem.

### 7.3 Execution Commands

| Stack | Run Tests | Run with Coverage |
|-------|-----------|-------------------|
| PHP / Pest | `./vendor/bin/pest` | `./vendor/bin/pest --coverage` |
| PHP / PHPUnit | `./vendor/bin/phpunit` | `./vendor/bin/phpunit --coverage-text` |
| Laravel (Artisan) | `php artisan test` | `php artisan test --coverage` |
| TypeScript / Node.js (Vitest) | `npx vitest run` | `npx vitest run --coverage` |
| Node.js / Jest | `npx jest` | `npx jest --coverage` |
| React Native | `npx jest` | `npx jest --coverage` |
| Flutter | `flutter test` | `flutter test --coverage` |

Run the full suite before every PR. Attach or link the coverage report in the PR description. PRs without a passing test report will not be approved.

### 7.4 Writing Tests

- Test names must be descriptive: `it_rejects_expired_tokens()`, `testCalculatesTotalWithDiscount()`
- Use simple, obvious test data: `'user@example.com'`, `'Test User'`, `100`. Avoid clever or realistic fake data that obscures the test's purpose
- One assertion per concept (multiple assertions are fine if they test the same behavior)
- Add `void` return type to all test methods (PHP)
- Use data providers or `@testWith` for parameterized tests — avoid duplicating test methods for different inputs
- Test edge cases: null values, empty strings, boundary values, concurrent access
- Never test framework internals. Test your code's behavior

### 7.5 Coverage Requirements

| Scope | Minimum Coverage |
|-------|-----------------|
| General code | 80% line coverage |
| Money movement | 100% |
| Authentication and authorization | 100% |
| PII handling | 100% |

Coverage is measured, not gamed. Writing assertion-free tests to inflate numbers is a governance violation and must be logged in `/docs/deviations/`.

### 7.6 PR Approval Gate

A PR **must not** be approved or merged if:
- The test suite has not been run against the branch
- Any test is failing
- Coverage has dropped below the minimum thresholds above
- No coverage report is attached or linked in the PR

Bypassing this gate is a governance deviation. Record it in `/docs/deviations/` with the justification provided.

---

## 8. Documentation Standards

### 8.1 Code Documentation

- Public methods on services, repositories, and API controllers must have docblocks
- Docblocks describe **what the method does and why**, not just the parameters
- No docblocks for getters, setters, or self-explanatory methods
- No single-line docblocks. If it fits on one line, use an inline comment instead

### 8.2 README

- Every project must have a README with: purpose, setup instructions, environment requirements, and how to run tests
- READMEs use Markdown format
- Writing style: second person ("you"), American English, simple vocabulary
- Avoid: "just", "obviously", "easy", "simply" — they assume knowledge the reader may not have
- Use realistic examples. Avoid `foo`, `bar`, `baz` placeholders

---

## 9. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-27 | CIO | Initial coding standards |
| 1.1 | 2026-03-01 | CIO + Claude | §7 expanded: four test types, SDET role reference, full framework and execution tables for all stacks (PHP, JS, TS, Node.js, React Native, Flutter) |
| 1.2 | 2026-03-09 | CIO + Claude | §6.3 added: Semantic Versioning (SemVer 2.0.0) — version format, conventional commit → version bump mapping, breaking change protocol (ADR required), pre-release labels (alpha/beta/rc), git tagging rules, version in project manifests, CHANGELOG alignment; former §6.3 renumbered to §6.4 |
| 1.3 | 2026-03-10 | CIO + Claude | §6.3 updated: AI Agent as Version Lifecycle Manager paragraph now references P-09 Release & Version Engineer persona (Rule 11, auto-activates) |
