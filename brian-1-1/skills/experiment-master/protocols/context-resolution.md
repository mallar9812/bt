# Context resolution

Builds the ExperimentContext (`references/context-schema.md`). State results; do not narrate lookups.

1. **Entities** via `ps-entities` (game → GID, platform).
2. **Candidates (named experiments):** resolve each explicitly named experiment independently. Match
   its name by fragment on `experiment` in the experiment tables (probe `CANDIDATES`, bounded by `gid`
   and the candidate discovery window defined under Windows). One candidate name → resolve and state it. In a user-origin read a vague request is confirmed with the user before anything else (`references/experiment-confirmation.md`); the probe result is reused, not run again.
   Two or more different experiment names matching the fragment → ask once. Zero → list the nearest
   names. An experiment spans platforms as `(gid, experiment)`; each platform has its own `exp_id`
   (`gid::cli::experiment::<number>`), and one name can have several `exp_id`s on a platform. Several
   `exp_id`s, platforms or versions of one name are not ambiguity: each becomes its own unit. A request
   that explicitly names several experiments is not ambiguous: build one independent ExperimentContext
   per named experiment; their user-level metrics are never pooled.
   **Experiment version.** The unit of analysis is `(exp_id, version)`: `version` is the `version` value
   of the experiment tables, an opaque string compared exactly — never parsed, truncated or numerically
   ordered — and it is platform-specific because `exp_id` contains the platform. Versions are never
   pooled, including on transition days: rows of different versions on one day belong to their own
   units. Every probe, query, context, classification, window, finding, comparison and budget is bounded
   by both `exp_id` and `version`. `CANDIDATES` returns each version with its own `first_active_day` and
   `last_active_day`. Per `exp_id`, versions are selected in this order:
   1. an explicit `version_ref` → that exact `(exp_id, version)` only;
   2. a requested period → every version active in the period, each independently;
   3. otherwise → the latest version, independently for each relevant `exp_id`: latest
      `first_active_day`, then latest `last_active_day`; earlier versions are carried in `versions[]`
      and surfaced as available historical versions.
   **Relevant `exp_id`:** for a named experiment, every `exp_id` that `CANDIDATES` returns for the name
   within the request's scope (`gid`, and the platform when one is given) is relevant, and each is
   independent. With a period, the versions active in it are selected for each matching `exp_id` (one
   with none yields no unit and is listed); without a period, the latest version is selected
   independently for every matching `exp_id`; earlier versions stay surfaced as available history.
   Several matching `exp_id`s are not ambiguity and trigger no question, and nothing is pooled to reduce
   work: the finite budget bounds how many units run, and units it cannot cover are `NOT_TESTED` /
   `OUT_OF_BUDGET`.
   Versions are never pooled, and neither are `exp_id`s or platforms: each unit is analysed on its own.
   Several versions are never a reason to ask. A `version_ref` not found in the candidate discovery
   window is reported together with the versions that were found.
   **Negative versions.** A `version` value that starts with `-` stays among the candidates, listed with
   the label "version semantics unknown" (`version_semantics_unknown = true`); it is never removed from
   discovery and its meaning is never inferred. The selection rules above are unchanged for every
   capability. For Classic Retention, LTV & LTDays, Rolling LTV and Economy only, each on its own
   (`references/capability-registry.md` § Selection by mode): an explicitly requested negative version
   is `UNSUPPORTED` / `VERSION_SEMANTICS_UNKNOWN`; a negative version that was not explicitly requested
   is never auto-selected for it (a unit the rules above selected is `SKIPPED_NOT_AUTO_SELECTED` for
   that capability). No other version is substituted and
   nothing is pooled.
   **Period discovery (PERIOD_IMPACT_ANALYSIS, no named experiment):** `gid` is required, platform is
   optional. The requested period is the `impact_window`; `onset`, `comparison_window`,
   `lookback_start` and the `candidate_discovery_window = [lookback_start, impact_window.end]` are set per
   `references/period-evidence.md` § Impact period, onset and lookback. One bounded `GROUP BY` on
   `experiment.dau` over the `candidate_discovery_window` (probe `DISCOVERY`) returns every
   `(exp_id, experiment, version)` with DAU > 0 on at least one day, with `first_active_day`,
   `last_active_day`, `active_days` (count of returned day rows) and the daily arm DAU used by the
   exposure proxy. Discovery order is
   `first_active_day`, then `exp_id`, then `version`, ascending; it is the final tie-break of candidate
   priority, not the spend order. No unit is filtered out at discovery. Each discovered
   `(exp_id, version)` is resolved independently through steps 3–7, with its windows set as under
   Windows below, and then goes through step 2a. A period with no game is not supported.
   **2a. Lifecycle and candidate classification (PERIOD only), per unit:**
   - A unit whose discovered `first_active_day` equals `lookback_start` is `left_censored`. One bounded
     `LIFECYCLE` probe covers all left-censored units and returns each one's true first active day
     within the history the table retains; the whole discovery scan is never widened for this. A unit
     the probe cannot resolve keeps `true_first_active_day = UNKNOWN`.
   - Allocation events, ship and kill come from the `Experiments` annotations (step 4), mapped to units
     by the rule in step 4; `allocation_stability` is `ANNOTATED` only where a mapped row positively
     documents the allocation in force, otherwise `UNKNOWN`.
   - Exposure events and `exposure_stability` (`PROXY`) come from the exposure-proxy policy in
     `references/period-evidence.md`, applied to the `DISCOVERY` daily arm DAU; no extra probe.
   - The lifecycle block, class, tier and candidate priority follow `references/period-evidence.md`
     § Candidates. Classification uses timing and exposure only; nothing from the capabilities feeds it.
   **2b. Trigger metric (PERIOD only) and scope (every mode).**
   - *Trigger (PERIOD only):* the metric the question names, resolved to the capability that owns it and
     that capability's own `definition_lock` name (`references/period-evidence.md` § Trigger, scope and
     evidence). A trigger that names no resolvable metric is `UNRESOLVED` and asked once. The trigger
     never limits which capabilities are selected. It must resolve to exactly one canonical metric of a
     capability that declares PERIOD `trigger` support (`references/capability-registry.md` § Registry):
     `classic_retention_dX`, `ltv_dX` ("D7 LTV"; Ad and IAP LTV only when named), `rolling_ltv_d7`,
     `<metric>:<cash_type>` for Economy, and so on. An ambiguous phrase — no day or horizon, several
     currencies with none named, unqualified D1/D3 retention — is `UNRESOLVED` and asked once; metrics
     and currencies are never pooled and no other capability is substituted. A capability that declares
     no PERIOD trigger role (none currently) is `UNSUPPORTED` / `NO_PERIOD_ROLE` and the run continues
     (Q14).
   - *Scope (every mode):* every segment phrase in the question (`segment_ref` in FULL and TARGETED,
     `scope_refs` in PERIOD) is resolved to a canonical `{dimension, values[]}` using only (a) an exact
     match to a live value of exactly one dimension, or (b) the validated vocabulary below. The live
     values come from the bounded `SCOPE` probe on `experiment.dau` and each selected capability's
     source table, over the `candidate_discovery_window` in PERIOD and over the selected units'
     `experiment_active_window`s (from `CANDIDATES`) for a named experiment. A phrase that matches no
     value, more than one dimension, or only by string similarity is `UNRESOLVED`: it is never guessed
     and never dropped; one question is asked, and no scoped evidence is produced until it is resolved.
     **While it is pending** (same in every mode, and for user phrases forwarded in a stream-origin
     request):
     - exactly one clarification question is asked;
     - only segment-independent context is shown: the experiment, its versions and platforms, active
       dates, control and variants, lifecycle and allocation events, annotation status;
     - no overall metric result and no partial-scope result is shown (if part of the request resolved —
       a dimension, or a platform such as Android — and the segment did not, nothing runs on the
       resolved part alone);
     - no scope-dependent probe, query or other work runs, and no budget is spent, for the pending
       segment;
     - the answer may offer: "I can also show the result for all users while you confirm." The overall
       result is computed and shown only after the user explicitly accepts. It is then labelled exactly
       "Overall (all users) — not the requested segment", has its own result identity with an empty
       scope (`master-state.md` § Results and meaningfulness), and never satisfies the requested
       segment;
     - request accounting: the segment element stays `CLARIFICATION_REQUIRED` until resolved; an
       accepted overall result is a separate element (`master-state.md` § Request accounting).

     The resolved scope becomes lens `L1` (`master-state.md` § Scope lenses and context updates) and is
     sent to every selected capability for every unit. A platform word (Android, iOS, Amazon → `cli`
     0, 1, 2 per `ps-entities`) selects units — `exp_id` carries the platform — and is not a cell
     filter. The resolved scope, with any
     value-group expansion written out, is recorded and stated.
   - *Validated vocabulary* — phrase → canonical dimension and values; a value group is intersected
     with the live values and the expansion is shown:

     | Phrase | Dimension | Values | Basis |
     |---|---|---|---|
     | organic | `install_bucket` | `organic (google play)`, `organic (w/o google play)` | explicitly validated value group (approved mapping); other organic-labelled buckets in the `ps-data-catalog` vocabulary (`organic`, `organic (dt_t1)`) are not part of it unless validated and added here |
     | payers / non-payers | `payer_flag` | `payer` / `non_payer` | live values |
     | new users / old users | `user_type` | `new` / `old` | live values |
     | a cohort label such as D08-D14 | `cohort` | that exact label | live values |
     | LAT / non-LAT | `lat_flag` | `lat` / `non-lat` | live values |

     A phrase outside this table and without an exact live-value match is `UNRESOLVED`. New groups are
     added here only after explicit validation.
   - *Pre-validated scope input (stream-origin request).* A scope may arrive already canonical — a list
     of `{dimension, values[]}` entries in the `investigation_context` or a ContextUpdate, resolved
     upstream from existing vocabulary — instead of as a phrase. It is validated exactly as a phrase is:
     each entry must match live values of exactly one dimension in the `SCOPE` probe (stored case is
     matched case-insensitively and the live value is the one recorded); nothing is matched by similarity
     and no vocabulary is added. An entry that does not match, or an empty intersection with the
     requested scope, is `UNRESOLVED_SCOPE`. A `cli` entry selects units, as a platform word does.
     `unresolved_phrases[]` in the context are ordinary user phrases and follow the rules above.
     `UNSUPPORTED`, `UNAVAILABLE` and `NO_SCOPED_EXPOSURE` apply unchanged, per lens, and nothing is
     broadened or replaced by an unscoped read.
   - *Per capability:* a scope dimension the capability's source table lacks, or that its analysis
     file does not support as a cut for a metric, is `UNSUPPORTED` for that capability or metric;
     scoped values absent from its table for the unit are `UNAVAILABLE`. Both are stated, never dropped,
     and never replaced by an unscoped read.
   - *Scoped exposure:* a scope-bounded `COVERAGE` probe per table finds the units with scoped rows. A
     unit with none in `experiment.dau` is `NO_SCOPED_EXPOSURE` and is not investigated: in PERIOD it
     stays in the candidate list with `evidence_status = NO_SCOPED_EXPOSURE`; in FULL and TARGETED it is
     reported as no data for the requested segment, and no unscoped read replaces it.
