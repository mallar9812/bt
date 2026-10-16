# Charts

Charts are requested through `visual_requirements` and built as `VisualEvidence`
(`references/visual-evidence.md`). `game-viz-design` renders them. Every rule in
`visual-evidence.md` § Rendering rules and in `game-viz-design` applies unchanged. This file only says
which visuals the generator requests.

## Which visuals

The defaults are those of `visual-evidence.md` § Visuals by mode and depth, at least to the SR-22
floor:
- **Chart budget (by tier, `evidence-selection.md`).** Charts follow the display tiers, not the
  registry count:
  - High-level read (Standard Experiment Read): one `SERIES` per Tier 1 result.
  - Detailed Read: one `SERIES` per Tier 1 and Tier 2 result; one contributor `BREAKDOWN` per Tier 1
    result from its cut findings, ordered as § Contributor bar order below (nothing is hidden or
    suppressed by contribution or weight); one panel for the primary metric when it reads
    `INSUFFICIENT_EVIDENCE`: a `SERIES` of the returned `observations[].diff` with the returned
    `summary.ci` drawn as a band, so the reader sees why it was unresolved; nothing is computed for it; and
    no panel when the observations were not returned.
  - Tier 3 and Tier 4 results get no chart.
  - **SR-22 floor.** When the tier budget yields no visual for a read (for example no Tier 1 result in
    a high-level read), the default set of `visual-evidence.md` § Visuals by mode and depth stands,
    unchanged.
  - Never one overloaded chart: one focused chart per charted metric.
- **Experiment period:** a `SERIES` from the returned `observations`. Each group is drawn as its own
  line on the metric's native date axis.
  - With several variants, the reference group and every variant of the same metric share one chart
    only when every comparison returns the same reference series. Otherwise each comparison gets its
    own chart.
  - Groups are never pooled.
- **Daily PAB:** when the series carries `pab_observations` (`visual-evidence.md` § Building it,
  step 7), the same chart also shows each group's pre-experiment values, with the experiment start
  marked (rendering rule 10). Otherwise no pre-experiment trend is drawn, and a returned `pab_value`
  is stated as a labelled pooled PAB movement.
- **No series returned, or count mismatch:** when `observations` is not returned or its count differs
  from `n_pairs`, the visual is a `SUMMARY` with the header the existing rule gives ("daily series not
  returned", "returned series does not match the test").
- **Breakdowns:** a `BREAKDOWN` from the cut findings (bars), ordered as § Contributor bar order below.
  No daily series is drawn for a pooled cell.
- **New and old users:** separate bars or panels, never a combined line.
- **PERIOD:** the trigger series with lookback, comparison and impact windows on the trigger's own
  axis; cross-capability evidence with correlation labels, one panel per date axis; game-level
  movement as a card; a lifecycle timeline.
- **Single-variant (`NO_COMPARISON`):** a descriptive `SUMMARY` or card per variant.

## Contributor bar order

A contributor `BREAKDOWN` draws the cells of one result's cut findings. When every cell of it carries one
returned numeric `contribution`, the bars are ordered by the absolute value of that contribution,
descending, and cells with equal absolute contribution keep their returned order. When any cell lacks a
returned `contribution`, when a cell returns one value per compared variant instead of one, or when none
carries one (for example Rolling LTV and Economy cells, which return movement and weight only), the bars
keep the order in which the cells were returned. Ordering only moves bars: no cell is hidden, merged,
dropped or capped by it, no `contribution` is computed or rescaled, and the bars keep the neutral
colour. The text fallback line of the visual lists the cells in the same order.

## Text fallback when rendering is unavailable

**Text fallback when rendering is unavailable.** `game-viz-design` draws only through the
`visualize:show_widget` tool. When that tool is not available in the session, no chart can be
rendered: each visual the budget requests is replaced by exactly one labelled text line, made of the
chart header (`header.metric_line` and `header.scope_line`), what it would show from fields already
returned (the groups and date axis of a `SERIES`, the cells of a `BREAKDOWN`), and the words "chart
not rendered in this environment". The line never says the chart is drawn, rendered, attached,
embedded or "below"; no HTML, image or file is produced or written, and no other tool, agent or path
is sought to draw it. Any number in the line comes from the returned fields of that visual and
appears once (SR-24). The fallback changes neither the budget nor the SR-22 accounting: a fallback
line stands in for its visual and is counted as that visual. The statement that no renderer is
available is made once, with the visuals (as a heading or preface to the fallback lines), never as an
opening sentence of the answer: SR-15 order is unchanged, so the Experiment Card still opens the
Standard and Targeted reads, and a Detailed Read still begins with `## 1. Verdict`.

## Kept from the existing rules

- **Date axes:**
  - Install-date and activity-date results are never on one chart.
  - Daily PAB observations are activity dates, so an install-date metric never gets a pre-experiment
    trend.
- **Intervals:** drawn only when returned. None is computed, and none is drawn per day.
- **Colours:**
  - Delta colours are neutral unless the direction is established (`visual-evidence.md` § Direction).
  - Economy `spend_per_dau` is always neutral.
  - KPI and healthcheck colours are unchanged.
- **Gaps and partial days:** excluded or missing days are gaps, never zero. Days with only a numerator
  or only a denominator are not plotted.
- **Conf:** a chart readout shows the returned Conf (`Conf: xx%`) of the adjusted effect; no other
  converted confidence value.
- **Trends data:** the chat report charts use the returned series; the dashboard's Trends ship the daily
  numerators and denominators of each variant and the PAB value with its half-width per charted metric
  (`dashboard.md` § Datasets), so the readout can be recomputed for any date range.
