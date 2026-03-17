# Application Documentation Governance Kit

---

## The Development Hierarchy

Every piece of work follows this sequence. No exceptions.

```
Business Requirment Documentation (BRD)
       ↓
Product requirement documentation-PRD( feature desc)
       ↓
Solution Document/ detailed architecture (TRD)
       ↓
Features Schedule & Definition
       ↓
Feature Spec (documented, approved)
       ↓
ADR (for every critical architectural decision the feature requires)
       ↓
Implementation
       ↓
Full Scope Testing
       ↓
Deployment to Repo(Git)
```

**Every project needs to be well documented allowing clear understand of Features.** ADRs are not standalone planning documents — they exist to explain and justify the critical architectural decisions made *in service of a defined feature*. We do not write an ADR speculatively. ADRs are written because a feature spec surfaced a decision that needed to be recorded.

---

## The Three Rules & Document Organisation Plan

1. **No feature is built without an approved spec.**
2. **No ADR is written without a parent feature spec.**
3. **No implementation begins without the spec and all required ADRs approved.**
4. For every project, application documentation governance docs are found in `/governance-docs` while the BRD is found in `/dev-project-docs` The PRD when created shall always be found in: `/dev-project-docs` 
5. The solution document when created must be places inside:
   
    `/docs/solution-doc-architecture.md`
   
   The solution-doc-architecture document should contain or be created with schemas always

---

## 1. Feature Spec Template

Feature specs are the starting point. Write the spec first. Identify which architectural decisions it requires. Then write those ADRs.

**Location**

```
docs/specs/feature-name.md
```

```md
# Feature Specification: [Feature Name]

## Overview
What problem this feature solves and why it matters now.

---

## User Flow
Step by step from trigger to outcome. Be specific.

---

## Scope
What is included. What is explicitly excluded.

---

## Functional Requirements
Clear, testable statements. Each requirement must be independently verifiable.

---

## Non-Functional Requirements
Performance, reliability, security, compliance constraints.

---

## Data and State Changes
What data is created, read, updated, or deleted. Which services own each piece.

---

## Architectural Decisions Required
List every decision this feature introduces that needs an ADR.
For each item, note whether the ADR exists or needs to be written.

| Decision | ADR | Status |
|----------|-----|--------|
| e.g. Choice of image hashing algorithm | ADR-20260219-Image-Forensics-Pipeline | Accepted |
| e.g. Fraud score aggregation strategy | To be written | Pending |

If no ADRs are required, state why explicitly.

---

## Risks and Edge Cases
Failure scenarios and how they are handled.

---

## Rollback Plan
How this feature is safely disabled or reverted if it causes issues in production.
```

**Rule**
A feature spec with unresolved ADR entries (status: Pending) cannot move to implementation.

---

## 2. ADR Template

ADRs explain and justify the critical architectural decisions that a feature requires. One decision per ADR. One page maximum.

**Location**

```
docs/adrs/ADR-YYYYMMDD-Short-Title.md
```

**Header**

```
Status:         Proposed | Accepted | Superseded
Date:           YYYY-MM-DD
Parent Feature: Link to the feature spec that triggered this ADR
Decision Owner: Cell Lead or Senior Engineer
Approved By:    Head of Product Engineering
```

**Body**

```md
## 1. Context
What problem triggered this decision.
Include constraints: scale, security, compliance, cost, timeline.
Reference the parent feature spec.

---

## 2. Decision
What we are doing. One or two clear sentences.

---

## 3. Options Considered
- Option A
- Option B
- Option C
Short bullets. No essays.

---

## 4. Rationale
Why this option was chosen.
Include tradeoffs and risks we accept.

---

## 5. Consequences
What this decision enables and what it limits.
Call out long-term costs explicitly.

---

## 6. Security and Risk Notes
Data sensitivity, failure modes, abuse cases, recovery assumptions.

---

## 7. Review Triggers
When this ADR must be revisited.
Example: volume > 10x, new regulatory rule, new region, model drift.
```

That is it. One page. No more.

---

## 3. When an ADR Is Mandatory vs Optional

These triggers are evaluated during feature spec review, not after. If a feature spec introduces any mandatory trigger, the ADR must be written and approved before implementation begins.

### Mandatory

Any of the following is true:

- Money movement is involved
- Identity or PII is touched
- Architecture or data ownership changes
- Cross-service or cross-cell integration is introduced
- Retry, concurrency, or idempotency logic changes
- Infra or deployment strategy changes
- Security boundaries change
- A new external dependency is added (API, library, service)
- An ML model or scoring algorithm is selected or changed
- A workaround becomes permanent