3. **Arms and design, per unit:** distinct `variant` with DAU > 0 for that version in the analysis
   window from `experiment.dau`, then classify per `references/experiment-classification.md`. This is
   the only place the reference arm is chosen. Never ask the user to pick a reference.
4. **Windows:** analysis window ends no later than D-2; the latest day is partial and the last five
   days are restated on each load, so state both. Ramp events and the stable window come from
   `charts_annotations` (rules in `annotations.md`). In PERIOD mode the annotation read covers the
   `candidate_discovery_window`, widened ±3 days per `annotations.md`.
   **Annotation-to-unit mapping.** Annotations carry no `exp_id` or `version`. An `Experiments` row maps
   by `(gid, cli, experiment name)` plus date. Only rows in the allocation-ramp format
   (`<name>:` followed by arm percentages) are lifecycle events; other `Experiments` rows are listed as
   commentary. A mapped row needs `gid` equal, `cli` in the row's platforms, and the name
   before the first `:` of `description` equal to the experiment-table `experiment` value. Among the
   matching `exp_id`s, the row is `DATE_ALIGNED` to a version when exactly one version is active on the
   row's date `d`, or exactly one version starts on `d`, or exactly one ends on `d − 1` or `d`; at a
   version transition (one version ends on `d − 1` or `d` and its successor starts on `d`) the row is the
   end event of the first and the start event of the second, each `DATE_ALIGNED`. Anything else —
   several matching `exp_id`s, several versions or none — is `AMBIGUOUS`: listed, never mapped silently,
   and never used to classify. A version boundary is not by itself an allocation change; when one is used
   as allocation evidence it is labelled `PROXY`.
