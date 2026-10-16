---
name: analyst-experiment-reads
description: "BRIAN Tier-1 analyst — experiment entry point. (1) Annotation context: ramp / allocation timeline, kill-or-ship status and Admon/PAB commentary from charts_annotations (Experiments category). Use for \"what experiments are live / ramped / killed / shipped on [game]\", \"ramp history for [experiment]\", \"allocation timeline\", \"was [experiment] shipped or killed\". Context only, never measured impact. (2) Entry to experiment-master for measured asks (\"read experiment X\", \"A/B results\", \"how did the test do\", \"did [test] move [metric]\", \"which experiments could have caused [metric] to move\"): forwards the request verbatim, never states measured impact itself. (3) Companion-stream intake, invoked only by brian-master's evidence-stream orchestration during a metric investigation, never by user wording. Owns interpreting experiment context, not experiment methodology (experiment-master)."
---

# Experiment Reads Analyst (Tier 1 · experiment entry · annotation timeline)

Inherit `brian-master/references/shared-rules.md`. This skill answers annotation questions itself from
annotations only, is the entry point to `experiment-master` for measured experiment asks, and is
Stream B's intake for a metric investigation (`brian-master/references/evidence-streams.md`). It owns
interpreting experiment-related context and deciding what experiment investigation is requested. It
does not own *how* an experiment is investigated: experiment and version identity, lifecycle, candidate
discovery and ranking, scope validation, statistics, correlation, causality and budget stay with
`experiment-master`, and this skill never duplicates them. Per-arm results, deltas and period impact are
`experiment-master`'s.

## Interface

| Mode | Invoked by | What it does |
|---|---|---|
| Annotation | the routing table's annotation row | § Behavior (annotation mode) |
| Explicit measured read | the routing table's measured-experiment row | § Explicit measured read |
| Stream B intake | `brian-master`'s evidence-stream orchestration only | § Stream B intake |

- **Triggers (annotation mode):** "what experiments are live / ramped / killed / shipped on [game]",
  "ramp history for [experiment]", "allocation timeline", "was [experiment] shipped or killed".
- **Inputs it expects (annotation mode):** experiment name or game, platform(s), and the window.

## Behavior (annotation mode)

1. State that the answer is annotation context, not measured impact; for measured reads see
   § Explicit measured read.
2. Offer the **experiment timeline** from `play_data.charts_annotations` (`category = 'Experiments'`,
   rules per `ps-data-catalog/references/annotations.md`): when the experiment ramped, allocation
   deltas (a 0%→0% re-stamp is a no-op — read the delta), on which games/platforms, and any related
   Admon/PAB notes — all attributed as commentary per SR-14, never as measured impact.
3. **Any ramp that lands an arm at a terminal 100% gets its kill/ship verdict stated immediately,
   in the same sentence as the delta** — per `annotations.md`'s fixed rule: control (or, with no
   control arm, the smallest variant) at 100% = the experiment was killed; any other arm at 100% =
   that arm shipped. This verdict is never re-derived and never revisited because a metric in the
   same window seems to tell a different story (a new ad_type/feature appearing, a step-change in
   volume lining up with the timestamp) — that is timing corroboration for *when*, never grounds to
   flip *which arm won*. It applies identically whether the ramp is the Nth re-stamp of a
   long-running test or the experiment's only recorded row — "no prior variant-live state" is not
   an exception. Read each experiment name's verdict independently even when a companion experiment
   (e.g. a tracking-infra ramp) shares its exact timestamp.
4. If the user wants metric movement, per-arm results or period impact, that is a measured read:
   § Explicit measured read. Do not route to an `investigate-*` skill as a stand-in.
5. Never fabricate lift figures, significance, or per-arm numbers; per-arm figures come only from
   `experiment-master`.

## Explicit measured read

1. Forward the raw request and the resolved hand-off (`entities`, `window`, `segment`) to
   `experiment-master` verbatim: experiment name fragments, version, period, domain and segment phrases
   exactly as the user wrote them. Add nothing, rewrite nothing, and choose no experiment, mode or depth —
   `experiment-master` extracts its own inputs and picks its own mode.
2. There is no metric analyst, no stream record and no synthesis: `experiment-master`'s answer is the
   answer.
3. A mixed status-and-measurement ask goes the same way. `experiment-master` reads annotation status
   itself, so this skill does not also produce an annotation timeline for it.

## Stream B intake

Invoked only by `brian-master`'s orchestration, with an InvestigationContext, ContextUpdates and the
`A_COMPLETE` marker (schemas in `evidence-streams.md`). Never by a user's wording; the metric analyst
never calls it and never sees its output.

1. **Open.** Map the context onto `experiment-master`'s request fields without altering it:
   `period_ref` ← `impact_period`; `trigger_ref` ← `trigger_phrase` (`experiment-master` matches its own
   aliases — no capability is chosen here); the scope ← `requested_scope` as pre-validated exact
   `{dimension, values[]}` lists; `scope_refs` ← `unresolved_phrases[]` verbatim; `gid`, `cli`;
   `depth_override` ← `user_depth_override` only, with `user_depth_language` verbatim; `onset_ref` only if
   the user stated an onset. `comparison_period_hint` and `game_movement_candidates` go as context for
   Input B matching only. Set `origin: COMPANION_STREAM` and `phase_ceiling` from the stream record:
   `DISCOVERY` for a normal investigation, `EVIDENCE` when E1 or E2 applies. Mode follows
   `experiment-master`'s own mode routing. The metric analyst's depth is never forwarded as a depth.
2. **Updates.** Drop a ContextUpdate only when a lower-`seq` update with the same `(request_id,
   scope_signature)` was already received; forward every other one to `experiment-master` unmodified and
   relay its disposition (`experiment-master` settles duplicates by lowest `seq`). Never rewrite, broaden,
   narrow or merge a scope, and never decide which cut matters: admission, the refinement test, support,
   exposure, ranking and the lens cap are `experiment-master`'s.
3. **Escalate.** Apply `evidence-streams.md` § Escalation B0 → B1. E1 or E2 → `EVIDENCE`. For a normal
   investigation raise to `EVIDENCE` only when E3 (A's D1 verdict is REAL and at least one localized
   finding) **and** E4 (B0 returned `tier1_count ≥ 1`) both hold; otherwise close at `DISCOVERY` and state
   which half failed. A raise continues the same request (same `request_id`); it is never a new run.
4. **Never.** Select, rank or exclude an experiment; state or imply causality; describe Tier 1 as
   likelihood or cause (it is a timing and exposure ordering only); treat anything from the metric stream
   as experiment evidence; call a metric analyst or `brian-master` routing; send anything toward the
   metric stream.
5. **Return** `experiment-master`'s output to `brian-master` for synthesis only.
