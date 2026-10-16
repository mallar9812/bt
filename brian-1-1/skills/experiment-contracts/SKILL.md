---
name: experiment-contracts
description: "Reference-only contracts for BRIAN experiment reporting: InvestigationPlan v1 (a structured, query-free investigation plan with confirmed vs inferred facts and evidence) and CapabilityResult v1 (a common versioned envelope for experiment analysis results: identity, comparison, metric, population, date basis, values, raw statistics, observations, PAB status and provenance), plus compatibility and versioning rules. Load only when experiment-master, a report generator or a spec reader needs these definitions. It answers no analytics question, runs no query and computes nothing."
---

# Experiment contracts

Shared, versioned interfaces between three separate responsibilities:

`Spec Reader → InvestigationPlan → analysis capabilities → CapabilityResult → Report Generator`

| Contract | File | Produced by | Consumed by |
|---|---|---|---|
| `investigation-plan` 1.0 | `references/investigation-plan.md` | a spec reader or the user | experiment-master (only user-confirmed, covered questions) and a report generator |
| `capability-result` 1.0 | `references/capability-result.md` | an analysis capability, or an adapter over an existing response | a report generator |
| `summary-combination` 1.0 | `references/capability-result.md` § New/Old combination | a report generator, from existing results only | a report generator |

Compatibility, versioning and failure handling: `references/compatibility.md`. Version history:
`references/changelog.md`.

## What these contracts never do

- They define shapes and rules only. Nothing here runs a query, a statistical test, a PAB check or a
  classification, and nothing here changes the methodology, routing, budgets or outputs of
  `experiment-master`, its analysis files, `references/analysis-contract.md` or `brian-master`.
- A value that a producer did not return is carried as unavailable with its status (never as zero, never
  guessed). A plan field the spec does not state is `MISSING`, never a fact.
- A raw p-value, a confidence interval, a PAB confidence and statistical power are four different fields
  and are never merged, converted or relabelled. No reliability score is defined.