5. **Annotation status** from the fixed kill/ship rule in `annotations.md`, stored separately as
   `annotation_status`. Never used to select or change the reference arm.
6. **Coverage, per table that the request needs:** a bounded probe on `(exp_id, version)`; a unit absent
   from a table is reported as `NOT_IN_TABLE` with the probe quoted. The PAB
   table(s) of each PAB-capable capability are covered the same way before its Stage 1 PAB runs. Count with `GROUP BY`, never
   `COUNT(DISTINCT)` (approximate in Druid).
7. **Concurrent experiments** on the same gid/platform and window, listed for later overlap notes. In
   period mode they come from the discovered set (all candidates, whatever their class), with overlap
   days.
8. **Clarify only when genuinely ambiguous or required** (a vague experiment statement in a user-origin read is confirmed
   per `references/experiment-confirmation.md`; several different experiment names matching
   one fragment; a period request with no game; an `UNRESOLVED` trigger phrase in PERIOD; an
   `UNRESOLVED` scope phrase in any mode; a retention request that does not say which retention —
   classic Retention or Rolling Retention (`references/capability-registry.md` § Domain matching); an
   unsupported arm name, which is a data-contract safeguard and not seen in current data); at most one
   question, alongside the delivered work. For a pending segment, the delivered work is only the
   segment-independent context of step 2b: no overall or partial-scope result is ever delivered
   automatically in its place. Naming several experiments, or an experiment having several
   versions, `exp_id`s or platforms, is never a reason to ask. A scope that arrived pre-validated from a
   ContextUpdate is never asked about: it is recorded `UNRESOLVED_SCOPE` and reported.

