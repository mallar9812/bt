# Evidence Streams — metric investigation and experiment investigation as independent streams

Orchestrator-only contract. `brian-master` applies it. No analyst or investigator reads it, inherits it,
or is told that it exists. It defines how one user question can run two independent evidence streams and
combine them at the end; it defines no metric method and no experiment method. Metric methodology is
`investigation-protocol.md` and the investigator skills. Experiment methodology is `experiment-master`.

- **Stream A — metric investigation.** The routed metric analyst, exactly as it runs today.
- **Stream B — experiment investigation.** `analyst-experiment-reads` → `experiment-master`.

```
Stream A (unchanged) ──► its existing output ──► read-only extraction (brian-master)
                                                         │  InvestigationContext / ContextUpdate
                                                         ▼
                                      analyst-experiment-reads ──► experiment-master  (Stream B)

Stream A output ─┐
                 ├──► synthesis (the only consumer of both)
Stream B output ─┘                 nothing ever flows from B into A
```

## Invariants

- **S1 — A's hand-off is unchanged.** The hand-off contract in `SKILL.md` never carries a stream field.
  Stream fields live only in the StreamRecord, which A never receives.
- **S2 — A is unaware.** No analyst, investigator or shared-methodology file references this file,
  Stream B, `analyst-experiment-reads` as a companion, or `experiment-master`. A is given nothing about
  experiments, no experiment finding, and no instruction to look for one.
- **S3 — one-way flow.** The orchestrator reads A's displayed output and never writes to A. Nothing B
  produces is visible to A before A has completed: by context isolation (`PARALLEL_ISOLATED`) or by
  ordering (`SEQUENTIAL_A_THEN_B`).
- **S4 — context is not evidence.** Everything taken from A is context. `experiment-master` never treats
  it as experiment evidence. A's game-level movement, when reused, is Layer A (trigger movement) only,
  never Layer C.
- **S5 — updates are advisory.** `experiment-master` validates, admits or declines every update; no
  upstream skill selects an experiment, ranks one, or decides causality.
- **S6 — no loops.** B never calls routing or a metric analyst. A stream-origin request carries
  `origin: COMPANION_STREAM`; `experiment-master` never returns it to `brian-master`. One Stream B per
  `request_id`. A hand-off between investigators inside A (for example Rev/DAU → engagement) opens no
  second stream; it is at most a `TRIGGER_REVISION`.
- **S7 — mode independence.** The two execution modes differ only in latency. The same context, updates,
  order, gate, lenses and dispositions result in both.
- **S8 — synthesis is the only meeting point** of the two streams.

## Execution modes

| Mode | Stream B runs | Valid only when |
|---|---|---|
| `SEQUENTIAL_A_THEN_B` (default) | after A's final output; B never starts first | always |
| `PARALLEL_ISOLATED` | concurrently with A, in an execution context A cannot see | the host explicitly provides isolated parallel execution; recorded in the StreamRecord |

No mechanism is named or assumed. If isolated parallel execution is not explicitly supported, use
sequential. In sequential mode `progressive_available` is false: every ContextUpdate is produced at A's
completion, in `seq` order. In either mode `seq` is assigned by order of appearance in A's output, never
by delivery time, so lens admission (§ Lens admission) is identical.

## Eligibility and classification

