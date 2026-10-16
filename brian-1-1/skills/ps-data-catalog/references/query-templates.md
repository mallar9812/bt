# Query Templates — Databricks only

⚠️ **Databricks now serves exactly four things.** Everything else routes to Druid — versioned
datasource from `play_data.chart_config`, alphabetically-sorted variant suffix, Druid SQL, rollup guard
and fallback rules all in `references/query-engines.md`. Do not use this file's syntax for a chart.

The four Databricks jobs:

1. **`play_data.chart_config`** — the version lookup. Runs on every conversation that touches a chart.
2. **`play_data.monthly_rev_diff`** — long-horizon monthly cohort; the one core table with no Druid
   equivalent.
3. **`external_data.sensor_tower_data`** + **`external_data.st_product_details`** — competitor data.
4. **`play_data.charts_annotations`** — chart annotations, the "what changed"
   layer. **No `chart_config` row, no version, no variant**, so nothing in `query-engines.md` Steps 1–3
   applies; its own hard rules, query shapes and checklist live in `references/annotations.md`. Do **not**
   query or fall back to `play_data.charts_annotations_data` (a separate older store) or
   `play_data.annotations_data` (empty).

These show **structure and syntax only**. No filter *value* below is a default — apply a filter only when
the question calls for it or a hard rule requires it, and omit an unscoped filter entirely rather than
blanking it. If unsure whether a source exclusion applies, ask the user rather than carrying one over.

## Databricks SQL form

```sql
%sql
select `__time`, gid, cli, sum(revenue) from <table>
where `__time` > '2026-01-01' and gid = 9 and cli = 0 group by 1,2,3
```

- Group by raw column positions matching the selected dimensions; aggregate last.
- Date columns: `date_field` on the Sensor Tower tables. `play_data.monthly_rev_diff` has **no date
  column at all** — scope it by `install_month`.

## 1. Chart version lookup

Batch every chart the conversation needs into one statement, then build each Druid datasource name by
appending the variant's `independent_columns` **sorted alphabetically**:

```sql
%sql
select chart_id, version, chart_version, independent_columns, metrics
from play_data.chart_config
where chart_id in ('chart_579', 'chart_1170', 'chart_1706', 'chart_3730')
order by chart_id, chart_version
```

## 2. Long-horizon monthly cohort

`spend` repeats on every `diff` row of a cohort — **always `MAX()`, never `SUM()`**, or the figure
inflates by the row count (confirmed: one cohort carried the identical value on 104 rows).

```sql
%sql
-- per-month cohort revenue
select gid, cli, install_month, diff,
       add_months(to_date(install_month), diff) as dau_month, rev
from play_data.monthly_rev_diff
where gid = <GID> and cli = <CLI>
order by install_month, diff
```

```sql
%sql
-- cohort spend, deduplicated
select gid, cli, install_month, max(spend) as spend
from play_data.monthly_rev_diff
where gid = <GID> and cli = <CLI>
group by 1, 2, 3
```

Cumulative ROAS through month N = `SUM(rev WHERE diff <= N) / MAX(spend)`. Only `gid` and `cli` exist as
dimensions — no country/network/source cut is possible here; say so rather than switching charts
mid-answer.

## 3. Sensor Tower pivot

`sensor_tower_data` is long/pivoted — one `metric` + `value` row per product/platform/country/date. Pivot
only the metrics the question needs and join `st_product_details` for readable names. Available metrics:
revenue, downloads, active_users, d1, d7, d14, d30, session_count, total_session_count, session_duration,
time_spent, total_time_spent.

```sql
%sql
select
  date_field as time,
  b.product_name as game_name,
  a.platform as os,
  b.publisher_name,
  b.game_class as category,
  a.product_id,
  upper(a.country) as country,
  CASE WHEN metric = 'revenue' THEN value END AS revenue,
  CASE WHEN metric = 'downloads' THEN value END AS downloads,
  CASE WHEN metric = 'active_users' THEN value END AS active_users,
  CASE WHEN metric = 'd1' THEN value END AS d1_retention,
  CASE WHEN metric = 'd7' THEN value END AS d7_retention
from external_data.sensor_tower_data a
left join external_data.st_product_details b on a.product_id = b.product_id
where date_field between '<START>' and '<END>'
  and a.product_id in (<PRODUCT_ID(S)>)
```

- `date_field` is daily grain — anchor ranges to calendar periods. For a single-day snapshot replace the
  `between` clause with `date_field = '<DATE>'`.
- Resolve `product_id` via `st_product_details` first; `value` is STRING, so cast before aggregating.

## Custom / ratio metrics

Query each base metric separately from its correct datasource, then apply the formula client-side. Never
combine metrics from different tables or variants in one query. Align numerator and denominator to
matching available dates only.

## Schema verification

Not a default step — trust the catalog for documented tables and query them directly. Run this only on a
trigger: (1) before reporting that a metric, dX, or dimension isn't available; (2) after a schema error,
**and only once you've confirmed the alphabetical sort** on a Druid name; (3) for a table with no catalog
entry. At most once per table per conversation.

```sql
%sql
DESCRIBE TABLE <schema>.<table>
```

For Druid chart datasources use `INFORMATION_SCHEMA.COLUMNS` / `INFORMATION_SCHEMA.TABLES` instead — see
`references/query-engines.md`. Use the live schema for the query, and on any disagreement with these
references, update the relevant reference file (or state the exact correction if the files aren't
editable).

## Consolidate first, then batch into waves

**Consolidation comes before batching** — see "Query consolidation" in `references/query-engines.md`. Prefer
one statement per (datasource, variant): where two statements would differ only by a filter value or an
adjacent date range, merge them into a `GROUP BY`. So **an adjacent current + prior period is normally one
statement**, and a freshness check is read off that statement rather than fired separately.

**Split when merging would need cleverness** — per-slice filters, per-slice rollup pins, per-slice windows,
non-contiguous ranges, conditional aggregation. That is a normal outcome, not a compromise. Also always
separate: each side of a cross-variant ratio (Druid cannot join variants) and each distinct datasource.

Batch what remains into waves of ~5 submitted and polled together; **a wave may mix Databricks and Druid**.
Sequential only for true dependencies: `chart_config` resolution before that chart's first Druid query,
drill-down L1 before L2, maturity-dependent dX choices. ~5 per wave matches engine concurrency; larger
waves just queue server-side.
