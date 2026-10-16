# Template population — sections and their sources

`references/report-templates.md` defines the templates, their selection and their sections. This file
only says which structured field fills each section and what is shown when it is empty. It changes no
template, section, requirement or selection rule.

Empty handling: an optional section with no evidence is left out (SR-26). A required section that
lacks its input is still shown, with the status of the missing input (for example
"Stage 2 not run", "PAB not run", "daily series not returned").

## Shared

| Section | Source |
|---|---|
| Experiment Card | `MasterState.context` and annotations, per `report-templates.md` § Experiment Card. Missing fields as defined there ("not available", "unknown", "allocation not documented in annotations"). |
| Period & segment line | `MasterState.context` windows, scope, versions (`output-format.md` § Period & segment line) |
| Charts | `charts.md` |
| Next question | the Master's recorded follow-ups that have not run (`MasterState.pending_followups`), as recorded; never generated from prose, and no analysis, check, query or action that was not recorded is offered, a PAB check included. With none recorded there is no offer line. When a material user input is missing, the one optional follow-up of `input-resolution.md` takes this slot and the recorded follow-ups, when any exist, close it as one `Or …` offer line |

## A — Standard Experiment Read

| Section | Source |
|---|---|
| Setup and windows | `MasterState.context`: design, comparisons, analysis and matured windows, scope |
| Outcome summary | the Verdict candidates of `evidence-selection.md`, composed as § Verdict composition (the same bullets a Detailed Read's section 1 would carry), and the annotation status; the recommendation is goal-conditional (§ Verdict composition), never an order to ship or kill |
| Primary metric outcomes | only metrics the user named as primary in this conversation; absent otherwise |
| Supporting metric outcomes | `summary-table.md` § Headline table: the Tier 1 and Tier 2 results of `evidence-selection.md`, one row each, followed by one line stating how many Tier 3 and Tier 4 results the Detailed Read holds; nothing is silently dropped, and the Detailed Read remains the complete record |
| Guardrails line | the Tier 3 results (Neutral) by name ("neutral: …"), from `evidence-selection.md`; absent when none |
| Named guardrails line | the metrics the user named as guardrails (`input-resolution.md` I3), each with its Read word from `summary-table.md` and no number; absent when none were named. It never changes a tier, and the Guardrails line above is unchanged |
| CI lines | only when the user asks ("show CI", SR-2 override): each computed headline result's labelled CI line as `summary-table.md` § Detailed Read table defines it; otherwise absent |
| Key positive and negative movements | results whose `direction` (`visual-evidence.md` § Direction) is established; absent otherwise |
| Evidence quality and limitations | `data_conditions`, maturity, `UNCONFIRMED` definitions, `NOT_TESTED` work, and the unanswered-inputs line of `input-resolution.md` |

## B — Targeted Diagnosis

| Section | Source |
|---|---|
| Requested metric and exact scope | `MasterState` request inputs and canonical scope with value-group expansions |
| Movement of the requested metric | the requested metric's ledger entries, per unit and pair (`summary-table.md` rows) |
| Where it moved | the capability's Stage 2 `findings[]` and `cuts`, as returned |
| Cohort and segment findings | the same sources; New and Old user cells shown as separate descriptive findings |
| Established vs not established | ledger `direction` and states |
| Depth-3 additions | mix-shift, evidence timeline and hypothesis table, only when produced |

It carries no full-experiment results table.

## C — PERIOD Impact Read

| Section | Source |
|---|---|
| Trigger metric, scope, lookback, windows, onset | `PeriodEvidenceRecord` and `MasterState.period` |
| Trigger movement and evidence | game-level movement (labelled game level) and trigger evidence per unit, as recorded |
| Supporting capability evidence | ledger entries with their movement labels |
| Same-axis correlation | ledger `correlation`; `NOT_COMPARABLE` listed by name |
| Limitations | `NOT_TESTED`, `OUT_OF_BUDGET` units, excluded units, data conditions |

Association is never worded as cause.

## D — Metric Investigation

| Section | Source |
|---|---|
| Metric definition and reference value | `definition_lock` and the reference value as returned |
| Overall movement | the metric's ledger entries per unit and pair |
| Driver breakdown | Stage 2 contributors and Stage 3 mix-shift, as returned |
| Supported cuts and cohorts | cell results under their parent, as returned |
| Final diagnosis and evidence strength | established findings and association-only hypotheses with their status; no ship or kill |

## Detailed Read (Template A, on experiment-read wording)

When a dashboard is built, only section 1 (Verdict) of this layout goes to chat, and the other nine sections live on the dashboard (`report-generator.md` § Chat answer when a dashboard is built); the full ten-section layout below is used only for a read with no dashboard.


Used only when `report-generator.md` step 1a selects it for a `FULL_EXPERIMENT_READ`: the user's
request asks for an experiment read without a high-level qualifier (brian-master SR-2, for that
response). Template selection, special states and Templates B, C and D are unchanged. In those, an
explicitly requested detailed read is answered in the existing format, with a note that the Detailed
Read layout does not apply and why. Sections, exactly in this order:

| # | Section | Source | When unavailable |
|---|---|---|---|
| 1 | Verdict | the Verdict candidates of `evidence-selection.md`, composed as § Verdict composition below, and annotation status (`SHIPPED` or `KILLED` only as annotated) | the recommendation is goal-conditional, never an order to ship or kill |
| 2 | Objective | Experiment Card user-provided objective | "not provided" |
| 3 | Feature description | Experiment Card user-provided changes per variant | "not provided" |
| 4 | Experiment details | Experiment Card and setup and windows | as the Experiment Card defines |
| 5 | Summary | `summary-table.md` § Detailed Read table, priority rows first | row statuses |
| 6 | Recommendations | the Master's recorded follow-ups, as recorded, and unresolved data gaps; a check or analysis that was not recorded as a follow-up is not offered | "no further step identified"; never ship or kill |
| 7 | General metrics | when the user named guardrail metrics, one opening line "Named guardrails (user-provided): …" as § A defines; then the results of the registered capabilities, by capability, a result whose metric carries a stated intent taking the clause of § Verdict composition, Stated intent; within a capability in the order of `evidence-selection.md` § Order, each with its Read word (`summary-table.md` § Detailed Read table) and its chart or fallback line (`charts.md`); a number already in the Summary table is not repeated in prose (SR-24) | statuses carried |
| 8 | Feature metrics | always present | "Feature-metric data is unavailable: no capability or source returns feature-specific metrics for this experiment." |
| 9 | Detailed insights | two labelled groups, as returned: "Supported findings" (results and cells whose `direction` is established) and "Hypotheses (association only)" (Stage 3 hypotheses and association-only findings); a finding and a hypothesis never share a bullet; a Stage 2 cell is "concentrated in", never "caused by"; cells stay under their parent, as returned; adjusted and observed values as returned | "No additional detailed insights are available: no supported findings were returned." |
| 10 | Closing summary | what the data does not establish, the unanswered-inputs line of `input-resolution.md`, and the next question | — |

**Layout rules for a Detailed Read:**
- **Verdict first.** The answer begins with section 1, Verdict. No title, heading, preamble, context
  paragraph or Experiment Card comes before it. The first line of the answer is the section 1 heading
  itself; no sentence precedes it, including one saying what is being read or which tools are unavailable.
- **All ten sections.** All 10 sections appear, each under its own numbered heading, in the order
  above. Section 9 is never left out: when no supported findings exist, it states the sentence above.
  Section 6 is never left out and never merged into section 10: with no recorded follow-up and no unresolved
  data gap it states "no further step identified" under its own `## 6. Recommendations` heading, and section 10
  does not carry its content.
- **Experiment Card in section 4 only.** The Experiment Card's content appears only inside section 4,
  Experiment details. It is not shown before section 1 and not repeated later. For a Detailed Read this
  replaces the shared rule that the Experiment Card opens the answer.
  No Experiment Card field (experiment, game and platform, version, windows, design, allocation, status,
  scope) is restated, listed or labelled anywhere outside section 4, including as a data gap in section 6:
  an unresolved card field is described only in section 4.
- **Where context goes.** Context that would otherwise be a preamble (what ran, what did not, data
  provenance, tool or chart availability) goes in section 4 or section 10.
  A Detailed Read states that no chart renderer is available once, in section 4 or section 10 (this replaces the
  placement "with the visuals" of `charts.md` § Text fallback). Sections 7 to 9 carry only the labelled fallback
  lines, and no sentence in the answer calls a chart "below" or "above".
  The statement reads exactly: "Charts: no chart renderer is available in this session; each requested chart is
  given as one labelled text line in sections 7 to 9."

**Verdict composition (section 1):** up to nine bullets, in this order, one per row of the dashboard's Verdict
(`dashboard.md` § Verdict rows). The two always read the same. A bullet without a supporting result is
left out; nothing is put in its place. Never write a placeholder bullet that says a part is absent, empty
or not applicable (for example "no positive result", "none is listed"). The response begins with the line
`## 1. Verdict`: no introductory sentence, preamble, note or other content comes before it, as § Layout
rules for a Detailed Read requires. Each bullet starts with its bold row name and, in brackets, its chip
word (`Decision`, `Neutral`, `Lift`, `Cost`, `Shift`, `Mixed`, `Up`, `Down`, `Caution`).

1. **Recommendation (Decision):** one headline sentence saying what case the data support for the
   comparator over the reference variant and what it costs, then one goal-conditional close:
   "If <goal A> is the goal, <comparator> is <upside | a marginal upside | not supported>; if <goal B> is
   the goal, <…>." The goals are the primary metric's and the revenue guardrail's; the sentence and the
   close are composed only from bullets 2 to 8 and add no number, metric or claim that is not in them. It
   never orders a ship or a kill, never gives a cause, and uses the word "variant", never "arm". With no
   Tier 1 to 3 result it says so and gives the caveat.
2. **Primary metric:** the primary metric's adjusted change in its unit with its reading. The primary
   metric is the one the user named; when none was named it is inferred from the test type and the
   bullet says "(inferred from the test type)": unlock, engagement, level or content tests, retention
   (Rolling D1 and D3, then classic) with revenue as a guardrail; monetisation, pricing or ads tests,
   Rev/DAU. When the test type cannot be told from the experiment name, the Experiment Card objective or
   the user's words, retention is used and the bullet says "(assumed)". Ranges that span zero are worded
   "a lack of evidence, not evidence of no effect".
3. **Value of the installs:** LTV, LTDays and Rolling LTV, observed †, with the horizons not matured.
4. **Mechanism:** what moved in the engagement and ad mix: Clear/DAU with its observed value and
   pre-test gap when PAB changed the picture, the puzzle split, hints and views, and the ad mix. It ends
   "the data show the pattern, not why it happens".
5. **New users:** one cut (user type new), observed †.
6. **Old users:** one cut (user type old), after PAB.
7. **Revenue guardrail (Mixed, Pass or Watch):** whole population only: Rev/DAU after PAB and observed, the
   component that costs, the neutral ad types, payers against non-payers.
8. **In-game economy:** spent (shown positive), purchased, earned, earners and spenders; net cash as a
   delta, not classified.
9. **Discount (Caution):** the single caveat `evidence-selection.md` selects, stated precisely (for example
   "the PAB window overlaps version 2, so the pre-test gap can already contain an effect of the feature").
   A missing PAB is worded as "observed †", never as making the result unreliable.
There is no Scope bullet. The window, reference variant, PAB window, versions not read and annotation status are
stated in section 4 only.

**One level of bullets.** The Verdict's bullets are the nine above and nothing else. Clauses inside a
bullet (for example one per unit group) are running text, each starting with its label (for example
`Relative-change metrics: …; Basis-point metrics: …`); no clause is a sub-bullet, and no bullet has a list
under it. A bullet is about one cut or one section only (SR-27): user type, cohort, payer and puzzle type
are never mixed in one bullet.

**Stated intent (user-provided).** When the user stated an intended direction for a metric in this
conversation (`input-resolution.md` I2), a metric named in bullets 2 to 8 may carry one short clause,
"in line with the stated intent" or "against the stated intent", chosen only by this table. Intent up
with `ESTABLISHED_UP` is in line and with `ESTABLISHED_DOWN` is against; intent down is the reverse;
intent no change is against for a Tier 1 or Tier 2 result with an established direction and in line for
a Tier 3 result. No other combination carries a clause. A metric with no stated intent, a
`NOT_ESTABLISHED` direction, or a stored-sign Economy metric (`metric.sign_convention` `STORED_SIGN`, where
up and down are ambiguous) never does. In a bullet that lists several metrics the clause follows the
metric it describes. The clause carries no number, no cause and no ship or kill wording, and never
changes a result's tier, `direction` or colour. With no stated intent the Verdict is exactly as above.

Each number appears at most once in the Verdict, as an adjusted (after PAB) or observed (†) value in the
formats of `output-format.md` § Results and meaningfulness. The Verdict gives no cause and no hypothesis.
The meaningful line (1%, 10 bps) and the Conf bar are stated at most once, in the first bullet that
relies on them; a later bullet says "same line" instead of repeating the number.

Charts still meet the SR-22 floor and sit inside General metrics and Detailed insights. Numbers come
only from structured results, never from analyst prose, and no new statistic is derived.
