# Report templates — default structures for experiment answers

Default structures for the answer the Master returns, including measured reads forwarded by
`analyst-experiment-reads`. A template is chosen from what the Master has already recorded
(`mode.rule_matched`, `depth`, `depth_basis`, the selected capabilities and the request's
`segment_ref`). It never re-routes a request, changes a mode or depth, adds a capability, or changes a
rule in `output-format.md`, `master-state.md` or the analysis files. SR-15 (order), SR-23 (prose
ceilings), SR-24 (each number once in prose) and SR-26 (absent conditional sections) govern every
template, and `output-format.md` wins any disagreement.

## Selection

First match, top to bottom.

| # | Recorded condition | Structure |
|---|---|---|
| 1 | A special state that `output-format.md` formats on its own: segment pending, the retention clarification, a design `UNRESOLVED` clarification, `NO_CAPABILITY` only, or a stream-origin run stopped at `PHASE_CEILING` | that existing format, unchanged; the Experiment Card opens it when an experiment is resolved |
| 2 | Every selected unit is `NO_COMPARISON` (single variant) | the `NO_COMPARISON` format of `output-format.md` § Special states, opened by the Experiment Card |
| 3 | `PERIOD_IMPACT_ANALYSIS` | C — PERIOD Impact Read |
| 4 | `FULL_EXPERIMENT_READ` | A — Standard Experiment Read |
| 5 | `TARGETED_DIAGNOSIS`, depth D3, exactly one selected capability and no `segment_ref` | D — Metric Investigation |
| 6 | `TARGETED_DIAGNOSIS`, any other | B — Targeted Diagnosis |

- Selection reads only recorded state; the request's wording never selects a template directly.
- A request mixing units of several states takes the template of its mode; each unit inside it keeps
  its own special-state wording.
- Annotation questions ("what experiments are live", "ramp history") are answered by
  `analyst-experiment-reads` in annotation mode and use none of these templates.
- A stream-origin answer keeps its lens presentation (`output-format.md`) inside the template and is
  returned to `brian-master` for synthesis.

## Shared rules

- **Order.** Every template follows SR-15: period & segment line (preceded by the Experiment Card),
  visuals, bottom line, supporting data, next question. Template sections are placed in those slots;
  they never add a slot.
- **Prose.** Sections beyond the bottom line are carried by tables, cards and charts, which do not count
  against SR-23. The prose ceiling is that of the depth run (D2 150 words, D3 300 words); content is
  never cut to meet it, prose is.
- **Absent sections.** A section with no supporting evidence for the request is left out with no
  placeholder (SR-26). Leaving out a section never hides a state: every `NOT_ESTABLISHED`,
  `INSUFFICIENT_DATA`, `INSUFFICIENT_EVIDENCE`, `NOT_TESTED`, `NOT_RUN`, `NOT_IN_TABLE`,
  `NOT_COMPARABLE`, `UNSUPPORTED`, `UNSUPPORTED_FOR_SCOPE` and `NO_SCOPED_EXPOSURE` item is still named
  where `output-format.md` requires it.
- **Missing, immature, unsupported and inconclusive evidence** is worded as `output-format.md` words
  it — never as zero, "no movement" or a negative result. An immature window is stated with its matured
  cutoff.
- **Charts** are requested through `visual_requirements` and rendered from `VisualEvidence`
  (`visual-evidence.md`). A section that needs a chart refers to it by its `visual_id` and carries one
  insight heading; the legend and figures are never restated as prose.
- **Results** are reported per unit and pair, never pooled, with each result's point estimate and CI
  first, then its meaningfulness classification, exactly as `output-format.md` § Results and
  meaningfulness requires.

## Experiment Card

The structured metadata block that opens every experiment answer once an experiment is resolved. It is
the entry and metadata structure of an experiment read; it never replaces the analysis. One card per
experiment; a card lists each selected version on its own row.

