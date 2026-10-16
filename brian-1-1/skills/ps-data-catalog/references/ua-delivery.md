# UA Delivery — Creative-Type CPI Decomposition (`chart_2454`) and Long-Horizon Cohort ROAS (`chart_1068`)

> **Two charts live in this file.** `chart_2454` (creative-type CPI decomposition) is the first half.
> **`chart_1068` (long-horizon cohort recovery / ROAS, D0–D360, with the network-type mapping) is the last
> section — read "chart_1068" below for any ROAS/LTV beyond D90, and read its CHART CHOICE RULE before
> mixing it with `chart_1706`.**

Extended catalog. Same discipline as everywhere else: query-only, resolve the version and variant from
`play_data.chart_config` this conversation (`references/query-engines.md`), verify the live schema before
claiming a field is unavailable.

> **Always group by or pin `network_name` before computing CTR, CPM, IPM or CPI.** These ratios are not
> comparable across networks, and summing across networks silently blends them.

**What it is for.** Creative-type-level UA delivery per install/spend date: impressions, clicks, installs,
spend, D1/D7 retained and recovery, plus campaign budget and bid where the network feed supplies them. Use
it to decompose CPI into CPM and IPM, and IPM into CTR and Click-to-Install. **It is not the headline eCPI
source — that is `chart_1706`** (see Verdict rule 4).

## Rollups & mandatory pins

**None.** No rollup rows to exclude. The mandatory discipline is analytic, not a filter: **always group by
`network_name`; never sum networks into one ratio.** `budget` and `bid` repeat across rows and are never
summed (see Raw metrics).

> **Engine & versions:** Druid — resolve `chart_2454-vN` and its variant per `references/query-engines.md`.
> Build every ratio client-side from summed raw columns (`SUM(spend)`, `SUM(impressions)`, …) over the
> period, **per network** — never average daily ratios (query-engines guardrail on ratios).

## Metrics

### CPI decomposition (derived)

| Metric_type | Name | Formula | Description |
|---|---|---|---|
| Custom | CPI | `{spend}/{installs}` | Spend per install for the slice. Equals `{CPM}/{IPM}`. **Per-network figure, not the portfolio headline eCPI.** |
| Custom | CPM | `{spend}/{impressions}*1000` | Cost per 1,000 impressions: the price of reach on that network. |
| Custom | IPM | `{installs}/{impressions}*1000` | Installs per 1,000 impressions: the efficiency half of CPI. `IPM = 1000 × {CTR} × {Click to Install}`. |
| Custom | CTR | `{clicks}/{impressions}` | Impression → click. **Only comparable within one network:** applovin and unity run roughly 47–85% (no close button on their ad formats); facebook and google roughly 1–4%. |
| Custom | Click to Install | `{installs}/{clicks}` | Click → install, store step included. Click-to-store-page and store-page-to-install are **not separable** in this chart. |

### Raw metrics (inputs to the formulas above)

| Metric_type | Name | Formula | Description |
|---|---|---|---|
| Normal | spend | `spend` | Network-reported ad spend for the row. |
| Normal | impressions | `impressions` | Ad impressions for the row. |
| Normal | clicks | `clicks` | Ad clicks as reported by the network; **definition differs by network — never compare across networks.** |
| Normal | installs | `installs` | Installs from the creative feed. **Does not tie to `chart_1706`** (see Datasource relationship). |
| Normal | d1_retained | `d1_retained` | Users counted as retained at D1 for the install date. Mid-Sep 2026 it is about 0.86 × installs — too high for a cohort retention rate — so **do not present `{d1_retained}/{installs}` as D1 retention without checking its population.** |
| Normal | d7_retained | `d7_retained` | Same family at D7; about 0.40 × installs in mid-Sep 2026, same caveat. |
| Normal | d1_recovery | `d1_recovery` | Sum of 0.67 × IAP rev + banner + interstitial + W2E + offerwall revenue at day 1 after install, per the `ltv_master_cc` join in the source SQL. |
| Normal | d7_recovery | `d7_recovery` | Same revenue definition at day 7 after install. |
| Normal | budget | `budget` | Campaign-day budget from the network feed. **Repeats on every country and creative row of the campaign: never SUM — take MAX per campaign-day.** |
| Normal | bid | `bid` | Campaign-day bid or target from the network feed. **Never SUM.** Unit depends on the feed (the adwords branch multiplies target ROAS by 100); applovin and unity units not confirmed. |

