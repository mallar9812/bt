# InvestigationPlan v1 (`investigation-plan` 1.0)

A structured, proposed investigation for one experiment. It is produced from a spec (by a future spec
reader) or by the user, and it is corrected and confirmed by the user before anything acts on it.
**A plan never executes anything.** It carries no query results, and producing it issues no query.

## Fact — how every extracted value is carried

Every value taken from a spec or a person is a `Fact`, never a bare value:

```
Fact = { basis: CONFIRMED | INFERRED | USER_PROVIDED | CORRECTED | MISSING,
         value?,                       # absent exactly when basis = MISSING
         evidence?: [{quote, location}],   # required when CONFIRMED: the spec text that states it
         inference_note?,              # required when INFERRED: why it was inferred and from what
         corrected_from?: Fact }       # required when CORRECTED: the value it replaced }
```

- `CONFIRMED`: the spec states it; `evidence` quotes the text and where it is.
- `INFERRED`: not stated; reasoned from the spec. Shown as inferred and never treated as confirmed.
- `USER_PROVIDED`: stated by the user in conversation.
- `CORRECTED`: a user correction of an earlier value; the earlier value is kept in `corrected_from`.
- `MISSING`: the spec and the user do not give it. It has no `value`, and it is listed in
  `missing_information`. A missing field is never filled with a default, a guess or another experiment's value.

## Fields

`Fact<T>` = a Fact whose value is of type T. Presence: `REQUIRED` (must be present), `OPTIONAL` (may be
absent; absent means not provided), `CONDITIONAL` (required when the stated condition holds).

| Field | Type | Presence | Notes |
|---|---|---|---|
| `contract.name` | `"investigation-plan"` | REQUIRED | |
| `contract.version` | string `MAJOR.MINOR` | REQUIRED | `1.0` for this document |
| `plan_id` | string | REQUIRED | stable id; results refer to it |
| `state` | `DRAFT` \| `USER_CONFIRMED` | REQUIRED | only `USER_CONFIRMED` plans may be acted on |
| `created_by` | `SPEC_READER` \| `USER` | REQUIRED | |
| `spec_ref` | object `{source, title?, version_or_hash?}` | OPTIONAL | absent when there is no spec |
| `experiment.name` | Fact<string> | REQUIRED | as stated; identity is resolved later by experiment-master |
| `experiment.exp_id` | Fact<string> | REQUIRED | `MISSING` unless stated |
| `experiment.versions` | Fact<list<string>> | REQUIRED | opaque strings, never parsed or ordered |
| `experiment.game` | Fact<string> | REQUIRED | |
| `experiment.platform` | Fact<string> | REQUIRED | |
| `comparison.arms` | list<object> | REQUIRED | one entry per arm named in the spec |
| `comparison.arms[].arm` | Fact<string> | REQUIRED | e.g. `control`, `var1` |
| `comparison.arms[].role` | Fact<`CONTROL` \| `VARIANT` \| `UNKNOWN`> | REQUIRED | |
| `comparison.arms[].intended_changes` | list<Fact<string>> | REQUIRED | empty list when none are stated (then listed as missing) |
| `comparison.explicit_control` | Fact<boolean> | REQUIRED | |
| `objective` | Fact<string> | REQUIRED | |
| `hypothesis` | Fact<string> | REQUIRED | |
| `metrics` | list<object> | REQUIRED | may be empty |
| `metrics[].metric_id` | string | REQUIRED | plan-local id |
| `metrics[].as_in_spec` | string | REQUIRED | the wording used in the spec or by the user |
| `metrics[].role` | Fact<`PRIMARY` \| `SECONDARY` \| `GUARDRAIL`> | REQUIRED | |
| `metrics[].expected_direction` | Fact<`UP` \| `DOWN` \| `NO_CHANGE` \| `UNKNOWN`> | REQUIRED | an expectation only; never sets a result's direction or colour |
| `metrics[].maps_to` | Avail<object `{capability, metric}`> | REQUIRED | `UNRESOLVED` until mapped to an existing capability metric |
| `segments` | list<object> | REQUIRED | may be empty |
| `segments[].segment_id` | string | REQUIRED | |
| `segments[].selected_by` | `USER` \| `SPEC` | REQUIRED | |
| `segments[].definition` | Fact<string> | REQUIRED | |
| `segments[].maps_to` | Avail<object `{dimension, values}`> | REQUIRED | `UNRESOLVED` or `NOT_APPLICABLE` (custom segment) when no existing dimension fits |
| `cohorts` | list<object> | REQUIRED | same shape as `segments` |
| `funnels` | list<object> | REQUIRED | may be empty |
| `funnels[].funnel_id` | string | REQUIRED | |
| `funnels[].name` | Fact<string> | REQUIRED | |
| `funnels[].steps` | list<object `{order, as_in_spec, event: Avail<string>}`> | REQUIRED | `event` is `UNRESOLVED` until mapped to a catalogued event |
| `drilldowns` | list<object `{target, reason: Fact<string>}`> | REQUIRED | may be empty |
| `questions` | list<object> | REQUIRED | the investigation questions |
| `questions[].question_id` | string | REQUIRED | |
| `questions[].text` | string | REQUIRED | |
| `questions[].refs` | list<string> | REQUIRED | ids of metrics, segments, cohorts, funnels |
| `questions[].required_data` | list<object `{table, fields, source: CATALOG \| UNKNOWN}`> | REQUIRED | |
| `questions[].coverage` | `COVERED` \| `NEEDS_NEW_CAPABILITY` \| `NEEDS_USER_INPUT` \| `OUT_OF_SCOPE` | REQUIRED | |
| `questions[].coverage_detail` | object | CONDITIONAL | when `COVERED`: `{capability, request_inputs}` using existing inputs only; when `NEEDS_NEW_CAPABILITY`: `{gap}` (a proposal, never run) |
| `missing_information` | list<object `{field_path, why_needed}`> | REQUIRED | every `MISSING` Fact appears here |
| `open_questions` | list<string> | REQUIRED | questions the spec leaves unanswered |
| `corrections` | list<object `{field_path, previous, new, by, at}`> | REQUIRED | append-only history of user corrections |
| `execution.queries_executed` | integer | REQUIRED | always `0`: a plan never executes a query |

`Avail<T>` is defined in `capability-result.md` § Availability.

## Rules

- Only a `USER_CONFIRMED` plan may be acted on, and only its `COVERED` questions, through the existing
  request inputs of `experiment-master` (domain, segment, period, metrics). The plan never changes routing,
  mode, depth, budgets or methodology.
- `NEEDS_NEW_CAPABILITY` questions carry a gap proposal (required data, proposed query shape, validation
  plan). They are never executed from a plan.
- Segments and cohorts the user selected are kept exactly; the scope is never broadened or substituted.
- `expected_direction` is compared with observed evidence in wording only; it never changes a result,
  a classification, a direction or a colour.
