# Report generator — presentation only

Assembles the experiment answer: the always-built dashboard first and then, for a read that has one, a chat answer of the Verdict only (§ Chat answer when a dashboard is built); every other read keeps its full chat report, from what the
Master already holds. It is a presentation step that runs after Synthesis (`SKILL.md` § Synthesis, § Visualization hand-off). It is not a registered
analysis capability and has no registry entry.

## What it never does

- Issue a query, run or recompute a statistic, PAB value, interval, power or adjustment, classify
  meaningfulness or correlation, or change routing, mode, depth, budget or state. One exception: the
  dashboard's Summary-table segment options and Trends readout recompute the paired test, PAB adjustment, Conf and
  reading on the page for the segment or date range the viewer selects, from the datasets of
  `dashboard.md` § Datasets, with exactly the rule of `master-state.md` § Results and meaningfulness and
  `analysis-contract.md` § PAB adjustment (`dashboard.md` § Recompute rule). Everything else on the page and
  in the chat report is stored.
- Take a number, a direction or a verdict from prose. Every figure comes from a structured field
  (`AnalysisResponse`, `result_ledger`, PERIOD records) and keeps its source reference.
- Include analyst commentary. Metric-analyst and investigator prose is not part of the generated report.
- Order a ship or a kill. A goal-conditional recommendation is allowed and required in the Verdict
  (`template-population.md` § Verdict composition): it says what the data support for each stated goal,
  composed only from the Verdict's other bullets, with no cause and no new number.
- Use the word "arm" or "arm-level" in report text: it says "variant". Internal field names and
  codes keep their spelling and are not report text, and where `output-format.md` prescribes the wording
  of a special state, that wording stands unchanged.
- Assume or fill a missing user input (intended direction, guardrail metrics, objective, variant
  changes). An input is used only when the user stated it in this conversation (`input-resolution.md`).
  No default, formula, unit or intent is invented, and a missing input withholds only the part that needs
  it, never the report. The one exception is the primary metric: when none was named, it is inferred from
  the test type and labelled "(inferred from the test type)" or "(assumed)"
  (`evidence-selection.md` § Primary metric); the inference only chooses which result is read first.
- Show a converted confidence value. Conf is the returned `pab.adjusted.conf` (`analysis-contract.md`
  § PAB adjustment), shown as `Conf: xx%` where `summary-table.md` § Columns allows it; it is never
  derived on the page from a p-value except by the explorer and trends recompute above. Results follow
  `output-format.md` § Results and meaningfulness: the adjusted value and its reading first, the
  observed value and the PAB beside it, significance as a separate statement.
- Fill a missing value, unit, PAB value, window, weight, confidence or classification. Unavailable
  values keep their status and reason and are never shown as zero.
- Claim that a chart was rendered or that daily PAB data was retrieved live. It describes only what
  the structured inputs contain.

## Inputs (all already held by the Master)

| Input | Source |
|---|---|
| Recorded mode, depth, `depth_basis`, selected capabilities, `segment_ref` | `MasterState` (`references/master-state.md`) |
| Resolved context: experiment, versions, windows, comparisons, lifecycle, annotation status, scope | `MasterState.context` (`references/context-schema.md`) |
| Results and their states, meaningfulness, PERIOD correlation | `result_ledger` (`master-state.md` § Results and meaningfulness) |
| Statistics, observations, data conditions, PAB results, findings and cuts | stored `analysis_responses` (`references/analysis-contract.md`) |
| PERIOD trigger, game-level movement, evidence records | `PeriodEvidenceRecord`s (`references/period-evidence.md`) |
| Visual requirements | `visual_requirements` (`master-state.md` § Visual requirements) |
| User-stated inputs: primary metric, intended direction, guardrail metrics, objective, variant changes | the user's request and earlier turns of this conversation only (`input-resolution.md`) |

## Steps

1. **Template.** Select the structure with `references/report-templates.md` § Selection, from recorded
   state only. Special states and `NO_COMPARISON` keep their existing formats. The selection never
   changes mode or depth.
1a. **Detailed Read (experiment-read wording).** Not asked, and not used for the chat, when a dashboard is built (§ Chat answer when a dashboard is built); it applies only to a read that has no dashboard. When the selected structure is A and the user's own
   request (`MasterState.request.raw`) asks for an experiment read without a high-level qualifier, lay
   the answer out as `template-population.md` § Detailed Read and build its table with
   `summary-table.md` § Detailed Read table. The wording is decided in this order:
   - **High-level qualifier** ("high-level read", "high level read", "high-level summary"): the
     Standard Experiment Read, unchanged.
   - **Experiment-read wording** ("exp read", "exp reads", "read experiment X", "experiment read",
     "detailed read"): the Detailed Read.
   - **Anything else** (for example "how did the test do?", "A/B results"): ask once, "High-level read
     (verdict + headline metrics, one screen) or detailed read (every metric, drivers and trends)?", and
     lay the answer out as the user answers. The question is asked once per conversation for the same
     unit; the answer is a presentation choice only. When no answer can be obtained (unattended, or a
     stream-origin request), the Standard Experiment Read (high-level) is used, unchanged.

   This is a per-response presentation choice taken from the user's wording (brian-master SR-2). It
   never changes the selected template, mode, depth, capabilities or budget, and a stream-origin
   request never takes it. Every other answer keeps its existing order and structure.
