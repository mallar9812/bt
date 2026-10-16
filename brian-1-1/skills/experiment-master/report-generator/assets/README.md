# Dashboard page assets

Reference page code for the experiment-read dashboard, taken from the accepted reference read
`level_tagging | Android | version 4` (two variants, no control, var1 as the reference). `dashboard.md` says
when and how to use it. Reuse it; do not redesign.

| File | What it is | Use |
|---|---|---|
| `page.css` | The complete page stylesheet (tokens, light and dark, cards, tiles, pills, chips, disclosure rows, tables, nav, collapsible sections, hover notes, segment options, matrix, trends). | Use verbatim as the first block of `files/index.html`, inside `<style>…</style>`. |
| `page.js` | The complete page script: mark filling (`fillMarks`, `fillCellMarks`, `fillPuzzle`), the reading rule (`confOf`, `classify`, `readStat`), Trends, Matrix, Drill-down, Every result, Summary, nav and scroll-spy, and the Segment explorer (`exData`, `exDiscover`, `exCompute`). Runs inside `dash.onData`. | Use verbatim as the last block, inside `<script>…</script>`, after setting the per-experiment constants below. |
| `page.body.example.html` | The generated body of the reference read (nav, header, Experiment card, Headline, Verdict, Users, Explorer shell, Puzzle, Guardrails, Summary, Appendix). Its prose and mark `data-where` ids belong to that experiment. | A worked example of the structure, ids, mark attributes and disclosure-row markup. Generate the new body in the same shape from this experiment's records; never copy its prose or numbers. |

The three files together are about 190 KB; the dashboard page limit is 256 KB, so a generated page stays within
it. If the body of a larger experiment would exceed the limit, keep the page and move the long Method /
Drill-down text to datasets, never to a second page.

## Per-experiment constants in `page.js`

These lines are the only experiment-specific code. Set them from the ExperimentContext before publishing.

| Constant | Meaning | Rule |
|---|---|---|
| `PAIRS` | The comparator variants, one per pair, e.g. `['var2']` or `['var1','var2']`. | From `comparisons[]`, every comparator in order. |
| `REFL` | Display name of the reference variant. | The control if the experiment has one, else the lowest-numbered variant, shown as that variant's own name (`var1`), never "control". |
| `ARMC` | Variant colours. | `control` muted grey; variants in the host palette (`dash.colors`) in order. |
| internal key `control` | The data key of the reference side in every dataset (`n_control`, `d_control`, `v === 'control'`). | Always keep the key `control` in the datasets whatever the display name is; `AL()` maps it to `REFL`. |
| `MORD`, `GROUPS`, `COH` | Metric order, group order and cohort buckets of the tables and matrix. | Fixed order from `summary-table.md` (groups) and `output-format.md` (cohorts); rows come from the data, a metric with no result is left out. |
| `LAB` | Class label map. | The reader labels are Upside / Downside / Neutral; the class stays in the tooltip. Keep every class key so that none is dropped. |

## Datasets the page reads (`dash.data`)

Document ids are `datasets/<id>`; each is attached as a file (CSV, TSV or JSON up to 8 MB) through
`upload_asset`. One row per row of the stored records; nothing is computed in the dataset.

