# Compatibility, versioning and failure handling

Applies to `investigation-plan`, `capability-result` and `summary-combination`.

## Versions

- A version is `MAJOR.MINOR`. A consumer declares the majors it supports; this release supports major
  `1` of all three contracts.
- **Same major, same or lower minor:** accepted.
- **Same major, higher minor:** accepted. Fields the consumer does not know are ignored and listed as
  unrecognised (a minor version only adds optional fields).
- **Different major, or a malformed version:** rejected as `INCOMPATIBLE_VERSION`. The consumer does
  not reinterpret the content.
- **Wrong or missing `contract.name`:** rejected as `WRONG_CONTRACT`.

## Field handling

| Situation | Consumer behaviour |
|---|---|
| Missing REQUIRED field | Reject the document as `INVALID: MISSING_REQUIRED <field>`. Show it as unusable, with the reason. Never fill it in. |
| Missing CONDITIONAL field whose condition holds | Same as a missing REQUIRED field |
| A `CONDITIONAL(result_kind=…)` field present for another result kind (e.g. statistics on a `NOT_RUN` or `DESCRIPTIVE` result) | Reject as `INVALID: FIELD_NOT_ALLOWED_FOR_KIND <field>` |
| Missing OPTIONAL field | Treat as `NOT_RETURNED` |
| Unknown field | Ignore it and list it as unrecognised. Never interpret it. |
| Reserved field (`reliability_score`, `confidence_pct`, `confidence_percent`, `significance`, `verdict`) | Reject as `INVALID: RESERVED_FIELD <field>` |
| `Avail` with `value` but status ≠ `AVAILABLE`, or `AVAILABLE` without `value` | Reject as `INVALID: AVAILABILITY_MISMATCH <field>` |
| `Fact` with `MISSING` and a value, `CONFIRMED` without evidence, `INFERRED` without a note, `CORRECTED` without the earlier value | Reject as `INVALID: FACT_BASIS <field>` |
| `pab.daily_trend_available` true without a `pab.observations` series for both compared groups | Reject as `INVALID: PAB_TREND_WITHOUT_OBSERVATIONS` |
| `pab.excluded_days` entry without a reason or a `source_ref` | Reject as `INVALID: EXCLUSION_WITHOUT_SOURCE` |
| `observations` count ≠ `statistics.n_pairs` | Accept the result, but treat the series as unusable: summary only, never a chart (existing fallback) |
| `summary-combination` `final_delta_pct` `AVAILABLE` while a rule in `capability-result.md` § New/Old combination does not hold | Reject as `INVALID: COMBINATION_INPUTS <rule>` |
| A weight definition or unit-comparability basis that is not in § Approved definitions, in a `PRODUCTION` document | Reject as `INVALID: UNAPPROVED_DEFINITION <field>` |
| `approved_by: "SYNTHETIC"` in a `PRODUCTION` document | Reject as `INVALID: UNAPPROVED_DEFINITION <field>` |
| A component result missing, or not matching the combination | Reject as `INVALID: COMBINATION_INCOMPATIBLE <field>` |
| A `SYNTHETIC_FIXTURE` combination offered for rendering | Reject as `INVALID: SYNTHETIC_NOT_RENDERABLE` |
| InvestigationPlan with `execution.queries_executed` ≠ 0 | Reject as `INVALID: PLAN_EXECUTED_QUERIES` |

## Approved definitions

Production combinations may only cite entries listed here. Adding an entry needs:
- the user's explicit approval;
- a source reference (the approved methodology document);
- a changelog entry.

| Kind | `id` | Approved by | Source | Status |
|---|---|---|---|---|
| New/Old contribution weight | — | — | — | none approved (UNRESOLVED) |
| Unit-comparability basis (raw delta vs PAB-adjusted delta) | — | — | — | none approved (UNRESOLVED) |

## Combining and comparing results

Two CapabilityResults are **compatible** (may share a table row group, a chart or a combination) only
when all of these are equal:
- `result_kind`;
- `metric.id` and `metric.definition_ref`;
- `comparison.pair_id`;
- `experiment.exp_id` and `experiment.version`;
- `population`, except `user_type` in a New/Old combination;
- `window.analysis`, `window.date_basis` and `window.observation_unit`.

Results that differ are shown separately, with the differing field named (e.g. "different date basis").
They are never pooled or averaged.

## Not enough evidence for a requested output

When an output needs something a result does not carry, the consumer gives that output the input's
status and names it. Examples:
- a chart needs `observations`;
- a trend needs `pab.observations`;
- a combination needs an approved weight.

Examples of what the consumer then shows: "daily series not returned", "PAB not run", "weight
definition unresolved". It never substitutes zero, a pooled value spread over days, or a guessed value.