Arms come from observed active users. Assignment and allocation tables were not part of Phase 0;
if added later they may cross-check but not replace step 3.

## Windows

These windows are kept separate and never collapsed. Representation follows `context-schema.md`.

- **`requested_period`** — what the user asked to analyse; absent for a named experiment with no period.
- **`experiment_active_window`** — when that experiment version was active: its `first_active_day` to
  `last_active_day` (from `CANDIDATES` for a named experiment, `DISCOVERY` in period mode), clipped to
  the requested period when one is given (in PERIOD mode, to the `candidate_discovery_window`) and to D-2.
- **`stable_window`** — per unit, the days after the last allocation change recorded in the annotations
  and dated within the unit's active window (a 0%→0% re-stamp is not a change) through its last active
  day, per `annotations.md`; a change before the active window leaves the whole window stable. Version
  boundaries are not allocation changes by themselves: allocation can change inside a version, and a
  version can change with no allocation change, so only actual allocation-change evidence counts. It
  has three states that are never conflated: a window, `empty` (known: no stable days) and `unknown`
  (not resolved).
- **`analysis_window`** — per unit, the days used for comparative analysis: `requested_period ∩
  experiment_active_window ∩ stable_window`, within the D-2 freshness rule. With no requested period that
  term is omitted; no default calendar analysis period is introduced. This meaning is unchanged in every
  mode. Classic Retention and LTV & LTDays apply the same window to **install dates** (an install cohort
  is eligible iff its install date lies inside it; `analyses/classic-retention.md`,
  `analyses/ltv-ltdays.md`); it is not an activity-day window there. The unit's unclipped observed active
  span (`first_active_day` to `min(last_active_day, D-2)`) is passed with it as `observed_active_span`,
  for reporting excluded cohorts only. In PERIOD mode the Master passes the unit's
  `experiment_evidence_window` as its `analysis_window` and records `analysis_window_basis =
  EXPERIMENT_EVIDENCE_WINDOW` (otherwise `REQUESTED_PERIOD`); for Classic Retention and LTV & LTDays it
  bounds install cohorts there too, and each capability's own maturity rule then applies.
- **`experiment_evidence_window`** (PERIOD only) — per unit,
  `candidate_discovery_window ∩ experiment_active_window ∩ stable_window` within D-2 (in the
  unknown-stable-window fallback below, `candidate_discovery_window ∩ experiment_active_window`), so a
  version that changed in the lookback, or shipped or was killed before the impact, keeps its own valid
  pre-transition days as evidence.
- **`impact_overlap_window`** (PERIOD only) — per unit, `impact_window ∩ experiment_active_window`;
  descriptive only, never an evidence window.
- **`mature_analysis_window`** — per measure, returned by the analysis (`analysis-contract.md`).

Resolution order: active window → ramp events and `stable_window` → `analysis_window` → `ARMS` and
classification over the analysis window.