| Id | Grain | Fields the page reads |
|---|---|---|
| `results` | One row per reported result, whole scope (59 in the reference read). | `id`, `capability`, `metric`, `pair`, `reference`, `comparator`, `unit` (`pct` / `bps` / `abs`), `obs_val`, `pab_val`, `pab_status`, `delta`, `delta_pct`, `adj_val`, `adj_delta`, `conf`, `p`, `n`, `final`, `adj_final`, `exposure`. |
| `cells` | One row per breakdown cell × metric × pair (529 in the reference read). | `dimension`, `cell`, `metric`, `pair`, `unit`, `reference`, `obs_val`, `pab_val`, `pab_status`, `adj_val`, `conf`, `n`, `final`. |
| `puzzle` | Engagement only: puzzle type × pair, plus the overall row. | `key` (`<type>\|<pair>`), `puzzle_type`, `pair`, `share`, `adj_val`, `obs_val`, `pab_val`, `pab_status`, `conf`, `final`, `contrib_pp`, `status`. |
| `trends` | One row per metric × date. | `metric`, `date`, `n_control`, `d_control`, `n_<variant>`, `d_<variant>` per comparator, and the per-metric fields `scale`, `kind` (`pct` / `bps`), `unit`, `basis` (Install date / Activity date), `group`, `desc` repeated on every row. |
| `trend_pab` | One row per trended metric × pair. | `key` (`<metric>\|<pair>`), `status` (`COMPUTED` or a reason), `pab` (pre-test baseline difference, in the metric's unit: % for `pct`, bps for `bps`), `half` (half-width of the baseline, same unit). |
| `x_dau`, `x_rev`, `x_eng`, `x_sess`, `x_rr`, `x_econ` | Daily cross-cut rows of the test window: day × variant × (install cohort `c`, user type `u`, payer status `p`, or whatever cuts the experiment carries) × metric key. | `d` (day), `v` (variant, `control` for the reference), the cut keys, and the metric numerators and denominators (`n` = DAU; revenue `t`, `r`, `i`; engagement `t`, `a`; sessions `s`, `l`, `n`; retention `a`, `b`, `n`; economy `t`, `a`, plus the earner / spender counts the economy rows carry). |
| `p_dau`, `p_rev`, `p_eng`, `p_sess`, `p_rr`, `p_econ` | The same daily cross-cut rows for the pre-test window (the PAB window). | Same fields as the matching `x_*`. |
| `experiment_card` | One row per card field. | `field`, `value`. |
| `audience` | Optional. One row. Target audience stated by the owner (`references/analysis-area-selection.md`). | `u` (`new`, `old` or empty), `p` (`payer`, `non_payer` or empty), `c` (comma-separated cohort values or empty), `label`. Absent means all users. |
| `run_state` | One row. Two-part read marker (`references/two-part-read.md`). | `part2` (`RUNNING`, `COMPLETE` or `PARTIAL`), `note` (optional text shown in the Appendix notice). Absent means complete. |

The Summary table's segment options, the "New users by days since install" card and the Trends readout recompute the PAB-adjusted effect (observed minus old-user share × PAB), the interval and Conf on the page from
`x_*` and `p_*` with the same rule as `confOf` / `classify` (`experiment-read-ui-spec.md` § 2); with every cut
value selected they must reproduce the overall rows of `results` (`dashboard.md` § Checks).

## Bundled datasets

Preferred packaging (fewest uploads and approvals): all datasets below in one file `bundle.json` made by `scripts/build_bundle.py`, each row
carrying `_ds` = the dataset id (`results`, `cells`, `x_dau`, `run_state`, ...). `ok(id)` in `page.js` returns the rows of that id from the
bundle (`bundle`, `bundle2`, ... in order) and falls back to a document named `<id>` when there is no bundle. The fields in the table are unchanged.

## Two-part read

Part 1 publishes the page with `experiment_card`, `results`, `puzzle`, `x_*`, `p_*`, a `cells` dataset limited to the rows the
non-appendix marks read, and `run_state` with `part2 = RUNNING`. While it says `RUNNING` (or `PARTIAL`), `applyRunState()` adds
`part2-pending` to `#appendix`: the Appendix sections are hidden and `#part2-note` is shown. Part 2 writes `cells` in full, `trends`
and `trend_pab`, then sets `run_state` to `COMPLETE`, on the same artifact and without republishing the page. A viewer who already
has the page open may need to reload it to see the Appendix.

## Page conventions (compulsory, see `dashboard.md` § Compulsory rules)

- The headline tile set includes Clear/DAU; the Verdict has nine rows and no Scope row.
- "New users by days since install" ships as two cards in `#sec-users`: `#opt-cohort-ask` (the prompt) and
  `#opt-cohort` (the table, `display:none`). `page.js` shows the table when `#opt-cohort-yes` is clicked.
- In `#tbl-cells` and `#tbl-res` the variant pair is part of the metric row header (`<metric> · var2 vs var1`);
  there is no Pair column. `sortable` marks columns with `rh: true` as `role="rowheader"`.
- The Matrix (`drawMatrix`) is a single table with one line per selected variant for each metric a `variantPicker` dropdown (`#dr-pick`) and a multi-select `groupPicker` for metric groups (`#dr-grp-pick`, all groups selected by default; one group heading row per group, always shown). Both appendix tables have Variants and Fields dropdown checklists (`fieldPicker`, hosts `#dt-pick` / `#res-pick`). A column opts in with `opt: '<key>'`; `sortable` hides the th and td of a column whose key is switched off (`api.on`) and filters rows by `api.vars`. The Exp change cell (`expCell`) and the % change cell (`pctCell`) each carry their own reading tag; there are no Reading columns.

## Collapsing, hover notes and segment options (v1.5.0)

- `initCollapse` adds a chevron to every `section[id^="sec-"]` heading and the Collapse all / Expand all buttons (`#cz-all`, `#cz-none`). A section is collapsed by the class `collapsed` (CSS hides everything but its heading); `#sec-card` carries the class in the body, so the Experiment card is collapsed by default.
- `.hv` is the hover/focus note (underlined `.u` text plus a `.tip`); `.hv.info` with `.ib` is the "i" button.
- The body has no explorer section. `#sec-summary` (controls are four `ddPicker` dropdown checklists: Cohort, User type, Payer flag, Metrics) holds `#ex-controls`, `#sum-mode`, the stored table in `#sum-default` and the recomputed table in `#ex-out`.
- `drawCohortNew` fills `#opt-cohort-out` (user_type = new, one column per install cohort that has new users).
- `page.body.example.html` is now the live body (this read's text); replace the per-experiment text, keep the structure and ids.