## Dimensions

| Dimension | Description |
|---|---|
| `__time` | Row date (`date_field` in the source SQL). Filter with a half-open range and aggregate to day first. |
| `gid` | Game id, **VARCHAR — quote literals.** |
| `cli` | Platform, VARCHAR. Seen: `0` and `1` on every network; `2` and `-1` only on facebook (since 2026-01-01); NULL on 11 facebook rows, 2025-08-25 to 2025-09-04. |
| `network_name` | Lowercased. Seen: applovin, facebook, google, ironsource (last row 2025-12-31), tiktok (first row 2026-01-01), unity. **Google is stored as `'google'`, not `'adwords'`.** |
| `country` | Lowercased 2-letter code. |
| `campaign_name` | Campaign name truncated at `' ('` for most networks. Google joins on the full trimmed name in the source SQL. |
| `creative_type` | Raw network value, differs by network (applovin: Playable/IEC/Video; facebook: others/Static/Video/Short Video/Carousel; google: TEXT/YOUTUBE_VIDEO/IMAGE/MEDIA_BUNDLE/untagged; unity: video/video+playable/playable/untagged; tiktok: Video/others). |
| `creative_type_label` | CASE relabel of `creative_type`: video and YOUTUBE_VIDEO → Video, IEC → Video + IEC, MEDIA_BUNDLE → Playable, IMAGE → Static, else unchanged. **Unity `playable` / `video+playable` stay lowercase while applovin `Playable` is capitalised — filter case-sensitively per network.** |
| `campaign_type` | From `dm_growth.campaign_tagging`. Seen: roas, event, install, creative, untagged, unknown, NULL. **NULL for 100% of google rows.** |
| `network_parameter` | Optimisation-target label from `campaign_tagging` (e.g. D28 BLD ROAS, D28 AD ROAS, D28_combo_roas, AAA, CBO, Engagement Event). **NULL for 100% of google rows.** |

## Datasource relationship — what ties to what

**`chart_2454` does not tie to `chart_1706`** (about 71% of spend, Sep 1–28 2026). Headline eCPI, spend and
installs come from `chart_1706` (`references/core-and-cohort.md`); `chart_2454` only **explains the move**.
Never put a `chart_2454` CPI beside a `chart_1706` eCPI as if they were the same metric, and never reconcile
one to the other by scaling — state that they are different feeds.

## CPI decomposition — procedure

**Identity:** `CPI = CPM / IPM`, and `IPM = 1000 × CTR × Click-to-Install`.

**Attribute a CPI move by log change (per network, period 1 vs period 0):**

```
ln(CPI1/CPI0) = ln(CPM1/CPM0) − ln(CTR1/CTR0) − ln(C2I1/C2I0)
```

The three terms sum exactly to the CPI move. **Say which term carries the move** (largest absolute term),
with its share of the total log change. A CPM rise is a price-of-reach move; a CTR or Click-to-Install fall
is an efficiency move (creative / store-step quality).

1. **Resolve** `chart_2454-vN` from `chart_config`; pull `SUM(spend, impressions, clicks, installs)` per
   `network_name` (× `cli`, × `creative_type_label` when drilling) per period — one statement, day-grained.
2. **Compute per network** CPM, IPM, CTR, C2I, CPI from the summed raws; run the log attribution.
3. **Portfolio-level CPI/CPM moves are partly network mix.** Split **mix from rate** first — hold each
   network's period-0 spend share fixed, recompute, and report the share of the move that is mix versus
   within-network rate — before blaming any single term (Verdict rule 3).
