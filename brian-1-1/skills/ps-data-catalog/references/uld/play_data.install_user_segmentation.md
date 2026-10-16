# `play_data.install_user_segmentation`: per-install early-engagement and early-revenue ranks (D0 / D0-D7)

> **Engine:** Trino. Write `play_data.install_user_segmentation` (no `delta.` prefix). **Category:** Cohort / early journey
> **Grain:** one row per install `(install_date, gid, cli, rid)`; `rid` is unique within `(install_date, gid, cli)`. **Partition / mandatory date filter:** `install_date` (DATE) — **always filter**.

> **Used by (BRIAN):** `investigate-retention` / `investigate-rolling-retention` D3 (cut a cohort's return by how engaged or monetised it was early), `analyst-game-performance` D2-R on request (D0 / D7 revenue per install by bucket). Read `references/uld.md` first for the layer-wide rules.

## What it is
A per-install lookup that ranks each install **inside its own `(gid, cli, install_date)` cohort** on D0 and D0-D7 session time and revenue, plus absolute session-time buckets and active days in the first 8 days. 523M rows, 2015-01-01 to D-1. Built from `play_data.installs_data_D00` (day-0 session time and revenue, incremental, anti-joined to existing rows) and `play_data.installs_data_D07` (D0-D7 cumulative values and `ltdays_d07`, defaulted to 1 when no match). Sessions come from `server_tables.sessions_master_cc` (seconds 0-43,200; gids 10 and 20 use `app_pause`, all others `length`). Revenue comes from `dm_admon.rev_dau_install_diff_ilrd_v2` after 2020-03-01 and `derived_tables.revenue_dau_install_diff` before. **It includes `install_bucket = 'reject'` users.**

## When to use it — and when not to
- **Use for:** cutting a cohort's retention or revenue by how engaged or monetised users were early (D0 session-time decile / absolute bucket, D0 revenue, D0-D7 active days); D0 monetiser rate; D0 and D7 revenue per install; revenue concentration in the top D0 decile; the session-time or revenue mix of a cohort (campaign intake vs behaviour splits).
- **Don't use for:** headline cohort revenue or ROAS (`play_data.monthly_rev_diff` or `chart_*`); DAU or day-level activity (`dau_splits`); acquisition source, campaign or country (`dau_splits`, `adjust_installs`). Decile columns are within-cohort ranks, not absolute levels.

## Mandatory pins (read before every query)
1. **Always filter `install_date`** — partition column, 523M rows.
2. **Exclude installs younger than 9 days for any D7 cut** (`install_date <= current_date - INTERVAL '9' DAY`), and also require `ltdays_d07 IS NOT NULL`. Younger rows carry `'NA'` on every D7 column.
3. **Never use a decile to define payers.** Payer / monetiser = `total_rev_d00 > 0`. Zero-revenue users are spread across R01-R06 (verified gid 26 / cli 0 / 2026-09-13), so low revenue deciles do not mean low spenders and `R10` is not "payers".
4. **Deciles are within-cohort ranks** — do not pool across `install_date`s or games as if they were absolute levels. Ties are split arbitrarily across deciles.
5. **Exclude `reject`:** join `derived_tables.dau_splits` on `(gid, cli, rid)`, `dau_date = install_date`, `actual_diff = 0`, `install_bucket <> 'reject'`, and say so. (Matched 95.5% of gid 26 installs on 2026-09-13; 236 matched rows were reject.) Installs missing in `dau_splits` drop out of the join — state coverage.
6. **D7 columns are text** — `TRY_CAST` before `SUM` / `AVG`; plain `CAST` fails on `'NA'`.

## Grain, keys & freshness
| Item | Value |
|---|---|
| Key | `(install_date, gid, cli, rid)` — one row per install; `rid` is a join key, never output. |
| Partition column | `install_date`. |
| Freshness | D-1 (max `install_date` = yesterday). `inserted_at` = build timestamp; every row with `install_date >= 2026-08-01` carries the same daily load time. |
| Types | `gid`, `cli` INTEGER; `rid` VARCHAR; `install_date` DATE; `session_time_d00` BIGINT; `total_rev_d00`, `it_w2e_ecpm_d00` DOUBLE; **all D7 metric columns and `ltdays_d07` are VARCHAR**; `inserted_at` TIMESTAMP. |
| Games / platforms | 48 gids. `cli` 0 Android, 1 iOS, 2 Amazon. Legacy `cli` 3 (to 2017-01-01, 5 gids) and 5 (2022-04 to 2024-12, 1 gid) exist in old history. |

## Gotchas
- **Pre-2020-01-30:** all session columns are `'NA'` (43,309,976 rows). Unreliable `session_time_d00` before this date.
- **D7 not elapsed** (`install_date > today - 9`): `'NA'` on all D7 columns (2,780,128 rows at probe).
- **No D7 row** (619,384 rows, 2024-01-05 to 2026-10-05, ~0.9% of Jun-Aug 2026): deciles and `ltdays_d07` are SQL NULL, but absolutes are `'0'` / `'0.0'` and `session_time_absolute_bucket_d07` lands in `'T8. 120+ min'` (SQL artifact). **Exclude `ltdays_d07 IS NULL` first.**
- **`it_w2e_ecpm_*`** is NULL for ~86% of D0 rows (~79% of D07 plus `'NA'`): NULL = no interstitial / W2E impressions, not zero.
- **`video_ecpm_bucket_d00` / `_d07`** are `'NA'` on every row (eCPM decile disabled). Ignore; use `it_w2e_ecpm_*`.
- **`revenue_decile_*` is never `'NA'` on D0**; D7 is `'NA'` if not elapsed, NULL if no D7 row, and is not gated by the 2020-01-30 cutoff.
- **Revenue definition:** ad revenue + 0.7 × IAP, xpromo excluded. Ties to ULD revenue, not to `chart_579`.
- **D7 deciles** are ranked within `installs_data_D07` for that cohort.

## Columns
| Column | Type | Role | Description |
|---|---|---|---|
| install_date | DATE | Key (partition) | Install date; cohort anchor for every decile. Always filter. |
| gid | INTEGER | Key | Game id (`public.gid_mapping`). |
| cli | INTEGER | Key | Platform: 0 Android, 1 iOS, 2 Amazon. |
| rid | VARCHAR | Key | User id; unique per `(install_date, gid, cli)`. Join key only. |
| session_time_d00 | BIGINT | Metric | Seconds of session time on install day; 0 if none. Unreliable before 2020-01-30. |
| total_rev_d00 | DOUBLE | Metric | Install-day revenue; 0 if none. **Payer = `> 0`.** |
| it_w2e_ecpm_d00 | DOUBLE | Metric | Install-day interstitial + W2E revenue per 1000 impressions; NULL when no such impressions. |
| session_time_d07 | VARCHAR | Metric | Cumulative session seconds, days 0-7. `'NA'` if D7 not elapsed; `'0'` if no D7 row. |
| total_rev_d07 | VARCHAR | Metric | Cumulative revenue, days 0-7. `'NA'` if D7 not elapsed; `'0.0'` if no D7 row. |
| it_w2e_ecpm_d07 | VARCHAR | Metric | eCPM over days 0-7; NULL if no impressions, `'NA'` if D7 not elapsed. |
| ltdays_d07 | VARCHAR | Metric | Distinct active days in D0-D7, `'0'`-`'8'`. `'NA'` if D7 not elapsed; NULL if no D7 row. `'0'` = no activity day found. |
| session_time_decile_d00 | VARCHAR | Dimension | `S01`-`S10` rank of D0 session seconds within `(gid, cli, install_date)`; `S10` = most time. `'NA'` for `install_date < 2020-01-30`. |
| session_time_absolute_bucket_d00 | VARCHAR | Dimension | `T1. 0-1 min` (<60s), `T2. 1-5 min`, `T3. 5-10 min`, `T4. 10-20 min`, `T5. 20-30 min`, `T6. 30-60 min`, `T7. 60-120 min`, `T8. 120+ min`; `'NA'` before 2020-01-30. |
| revenue_decile_d00 | VARCHAR | Dimension | `R01`-`R10` rank of D0 revenue within the cohort; `R10` = highest. Not a payer definition (pin 3). |
| video_ecpm_bucket_d00 | VARCHAR | Dimension | Always `'NA'`. Ignore. |
| session_time_decile_d07 | VARCHAR | Dimension | `S01`-`S10` rank of D0-D7 cumulative session seconds. `'NA'` pre-cutoff or D7 not elapsed; NULL if no D7 row. |
| session_time_absolute_bucket_d07 | VARCHAR | Dimension | `T1`-`T8` buckets on D0-D7 session time. `'NA'` pre-cutoff or D7 not elapsed; no-D7-row installs land in `T8` (exclude `ltdays_d07 IS NULL` first). |
| revenue_decile_d07 | VARCHAR | Dimension | `R01`-`R10` rank of D0-D7 cumulative revenue. `'NA'` if D7 not elapsed; NULL if no D7 row. |
| video_ecpm_bucket_d07 | VARCHAR | Dimension | Always `'NA'`. Ignore. |
| inserted_at | TIMESTAMP | Meta | Build timestamp. Not for analysis. |

## Common metrics built from this table
| Metric | Formula (`{field}` notation) | Notes |
|---|---|---|
| Installs | `COUNT(DISTINCT {rid})` | Per `install_date` × `gid` × `cli`; exclude `reject` via `dau_splits`. |
| Avg D0 session minutes | `AVG({session_time_d00}) / 60` | Zero-inclusive. |
| D0 monetiser rate | `COUNT(DISTINCT CASE WHEN {total_rev_d00} > 0 THEN {rid} END) / COUNT(DISTINCT {rid})` | Share with any D0 revenue (ads or IAP). Not an IAP-payer rate. |
| D0 revenue per install | `SUM({total_rev_d00}) / COUNT(DISTINCT {rid})` | Ties to ULD revenue, not `chart_579`. |
| D7 revenue per install | `SUM(TRY_CAST({total_rev_d07} AS DOUBLE)) / COUNT(DISTINCT {rid})` | Installs 9+ days old with `ltdays_d07` not NULL only. |
| Avg active days D0-D7 | `AVG(TRY_CAST({ltdays_d07} AS INTEGER))` | 0-8; mature, non-NULL rows only. |
| Revenue share of top D0 decile | `SUM(CASE WHEN {revenue_decile_d00} = 'R10' THEN {total_rev_d00} END) / SUM({total_rev_d00})` | Concentration measure. |
| Avg eCPM of exposed installs | `SUM({it_w2e_ecpm_d00}) / COUNT({it_w2e_ecpm_d00})` | Install-weighted mean over non-NULL rows only. |

## Join recipes
**Key:** `i.gid = t.gid AND i.cli = t.cli AND i.rid = t.rid AND i.install_date = t.<date>` (INTEGER / INTEGER / VARCHAR / DATE).

| Table | Join | Notes |
|---|---|---|
| `derived_tables.dau_splits` | `(gid, cli, rid)`, `dau_date = install_date`, `actual_diff = 0` | Required for the `reject` exclusion and segments. |
| `dau_splits` (later days) | `(gid, cli, rid)`, `dau_date = install_date + n` | Retention of a bucket: Dn return flag by early-engagement bucket. |
| `dm_admon.rev_dau_install_diff_ilrd_v2` | `(gid, cli, rid)` | Revenue by cohort age for a D0 bucket. Pre-aggregate to the user first. |

## Query templates

**1. D0 session-time decile profile for one cohort window (reject excluded)**
```sql
SELECT i.session_time_decile_d00 AS decile,
       COUNT(DISTINCT i.rid) AS installs,
       ROUND(AVG(i.session_time_d00) / 60e0, 2) AS avg_d0_minutes,
       ROUND(SUM(i.total_rev_d00) / COUNT(DISTINCT i.rid), 4) AS d0_rev_per_install,
       ROUND(100e0 * COUNT(DISTINCT CASE WHEN i.total_rev_d00 > 0 THEN i.rid END) / COUNT(DISTINCT i.rid), 2) AS monetiser_pct
FROM play_data.install_user_segmentation i
JOIN derived_tables.dau_splits s
  ON s.gid = i.gid AND s.cli = i.cli AND s.rid = i.rid
 AND s.dau_date = i.install_date AND s.actual_diff = 0
WHERE i.install_date BETWEEN DATE '{start_date}' AND DATE '{end_date}' AND i.gid = {gid} AND i.cli = {cli}
  AND s.dau_date BETWEEN DATE '{start_date}' AND DATE '{end_date}' AND s.gid = {gid}
  AND s.install_bucket <> 'reject'
  AND i.session_time_decile_d00 <> 'NA'
GROUP BY 1 ORDER BY 1
```

**2. D0 monetiser rate and revenue per install by day (payer = total_rev_d00 > 0)**
```sql
SELECT i.install_date,
       COUNT(DISTINCT i.rid) AS installs,
       ROUND(100e0 * COUNT(DISTINCT CASE WHEN i.total_rev_d00 > 0 THEN i.rid END) / COUNT(DISTINCT i.rid), 2) AS monetiser_pct,
       ROUND(SUM(i.total_rev_d00) / COUNT(DISTINCT i.rid), 4) AS d0_rev_per_install
FROM play_data.install_user_segmentation i
JOIN derived_tables.dau_splits s
  ON s.gid = i.gid AND s.cli = i.cli AND s.rid = i.rid AND s.dau_date = i.install_date AND s.actual_diff = 0
WHERE i.install_date BETWEEN DATE '{start_date}' AND DATE '{end_date}' AND i.gid = {gid} AND i.cli = {cli}
  AND s.dau_date BETWEEN DATE '{start_date}' AND DATE '{end_date}' AND s.gid = {gid}
  AND s.install_bucket <> 'reject'
GROUP BY 1 ORDER BY 1
```

**3. D7 revenue per install and active days by D0 absolute session bucket (mature installs only)**
```sql
SELECT i.session_time_absolute_bucket_d00 AS d0_bucket,
       COUNT(DISTINCT i.rid) AS installs,
       ROUND(SUM(TRY_CAST(i.total_rev_d07 AS DOUBLE)) / COUNT(DISTINCT i.rid), 4) AS d7_rev_per_install,
       ROUND(AVG(TRY_CAST(i.ltdays_d07 AS INTEGER)), 2) AS avg_active_days_d0_d7
FROM play_data.install_user_segmentation i
JOIN derived_tables.dau_splits s
  ON s.gid = i.gid AND s.cli = i.cli AND s.rid = i.rid AND s.dau_date = i.install_date AND s.actual_diff = 0
WHERE i.install_date BETWEEN DATE '{start_date}' AND DATE '{end_date}'
  AND i.install_date <= current_date - INTERVAL '9' DAY      -- D7 matured
  AND i.gid = {gid} AND i.cli = {cli}
  AND i.ltdays_d07 IS NOT NULL AND i.ltdays_d07 <> 'NA'      -- drop no-D7-row installs
  AND s.dau_date BETWEEN DATE '{start_date}' AND DATE '{end_date}' AND s.gid = {gid}
  AND s.install_bucket <> 'reject'
GROUP BY 1 ORDER BY 1
```

**4. Top-decile D0 revenue concentration**
```sql
SELECT i.install_date,
       ROUND(SUM(CASE WHEN i.revenue_decile_d00 = 'R10' THEN i.total_rev_d00 END) / NULLIF(SUM(i.total_rev_d00), 0), 4) AS top_decile_rev_share
FROM play_data.install_user_segmentation i
WHERE i.install_date BETWEEN DATE '{start_date}' AND DATE '{end_date}' AND i.gid = {gid} AND i.cli = {cli}
GROUP BY 1 ORDER BY 1
```
(Reject not excluded here — add the `dau_splits` join from template 1 when the number will be reported.)