1b. **Resolve inputs.** For a Standard Experiment Read or a Detailed Read, collect the user-stated
   inputs of `input-resolution.md` from this conversation. Only when one of them is material and
   absent, end the answer with the one optional follow-up that file defines. The follow-up comes after
   the report, never instead of it and never before it, and a missing input withholds only the part
   that needs it. Answers are applied by running steps 2b to 6 again on the same stored results:
   nothing is queried and no value, statistic or classification changes, and the display tier and
   order of a result follow `evidence-selection.md`, as they already do when the request names a
   primary metric. A stream-origin request, a special state and Templates B, C and D ask nothing here.
2. **Adapt.** Build one report record per `result_ledger` entry with `adapter.md`. Cut findings and
   PERIOD evidence are read from their own sources, unchanged.
2b. **Select evidence.** Read `evidence-selection.md` and give every result its display tier and order,
   and the Verdict its rows. Presentation only: nothing is removed, recomputed or reclassified, and
   every result still appears once in the results tables.
3. **Populate.** Fill each section of the selected template with `template-population.md`. A section
   without evidence is left out (SR-26), but every non-computed state is still named.
4. **Tables.** Build the results tables with `summary-table.md`.
5. **Charts.** Build `visual_requirements` and `VisualEvidence` with `charts.md`;
   `game-viz-design` renders them in the chat report (the dashboard renders the same evidence itself,
   step 7).
6. **Assemble** in SR-15 order as `report-templates.md` § Shared rules places each section: Experiment
   Card, period and segment line, visuals, bottom line, supporting data, next question. The follow-up
   of step 1b, when there is one, is the last element of the next-question slot.
7. **Dashboard.** Always, before the chat answer, for every read `dashboard.md` § When it runs lists: create
   and publish the interactive dashboard of `references/experiment-read-ui-spec.md` from the Dashboard
   artifact type, with the datasets of `dashboard.md` § Datasets built from the same stored results, one per
   experiment-version and platform. Presentation only; it changes no routing, mode, depth, budget,
   statistic or classification. The dashboard link follows the chat Verdict. With the two-part read
   (`references/two-part-read.md`), steps 2 to 7 run twice over the same stored results: for Part 1 (Verdict in chat,
   dashboard without Appendix data) and for Part 2 (the rest of the Detailed Read, Appendix datasets written in place).

## Chat answer when a dashboard is built

For a user-origin FULL_EXPERIMENT_READ or TARGETED_DIAGNOSIS that gets a dashboard (`dashboard.md` § When it runs), the dashboard is
built and published first, and the chat then carries only:

1. **The Verdict**, composed with `template-population.md` § Verdict composition (the same rows, wording, annotation status and
   goal-conditional recommendation a Detailed Read's section 1 carries), under a heading "Verdict" and nothing before it. For a
   TARGETED read, which has no Verdict section, the chat carries its two answering sections instead: "Requested metric and exact
   scope" and "Movement of the requested metric" (Template B). With a target audience (`analysis-area-selection.md`), the
   Verdict states the audience's result first and the all-users result after it, as before.
2. **One line** naming the dashboard (the link) and, in Part 1, that Part 2 is running.
3. **State lines, only when needed:** one line each for a selected area that was `NOT_TESTED`, `BLOCKED` or `NOT_IN_TABLE`, and
   the not-selected areas, worded per `output-format.md` (never as missing data or no movement).

Nothing else is written in chat: no Summary table, Experiment Card, headline table, charts, guardrail lines, other numbered
sections or recommendations list; they are on the dashboard. The Detailed Read wording question (step 1a) therefore does not
change a dashboard read's chat, and is not asked when a dashboard will be built. A read with no dashboard (special states,
Templates C and D, stream-origin) keeps its full chat report unchanged. Presentation only: no query, statistic or classification
changes.

## Statuses

Every status is carried with its reason, in the existing vocabulary:
- ledger states `NOT_IN_TABLE`, `NO_SCOPED_EXPOSURE`, `INSUFFICIENT_DATA`, `UNSUPPORTED_FOR_SCOPE`,
  `NOT_TESTED`, `NOT_RUN` and `NO_COMPARISON`;
- meaningfulness classifications;
- `pab[]` statuses `COMPUTED`, `NOT_APPLICABLE`, `NOT_IN_TABLE`, `CONFIG_REQUIRED` and `TBD`;
- `CapabilityResult` availability statuses (`experiment-contracts/references/capability-result.md`).

`output-format.md` wording rules apply: not run is never worded as missing data or as no movement.

## UI specification

`references/experiment-read-ui-spec.md` is the owner's specification of the user-facing presentation of an
experiment read: page structure, wording, labels, number formats and visual design. It does not govern data
sourcing, queries, pipelines or publishing. Step 7 builds the dashboard from it, as `dashboard.md` defines,
and it is consulted whenever a Report Designer change is assessed or proposed. The accepted contracts (this
file, `dashboard.md`, `adapter.md`, `template-population.md`, `summary-table.md`, `charts.md`,
`input-resolution.md`, `evidence-selection.md`, `output-format.md`, `master-state.md`,
`report-templates.md` and `visual-evidence.md`) agree with the specification; `dashboard.md` § Precedence over
the UI spec lists no differences. A difference found later is settled only by an explicit product decision,
never inside an answer, and until then the contract wins. An answer never says or implies that an
interactive page, segment options, matrix, trend controls, disclosure rows or dark mode exist unless the
published page actually has them.
