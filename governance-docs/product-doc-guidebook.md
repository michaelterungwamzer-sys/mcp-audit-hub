# The Product Document Guidebook
### A Practical Reference for Digital Product & Innovation Teams

---

## Introduction

Every digital product — whether an API engine, a fintech app, or an AI-powered tool — moves through a lifecycle. At each stage, a specific document captures what needs to be decided, agreed upon, or built. This guide defines each document, explains where it lives in the sequence, and tells you what can be merged versus what must stay separate.

Use this as a shared reference so that every team member — product, engineering, design, legal, or operations — understands what document to produce, when to produce it, and why it matters.

---

## The Master Sequence

```
1. Vision Doc
      ↓
2. BRD (Business Requirements Document)
      ↓
3. PRD (Product Requirements Document)  ← THE MASTER PRODUCT DOC
   [FRD + User Stories live inside here]
      ↓
4. SOW (Statement of Work)  ← only when external vendors are involved
      ↓
5. TAD (Technical Architecture Document)
   [API Spec lives inside here at early stage]
      ↓
6. API Specification  ← graduates to standalone doc at scale
      ↓
7. Sprint Planning / Backlog
      ↓
8. Test Plan / QA Checklist
      ↓
9. Go-To-Market / Launch Plan
      ↓
10. Runbook / SOP
```

> **The simple version for lean teams:**
> `Vision Doc → PRD → TAD + API Spec → Sprint → Test Plan → Runbook`
> The SOW slots in between PRD and TAD only when contractors are involved.

---

## Document-by-Document Reference

---

### 1. Vision Document
**Layer:** Strategy
**Question it answers:** *Why does this product exist?*
**Owner:** Founder / CPO / Head of Product

**What it contains:**
- The problem being solved
- Target audience and market context
- The product idea and value proposition
- Strategic fit with business goals
- High-level success definition

**Key rule:** This is the compass. Every document that follows should be traceable back to the Vision Doc. If a feature cannot be linked to the vision, it probably shouldn't be built.

---

### 2. Business Requirements Document (BRD)
**Layer:** Strategy / Definition
**Question it answers:** *What business rules, compliance needs, and constraints apply?*
**Owner:** Business Analyst / Product Manager

**What it contains:**
- Business objectives and expected outcomes
- Regulatory and compliance requirements (e.g. CBN, NDPR)
- Business process flows
- Stakeholder needs and sign-off requirements
- Constraints (budget, timeline, policy)

**Merge note:** For small teams or early-stage products, the BRD can be embedded as a "Business Rules & Constraints" section inside the PRD. Standalone BRDs are most valuable for regulated products (fintech, health, insurance) where compliance requirements need their own audit trail.

---

### 3. Product Requirements Document (PRD)
**Layer:** Definition
**Question it answers:** *What exactly are we building, for whom, and what must it do?*
**Owner:** Product Manager

This is the **master product document**. Everything upstream (Vision, BRD) feeds into it. Everything downstream (TAD, Sprint, Test Plan) is derived from it.

**What it contains:**

**a. Problem Statement & Objectives**
A clear articulation of the user problem and the business goal this product addresses.

**b. User Personas & Use Cases**
Who are the primary and secondary users? What are their goals, frustrations, and contexts of use?

**c. Functional Requirements** *(replaces the FRD)*
A complete list of what the product must do — organized by feature area or epic. Written as "The system shall…" or "Users must be able to…" statements.

**d. Non-Functional Requirements**
Performance benchmarks, uptime SLAs, security standards, scalability targets, accessibility requirements.

**e. User Stories / Epics** *(replaces the User Story Map)*
Broken-down requirements in the format: *"As a [user], I want to [action], so that [outcome]."* These can also live directly in your project management tool (Jira, Linear, Notion) and be referenced here.

**f. UX Flow Descriptions**
Written descriptions or references to wireframes/prototypes that define the user journey and key screens.