- **Candidate discovery window** (named experiment only; distinct from the PERIOD
  `candidate_discovery_window`) — used only by `CANDIDATES`, to resolve
  `exp_id`s: the requested period when the request has one, otherwise the full history available in the
  experiment table through D-2. It is never reported as, or used as, an analysis period.
- **`stable_window` edge cases:**
  - *No allocation change recorded within usable annotation coverage* — annotations are readable, the
    live coverage bounds (`annotations.md`) cover the unit's active window, and no allocation change is
    recorded for the `exp_id` within it: `stable_window` is taken as `experiment_active_window`.
    This is not proof that no change occurred (annotation coverage is voluntary, `annotations.md`);
    record the assumption and the limitation in `assumptions[]`.
  - *Last recorded allocation change on the unit's final active day:* `stable_window` is `empty` and
    `analysis_window` is empty. It is not widened back to the active window.
  - *Annotations unavailable, or no usable annotation record exists* (the source cannot be read, the
    active window lies outside the live coverage bounds, or the allocation rows are unusable):
    `stable_window` stays `unknown`; do not infer it. Carry the limitation in `assumptions[]` and use the
    existing fallback: `requested_period ∩ experiment_active_window` within D-2 as the `analysis_window`.
- **A requested period that includes ramp or pre-ramp days** is preserved in the context. The portion
  inside `stable_window` and the ramp events outside it are stated explicitly, never dropped silently.
- **An empty intersection** (including an `empty` stable window) is reported as no analysis days for that
  experiment; it is not widened. An `unknown` stable window is not an empty one.
- **PERIOD:** `requested_period` (the `impact_window`) remains the governing game-level period and is
  never rewritten to stable windows, to the `candidate_discovery_window` or to any unit's
  `experiment_evidence_window`; those shape only experiment-level discovery and evidence.

## Probes

The only Druid context probes the Master issues are these bounded probes — no arbitrary SQL against the
experiment tables; everything else is an analysis's work. Annotation reads are defined separately by
`annotations.md` and remain part of context resolution. Each probe is a declarative spec: its statement
is the direct rendering of the spec under the Druid rules in
`ps-data-catalog/references/query-engines.md`. A probe costs one statement against the `context` budget,
is bounded by `__time` and the filters shown, and counts with `GROUP BY`, never `COUNT(DISTINCT)`.

| Probe | Table | Group by | Bounded by | Returns |
|---|---|---|---|---|
| `CANDIDATES` | `experiment.dau` | `exp_id`, `experiment`, `version` | `gid`, candidate discovery window, name fragment, optional `cli` | candidate `(exp_id, experiment, version)` units, each with its own `first_active_day` and `last_active_day` (step 2) |
| `DISCOVERY` | `experiment.dau` | `exp_id`, `experiment`, `version`, `variant`, day | `gid`, the `candidate_discovery_window`, optional `cli` | one row per active arm-day with its DAU: per-version `first_active_day`, `last_active_day`, `active_days`, and the daily arm DAU for the exposure proxy (step 2; also step 7 over a unit's window) |
| `LIFECYCLE` | `experiment.dau` | `exp_id`, `version` | the left-censored `(exp_id, version)` units only; the full history the table retains up to `lookback_start` | each unit's earliest active day (step 2a) |
| `ARMS` | `experiment.dau` | `exp_id`, `version`, `variant` | the `(exp_id, version)` units, analysis window | arms with DAU > 0 (step 3) |
| `SCOPE` | `experiment.dau` and each selected capability's source table (any mode with a scope) | the requested scope dimensions | `gid`, optional `cli`; PERIOD: the `candidate_discovery_window`; named experiment: the selected `(exp_id, version)` units and their `experiment_active_window`s | the live values of each scope dimension per table (step 2b) |
| `COVERAGE` | each source and dependency table in the registry; the PAB table(s) of each PAB-capable capability | `exp_id`, `version` | the `(exp_id, version)` units, analysis window (PAB tables: the window the analysis file's PAB section sets); with a scope, in any mode, also the canonical scope | units with rows (step 6); with a scope, units with scoped rows (step 2b) |

For a stream-origin request, `SCOPE` and the scope-bounded `COVERAGE` run per scope lens
(`master-state.md` § Scope lenses and context updates): live values are read once per scope dimension,
and `COVERAGE` carries the lens's canonical scope. No other probe is repeated for a lens.

Annotation reads (steps 4–5) are defined by `annotations.md`, not here.