**Signals.** `X` — explicit experiment intent: the ask names an experiment, a test, a variant, A/B or a
PAB read, or asks about experiments. `M` — an unrestricted metric-diagnosis ask: why / what drove /
root cause / investigate / deep dive on a metric move, not restricted to experiments. A why-question
scoped to a named experiment or variant, or a cause question restricted to experiments ("which
experiments could have caused…", "did [test] move…"), is **restricted**, so it is not `M`.

| X | M | Meaning | Route |
|---|---|---|---|
| yes | no | explicit experiment ask | `analyst-experiment-reads` → `experiment-master`. No metric analyst, no StreamRecord, no synthesis. |
| yes | yes | mixed ask (`kind: MIXED`) | Stream A (routed metric analyst) + Stream B at `phase_ceiling: EVIDENCE` from T0 (E1). |
| no | yes | normal metric investigation (`kind: NORMAL`) | Stream A + Stream B at `phase_ceiling: DISCOVERY` (B0). |
| no | no | anything else | existing routing rows, unchanged. |

An ambiguous phrasing ("why did Rev/DAU drop — was it the test?") is treated as mixed. An ask for
experiment status only (ramp, allocation timeline, kill-or-ship, Admon or PAB commentary, no measurement)
stays in `analyst-experiment-reads` annotation mode: it is not a measured read, opens no stream and does
not reach `experiment-master`.

**Stream B opens only when all hold:** the question routes to `investigate-rev-dau`,
`investigate-retention`, `investigate-rolling-retention`, `investigate-engagement`, or to
`analyst-game-performance` running the investigation protocol for a "why did [metric] move" ask; the
depth is D2 or D3; the question is not an explicit experiment ask; and a game resolves. It never opens
for D0, D1, D1-C, `analyst-daily-healthcheck` (including investigator runs the healthcheck escalates),
`analyst-general-questions`, `analyst-comp-data`, or a formatting-only report request.

## Records

```
StreamRecord = {                              # orchestrator-only; never shown to A
  request_id, kind: NORMAL | MIXED, eligibility_basis,
  a: {analyst, hand_off},                     # the hand-off exactly as the routing table produced it
  b: {entry: analyst-experiment-reads,
      phase_ceiling: DISCOVERY | EVIDENCE, ceiling_basis?: E1 | E2 | E3_AND_E4,
      status: OPEN | CLOSED_AT_DISCOVERY | RUNNING | DONE | FAILED},
  execution_mode, progressive_available,
  a_complete, update_set_closed, next_seq, skipped_cuts[] }

InvestigationContext (seq 0) = {
  request_id, seq: 0, gid, cli?,
  trigger_phrase, direction_stated?, magnitude_stated?,
  impact_period, comparison_period_hint?,     # the hand-off window; A's comparison once known
  requested_scope: [{dimension, values[]}],   # canonical exact values; [] means overall
  unresolved_phrases[],                       # scope phrases not resolvable here, forwarded verbatim
  user_depth_language?, user_depth_override?, # verbatim; never A's computed depth
  experiment_intent: NONE | EXPLICIT | PRIOR_IN_CONVERSATION }

ContextUpdate = {
  request_id, seq, type: SCOPE_REFINEMENT | TRIGGER_REVISION, source: METRIC_FINDING,
  scope: [{dimension, values[]}],             # SCOPE_REFINEMENT: the full conjunction, requested ∩ cut
  scope_signature, dimension_count, contribution_pct?,
  source_ref,                                 # locator in A's output (section + step or row number)
  evidence_ref,                               # the quoted line or cell
  basis: STATED | DERIVED }
  # TRIGGER_REVISION carries {trigger_phrase, locked_definition, family, evidence_ref} instead of scope

A_COMPLETE = {
  request_id, extraction_status: COMPLETE | PARTIAL | NONE, missing[],
  d1_verdict?: REAL | ARTIFACT,
  localized_findings[{source_ref, evidence_ref, scope, contribution_pct?}],
  game_movement_candidates[{metric_label, scope, impact_period, comparison_period,
                            value, prior_value, delta_abs, delta_pct, freshness, source_skill,
                            evidence_ref}] }

UpdateAck = {request_id, seq, disposition: ACCEPTED_LENS | DUPLICATE | UNSUPPORTED |
             UNRESOLVED_SCOPE | NO_SCOPED_EXPOSURE | LENS_CAP | OUT_OF_BUDGET | DEFERRED_BY_CEILING,
             lens_id?, reason?}
```

Early dispositions (`DUPLICATE`, `UNSUPPORTED`, `UNRESOLVED_SCOPE`, `NO_SCOPED_EXPOSURE`) are returned
when an update is validated; `ACCEPTED_LENS`, `LENS_CAP`, `OUT_OF_BUDGET` and `DEFERRED_BY_CEILING` when
admission is decided on the closed set.

`scope_signature` = dimensions sorted a–z, each `dimension=` followed by its values trimmed,
case-folded, de-duplicated and sorted and joined by `|`, entries joined by `;`. The dedupe key is
`(request_id, scope_signature)`. A `cli` entry is unit selection, exactly as a platform word is, and is
included in the signature.

## Scope canonicalisation (orchestrator)

User phrases and A's cuts become canonical `{dimension, values[]}` conjunctions using existing
vocabulary only, never a similarity match:

- the validated vocabulary in `experiment-master/protocols/context-resolution.md` step 2b (organic,
  payers / non-payers, new / old users, a cohort label, LAT / non-LAT), with the same expansion written
  out ("organic" → `install_bucket` ∈ {`organic (google play)`, `organic (w/o google play)`});
- `ps-entities` (Tier-1 → `country` ∈ {`us`, `gb`, `ca`, `au`}; platform word → `cli`);
- `ps-data-catalog` dimension value lists, including the cohort buckets. A cohort range expands to exact
  bucket labels only when both ends fall on bucket boundaries ("D00–D30" → `D00`, `D01`, `D02-D07`,
  `D08-D14`, `D15-D30`); an off-boundary range is not rounded.

Example: "Rev/DAU dropped for organic users in D08-D14" →
`requested_scope = [{install_bucket, [organic (google play), organic (w/o google play)]}, {cohort, [D08-D14]}]`.

Rules: a phrase that cannot be made exact is forwarded in `unresolved_phrases[]`, never guessed and
never dropped. A cut's values are taken as A's own output or queries show them. A display label that is
not a stored value is not translated; that cut is not forwarded and is recorded in `skipped_cuts[]` with
`NOT_EXACT_VALUE`. The orchestrator does not pre-filter by what the experiment tables support: a
dimension they lack (for example `install_source`) is forwarded and comes back `UNSUPPORTED`.

## Extraction from A's existing output

Read-only, from what A displays. Every extracted field carries `evidence_ref`, and `basis` is `STATED`
(shown as is) or `DERIVED` (computed from displayed values, for example a conjunction). Nothing is
inferred.

| Field | Where it is already in A's output |
|---|---|
| trigger, locked definition, family | the Stage-zero locked-definition statement |
| direction, magnitude, periods | the period & segment line and the L0 figure with its % and absolute delta |
| D1 verdict | the Stage D1 verdict (REAL or ARTIFACT) |
| material cuts | the drill path and the Finding rows: only segments A descends into or lists as a Finding |
| contribution | the contribution-to-delta A displays for that segment |
| game-level movement | the headline comparison, as value, prior value, deltas and freshness |

`evidence_ref` quotes only the cells that show the cut and its contribution (the drill-path clause, or a
Finding row's segment and contribution cells). It never quotes the row's bucket, confidence, causation,
hypothesis or next-step cells, so none of them reaches Stream B inside a quote.

A *localized* finding is a drill-path step or Finding row naming at least one dimension value not
already in the requested scope. Never extracted or forwarded: annotation text (annotations are not used
for routing), hypotheses, attribution buckets, causation flags, `so_what`. Synthesis reads those from A
directly. Missing fields are `null` with the reason, `extraction_status: PARTIAL`; A BLOCKED, failed or
without output is `NONE`. Nothing is fabricated.

## Escalation B0 → B1

**B0 (`phase_ceiling: DISCOVERY`)** is the existing P0 context work in `experiment-master` — discovery,
lifecycle, annotations, `SCOPE`, scope-bounded `COVERAGE`, `ARMS` — and no capability evidence.
Game-level movement (Input B) is not resolved in B0. B0 returns `tier1_count`: the Tier-1 units among
investigable units under the requested scope. **B1 (`phase_ceiling: EVIDENCE`)** is the existing P1–P4.

| Trigger | Condition | Effect |
|---|---|---|
| E1 explicit experiment intent | `experiment_intent = EXPLICIT` (mixed ask) | `EVIDENCE` from T0 |
| E2 existing experiment intent | `experiment_intent = PRIOR_IN_CONVERSATION`, or a later user turn asks for experiment evidence on an open stream | `EVIDENCE` |
| E3 | A's D1 verdict is REAL **and** ≥ 1 localized finding | counts toward the gate |
| E4 | B0 `tier1_count ≥ 1` | counts toward the gate |

E1 or E2 alone raises the ceiling. For a normal investigation (`kind: NORMAL`) the ceiling rises only
when **E3 and E4 are both** met; neither alone is enough. The gate is evaluated when both inputs exist,
which is after both B0 and A's completion; until then B waits at `DISCOVERY`. When it is not met, B
closes at `DISCOVERY` (`CLOSED_AT_DISCOVERY`), the reason names which half failed, and an offer to deepen
is shown. Deepening continues the same run from P1 on the stored P0 state; it never restarts it.
`analyst-experiment-reads` applies this table; `experiment-master` may still decline for budget.

**Tier 1 is a timing and exposure ordering signal only** (`experiment-master/references/period-evidence.md`
§ Candidates). It is never described as likelihood, probability of cause, or evidence of causality, and
using it here as a spend gate does not change its meaning.

## Lens admission

A *lens* is one canonical scope under which scope-dependent evidence is produced. Maximum 3, including
the requested scope.

1. **Lens 1** is the requested scope (overall if none) and always takes slot 1.
2. Every other lens is a **proper refinement** of an existing lens: it adds a dimension or narrows a
   dimension's value set. A scope equal to an existing lens is a `DUPLICATE`; an empty intersection is
   `UNRESOLVED_SCOPE`. A lens inherits every dimension of the requested scope and never drops one.
3. **Unsupported cuts do not consume a lens.** A cut consumes a slot only when at least one capability
   and table can read its scope for at least one investigable unit.
4. **Admission is decided on the closed set.** Updates are validated as they arrive but admitted only
   once the update set is closed (A complete or declared failed). Candidates rank by dimension count
   (deeper first), then `contribution_pct` (higher first), then `seq`; the top ones fill the remaining
   slots, the rest are `NOT_TESTED / LENS_CAP`. Sibling cuts are never all investigated.
5. **Reuse.** A new lens never restarts `experiment-master`. Discovery, lifecycle, arms and design,
   windows and candidate ranking are reused; only scope-dependent work runs for the lens (scoped
   `COVERAGE`, Stage 1 and 2 evidence, correlation, the evidence record).
6. Dedupe key `(request_id, scope_signature)`. Of updates sharing a signature the one with the **lowest
   `seq`** is the holder and the others are `DUPLICATE`, whatever order they were delivered in; an update
   equal to a lens already held (including lens 1) is a `DUPLICATE` of it. A `DUPLICATE` acknowledged on
   arrival is revised if a lower-`seq` update with the same signature arrives later. Lenses are never
   pooled. Scope is never broadened.

## Game-level movement (Input B)

`experiment-master` resolves Input B when the update set closes, not in B0, and not at all for a run
closed at `DISCOVERY`. If A's `game_movement_candidates` contain a result matching the lens in **metric,
scope, impact period and comparison period**, that result is reused: zero statements,
`source: STREAM_A_EXTRACTION`. Otherwise `experiment-master` issues its existing game-level request.
`experiment-master` makes the match, since it owns the windows. `definition_alignment` is unchanged
(revenue stays `NOT_IDENTICAL`). The reused figure stays Layer A trigger movement and is never Layer C
experiment evidence.

## Synthesis

After both streams close, `brian-master` composes the answer. It adds no figure, claim or chart and
reinterprets neither stream.

| Section | Source, carried verbatim |
|---|---|
| 1. Metric diagnosis | Stream A's answer: its charts, drill path, findings, attribution buckets, causation flags |
| 2. Experiment lifecycle association | Experiment Master Layer B per unit and lens: class, relevant event, tier as "timing and exposure ordering only" |
| 3. Experiment evidence | Layer C: pair-level movement per capability with every `NOT_TESTED`, `UNSUPPORTED`, `PHASE_CEILING`, `LENS_CAP` state; reference-arm movement |
| 4. Correlation | Layer D, on identical canonical scope, labelled correlation |
| 5. Causal evidence | Layer E, `NONE_ESTABLISHED` unless the evidence contract supports more; ends with what the data does not establish |

- The movement figure appears once, attributed to Stream A (SR-24); experiment sections refer to it.
- A run closed at `DISCOVERY` shows sections 3–5 as one line: not run, the gate reason, how to deepen.
  A section that did not run is never blank.
- A metric-side attribution or causation label is never presented as experiment evidence; timing is
  never presented as causation; disagreement between the streams is shown, not reconciled.
- An experiment ramp that A mentions from annotations stays commentary inside section 1 (SR-14).
- One stream failing never cancels the other; the failed one is stated with its reason.
- SR-23 ceilings apply to each stream's own answer; the synthesis adds headings and the one-line
  states above only. An explicit experiment ask has one stream and no synthesis.

## Failure semantics

A `PARTIAL` extraction goes forward with its gaps named; B continues on the T0 context. A `NONE`
extraction means E3 cannot be met and B closes at `DISCOVERY` unless E1 or E2 applies. If B fails,
synthesis states it and A's answer is unaffected. Host state is the conversation's: a stream that cannot
be resumed is reported as such, and the user can re-ask.
