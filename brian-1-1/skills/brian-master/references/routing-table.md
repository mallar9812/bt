# Routing Table — trigger phrases → analyst skill

Match the question's *intent*, not just keywords. First match from the top wins; a "why/investigate"
qualifier overrides a summary phrasing.

| Trigger patterns (examples) | Skill | Depth |
|---|---|---|
| any ask for measured experiment outcomes: "read experiment X", "A/B results", "how did the test do", "PAB read", "did [test] move [metric]", "why did [metric] move in [variant]", "what did experiments do to [metric] in [period]", "[metric] dropped between [date] and [date] — which experiments could have caused it?" — when the ask carries no unrestricted metric "why" (see § Mixed asks) | `analyst-experiment-reads` → `experiment-master` | mode-defined: D2 / D3 |
| experiment ramp / allocation timeline, kill-or-ship status, Admon/PAB commentary, with no measurement: "what experiments are live/ramped/killed/shipped on [game]", "ramp history for X" | `analyst-experiment-reads` | — |
| "investigate…", "root cause…", "deep dive on [metric]", "why exactly…" | matching `investigate-*` | D3 |
| "why did [classic] retention drop/spike", "D7 retention fell" | `investigate-retention` | D2 |
| "rolling retention dropped", "D1/D3 rolling moved" | `investigate-rolling-retention` | D2 |
| "why did sessions/time spent/actions per DAU/stickiness drop", "engagement fell" | `investigate-engagement` | D2 |
| "Rev/DAU dropped", "revenue down but DAU flat", "why did rev/dau move" | `investigate-rev-dau` | D2 |
| "why did revenue/DAU/spend/ROAS move" (no single owning investigator) | `analyst-game-performance` runs the investigation protocol at D2 for that metric | D2 |
| "daily healthcheck", "morning scan", "anything broken today?", "portfolio health" | `analyst-daily-healthcheck` | D1 |
| "compare A vs B", "which game is best", "top N games/franchises/countries by [metric]", "rank the portfolio", any ask covering 2+ entities side by side | `analyst-game-performance` | **D1-C** |
| "how is [game/franchise/portfolio] performing/doing", "KPI summary", "dashboard for X", "ROAS/LTV/spend/eCPI for X", "LiveOps impact" | `analyst-game-performance` | D0 |
| "what does [metric] mean", "formula for X", "which table/chart holds X", "values of [dimension]", "define…", quick single-number lookups | `analyst-general-questions` | D0 |
| "[competitor] performance", "vs [rival app]", "market/genre benchmark", "Sensor Tower…" | `analyst-comp-data` | D0; D2 when asked why |
| "make a report/deck/PDF of…", "monthly/quarterly review deck", "export this to slides", "one-pager on…" | primary analyst answers, then `ps-brand-report` formats | **max(inherit, D2-R)** |

**Row order is load-bearing.** The D1-C comparison row sits **above** the D0 "how is X performing" row
because first match from the top wins, and a multi-entity ask phrased as a performance question ("how
are Word Trip and Word Bingo performing") otherwise matches the D0 row first and runs a comparison at
D0. Do not reorder these two.

The two experiment rows sit at the **top** for the same reason: the investigate and "why did [metric]
move" rows would otherwise capture an experiment question that names a metric. A mixed ask (status and
measurement) goes to `analyst-experiment-reads`, which invokes `experiment-master`; `experiment-master`
reads annotation status itself. `experiment-master` chooses its own mode and depth (D2 or D3).

Tie-breaks:

- A named metric with a named direction ("retention **dropped**") beats a generic summary phrasing.
- "How is X doing **and why is retention down**" → `analyst-game-performance` (primary) at D0, with an
  immediate hand-off of the retention part to `investigate-retention` at D2.
- Anything mentioning a competitor name routes competitor parts to `analyst-comp-data`; internal parts
  stay with the primary analyst — never blended in one series.