If in doubt, write an ADR.

### Optional

All of the following are true:

- Change is internal to a single service
- No data model changes
- No risk profile change
- No long-term constraint introduced
- Easy to reverse

Examples: UI layout tweaks, refactoring without behavior change, test improvements, minor performance tuning.

Optional does not mean discouraged. It means not required.

---

## 4. Lifecycle Rules

```
Feature Spec Written
       ↓
ADRs identified in spec (mandatory triggers reviewed)
       ↓
ADRs drafted (status: Proposed)
       ↓
ADRs reviewed and approved by HoPE (status: Accepted)
       ↓
Implementation begins
       ↓
If a decision is later reversed → new ADR created (status: Superseded)
```

- Feature spec approval is a prerequisite for writing ADRs
- ADR approval is a prerequisite for implementation
- Drafts (status: Proposed) are acceptable to unblock parallel review work
- Superseded ADRs are never deleted — the new ADR must reference the old one
- This creates a visible, auditable decision history

---

## 5. PR Template

**Location**

```
.github/pull_request_template.md
```

```md
## Summary
Brief description of what this PR does.

---

## Linked Artifacts

### Feature Spec
- Spec link: [required — no PR without a spec]

### Architecture Decision Records
List all ADRs relevant to this change.
- ADR link:

If no ADR was required, state the justification:

---

## Risk and Impact
- Touches PII, money, or security boundary: Yes / No
- Potential failure modes:
- Rollback plan:

---

## Agent Review Summary
Paste Claude ADR review output here (if ADR was written or changed).

---

## Test Report

**This section is mandatory. PRs without a passing test report will not be approved.**

- Test suite run: Yes / No
- All tests passing: Yes / No
- Coverage report: [attach or link]
- Coverage — general code: __%  (minimum 80%)
- Coverage — money/auth/PII: __ % (must be 100%)

> If tests are not passing or coverage thresholds are not met, do not submit this PR for review. Fix the failures first. Bypassing this gate requires a deviation log entry in `/docs/deviations/`.

---

## Verification
- [ ] Tests added or updated
- [ ] Test suite run — all passing
- [ ] Coverage meets thresholds (80% general, 100% money/auth/PII)
- [ ] Test report attached or linked above
- [ ] Edge cases considered
- [ ] Observability updated where needed

---

## Approvals
- Cell Lead:
- HoPE:
```

**Rules**
- PRs without a linked feature spec cannot be merged.
- PRs with mandatory ADR triggers and no ADR link cannot be merged.
- PRs without a passing test report and coverage summary cannot be merged.
- Violations of any of the above must be recorded in `/docs/deviations/` before the deviation is permitted.

---

## 6. Claude Agent Prompt for ADR Review

Use this as the system prompt for your ADR review agent. Run it before requesting HoPE approval.

```
You are an Architecture Review Agent.

Your task is to review the provided Architecture Decision Record (ADR).

First, confirm the ADR has a parent feature spec referenced in its Context or header.
If no feature spec is referenced, flag this immediately — the ADR is incomplete.

Then check for:
1. Clear problem context tied to a specific feature requirement
2. Explicit decision statement
3. Viable alternatives considered
4. Sound rationale and accepted tradeoffs
5. Clear consequences and long-term impact
6. Security and risk awareness
7. Operational and rollback considerations

Flag:
- Missing parent feature spec reference
- Hidden assumptions
- Missing risks
- Over-reliance on manual processes
- Decisions made without feature context

Respond with:
- Approval or Rework Required
- Bullet list of issues or confirmations
- Specific improvement suggestions

Do not rewrite the ADR unless asked.
Be direct and critical.
```

---

## 7. ADR Examples

### A. Image Forensics Pipeline

**Title**

```
ADR-20260219-Image-Forensics-Pipeline
```

**Header**

```
Status:         Accepted
Date:           2026-02-19
Parent Feature: docs/specs/image-fraud-detection.md
Decision Owner: Cell Lead
Approved By:    Head of Product Engineering
```

**Context**
The image fraud detection feature requires a strategy for detecting reused and manipulated photos submitted with claims. Multiple detection approaches are viable.

**Decision**
Use perceptual hashing for duplicate detection, ELA (Error Level Analysis) for manipulation detection, and EXIF metadata inspection for timestamp/GPS validation — all processed via OpenCV and Pillow.

