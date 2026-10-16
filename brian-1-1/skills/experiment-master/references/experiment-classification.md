# Experiment Classification — which arms are compared

Answers one question: **which arms are we comparing?** It does not say what happened to the
experiment — that is annotation status (`ps-data-catalog/references/annotations.md`, unchanged).
The two never substitute for each other: the reference arm is not "the smallest variant", and a
terminal 100% ramp never selects a reference.

Evaluated **per experiment-version unit `(exp_id, version)`** (exp_id is per platform) over that unit's
analysis window, on the arms that have DAU > 0 in `experiment.dau` for that version in that window.
Arms, classification and the reference arm can differ between versions of one experiment; versions are
never pooled.

## Rule

```
arms             = distinct variant with dau > 0 in analysis_window
explicit_control = "control" in arms

if len(arms) >= 2 and any arm is neither "control" nor matches ^var[1-9][0-9]*$:
    design.status = UNRESOLVED; reason = UNSUPPORTED_ARM_NAME; comparisons = []
    # data-contract safeguard — do not infer an ordering or a reference
elif explicit_control and len(arms) >= 2:
    classification  = CONTROLLED_TEST
    design.status   = COMPARABLE; reason = null
    reference_arm   = "control";  reference_basis = EXPLICIT_CONTROL
    comparison_type = CONTROL_VS_VARIANT
elif len(arms) >= 2:
    classification  = NO_CONTROL_MULTI_ARM          # explicit_control stays false
    design.status   = COMPARABLE; reason = null
    comparison_type = REFERENCE_VARIANT_VS_VARIANT
    if "var1" in arms: reference_arm = "var1";  reference_basis = CONVENTION_VAR1
    else:              reference_arm = lowest-numbered var<N>
                       reference_basis = CONVENTION_LOWEST_VARIANT
else:
    classification = SINGLE_ARM
    design.status = NO_COMPARISON; reason = SINGLE_ARM      # not BLOCKED
    reference_arm = null; reference_basis = null; comparison_type = NONE
```

`design.status` is assigned explicitly in every branch; there is no implicit default:

| Outcome | design.status | reason |
|---|---|---|
| Resolved CONTROLLED_TEST (>= 2 arms) | COMPARABLE | null |
| Resolved NO_CONTROL_MULTI_ARM (>= 2 arms) | COMPARABLE | null |
| SINGLE_ARM | NO_COMPARISON | SINGLE_ARM |
| Unsupported multi-arm arm name | UNRESOLVED | UNSUPPORTED_ARM_NAME |

## Ordering

`var<N>` is ordered by numeric N (`var2 < var10`) — never lexically.

The unsupported-arm-name rule is a **data-contract safeguard, not an observed current-data
condition**: in Phase 0 (2026-09-28) non-var names occurred only on single-arm experiments. If a
future multi-arm experiment contains an arm that is neither `control` nor `var<N>`, the result is
`UNRESOLVED / UNSUPPORTED_ARM_NAME` with no comparisons and no inferred reference.

## Pairing

Reference-vs-comparator only; **never all-pairs**. `comparators = arms − {reference_arm}`, ordered
numerically.

| Arms | Pairs |
|---|---|
| control, var1, var2 | control→var1, control→var2 |
| var1, var2, var3 | var1→var2, var1→var3 |
| var2, var3, var5 | var2→var3, var2→var5 |
| var2, var10 | var2→var10 |
| control only / one variant | none (SINGLE_ARM) |
| (future) control or var1 plus a non-var<N> arm | none (UNSUPPORTED_ARM_NAME) |

**`pair_id` (canonical).** `pair_id = <comparator>_vs_<reference>`, where `<comparator>` and
`<reference>` are the arms' `variant` values exactly as stored in the experiment tables (for example
`var1_vs_control`, `var2_vs_var1`). It is derived only from the resolved comparison, so the same unit and
comparison always give the same `pair_id`, whatever the mode, request order, lens or display label. No
ordinal (`P1`, `P2`), counter or hash is used, and the direction is always comparator vs reference. A
`NO_COMPARISON` unit has no pair; where an identity needs one, `pair_id = NONE`.

## Eligibility

A comparator is eligible iff at least one paired day exists: a day in the analysis window on which
both arms have matured data in that metric's own table. Ineligible reasons: `NO_PAIRED_DAYS`,
`NOT_IN_TABLE`. No sample-size, SRM, multiple-testing or peeking rule is defined here (all TBD).
If an arm appears or disappears inside the window, `arm_set_stable = false`.

## Invariants

- The reference variant is never renamed or described as control or baseline.
- `explicit_control` is true only when an arm literally named `control` exists.
- The Master decides the reference; analyses receive `comparisons[]` and never re-derive it.
- A comparison belongs to one unit; it never spans versions.
- Snapshot, never evidence of absence, counted per `exp_id` before version splitting: on 2026-09-28 the
  observed split was 800 control+var1,
  52 control without var1, 175 no-control with var1, 25 no-control without var1, 27 single-arm.