| Field | Required | Source | When absent | User-editable |
|---|---|---|---|---|
| Experiment (name and `exp_id`) | required | context resolution (`context-schema.md` `experiment`, `units[].exp_id`) | the existing clarification rule; no card is shown before resolution | no — a different experiment is a new request |
| Game and platform (`gid`, `cli`) | required | `ps-entities`; `exp_id` carries the platform | as above | no — as above |
| Version(s) | required | `versions[]` with `selection_basis`; earlier versions listed when the latest was selected without a period | not applicable: a unit always has a version | no — a different version is a new request input (`version_ref`) |
| Experiment active window | required | `versions[].first_active_day` / `last_active_day` (observed activity, labelled "observed") | "not available" | no |
| Analysis window | required | `units[].windows.analysis_window` with its basis | "not available" | no — a different period is a new request input (`period_ref`) |
| Design and comparisons | required | `design.classification`, `comparisons[]` with their comparison labels | "no comparison" (`NO_COMPARISON`) | no |
| Allocation | conditional: shown when annotations document it | annotation ramps (`ramp_events[]`), each with its basis; PERIOD lifecycle allocation events | "allocation not documented in annotations" (absence of an annotation is not evidence) | no |
| Status | required | `annotation_status` with its basis; PERIOD `end_type` per version | "unknown" | no |
| Scope | required | the canonical scope (lens `L1`) with value-group expansions, or "overall" | "overall" | no — a different segment is a new request input (`segment_ref`) |
| Population | conditional: shown in the dashboard card | the scope and the new-user share of DAU-days from the stored results | omitted | no |
| Meaningfulness line | required | `stats_config` (`meaningful_line_pct`, `meaningful_line_bps`, `conf_bar`) or the user-stated threshold, with its source: "1% line, 10 bps for retention, Conf above 85%" | the default line | no — a user-stated threshold is a new request input (`threshold_refs`) |
| PAB window | conditional: shown when PAB ran (every read of a PAB-capable capability) | the PAB window the capability returned (first and last day, number of days) | omitted | no |
| Objective, specification link, owner, minimum build | optional | user-provided in this conversation only; BRIAN has no source for them | omitted | yes — stated by the user, shown as given and labelled "user-provided" |
| Primary metric | optional | the metric the user named as primary in this conversation (`report-templates.md` § A), else the metric inferred from the test type (`evidence-selection.md` § Primary metric) | omitted | yes — labelled "user-provided", "inferred from the test type" or "assumed"; it only chooses which result is read first |
| Intended direction per metric | optional | user-provided in this conversation only (`adapter.md` `metric.intended_direction` stays `UNRESOLVED` without it) | omitted | yes — labelled "user-provided"; it never sets a result's `direction` or colour |
| Guardrail metrics | optional | the metrics the user named as guardrails in this conversation (`input-resolution.md` I3) | omitted | yes — labelled "user-provided"; it never changes a result's tier, `direction` or colour |
| Link to the read | — | the read is this answer; no stored link exists | — | — |

- **Prefill only from a trusted source.** A field is filled only from the sources in the table. No
  other source is read and no value is guessed, defaulted, or carried over from another experiment.
- **Confirmed vs user-provided.** Every user-provided value is labelled "user-provided". A user-provided
  value never fills or replaces a confirmed field.
- **Identity, scope and windows are never edited through the card.** A user value for the experiment,
  game, platform, version, period or segment is a new request input, handled by the Master's existing
  input extraction and routing. It is never written into the card in place of the resolved value; when
  it conflicts, both are shown and the resolved value is the one analysed.
- **Validation.** Dates are full dates with the year. `cli` is a `ps-entities` platform code. A version
  is an opaque string compared exactly, never parsed or ordered. A link is shown exactly as given and
  never opened. A user value that fails validation is shown as given, labelled "not validated", and
  used nowhere.
- **Persistence.** The card exists only in this answer. BRIAN keeps no record of it between
  conversations, and the answer never claims that metadata was saved.
- **Extensibility.** A new field is added as a row with its requirement, source, absent behaviour and
  editability. A field with no trusted source is user-provided only.
- **Missing inputs.** An optional row with no user-provided value is omitted. The one optional
  follow-up that asks for missing inputs, and the line that records those left unanswered, are defined
  in `input-resolution.md`; neither blocks or reorders the answer.

## A — Standard Experiment Read (FULL_EXPERIMENT_READ, D3)

