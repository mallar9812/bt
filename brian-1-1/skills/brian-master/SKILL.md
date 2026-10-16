---
name: brian-master
description: "BRIAN v1.1 master router — the entry point for EVERY Playsimple analytics question. Classifies intent, hands off to exactly ONE analyst skill (a metric investigation may additionally open an independent experiment stream — see references/evidence-streams.md), and attaches a depth level (D0 mention · D1 check · D2 diagnose · D3 full investigation) so a broad \"how is X doing\" never turns into an accidental deep dive and a \"why did X drop\" never stays shallow. Owns the shared rulebook every analyst inherits (query-only, D-2 freshness, calendar anchoring, verdict grounding, formatting), the investigation protocol, and the escalation policy. Load FIRST for any Playsimple game/portfolio/metric question: performance, KPIs, healthcheck, retention, engagement, revenue, Rev/DAU, ROAS, spend, experiments, competitors, definitions, or any \"why did X move\" — then follow its routing to the right analyst.\n"
---

# BRIAN Master — route the question, assign the depth

Thin router. Do three things, then get out of the way: **classify intent → pick exactly one analyst
→ attach a depth level**. Never answer the data question from this skill.

## Hand-off contract

Every routing decision produces this, stated internally before any query:

```
{analyst: <skill>, depth: D0–D3, entities: <games/franchise/platforms/tiers via ps-entities>,
 window: <resolved calendar period>, segment: <filters>, visuals: <the SR-22 floor for this depth>}
```

The analyst may not exceed its assigned depth (see `references/depth-policy.md`); it may offer the
next level when its budget ends inconclusive. **It may not fall below the depth's visual floor
either** — `visuals` is part of the contract, not an optional extra (SR-22).

**The hand-off never carries stream fields.** When a metric investigation also opens an experiment
stream (`references/evidence-streams.md`), the analyst's hand-off is exactly the record above, byte for
byte; the stream's bookkeeping lives in a separate orchestrator-only record the analyst never receives.

## Routing

Full trigger-phrase table: `references/routing-table.md`. The short version:

| Question shape | Analyst skill | Default depth |
|---|---|---|
| "How is [game/franchise/portfolio] doing/performing", KPI summary, dashboard, ROAS/LTV/spend/eCPI | `analyst-game-performance` | D0 per domain touched |
| "Compare A vs B", "top N by [metric]", "which game is best" — any ranking across 2+ entities | `analyst-game-performance` | **D1-C** (full Procedure C column set) |
| "Daily healthcheck", "anything broken?", morning scan (also scheduled) | `analyst-daily-healthcheck` | D1 per cell |
| Measured experiment outcomes: "read experiment X", A/B results, "how did the test do", PAB read, "did [test] move [metric]", "why did [metric] move in [variant]", "what did experiments do to [metric] in [period]", "which experiments could have caused [metric] to move in [period]" | `analyst-experiment-reads` → `experiment-master` | mode-defined: D2 / D3 |
| Experiment ramp / allocation timeline, kill-or-ship status, Admon/PAB commentary — no measurement | `analyst-experiment-reads` | — |
| Metric definition, formula, "which table/chart holds X", dimension values, glossary, quick single number | `analyst-general-questions` | D0 |
| Competitor, rival app, market/genre benchmark (Sensor Tower) | `analyst-comp-data` | D0/D2 per ask |
| "[classic] retention dropped/spiked/why" | `investigate-retention` | D2 (D3 on "investigate/root cause") |
| Engagement / sessions / time spent / actions/DAU / stickiness moved | `investigate-engagement` | D2 (D3 likewise) |
| Rev/DAU moved; revenue moved with flat DAU (or vice versa) | `investigate-rev-dau` | D2 (D3 likewise) |
| Rolling retention (D1/D3 rolling) moved | `investigate-rolling-retention` | D2 (D3 likewise) |

Rules:

- **One analyst per question — with one defined pairing.** A multi-part question is answered by the
  primary analyst, which may hand off follow-ups. Never load two metric analysts side by side for one
  ask. The single exception is the evidence-stream pairing in `references/evidence-streams.md`: an
  eligible metric investigation runs its routed analyst (Stream A, unchanged) beside an independent
  experiment stream (Stream B).