4. **Drill** the carrying term: `creative_type_label` → `campaign_type` / `network_parameter` → `country`.
5. **Present** a per-network table (CPI, CPM, IPM, CTR, C2I with deltas in-cell) and a waterfall of the
   log terms; label every figure "UA delivery (`chart_2454`)" and keep the `chart_1706` eCPI as the headline.

## Verdict rules

1. **Judge CPM, CTR, IPM, Click-to-Install and CPI against the SAME network's own history, same `cli`:**
   trailing 28 days vs the prior 28 days, plus that network's trailing 90-day range. Calendar-anchored and
   complete through D-2 **per network** (each network's own freshness, SR-6). This trailing-window basis is
   explicit for this chart and overrides the generic month-anchored default (SR-5) for these ratios.
2. **AppLovin and Unity CTR (~47–85%) is not an intent signal** — their ad formats have no close button. A
   CTR rise there with falling Click-to-Install means **lower-quality clicks, not a better creative.**
   Facebook, Google and TikTok CTR is a genuine intent signal.
3. **Portfolio CPI/CPM moves are partly network mix.** Split mix from rate before blaming a single term.
4. **`chart_2454` does not tie to `chart_1706`.** Headline eCPI comes from `chart_1706`; `chart_2454` only
   explains the move.

---

# chart_1068 — long-horizon cohort recovery / ROAS (D0–D360)

> **Engine & versions:** Druid — resolve `chart_1068-vN` and its two variants from `play_data.chart_config`
> (`references/query-engines.md`). Source table: `growth.ltv_master_cumulative` (Trino). Confirmed live
> 14 Oct 2026: base `chart_1068-v16`, installs `chart_1068-v16-metric`, spend
> `chart_1068-v16-device_language-device_type-lat_flag-metric`. Re-resolve the version each conversation.

**What it is for.** Install-date cohort recovery curve for every game (43 gids, install dates from
2021-01-01) at snapshot ages D0 to D360, with the install-source taxonomy `network_type` and a `geo_bucket`
geography. **It is the chart for long-term revenue / LTV / ROAS beyond D90** — `chart_1706` `overall_rev_dX`
is capped at d90 and cannot answer these. One row per gid × cli × network_name × country × device_type ×
device_language × lat_flag × reattribution_flag × install_date × `metric` (age snapshot).

## CHART CHOICE RULE — chart_1706 vs chart_1068: pick ONE per answer, NEVER mix

1. **Decide the chart before the first query** and take **every** cohort metric in that answer — installs,
   spend, revenue/recovery, retention, ROAS, LTV, eCPI — from that one chart.
2. **Never build one number from both charts.** No installs from one with revenue from the other, no spend
   from one with recovery from the other, no ratio whose numerator and denominator come from different
   charts, no overlaying a `chart_1706` series and a `chart_1068` series on one axis, no averaging them.
3. **If the user asks for both,** return two separately labelled sections ("chart_1706" and "chart_1068").
   Never one blended figure. Label every figure with its source chart.
4. **Routing:**
   - `chart_1706` → revenue / ROAS / LTV up to **D90**, classic dX retention, and cuts by `install_bucket`,
     `install_source`, `install_type`, `install_build`.
   - `chart_1068` → long-term revenue / ROAS / LTV **D120–D360**, and cuts by `network_type`, `geo_bucket`,
     `device_type`, `lat_flag`, `reattribution_flag`.
   - A question that **spans the boundary** (e.g. D30 vs D180 ROAS) runs **entirely on `chart_1068`** —
     never D30 from `chart_1706` and D180 from `chart_1068`.
5. **They do not tie** (all games, install date 2026-07-01): installs 367,066 (1706) vs 392,740 (1068),
   +7.0%; spend 519,361 vs 522,302, +0.6%; D7 revenue 143,523 vs 146,666, +2.2%; D90 revenue 372,372 vs
   380,420, +2.2%. Never reconcile one to the other by scaling — state that they are different feeds.

## Rollups & mandatory pins

- **`metric` — always pin exactly one value** (e.g. `D90`). Revenue, payers and `dau_days` are cumulative at
  that age; summing across `metric` values multiplies the cohort.
- **`spend` — never `SUM` on the raw table.** It repeats on every `device_type` × `lat_flag` ×
  `device_language` row of a group. On 2026-07-01 D0: raw `SUM(spend)` 3,324,461 vs de-duplicated 522,301
  (6.4× over). Use the Druid spend variant, or `MAX(spend)` per gid × cli × network_name × country ×
  reattribution_flag × install_date, then sum.
- `geo_bucket` is a rollup, not a country — never sum alongside `country`.
- No other rollup value exists on this chart; `SUM()` across `gid`, `cli`, `network_type`, `country` is the
  correct total.

## Variants — three statements

| Variant | Carries | Notes |
|---|---|---|
| `chart_1068-vN` (base) | `total_recovery_ilrd`, `iap_rev`, `ad_recovery_ilrd`, `retained_users`, `dau_days`, `payers` | All dimensions incl. `metric`. **No installs, no spend.** |
| `chart_1068-vN-metric` | `installs` | **No `metric` dimension** — one installs figure per cohort. For 2026-07-01 it equals the D90 row sum (392,740), not the D0 row (391,048). This is the denominator for every LTV / retention / eCPI. |
| `chart_1068-vN-device_language-device_type-lat_flag-metric` | `spend` | Those four dimensions do **not** exist here; already de-duplicated (2026-07-01: 522,302). |

Druid cannot join variants: **one statement per variant**, each covering every period, game and segment the
answer needs, combined client-side on `gid` × `cli` × `__time` (× the shared slicer, e.g. `network_type`).

## Network mapping (`network_type`) — computed by the chart, not stored

`network_type` is derived in the chart SQL by a `CASE` on **`LOWER(network_name)`**. Anything not listed
falls to `other`. **Do not use the stored `network_type` column on `growth.ltv_master_cumulative`** — it
disagrees with the chart (e.g. `amazon_ads`, `z2a`, `xiaomi_getapps`, `tapjoy`, `digitalturbine_t1` are
`other` in the table but DSP / DSP / DSP / incent / preload in the chart; `adwords_pmax` is `other` in the
table but `platform` in the chart). When querying the warehouse table directly, re-derive it from this map.

| network_type | network_name values (lower-cased) |
|---|---|
| `preload` | digitalturbine, digitalturbine_t1, xiaomi_pai, xiaomi_pai_getapps, ironsource_aura |
| `affiliate` | snapchat, tiktok |
| `DSP` | aarki, chartboost, liftoff, amazon_ads, digitalturbine_dsp, mobavenue_dsp, inmobi_dsp, adikteev, bigabid, smadex, molocoads, z2a, zucks, xiaomi, xiaomi_dtdsp, xiaomi_getapps, xiaomi_dtdsp_getapps, kayzen |
| `platform` | adwords_uac, adwords_search, adwords_video, adwords_pmax, apple_search, gotap, facebook |
| `video` | applovin, ironsource, mintegral, sonypreloads, unity, vungle |
| `incent` | mistplay, blind_ferret, adjoe, play2pay, almedia, admattic, gamelight, sonypreloads_incent, kashkick, prodege, tapjoy, playback_rewards, exmox, bigtreeads, tyrads_new, tyrads |
| `organic` | organic, organic (dt_t1), organic (w/o google play), organic (google play), deeplink |
| `xpromo` | quest_center |
| `other` | **everything else** — incl. NULL `network_name`, kickcash, mobupps, pangle, organic_getapps, untrusted_devices, untagged, invite, versemedia, twitter, adcolony, dv_360, samsung_store … |

Watch-outs, all confirmed live (Sep–Oct 2026):

- **Near-twin names map to different types:** `ironsource` = video but `ironsource_aura` = preload;
  `xiaomi` = DSP but `xiaomi_pai` = preload; `sonypreloads` = video but `sonypreloads_incent` = incent.
- **`kashkick` is mapped (incent) but the table holds `kickcash` — that spelling lands in `other`.**
- **NULL `network_name` is `other` and install-heavy:** few rows (≈2.7K) but ≈1.9M installs on D0 rows —
  comparable to organic (w/o google play). Do not read `other` as small.
- `organic (dt_t1)` counts as `organic`, while `digitalturbine_t1` counts as `preload`.
- This taxonomy is **not** `chart_1706`'s `install_bucket` / `install_source`; do not equate the two or
  translate one into the other.

## Metrics

### Recovery and ROAS (cumulative to age X — pin `metric`)

| Metric_type | Name | Formula | Description |
|---|---|---|---|
| Normal | Total Recovery | `total_recovery_ilrd` | Total revenue the cohort has returned from install through the pinned age; equals `iap_rev + ad_recovery_ilrd` (checked at D0 and D90). Net-vs-gross basis not confirmed. Numerator for every long-term ROAS / LTV on this chart. |
| Normal | IAP Revenue | `iap_rev` | In-app-purchase revenue, cumulative to the pinned age. |
| Normal | Ad Recovery | `ad_recovery_ilrd` | Ad revenue from impression-level revenue data (ILRD), cumulative to the pinned age. |
| Custom | DX ROAS | `{total_recovery_ilrd}/{spend}` | Share of spend recovered by age X (`metric='DX'`). Sum numerator and denominator over the cohort set **before** dividing; never average daily ROAS. Report only matured cohorts. |
| Custom | DX IAP ROAS / DX Ad ROAS | `{iap_rev}/{spend}` · `{ad_recovery_ilrd}/{spend}` | IAP-only and ad-only parts of DX ROAS. |
| Custom | DX LTV | `{total_recovery_ilrd}/{installs}` | Recovery per install at age X. |
| Custom | Ad share of recovery | `{ad_recovery_ilrd}/{total_recovery_ilrd}` | Share of recovery from ads rather than IAP. |

### Cohort size, spend, engagement

| Metric_type | Name | Formula | Description |
|---|---|---|---|
| Normal | installs | `installs` | Cohort installs, reattribution rows included. Slightly different on each age row on the table (391,048 at D0 → 392,740 at D90 for 2026-07-01) as late installs post; take it from the `-metric` variant. |
| Normal | spend | `spend` | Cohort-group marketing spend. De-duplicate (see pins). Drifts up with age on the raw table (3,324,461 at D0 → 3,419,158 at D90 raw) as cost updates land. |
| Custom | eCPI | `{spend}/{installs}` | Spend per install; both from `chart_1068`. |
| Normal | retained_users | `retained_users` | Users active **exactly on day X** — not cumulative (D0 = installs; D1 = 101,203 for 2026-07-01). |
| Custom | DX Retention % | `{retained_users}*100/{installs}` | Percent of the cohort active on day X. |
| Normal | dau_days | `dau_days` | Cumulative active user-days from install through age X (D1 492,251 = D0 391,048 + D1 retained 101,203). |
| Normal | payers | `payers` | Users who have paid by age X; rises with age (398 at D0 → 1,453 at D90). Cumulative — never sum across `metric`. |
| Custom | DX Payer Conversion % | `{payers}*100/{installs}` | Percent of the cohort that has paid by age X. |

## Dimensions

| Dimension | Description |
|---|---|
| `gid` | Game id. Resolve name → gid via `ps-entities`. |
| `cli` | Platform code 0 / 1 / 2 (chart filters to these; live values are 0, 1, 2). Mapping per `ps-entities` convention. |
| `__time` (install_date) | Install date of the cohort; 2021-01-01 to 2026-10-13. Cohort grain, not activity date. |
| `metric` | Age snapshot `'D' + diff`. **Only** D0, D1, D2, D3, D5, D7, D14, D21, D30, D45, D60, D90, D120, D150, D180, D210, D240, D270, D300, D330, D360 — no D4, D6, D10, D100. Never invent an in-between age; interpolate and say so. |
| `network_name` | Raw network / source, lower-cased for the mapping. NULL on 1.46M rows (0.35%). |
| `network_type` | See **Network mapping** above. |
| `country` | Install country code; `na` appears as an unknown value (≈1.9M installs on D0 rows, Sep–Oct 2026). |
| `geo_bucket` | Computed: `'us'` (lower-case) for US; `'Tier 1 non-US'` for gb / au / ca; otherwise the Title-Case bucket from `public.country_region_mapping` (latest row per country_code: Africa, Central and Carribean, Middle East Asia, South and SouthEast Asia, Southern Europe, South America, Eastern Europe, Central and East Asia, Oceania, Western Europe, Northern Europe, North America); countries absent from the mapping → `'others'`. Rollup, not a country. |
| `device_type` | phone, tablet, pc, tv, console, ipod; NULL on ≈6.0% of rows. |
| `device_language` | 2-letter code (en, es, fr, pt, ar, de …); no NULLs. Spend-duplication axis. |
| `lat_flag` | `lat` / `non-lat`; NULL on ≈6.9% of rows. Spend-duplication axis. |
| `reattribution_flag` | `installs` / `reattributions`; no NULLs. Not filtered by the chart, so reattribution rows are inside installs and recovery by default. Whether `= 'installs'` reproduces `chart_1706` `install_type = only_install` is **not confirmed**. |

## Cohort maturity and D-2

A `dX` row exists only for `install_date ≤ (data cut-off, D-2) − X days`. As of 14 Oct 2026 (cut-off
2026-10-12) the latest install_date per age is: D1 10-11, D7 10-05, D30 09-12, D90 07-14, D180 04-15, D360
2025-10-17. Later cohorts simply have no row for that age — **absence is never a finding**, and a shorter
age is never silently substituted. D0 runs to 2026-10-13 but is partial. For multi-month windows, state the
highest mature age used per install month.

## Procedure — long-horizon ROAS

1. **Decide the chart** per the CHART CHOICE RULE (age > D90 → `chart_1068`).
2. **Resolve** the three `chart_1068` variants from `chart_config`.
3. **Run three statements** (recovery with `metric` pinned or grouped, installs, spend), day- or
   month-grained over the same install-date window and same slicers.
4. **Keep only matured cohorts** for the requested age; disclose the install-date range kept.
5. **Divide after summing** — total recovery over total spend; never average daily ROAS.
6. **Label** every figure "chart_1068" and, where relevant, "D{X} · matured cohorts through {date}".

## Datasource relationship — what ties to what

- **`chart_1068` does not tie to `chart_1706`** (see rule 5 above). Never combine them in one number.
- `total_recovery_ilrd` is not a drop-in for `overall_rev_dX`; do not label them as the same metric.
- `chart_1068` does not tie to `chart_2454` either (separate feeds); headline cohort ROAS is the one chart
  chosen under the rule, `chart_2454` only explains CPI moves.

## Glossary

| Term | Meaning |
|---|---|
| IPM | Installs per mille: installs per 1,000 impressions. |
| IEC | Creative type labelled "Video + IEC"; expansion not stated in the source SQL. |
| ILRD | Impression-level revenue data: per-impression ad revenue, the source of `ad_recovery_ilrd`. |
| Recovery | Cumulative revenue a cohort has returned by age X; recovery ÷ spend = ROAS. |
| LAT | Limited Ad Tracking; `lat_flag = 'lat'` marks users who opted out. |