| Section | SR-15 slot | Required |
|---|---|---|
| Experiment Card | before the period & segment line | always |
| Setup and windows: design, comparisons, analysis and matured windows, scope | period & segment line | always |
| Charts: the FULL / D3 set of `visual-evidence.md` | visuals | always (SR-22) |
| Outcome summary: per unit and pair, the meaningfulness classifications of the results and the annotation status — the recommendation is goal-conditional, never an order to ship or kill | bottom line | always |
| Primary metric outcomes: the metrics the user named as primary (or success / guardrail) in this conversation, as returned | supporting data (table) | when the user named any |
| Supporting metric outcomes: the headline table — the Tier 1 and Tier 2 results (`evidence-selection.md`), one row per result — and one line with the count of Tier 3 and Tier 4 results held in the detailed read | supporting data (table) | always |
| Guardrails line: the Tier 3 results by name ("held: …") | bottom line | when any exists |
| Named guardrails line: the guardrail metrics the user named, each with its Read word and no number | bottom line | when the user named any |
| Key positive and negative movements: results with an established direction | bottom line | when any exists |
| Evidence quality and limitations: data conditions, maturity, `UNCONFIRMED` definitions, `NOT_TESTED` work | supporting data | when any exists |
| Next question; carries the one optional input follow-up of `input-resolution.md` when a material input is missing | next question | per SR-26 |

No metric is ranked as primary unless the user named it; with none named, every result is a supporting
row. Completeness without duplication: every result appears exactly once, as one row of the results
tables of the detailed read (priority rows, then the order of `evidence-selection.md`); the high-level
read shows the Tier 1 and Tier 2 rows and states the count of Tier 3 and Tier 4 results it holds back,
with the detailed read as the record. Charts carry only the depth-floor visuals and
the Master's chosen ones; the bottom line cites conclusions, not the table's figures.

## B — Targeted Diagnosis (TARGETED_DIAGNOSIS, D2; D3 when raised by depth language or override)

| Section | SR-15 slot | Required |
|---|---|---|
| Experiment Card | before the period & segment line | always |
| Requested metric and exact scope, with every value-group expansion | period & segment line | always |
| Movement of the requested metric, per unit and pair, with its CI and classification | bottom line | always |
| Where it moved: the contributors the capability's Stage 2 returned | visuals and supporting data | when Stage 2 returned any |
| Cohort and segment findings | supporting data | when returned |
| Supporting charts: the TARGETED set of `visual-evidence.md` | visuals | always (SR-22) |
| Established vs not established: which findings have an established direction, which are `NOT_ESTABLISHED` or insufficient | bottom line | always |
| At D3: mix-shift, evidence timeline and the association-only hypothesis table (`master-state.md` § Stages and depth) | visuals and supporting data | when produced |
| Next question or offered further investigation | next question | per SR-26 |

A targeted answer reports only the requested capabilities and any partner cross-checks that ran. It
carries no full-experiment results table.

## C — PERIOD Impact Read (PERIOD_IMPACT_ANALYSIS)

| Section | SR-15 slot | Required |
|---|---|---|
| Experiment Card, one per candidate experiment shown | before the period & segment line | per candidate |
| Trigger metric, resolved scope, lookback, comparison and impact windows, onset with its basis | period & segment line | always |
| Trigger movement (game level, labelled so) and trigger evidence per unit | bottom line and visuals | always |
| Supporting capability evidence with its movement labels | supporting data | when run |
| Same-axis correlation results, with `NOT_COMPARABLE` evidence listed by name | supporting data | when run |
| Time-series charts: the PERIOD set of `visual-evidence.md` | visuals | always (SR-22) |
| Limitations and unresolved evidence: `NOT_TESTED` / `OUT_OF_BUDGET` units, excluded units, data conditions | supporting data | always when any exists |

The layers stay separate as `output-format.md` § Period impact candidates requires; association is
never worded as cause.

## D — Metric Investigation (TARGETED_DIAGNOSIS, D3, one capability, no segment)

| Section | SR-15 slot | Required |
|---|---|---|
| Experiment Card | before the period & segment line | always |
| Metric definition (from `definition_lock`) and the reference value | period & segment line | always |
| Overall movement per unit and pair, with its CI and classification | bottom line | always |
| Driver breakdown: Stage 2 contributors and Stage 3 mix-shift where returned | visuals and supporting data | when returned |
| Supported cuts and cohorts, each under its parent result | supporting data | when returned |
| Charts: the TARGETED D3 set of `visual-evidence.md` | visuals | always (SR-22) |
| Final diagnosis and evidence strength: established findings, association-only hypotheses with their status | bottom line and supporting data | always |

A metric investigation with no named experiment is a `brian-master` route to an `investigate-*` skill
and uses none of these templates.

## Depth

| Depth | Effect |
|---|---|
| D2 | the template's required sections; Stage 3 sections absent (offered, not run) |
| D3 | adds the D3 sections the run produced: mix-shift, evidence timeline, hypothesis table |

Depth comes from the Master's recorded `depth`; a template never raises or lowers it.
