# ADR-20260317-Security-Scoring-Algorithm

**Status**: Proposed
**Date**: 2026-03-17
**Decision Owner**: P-02 Solution Architect (Claude Opus 4.6)
**Approved By**: Pending — Project Owner

---

## Context

MCP-Audit needs a scoring algorithm to aggregate findings from multiple analyzers into a single security score (0–100) and classification (PASS/WARN/FAIL). The algorithm must be:

- **Deterministic and reproducible** — same findings always produce the same score
- **Explainable** — users need to understand why they got their score
- **Configurable** — severity weights tuneable per organisation
- **Extensible** — must support future chain-aware scoring without rewriting the module

Per the PRD Scoring Strategy Roadmap (Section 4.6), scoring evolves across 4 phases:

| Phase | Version | Approach |
|-------|---------|----------|
| 1 | v0.1 | Weighted sum |
| 2 | v0.1.x | Co-location multiplier (1.5×) |
| 3 | v0.2 | Markov chain scoring (optional mode) |
| 4 | v0.3+ | Markov chain as default |

**This ADR covers Phase 1 (v0.1) and Phase 2 (v0.1.x).** A separate ADR is mandatory for Markov chain scoring (v0.2) per Rule 3 — ML/AI scoring algorithm selection.

---

## Decision

Implement a **deterministic weighted-sum scoring algorithm** for v0.1, with a **co-location multiplier** extension in v0.1.x.

### Phase 1 — Weighted Sum (v0.1)

```
score = max(0, 100 - Σ(severity_weight × finding_count_per_severity))
```

| Severity | Weight |
|----------|--------|
| critical | 25 |
| high | 15 |
| medium | 5 |
| low | 1 |

**Classification thresholds:**

| Condition | Classification |
|-----------|---------------|
| score < 40 | FAIL |
| Any critical findings present (regardless of score) | WARN |
| score ≥ 70 AND no critical findings | PASS |
| score ≥ 40 AND score < 70 | WARN |

**Evaluation order matters:** check `score < 40` FIRST (→ FAIL), then check for criticals (→ WARN), then check `score ≥ 70` (→ PASS), else WARN.

### Phase 2 — Co-location Multiplier (v0.1.x)

Findings sharing the same file AND the same function/handler scope receive a **1.5× severity weight multiplier** before summing.

```
effective_weight = base_weight × (co_located ? 1.5 : 1.0)
score = max(0, 100 - Σ effective_weights)
```

Two findings are "co-located" if:
1. Same `filePath`, AND
2. Within the same AST function/handler node (determined by checking if both finding line numbers fall within the same `FunctionDeclaration`, `ArrowFunctionExpression`, or `FunctionExpression` node)

### Implementation — Strategy Pattern

The scoring module must use a **strategy pattern** to support swappable algorithms:

```typescript
interface ScoringStrategy {
    calculate(findings: Finding[]): ScoringResult;
}

interface ScoringResult {
    score: number;           // 0-100
    classification: 'PASS' | 'WARN' | 'FAIL';
    breakdown: SeverityBreakdown;
}

class WeightedSumStrategy implements ScoringStrategy { ... }      // v0.1
class CoLocationStrategy implements ScoringStrategy { ... }       // v0.1.x
// class MarkovChainStrategy implements ScoringStrategy { ... }   // v0.2 — requires ADR
```

---

## Options Considered

### Option 1: Weighted Sum (Selected for v0.1)

- **Pros**:
  - Simple, deterministic, fully explainable ("each critical finding costs 25 points")
  - Users can calculate expected scores manually
  - No training data needed
  - Extensible via weight configuration
  - Fast to implement — hours, not days

- **Cons**:
  - Treats all findings as independent — tool poisoning + injection in the same handler scores identically to two unrelated findings
  - Doesn't reflect real-world exploitability
  - Can be "gamed" by splitting code across many files

### Option 2: CVSS-Based Scoring

- **Pros**:
  - Industry standard; considers exploitability, impact, scope
  - Familiar to security professionals
- **Cons**:
  - Designed for individual vulnerabilities, not aggregated scanner output
  - Requires extensive per-finding metadata (attack vector, complexity, privileges) that static analysis can't reliably determine
  - Overly complex for v0.1
  - Users would need CVSS training to understand scores

### Option 3: Markov Chain Scoring (Deferred to v0.2)