- **A deliverable qualifier raises the depth floor, it does not change the analyst.** "How is the
  portfolio doing — as a deck" still routes to `analyst-game-performance`, but at **D2-R**, not D0:
  the deck's Breakdowns and Detail sections need cuts that D0 forbids. See `depth-policy.md` § D2-R.
  Never let the formatting request read as a formatting-only request.

## Mixed asks and the companion experiment stream

A question can carry two signals: **X**, explicit experiment intent (it names an experiment, test,
variant, A/B or PAB read, or asks about experiments), and **M**, an unrestricted metric-diagnosis ask
("why did [metric] move", root cause, deep dive) that is not restricted to experiments. A why-question
scoped to a named experiment or variant, or a cause question restricted to experiments, is not M. The
rows above are unchanged; this section only says when a metric row also opens an experiment stream
(contract: `evidence-streams.md`).

| Example | X | M | Routing |
|---|---|---|---|
| "Read experiment X", "Analyze experiment X v4", "Give me an experiment read" | yes | no | `analyst-experiment-reads` → `experiment-master`; no metric analyst, no stream record, no synthesis |
| "Which experiments could have caused Rev/DAU to drop?" | yes | no | same: experiment-only, `experiment-master` in PERIOD mode |
| "Why did Rev/DAU drop, check experiments"; "Why did Rev/DAU drop — was it the test?" | yes | yes | the metric row (`investigate-rev-dau`, unchanged) **and** an experiment stream started at full evidence |
| "Why did Rev/DAU drop?" | no | yes | the metric row (`investigate-rev-dau`, unchanged) **and** an experiment stream started at discovery only |
| "How is [game] doing?", healthcheck, comparisons, definitions, competitors | no | no | the rows above, no experiment stream |

An ambiguous phrasing is treated as mixed. The metric analyst's hand-off is the same record in every
case; the experiment stream is orchestration beside it and is never part of it.

## Same-label metric families — the routing trap

The rows above read as if each metric name maps to one skill. Several do not. **Distinct metric
families share short labels, day-index notation (`D1`, `D7`), and abbreviations, and a user naming one
almost never spells out which family they mean.** Routing these on keyword presence is the single
easiest way to run a flawless investigation on the wrong series.

Known overlaps to treat as ambiguous by default:

| Ambiguous ask | Candidate families | Owning skills |
|---|---|---|
| "retention", "RR", "D1/D7 retention", "retention ratio" | classic install-cohort `dX` · flag-based rolling · activity-based return rates | `investigate-retention` · `investigate-rolling-retention` |
| "engagement", "activity", "usage" | sessions/time-spent · in-game actions · WAU/MAU stickiness | `investigate-engagement` (one skill, but different charts and bands) |
| "revenue per user", "ARPDAU", "RPD" | Rev/DAU on activity grain · cohort LTV on install grain | `investigate-rev-dau` · `analyst-game-performance` |

How to break them — in order, stopping at the first that decides:

1. **The level.** Each family occupies its own band for the same game and window. A level the user
   quotes that sits far outside the family you were about to route to is pointing at a different
   family, a different denominator, or a different segment — treat it as the strongest available signal
   (SR-17).
2. **The shape and the vocabulary around it.** Which direction, over what period, described how.
3. **A cheap dual pull.** Where 1 and 2 leave two candidates, route to the better-supported one and set
   `disambiguate:` in the hand-off; the investigator resolves it in Stage zero by querying both families
   over the same window and adopting whichever reproduces the user's level.

**Never route a same-label ask by the absence of a keyword** ("they didn't say rolling, so it's
classic"). Absence of a qualifier means the user did not think a qualifier was needed — usually because
in their own workflow the label is unambiguous.

Also: a **ratio the user names may not exist in the family they mean** (a `Dx/Dy` ratio where the family
only carries some day indices). Do not silently answer with the other family's ratio. Give the nearest
in-family ratio, name the substitution, and add the sibling family's equivalent alongside it, labeled.
