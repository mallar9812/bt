# Experiment read: UI and report format

Owner: Rajeswari (mallar@playsimple.in), PlaySimple Games. Covers only what the reader sees: page structure, wording rules, how the verdict is formed from the numbers, and the visual design. Nothing about data sourcing, queries, pipelines or publishing is in here.

Reference reads: review_screen_opts | iOS | version 2 (https://claude.ai/artifact/Dc57kUiqHVCNtVQRvXj1At), tp_wq_unlock | Android | version -1 (https://claude.ai/artifact/UHYX3cG4PVQEK25QBN5zU2) and level_tagging | Android | version 4 (https://claude.ai/artifact/WPTQLZ1SBqgbHafZsTNVpR; two variants, no control, var1 as the reference; the most recent, and the one whose analysis pattern the plugin follows). Reference UI code is shipped in `report-generator/assets/` (page.css, page.js, an example body and a README of the datasets); see `report-generator/dashboard.md`. Reuse it; do not redesign.

Reading this spec: "control" means the reference variant (the control when the experiment has one, otherwise the lowest-numbered variant, shown under its own name such as var1), and "arm" is the spec's shorthand for a variant. Page text says "variant" and names the reference by its own name. Verdict and statistics wording follow the contracts (`master-state.md` § Results and meaningfulness, `output-format.md`); this spec owns layout and look.

---

## 1. Report scope and title

1. One read = one experiment-version on one platform. Title: `exp name | cli (Android/iOS) | version`, e.g. `tp_wq_unlock | Android | version -1` (h1, bars written as `&#124;`).
2. Only the named experiment. Parallel experiments are not read (listed under "not checked"). Other versions are out of scope unless asked; mention them in one scope bullet.
3. Each variant is compared with the reference separately: the control if the experiment has one, otherwise the lowest-numbered variant (var1, never called "control"); never pooled across variants, versions or platforms.
4. No country or install-source deep dives unless asked. Default cuts: install cohort (days since install), user type (new = `user_type new` / old = `user_type old`), payer status; puzzle type only for engagement.
5. A negative version (e.g. -1) is read as a normal version when the user says so; all metric families are shown, with one line in the card and Method noting this.

## 2. How a number becomes a label (the verdict logic)

1. Every value shown is PAB-adjusted: observed minus the old-user share × the pre-test difference of the same arms (PAB covers only users who existed before the test, so a result with new users in it takes only the old users' part; old users take it in full, new users have none). Where no PAB exists the observed value is shown with a trailing ` †`. † is explained once in the header and once in Method.
2. Meaningful line: 1% relative change (10 bps for retention). Conf above 85% counts as sufficient evidence.
3. Whole 95% interval beyond the line is meaningful; general metrics whose whole interval sits inside ±1% are no meaningful movement; in between, Conf above 85% and size at or above the line is meaningful, smaller is no meaningful movement; Conf at or below 85% is insufficient evidence; absolute-unit metrics (e.g. net cash) are not classified.
4. Reader-facing labels only three: **Upside** (green, ↑) = meaningful and positive; **Downside** (red, ↓) = meaningful and negative; **Neutral** = everything else. The underlying class goes only in the pill tooltip. Higher is treated as better for every metric, so Upside/Downside are direction, not a business verdict (say this under the matrix).
5. Number formats: `+1.28%` (two decimals, explicit sign, Unicode minus); retention `+65.6 bps` (one decimal), never "pp" or "%"; absolute values three decimals. Conf: `Conf: 99.6%`, `>99.9%` above 0.999, `—` when missing.
6. Under every chart and in every value cell: first line bold `% change, Conf: xx%` with the pill; the absolute delta in small grey text next to the value (`value 1.0648 · delta +0.0346`); the control side shows `value <control>` and `baseline, N days`. No confidence-interval ranges in prose or readouts. Arms are pivoted into one row: `Control | var1 vs control | var2 vs control` (coloured dot per arm header).
7. Numbers in prose are live data marks, never typed by hand, so prose updates with the data. In bullets say "observed †" for unadjusted values and "after PAB" for adjusted ones; when PAB flips a sign give the observed value and the pre-test gap in brackets.

## 3. Writing rules

1. Verdict first. Page order: Experiment card, Headline, Verdict, then detail.
2. Everything is bullets with sub-bullets, as disclosure rows (`details.dr`): bold one-sentence summary + a chip (`Decision`, `Lift`, `Cost`, `Flat`, `Watch`, `Pass`, `Caution`, `Discounted`, `Spiky`, `Scope`, `Config`, `Gap`), body of 1–4 short sub-bullets with the numbers. First one or two rows open, the rest collapsed. Any note paragraph over about 150 characters is split into bullets.
3. Never mix two cuts in one statement (a sentence is about user type, or cohort, or payer, never two). Never mix sections: Users = one cut (user type) plus the new-install cohort table; Puzzle = one cut; Guardrails = whole population only. Never mix metric types in one table block (group header rows: revenue, impressions, eCPM, engagement, sessions, economy, rolling retention, classic retention, LTV, LTDays, rolling LTV, in that fixed order; totals before components).
4. Verdict rows in this order: Recommendation (bold, `Decision` chip, open: who to ship to, what to hold, window) · Primary metric (retention for an unlock/engagement test; revenue is a guardrail) · Value of the installs (LTV, LTDays, rolling LTV) · Mechanism (what moved in the puzzle split) · New users · Old users · Revenue guardrail · In-game economy · What to discount. No Scope row: scope facts live in the Experiment card and Method.
5. Beside the verdict, two cards: "What was tested" (feature config, allocation and window, design) and "What to discount, and why" (PAB population caveat, small cells, exposure ramp, spiky metrics).
6. Always state the PAB population caveat when PAB covers only pre-existing users and the test is new-user heavy: adjusted overall engagement can read negative while every observed number is positive; tell the reader to use the user-type split.
7. Nothing dropped silently: list what was not run or not checked in Guardrails and in Method.
8. Plain, short sentences, no hedging words, each number once; bold only the row summary and the `% change, Conf` line.

## 4. Page structure (section ids, in order)

Nav pill: brand · links `Headline · Verdict · Users · Puzzle types · Guardrails · Summary · Matrix · Trends · Drill-down · Method` · feedback icon far right.

1. `header#top`: h1 title; sub-line (game, GID, cli, exp_id, window, arms); one sub-line with two hover notes, both underlined: "All effects are PAB-adjusted" (the rest of the PAB/† sentence on hover) and "Scope" (the rest of the scope text on hover); a "Collapse all sections" / "Expand all sections" button pair.
2. `#sec-card` Experiment card (collapsed by default; every section heading collapses and expands its section): key/value table with rows Experiment, Game and platform, Version read, Observed active window, Analysis window, Design, Allocation, Feature (runtime config), Status, Population, Meaningfulness guidance.
3. `#sec-headline` Headline results (only the "† = observed, PAB not available" note is visible; the other notes are in an "i" hover button on the heading): tiles, one row per comparator, each = name, variant, big number, pill. The big number is the PAB-adjusted change versus the reference (bps for retention), never the metric's value; the reference is the control if present, else the lowest-numbered variant, and gets no row; the pill is Upside / Downside / Neutral, with no Conf on the tile. Standard set until the user defines another: Rev/DAU (all revenue), Clear/DAU, Banner impressions/DAU, W2E impressions/DAU (separate tiles), Session time/DAU, Rolling D1 retention, Classic D1 and D7 retention, LTV D7, LTDays D7 (D30 horizons live in the summary table). Rolling D1, never D3, in the headline.
4. `#sec-verdict`: disclosure rows + the two-card grid.
5. `#sec-users`: one table, metric groups × `New users · varX (observed †)` and `Old users · varX (PAB-adjusted)`, each header carrying its `user_type` value; then the optional "New users by days since install" card (tagged `user_type = new`, computed on the page from the daily cut data; D00, D01, D02-D07, D08-D14, D15-D30 columns), hidden behind a prompt ("Do you want to see it?" / "Yes, show it") and shown only after the viewer says yes.
6. (No separate explorer section: its controls are in `#sec-summary`, section 7.)

7. `#sec-puzzle`: table (Puzzle type, Share of clears, varX vs control, Contribution) + disclosure notes. Contribution = share × effect, rows add up to the overall row.
8. `#sec-guard`: disclosure rows (allocation balance, ad load, engagement, rolling retention, classic retention and LTV, economy, not checked).
9. `#sec-summary` "Summary table": the segment controls (section 7) above one table, group rows, a Reading column of one-line notes.
10. `details.appx#appendix` (collapsed): `#sec-matrix` Matrix: metric by cell, PAB-adjusted (FIRST) → `#sec-trends` → `#sec-drill` → `#sec-results` → `#sec-method`.
    - Matrix: Cut select, Metric groups dropdown checklist (`#dr-grp-pick`, multi-select, defaults to the first group; with several groups selected the rows are split under group headings), "only metrics with upside or downside" checkbox (on), and a Variants dropdown checklist (`#dr-pick`, all on); ONE matrix, not one per variant: each metric has one line per selected variant, the row header reads `<metric> · var2 vs var1`, and every column (Overall and each cell) carries the per-variant values on those lines; Overall column + one column per cell; meaningful cells boxed bold green/red; † when no PAB; hover for Conf.
    - Drill-down: "What stands out" lead, highlight cards (one cut × one metric group each, a title, 2–3 sentence note, a small table), a counts table (cells tested, with PAB, meaningful), "All cells" table (filters: cut, group, search, meaningful-only; 37 rows then Show all); the variant pair is in the row header (`<metric> · var2 vs var1`), never a separate Pair column.
    - Every result: searchable, sortable full table; the variant pair is in the row header (`<metric> · var2 vs var1`), never a separate Pair column with Variants and Fields dropdown menus (default fields: Capability, Exp change, % change; the rest are optional; Reference, Comparator, Exp change, PAB, Delta, % change, Conf, p, paired units); the observed reading tag sits next to the Exp change value and the PAB-adjusted reading tag next to the % change value, with no separate Reading columns.
    - Method: cards Test design, PAB adjustment, Where PAB is not available (†), Conf and the reading, Metric definitions, Limits and not run.
11. No "Expand all" button. No arm toggle or segmented control.

## 5. Charts (Trends)

1. Line charts only. Default = actual daily values of control and each variant against date (standard rule). Other views in a View select: 7-day average, difference vs control daily, difference 7-day average. Difference views are optional, never default.
2. One card per metric; group select (All, Revenue, Engagement, Retention, Value, Economy). Sub-line says "Install date" or "Activity date".
3. From/To date inputs and a Full range reset; the readout under each chart recalculates for the dates in range (full pre-test baseline, so short ranges are indicative; say so). "No dates in range" when empty.
4. Style: muted grid, control dashed grey, variants in the host palette (blue then orange), arm names labelled at the line ends instead of an in-chart legend, 0.75rem axis text with enough contrast, hover tooltip with date and each arm's value.

## 6. Design system (Apple HIG)

- Tokens: spacing .5/1/1.5/2.75rem; radius 18px (cards), 10px (small); colours derived from host tokens (`--ink`, `--ink2`, `--line` 10% fg, `--fill` 4% fg, `--panel`, `--ok` #1f8a3b, `--bad` #d12a2f`, `--acc` #0a7cff). Page max-width 74rem, centred.
- Type: system stack (`system-ui, -apple-system, SF Pro Text, Segoe UI, Roboto…`), all sizes in rem; body 0.9375rem/1.4 with −0.24px tracking; h1 2.125rem/700; h2 1.375rem/700; h3 0.9375rem/600; notes 0.8125rem muted; tabular numerals on every number.
- Cards: panel background, 1px 6% border, radius 18px, padding 1.75rem, soft two-layer shadow. Calm section accents: coloured bar before each h2 and matching card top border (verdict blue, users purple, puzzle teal, guardrails orange, summary indigo). First verdict card has a faint accent gradient; the recommendation row has a 3px accent left bar.
- Balance: headline tiles are toned down: big number stays ink-coloured even when meaningful, pill has no background inside tiles, Neutral is plain muted text. Colour appears in pills, chips and meaningful cells, not everywhere at once.
- Pills: 999px radius, 0.75rem/500; Upside green on a 13% tint with ↑ prefix; Downside red on a 12% tint with ↓; Neutral muted fill. Chips: small uppercase labels beside row summaries (`acc`, `ok`, `bad`, `warn`, `neutral`).
- Floating nav: sticky at top with a solid page-background band behind it (so scrolling text can never show through or pass behind the pill); inner pill is opaque (panel background, border, shadow). Links on one line (no wrap, 0.75rem, 40–44pt targets); current section highlighted with a dull grey fill via scroll-spy (must update while scrolling). Brand text reads "Experiment read" at the top and switches to the experiment name once the header scrolls out. Feedback speech-bubble icon at the far right, hover/focus only (not clickable), tooltip "Reach out to mallar@playsimple.in for any feedback". Sections have `scroll-margin-top: 4.5rem`.
- Disclosure rows: chevron that rotates, 44pt min height, bold summary, small-dot sub-bullets, hairlines between rows. Appendix summary uses a ▸ marker.
- Tables: scroll wrapper, group rows in small accent caps, first column no-wrap, value cells min-width 13rem (11rem in the explorer) so number and pill stay on one line.
- Controls: native selects, date inputs and pill buttons with `color-scheme: light dark` (dropdowns must be readable in dark mode); checkbox labels; visible focus rings; `aria-pressed`, `role=group`, `aria-label` on controls.
- Dark mode from host tokens plus explicit fallbacks for panel, grid and select colours; `prefers-contrast: more` raises borders and adds pill rings; `prefers-reduced-motion` removes transitions.

## 7. Summary table segment options (the former Segment explorer)

1. Any combination of cut values with the same labels, pills and number formats as the rest of the report.
2. Fully dynamic: the cuts, their values and the metric rows come from whatever the experiment's data carries, so controls and headers change experiment to experiment; nothing per-experiment is hard-coded.
3. Controls: Cohort, User type and Payer flag, and Metrics (metric groups), each a dropdown checklist with everything ticked by default (user type values labelled with their `user_type`; the Cohort menu also has "Installed in the read window" / "Existed before the read window"); no split control; "Split across" none or any cut (one column per value); "Metrics" group filter.
4. Output: one table with group rows; each cell bold value + pill + `Conf: xx% · N days`; tooltip with observed, PAB, control and variant values; a lead line (segments × metrics, how many upside/downside, no-multiple-testing caveat). † where the segment has no pre-test counterpart.
5. With every value selected, no split and no group filter, the stored all-users table is shown. A selection reproduces the user-type and cohort numbers shown elsewhere on the page (user type new, old; cohort D00 etc.).

## 8. Checks before delivering a read

1. No empty (—) value marks anywhere; every pill matches its numbers; † present on every observed-only value.
2. Section order, nav links and ids exactly as in section 4; matrix first in the appendix.
3. No two cuts or metric types mixed in any statement or table.
4. Light and dark screenshots checked for contrast, nav (nothing passing behind), tiles balance, explorer and matrix.
5. Reply briefly: what changed and key numbers; no URL unless asked.

## 9. Instruction log (user's own words, in order)

- any movement above 1% or 10 bps is meaningful.
- the values below graphs should be in one line; control, var1 and var2 pivoted.
- texts in bullets and easy-to-read formats.
- use Apple's design principles and make it interactive; fix all issues and add colours to the entire report; headline looked overloaded with colours — maintain balance.
- instead of "meaningful" in green/red use Upside and Downside, Neutral for the rest.
- in charts the text is irritating — manage colour contrast; don't show "pp"; delta numbers not bold, small next to the value.
- plot actuals of control and variants over time, not deltas — standard rule; dark-mode dropdowns must be visible.
- remove the arm buttons at the top; make it fluid like Apple designs.
- floating bar: nothing may pass behind it; text must end at the bottom of the panel.
- report name format `exp name | cli (android/ios) | version`.
- remove "Expand all".
- on scroll show the experiment name instead of "Experiment read" plus a feedback note on hover; one line, resized items, no info icon, feedback icon visible but not annoying; hoverable only, right-most end.
- highlight the section the user is at, dynamically, dulled.
- separate artifact per read; selectable cohort / payer / user type combinations with select-all and split across cohorts.
- -1 is a normal experiment: calculate the missing metrics.
- matrix: metric by cell, PAB-adjusted goes at the start of the appendix, above the charts.
- the checked things and headers change experiment to experiment — keep it dynamic.
- until defined otherwise the headline metrics are Rev/DAU, banner and W2E impressions separately, session time/DAU, rolling D1, LTV, LTDays, D1 and D7 retention.