- **Pros**:
  - Models attack chains (tool poisoning → injection → exfiltration)
  - Reflects real-world exploitability
  - Major differentiator — no existing scanner does this
- **Cons**:
  - Requires calibrated transition probability matrix — needs real scan data from v0.1
  - Harder to explain to users
  - Adds ML-adjacent complexity
  - Requires separate ADR per Rule 3 (ML/AI algorithm selection)
- **Note**: Deferred, not rejected. Will be implemented in v0.2 after collecting v0.1 scan data to calibrate the transition matrix

### Option 4: Machine Learning Risk Model

- **Pros**:
  - Could learn complex risk patterns; potentially highest accuracy
- **Cons**:
  - Massive overkill for v0.1
  - Requires labelled training data (doesn't exist yet)
  - Black box — contradicts explainability goal
  - Would add Python/ML dependency or cloud API
  - Violates the 6-week timeline
  - Contradicts the "users can verify their own score" principle

---

## Rationale

The weighted sum is the right algorithm for v0.1 because:

1. **Fully explainable** — users can verify their score by hand: "I have 1 critical (25) + 2 high (30) = 55 points deducted → score = 45"
2. **Zero training data** — works on day one with no calibration period
3. **Extensible** — weights are configurable per organisation; the strategy pattern allows swapping algorithms without changing the aggregator
4. **Co-location multiplier** addresses the biggest weakness (independent scoring) with minimal complexity — compare file paths + AST parent nodes, multiply by 1.5
5. **Foundation for Markov** — real scan data from v0.1 users feeds the transition probability calibration for v0.2

The co-location multiplier (1.5×) was selected over more complex chain detection because:
- Simple to implement (compare file paths + check AST parent function nodes)
- Easy to explain ("findings in the same handler are 50% more severe")
- Captures 80% of the chain-scoring benefit with 10% of the complexity

---

## Consequences

### Positive

- Users can understand and predict their scores
- Zero external dependencies for scoring
- Weights are configurable — organisations can tune to their risk appetite
- Co-location multiplier catches the most dangerous pattern (chained findings in same handler)
- Real scan data from v0.1 users directly feeds Markov scoring calibration in v0.2
- Strategy pattern makes algorithm evolution non-breaking

### Negative

- Two isolated critical findings score identically to two chained critical findings in v0.1 (mitigated by co-location multiplier in v0.1.x)
- Score can reach 0 quickly with many findings (floor at 0 prevents negative scores — this is acceptable)
- Co-location multiplier of 1.5× is a heuristic, not data-derived (will be validated with real scan data)

### Neutral

- Score formula must be documented in `--help` output and README so users can verify
- Allowlisted findings must be removed BEFORE scoring (not after) — allowlisted findings do not affect the score

---

## Security and Risk Notes

- **Scoring logic must have 100% test coverage** (per PRD NFR-10) — this is the highest-integrity code path in the tool
- **Edge case: critical + high score**: a score of 75 with 1 critical is WARN, not PASS — classification checks criticals independently of score threshold
- **Edge case: all findings allowlisted**: score should be 100 (suppressed findings do not contribute to score)
- **Edge case: score exactly 0**: valid — display as "0/100 (FAIL)", do not show negative
- **Scoring must be deterministic**: same findings in any order must produce the same score (sort before processing)

---

## Review Triggers

- When v0.1 scan data is available — validate and potentially calibrate co-location multiplier (currently 1.5×)
- When Markov chain scoring implementation begins — requires its own ADR (Rule 3 mandatory trigger: ML/scoring algorithm)
- If users report that scores don't match their risk perception — may indicate weight adjustment needed
- If a server with known real-world exploitation scores higher than expected (false sense of safety)

---

## ISO 27001 Mapping

- [x] A.5 - Risk Assessment
- [x] A.8.25 - Secure Development
- [x] A.5.37 - Documented Procedures

---

## Related ADRs

- [ADR-20260317-Tech-Stack-Selection](ADR-20260317-Tech-Stack-Selection.md)
- Future: ADR for Markov Chain Scoring (v0.2 — Rule 3 mandatory trigger: ML/scoring algorithm selection)

## References

- PRD Section 4.5: Result Aggregation & Scoring
- PRD Section 4.6: Scoring Strategy Roadmap
- CVSS v3.1 Specification: https://www.first.org/cvss/specification-document
- OWASP Risk Rating Methodology: https://owasp.org/www-community/OWASP_Risk_Rating_Methodology