**g. Integrations & Dependencies**
Third-party APIs, internal services, data sources, and platforms this product connects to.

**h. Acceptance Criteria**
The specific, testable conditions that must be true for a feature to be considered complete and approved.

**i. Out-of-Scope Items**
An explicit list of what is NOT being built in this version — prevents scope creep.

**j. Assumptions & Open Questions**
Known unknowns that need resolution before or during development.

**k. Success Metrics (KPIs)**
How will product and business measure whether this was built successfully?

**Merge note:** The FRD and User Story Map are not separate documents — they are sections inside the PRD. Treating them as separate documents is a legacy enterprise habit that slows modern teams down.

---

### 4. Statement of Work (SOW)
**Layer:** Execution (Contractual)
**Question it answers:** *What are the delivery terms, timeline, and cost?*
**Owner:** Legal / Project Manager / Procurement

**What it contains:**
- Scope of work and specific deliverables
- Project milestones and delivery timeline
- Pricing, payment schedule, and billing terms
- Roles and responsibilities (client vs. vendor)
- Acceptance criteria (often references the PRD)
- Change management process (how scope changes are handled)
- IP ownership, confidentiality, and legal terms

**Key rule:** The SOW is a **legal contract** — it must never be merged with any product or technical document. The PRD defines *what* is being built; the SOW defines *the terms under which* it will be built. Always finalize the PRD before signing an SOW — vague SOWs without a clear PRD are the leading cause of scope disputes.

**When it appears:** Only when external vendors, agencies, or contractors are involved. Internal teams typically use a Sprint Plan or project brief instead.

---

### 5. Technical Architecture Document (TAD)
**Layer:** Execution (Technical)
**Question it answers:** *How will we build it? What stack, infrastructure, and patterns will be used?*
**Owner:** Lead Engineer / Solutions Architect

**What it contains:**
- System architecture diagrams (e.g. component, sequence, deployment diagrams)
- Technology stack decisions and rationale
- Database schema / Entity Relationship Diagrams (ERDs)
- Infrastructure design (cloud services, environments, CI/CD pipeline)
- Security architecture
- API Specification *(at early stage — graduates to standalone doc at scale)*
- Third-party service integration design
- Scalability and failover strategy

**Key rule:** The TAD is written *after* the PRD — it translates product requirements into engineering decisions. Never merge the TAD with the PRD. One defines *what* to build; the other defines *how* to build it.

---

### 6. API Specification
**Layer:** Execution (Technical)
**Question it answers:** *What are the exact endpoints, request/response contracts, and integration rules?*
**Owner:** Backend Lead / API Designer

**What it contains:**
- All API endpoints with HTTP methods
- Request parameters, headers, and body schemas
- Response payloads and status codes
- Authentication and authorization model
- Rate limiting and error handling
- Versioning strategy
- Sample requests and responses

**Tools:** OpenAPI / Swagger, Postman Collections, Redoc

**Merge note:** At early stage, the API Spec lives as a section inside the TAD. Once the product has multiple consumers (external developers, partners, mobile apps), it graduates to its own standalone document and developer portal.

---

### 7. Sprint Plan / Product Backlog
**Layer:** Execution (Delivery)
**Question it answers:** *What are we building in this cycle, and in what priority?*
**Owner:** Scrum Master / Product Manager
**Tool:** Jira, Linear, Trello, Notion

**What it contains:**
- Prioritized list of user stories and tasks (the backlog)
- Sprint goal and selected stories for the current sprint
- Story point estimates
- Definition of Done (DoD) for the sprint
- Assigned owners per task

**Key rule:** The backlog is a *living artifact*, not a static document. User stories in the PRD are the source; the backlog is where they are broken down, estimated, and scheduled.

---

### 8. Test Plan / QA Checklist
**Layer:** Execution (Quality)
**Question it answers:** *How do we verify that every requirement was actually met?*
**Owner:** QA Lead / Engineering Lead