**Options Considered**

- Deep learning classifier only (ResNet/ViT)
- Perceptual hashing + ELA + metadata (selected)
- Commercial image forensics API

**Rationale**
The selected approach is interpretable (findings can be shown to claims officers), runs locally without per-call API costs, and requires no model training from scratch.

**Consequences**

- Results are explainable and auditable
- ELA accuracy decreases on heavily re-compressed images
- No external API dependency for core forensics

**Security and Risk Notes**

- Image files are processed in memory; raw paths never exposed
- Results stored with signed URLs, not direct file references

**Review Triggers**

- Fraud rate rises despite clean ELA scores (model evasion detected)
- Regulatory requirement for certified forensics tools

---

### B. Interpretable ML for Fraud Scoring

**Title**

```
ADR-20260219-Interpretable-ML-Fraud-Scoring
```

**Header**

```
Status:         Accepted
Date:           2026-02-19
Parent Feature: docs/specs/behavioral-fraud-scoring.md
Decision Owner: Cell Lead
Approved By:    Head of Product Engineering
```

**Context**
The behavioral fraud scoring feature requires a model that produces a fraud probability score from claim history, timing patterns, and agent behavior data. Claims officers must be able to understand and defend decisions based on model output.

**Decision**
Use XGBoost or Random Forest for fraud scoring, with SHAP values surfaced alongside every score.

**Options Considered**

- Deep neural network (high accuracy, not interpretable)
- XGBoost/Random Forest with SHAP (selected)
- Rule-based scoring only

**Rationale**
Claims officers need to understand why a claim was flagged. Black-box models create liability and reduce trust in the system. SHAP values make every score auditable.

**Consequences**

- Officers can explain and defend decisions
- Slight accuracy trade-off vs. deep learning
- Model retraining is straightforward

**Security and Risk Notes**

- Model outputs are audit-logged per claim
- Model versions are tracked; new versions deploy in shadow mode before activation

**Review Triggers**

- Model drift detected via monitoring
- Regulatory audit requiring explainability evidence

---

### C. Versioned Risk Model Deployment

**Title**

```
ADR-20260219-Versioned-Risk-Model-Deployment
```

**Header**

```
Status:         Accepted
Date:           2026-02-19
Parent Feature: docs/specs/behavioral-fraud-scoring.md
Decision Owner: Cell Lead
Approved By:    Head of Product Engineering
```

**Context**
Risk model updates can unintentionally block valid claims or change fraud thresholds without visibility. Discovered during spec review for the behavioral fraud scoring feature.

**Decision**
All risk models must be versioned and deployed in shadow mode before activation.

**Options Considered**

- Immediate replacement
- Feature flag switching
- Shadow deployment (selected)

**Rationale**
Shadow mode allows direct comparison of old and new model outputs on live data without customer impact.

**Consequences**

- Higher confidence in every model update
- Increased infra cost during shadow period

**Security and Risk Notes**

- Prevents silent mass failures
- Requires monitoring dashboard to compare shadow vs. active scores

**Review Triggers**

- Model drift
- Regulatory review
- Volume > 10x current baseline

---

## 8. ISO 27001 Alignment

The Feature → ADR → Implementation workflow satisfies multiple ISO 27001 controls without additional documentation overhead.

| Control                          | How This Workflow Satisfies It                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Change Management**            | Feature specs and ADRs provide evidence of reviewed, approved changes with traceable rationale          |
| **Risk Assessment**              | ADR mandatory triggers force risk identification during feature spec review, before any code is written |
| **Secure System Design**         | ADR Security and Risk Notes field enforces security-by-design on every architectural decision           |
| **Access and Privilege Control** | ADRs capture trust boundary changes and access assumptions, preventing privilege creep                  |
| **Operational Resilience**       | Rollback plans in specs and failure modes in ADRs link directly to incident response                    |
| **Knowledge Management**         | ADRs replace tribal knowledge and verbal rules; decision history survives team changes                  |

---

## 9. How HoPE Enforces This Without Drama

- Feature spec required before any ADR is written
- ADR required for PR merge when mandatory triggers are present
- Claude agent flags missing feature spec references in ADRs
- HoPE reviews decisions, not code
- Exceptions require written justification (which itself becomes a record)

The system enforces discipline, not the person.

---

## 10. Cultural Principles

> "No significant change is real until its decision is written down."

> "Big decisions must survive the people who made them."

> "Features define what we build. ADRs explain how we decided to build it."