- **Experiment-measurement asks go to `analyst-experiment-reads` (which invokes `experiment-master`)
  before any metric-family row.** A "why did [metric] move" that names an experiment or variant is an
  experiment ask; the metric-family investigators never take it. A mixed ask (status and measurement)
  also goes there, and `experiment-master` reads annotation status itself. An ask that pairs an open
  metric "why" with experiment intent ("why did Rev/DAU drop, check experiments") is not an experiment
  ask alone: it opens both streams (`references/routing-table.md` § Mixed asks).
- **Direct deep-dive asks skip Tier 1** — "why did D7 retention drop?" routes straight to
  `investigate-retention` at D2.
- **Escalation is a depth upgrade, not a re-ask.** When a Tier-1 answer trips the Notable-Change
  threshold (|Δ| > 10%) or the user asks "why", hand the already-resolved
  {entities, window, segment} to the matching investigator at D2 — the investigator never re-asks
  what's known.
- **Metric families that share a label are separated on evidence, not on keywords.** Several families
  carry near-identical short names and abbreviations, and a user naming one of them rarely spells out
  which they mean. **Absence of a family's keyword is not evidence for the other family** — people
  abbreviate the metric they look at every day. Route on the stronger signals: the *level* the user
  quotes (each family sits in its own band), the *shape* they describe, and the surface they work from.
  Where two families stay plausible, route to the better-supported one and carry
  `disambiguate: <family A vs family B>` in the hand-off so the investigator settles it in Stage zero
  by pulling both — that is two extra rows in a `GROUP BY`, not a second investigation.
- **Route on the user's intent, then let the analyst correct the metric.** A hand-off names the best
  current guess; discovering mid-run that a sibling family fits better is a metric correction inside
  the same run at the same depth (`depth-policy.md`), not a reason to stop and re-ask.
- Vague question → settle what defaults and a cheap query can settle, then route. Ask at most **one**
  clarifying question, and only where no reasonable default exists and the answer changes the analysis
  (SR-21) — never hold a routable question to confirm a single-candidate entity match, a calendar
  window the anchoring rules already fix, or a metric family a query would resolve. Outside Playsimple
  analytics → say so plainly.

## Evidence streams

Orchestration only; the full contract is `references/evidence-streams.md`. A metric investigation
(D2/D3 on an investigator row, or `analyst-game-performance` running the investigation protocol) opens
two independent streams:

- **Stream A** — the routed metric analyst, run exactly as today with an unchanged hand-off.
- **Stream B** — `analyst-experiment-reads` → `experiment-master`, started at `DISCOVERY` (cheap
  discovery only) and raised to `EVIDENCE` only per the escalation gate (E1/E2 alone, or E3 and E4
  together).

You read A's existing output, extract context from it (trigger, direction, magnitude, periods, scope,
material cuts) and pass it one way to Stream B. Nothing B produces ever reaches A, and A is never told
the stream exists. Run in the host's execution mode — `SEQUENTIAL_A_THEN_B` by default,
`PARALLEL_ISOLATED` only where isolated parallel execution is explicitly supported. The two streams
meet only in the final synthesis. Explicit experiment asks open no stream. The healthcheck, D0, D1 and
D1-C routes never open one.

## What every analyst inherits

- `references/shared-rules.md` — the common rulebook (query-only, D-2 + date alignment, calendar
  anchoring, net+gross, PoP deltas on every metric, formatting, verdict grounding + weighting,
  actuals-before-predictions, presentation format, and the length/table discipline SR-23…SR-28:
  prose budget per depth, each number once, assert-don't-argue, conditional sections, comparisons as
  group claims, and table construction). Analysts state domain-specific rules only.
- `references/depth-policy.md` — the D0–D3 depth contract and stop gates.
- `references/investigation-protocol.md` — the shared drill (L0→L1→L2), hypothesis-verdict
  discipline, attribution ontology, annotations evidence layer, BLOCKED-note grammar. Binding at
  depth ≥ D2.
- Data & context only via `ps-data-catalog` (start at its **Fast path** box) and `ps-entities`.
  No analyst hardcodes a datasource or a chart version.
- **`game-viz-design` — LOAD it, don't just cite it.** Every analyst and investigator renders its own
  visuals by invoking this skill; the widget mechanism and chart patterns live inside it, so naming it
  in prose produces nothing. **Each skill owns its charts** — routing to a single analyst never routes
  the charting elsewhere, and no skill may assume another one will draw the picture. The per-depth
  minimum is SR-22: **D2 and deeper always ship at least one chart.** Branded PPTX/PDF exports via
  `ps-brand-report`.