**What it contains:**
- Test scope (what will and won't be tested)
- Test types: unit, integration, UAT, regression, performance, security
- Test cases mapped to PRD acceptance criteria
- Test environment setup
- Entry and exit criteria
- Bug severity classification
- Sign-off process

**Key rule:** The Test Plan references the PRD acceptance criteria as its source of truth. If a requirement is in the PRD but has no test case, it's at risk.

---

### 9. Go-To-Market (GTM) / Launch Plan
**Layer:** Delivery
**Question it answers:** *How do we release this product and communicate it to the market?*
**Owner:** Product + Marketing / Growth

**What it contains:**
- Launch objectives and target audience
- Pricing and packaging
- Distribution and acquisition channels
- Messaging and positioning
- Launch timeline and phased rollout plan
- Internal enablement (sales, support training)
- Success metrics for launch

---

### 10. Runbook / Standard Operating Procedure (SOP)
**Layer:** Operations
**Question it answers:** *How do we operate, monitor, and support this product in production?*
**Owner:** DevOps / Engineering Lead / Support

**What it contains:**
- System monitoring setup and alerting rules
- Incident response procedures and escalation paths
- Deployment and rollback procedures
- Backup and disaster recovery plan
- Common error codes and resolution steps
- On-call schedule and contacts
- Routine maintenance tasks

**Key rule:** The Runbook is written *before* go-live, not after the first incident. It is a living document updated with every new finding in production.

---

## Document Merge Reference

| Document | Can Merge Into | Condition |
|---|---|---|
| BRD | PRD | Small teams, non-regulated products |
| FRD | PRD | Always — it's a section, not a separate doc |
| User Story Map | PRD + Backlog | Stories live in PRD, execution in Jira/Linear |
| API Spec | TAD | Early-stage only; standalone once external-facing |
| GTM Plan | PRD (as a section) | Only for very small, internal launches |

| Document | Must Stay Separate | Reason |
|---|---|---|
| SOW | Always | Legal contract — merging creates liability risk |
| TAD | Always | Defines "how"; PRD defines "what" — must not mix |
| Test Plan | Always | Must independently verify PRD requirements |
| Runbook | Always | Different audience, lifecycle, and update cadence |

---

## Quick Reference: Who Does What

| Document | Primary Owner | Key Contributors |
|---|---|---|
| Vision Doc | Founder / CPO | All senior stakeholders |
| BRD | Business Analyst / PM | Legal, Compliance, Finance |
| PRD | Product Manager | Design, Engineering, Business |
| SOW | Legal / Project Manager | Finance, Vendor, PM |
| TAD | Lead Engineer / Architect | All engineers |
| API Spec | Backend Lead | Frontend, Partners |
| Sprint Plan | Scrum Master / PM | Full delivery team |
| Test Plan | QA Lead | Engineering, PM |
| GTM Plan | Product + Marketing | Sales, Support |
| Runbook | DevOps / Eng Lead | Support, On-call team |

---

## The Cardinal Rules

1. **Never write a SOW without a completed PRD.** The PRD is the scope. The SOW is the contract around that scope. Getting this backwards is the number one cause of delivery disputes.

2. **The PRD is the master document.** Every engineer, designer, and QA engineer should be able to trace their work back to a requirement in the PRD.

3. **Merge lean, separate when it matters.** Small teams should merge aggressively to move fast. As the product scales — especially when external developers, regulators, or legal parties are involved — graduate documents to standalone artifacts.

4. **Documents are living artifacts.** A PRD that was written and never updated is a liability. Version your documents, log changes, and ensure the team always works from the latest version.

5. **Acceptance criteria connect the PRD to the Test Plan.** If it isn't in the acceptance criteria, it won't be tested. If it isn't tested, it can't be approved.

---

*This guide is maintained by the Product & Innovation team. Update when processes evolve.*
