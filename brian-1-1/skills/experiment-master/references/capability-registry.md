# Capability Registry — selection metadata

Metadata the Master uses to choose, order, cost and cover a capability. It holds no metric formulas,
denominators, pins or statistical methodology: those are owned by each analysis file and are never
restated here.

## Registry

Registry order is the deterministic dispatch order.

| Capability | Domain | Analysis file | Source table | Dependency table | Supported depth | PERIOD (date axis) | Partners |
|---|---|---|---|---|---|---|---|
| revenue | REVENUE | `analyses/revenue.md` | `experiment.revenue_without_xpromo` | `experiment.dau` | D2, D3 | trigger, evidence (activity date) | engagement, sessions |
| retention | RETENTION | `analyses/retention.md` | `experiment.rolling_retention` | — | D2, D3 | trigger, evidence (activity date) | engagement, sessions |
| engagement | ENGAGEMENT | `analyses/engagement.md` | `experiment.engagement` | `experiment.dau` | D2, D3 | trigger, evidence (activity date) | sessions, retention |
| sessions | SESSIONS | `analyses/sessions.md` | `experiment.sessions` | — | D2, D3 | trigger, evidence (activity date) | engagement, revenue |
| classic_retention | CLASSIC_RETENTION | `analyses/classic-retention.md` | `experiment.retained_users` | `experiment.installs` | D2, D3 | trigger, evidence (install date) | — |
| ltv_ltdays | LTV_LTDAYS | `analyses/ltv-ltdays.md` | `experiment.recovery`, `experiment.active_dau_days` | `experiment.installs` | D2, D3 | trigger, evidence (install date) | — |
| rolling_ltv | ROLLING_LTV | `analyses/rolling-ltv.md` | `experiment.rolling_ltv` | — | D2, D3 | trigger, evidence (activity date) | — |
| economy | ECONOMY | `analyses/economy.md` | `experiment.economy` | `experiment.dau` | D2, D3 | trigger, evidence (activity date) | — |

- **Supported depth:** the depths the capability serves; stages per depth are in `master-state.md`. All
  eight also serve `design.status = NO_COMPARISON` with descriptive values only.
- **PERIOD (date axis):** each capability declares its own PERIOD support — `trigger` (it can own the
  PERIOD trigger metric), `evidence` (it can supply cross-capability evidence) — and the date axis of
  its evidence (`activity date` or `install date`, `period-evidence.md` § PeriodEvidenceRecord); its
  PERIOD methodology is in its analysis file. A capability that declares no trigger or evidence role
  states the concrete reason here and is handled by `period-evidence.md` Q14; none does currently.
  Declaring support does not make a PERIOD request run every metric of the capability: the Master
  decides what runs from the trigger, the evidence selection (each capability's own Stage 1), the
  scope, the phase and the budget. A capability with several metric families (LTV & LTDays) or
  currencies (Economy) stays one capability.
- **Classic Retention** ("Retention (classic)") is a separate definition from Rolling Retention
  (`retention`): install-cohort based, retention days D1–D30, `retained_users` ÷ `installs`, in FULL,
  TARGETED and PERIOD (install-date evidence). It is never a fallback for a Rolling Retention request,
  the two are never merged, and it has no partner.
- **LTV & LTDays** (`ltv_ltdays`) is install-cohort based: four metric families — LTV, Ad LTV, IAP LTV
  and LTDays — at horizons D1, D3, D5, D7, D10, D15, D21, D30, D45, D60, D90, D120, D180, from
  `experiment.recovery` and `experiment.active_dau_days` ÷ `experiment.installs`. It is one capability
  with four metric families, supports PERIOD (install-date evidence) and has no partner. It is never a
  fallback for Revenue, Classic Retention or Rolling Retention, and none of them is a fallback for it.
- **Rolling LTV** (`rolling_ltv`) is activity-date based: for each activity date, the forward revenue
  from that day through day +7 of the users active that day, ÷ that day's DAU, with the user's
  age-since-install bucket as a dimension; three metrics (`rolling_ltv_d7`, `iap_rolling_ltv_d7`,
  `ad_rolling_ltv_d7`), D7 only, from `experiment.rolling_ltv`. It is a separate capability from
  `ltv_ltdays` (different population, time axis, denominator and revenue window), never a fallback for it
  or for Revenue, and none of them is a fallback for it. It supports PERIOD (activity-date evidence)
  and has no partner. There is no Rolling LTDays.
- **Economy** (`economy`) is the **in-game economy only**: in-game currencies and resources earned, spent
  and acquired inside the game, in in-game units, never money. Six metrics per `cash_type`
  (`earn_per_dau`, `spend_per_dau`, `purchase_per_dau`, `net_per_dau`, `earners_per_dau`,
  `spenders_per_dau`), currencies never pooled, from `experiment.economy` ÷ `experiment.dau`, with PAB
  from `experiment.pre_economy_2` and `experiment.pre_dau_2`. It supports PERIOD (activity-date evidence),
  as trigger or cross-capability evidence, and has no partner. It never serves monetary revenue (Revenue,
  LTV & LTDays, Rolling LTV) or acquisition spend, and none of those serves it.
- **Dependency table:** a table the capability reads in addition to its source table. A dependency that
  lacks coverage removes the capability for that experiment-version unit. `ltv_ltdays` has two source
  tables; each gates only its own metric families (§ Coverage and availability).
- **Partners:** advisory only. A follow-up may name a partner; selection still needs justification.

## Domain matching

`domain_ref` is matched against these aliases in registry order; the first match wins, after the
Rolling LTV, Economy, retention and LTV rules below are applied.

| Domain | Aliases |
|---|---|
| REVENUE | revenue, Rev/DAU, ARPDAU, monetization, eCPM, impressions, ad revenue, IAP |
| RETENTION | rolling retention, rolling D1, rolling D3 |
| ENGAGEMENT | engagement, actions, clear, clears |
| SESSIONS | sessions, session length, time spent |
| CLASSIC_RETENTION | classic retention, cohort retention, install-cohort retention, retention (classic) |
| LTV_LTDAYS | LTV, lifetime value, DX LTV, cohort LTV, revenue per install, Ad LTV, IAP LTV, LTDays, lifetime days, active days per install |
| ROLLING_LTV | rolling LTV, rolling lifetime value, IAP rolling LTV, Ad rolling LTV |
| ECONOMY | economy, in-game economy, in-game currency, coins, cash, hints, lives, spin, net economy, earners, spenders |

- **Rolling LTV (applied first, before the retention and LTV rules and the alias table).** A request
  naming "rolling LTV" or "rolling lifetime value" routes to `ROLLING_LTV` (`analyses/rolling-ltv.md`),
  never to `LTV_LTDAYS`, RETENTION or REVENUE:
  - "rolling LTV" / "rolling lifetime value" → the three metrics (`rolling_ltv_d7`, `iap_rolling_ltv_d7`,
    `ad_rolling_ltv_d7`); "IAP rolling LTV" → `iap_rolling_ltv_d7` only; "Ad rolling LTV" →
    `ad_rolling_ltv_d7` only;
  - the only horizon is D7 (used when none is named); any other named horizon (D14, D30, …) is
    `UNSUPPORTED` / `HORIZON_UNSUPPORTED` for that horizon, named in the answer; no other horizon is
    substituted;
  - "rolling LTDays" or "rolling lifetime days" is `NO_CAPABILITY`: the source has no forward
    active-days measure, and neither `ltv_ltdays` nor this capability is used in its place;
  - a request without "rolling" never routes here, and `ltv_ltdays` is never a fallback for a Rolling
    LTV request, nor the reverse.
- **Economy (applied after the Rolling LTV rule, before the retention and LTV rules and the alias
  table).** Context decides ownership, never a single word. A request about **in-game** currencies or
  resources — one that names a currency or resource (`cash`, coins, hints, lives, spin, skipit,
  inventory or another stored `cash_type`), "currency", "in-game" or "economy", and asks about
  earning, spending or acquiring them, net economy, earners or spenders, or the pre-version economy
  (Economy PAB) — routes to `ECONOMY` (`analyses/economy.md`):
  - earn → `earn_per_dau`; spend → `spend_per_dau`; in-game purchase or acquisition → `purchase_per_dau`;
    net → `net_per_dau`; earners → `earners_per_dau`; spenders → `spenders_per_dau`; "economy" with no
    metric → all six. A named currency → that `cash_type` only; none named → each `cash_type` present,
    separately. Currencies are never pooled;
  - in-game "spend" is never acquisition spend, and in-game "purchase" is never IAP revenue: the word
    alone never routes to REVENUE. Examples → Economy: "Did users earn more cash?", "How many hints did
    users spend?", "Did users spend more coins?", "How much in-game cash was earned?", "How much coin
    was purchased inside the game?";
  - money is never Economy: "What was the IAP revenue?", "How much money did users spend buying
    coins?", "How much did users pay for coins?" → REVENUE; acquisition spend ("How much did we spend
    acquiring these users?") → `NO_CAPABILITY`;
  - a balance or wallet request, or a per-user currency rate (per earner, per spender, per user), is not
    a V1 metric → `NO_CAPABILITY`; nothing is substituted;
  - Engagement's `use_hint` action counts stay Engagement's diagnostic; spending or earning hints as a
    resource is Economy;
  - only when the context genuinely cannot tell in-game from monetary ("purchases" or "spend" with no
    other context) → ask once; no default is assumed.
- **Retention (applied before the alias table).** Classic Retention and Rolling Retention are separate
  definitions, and a request never resolves silently to either. Each requested retention day is resolved
  on its own:
  - "rolling" wording → `RETENTION` (`analyses/retention.md`) for D1 and D3. A rolling day other than
    D1 or D3 ("rolling D7") is `UNSUPPORTED` for that day; it is never switched to Classic Retention;
  - "classic" / "cohort" wording (the aliases above) → `CLASSIC_RETENTION` for any day D1–D30;
  - D2 or D4–D30 without a qualifier ("D7 retention") → `CLASSIC_RETENTION` directly: only Classic
    Retention supports those days, so nothing is asked;
  - "retention", "D1 retention" or "D3 retention" (or D1 / D3 named as the metric), or "DX retention" with
    no day, without "rolling" or "classic" → ask once whether the user means classic Retention or Rolling
    Retention (`protocols/context-resolution.md` step 8). Nothing is dispatched for that retention
    element until it is answered, and no default is assumed; the rest of the request proceeds. "Rolling"
    → `RETENTION`; "classic" → `CLASSIC_RETENTION` (with no day named, its default days);
  - a request with several days is split by day: an unambiguous day resolves (for example D7 →
    `CLASSIC_RETENTION`) and never settles an ambiguous one; one question covers every ambiguous day;
  - D0, and any day above D30, is `UNSUPPORTED` for that day, whatever the qualifier; no other day is
    substituted.
- **LTV & LTDays (applied before the alias table, after the retention rule).** A request naming LTV,
  lifetime value, DX LTV, cohort LTV, revenue per install, Ad LTV, IAP LTV, LTDays, lifetime days or
  active days per install routes to `LTV_LTDAYS`, even though "revenue" and "IAP" are REVENUE aliases;
  Rev/DAU, ARPDAU and other revenue wording stay REVENUE, and LTDays never routes to either retention
  capability (nor a retention request to it). Each metric family is its own metric:
  - "LTV", "lifetime value", "DX LTV", "cohort LTV" or "revenue per install" → the three LTV families
    (`ltv_dX`, `ad_ltv_dX`, `iap_ltv_dX`); "Ad LTV" → `ad_ltv_dX` only; "IAP LTV" → `iap_ltv_dX` only;
    "LTDays", "lifetime days" or "active days per install" → `ltdays_dX` only; several named families →
    each of them;
  - a named horizon among D1, D3, D5, D7, D10, D15, D21, D30, D45, D60, D90, D120, D180 is computed
    (`horizon_basis = USER_REQUESTED`); with none named, the defaults D1, D3, D7, D15, D30 (`DEFAULT`);
  - any other horizon (D0, D2, D14, D28, …) is `UNSUPPORTED` / `HORIZON_UNSUPPORTED` for that horizon,
    named in the answer; the nearest horizon is never substituted, and the other horizons proceed;
  - "rolling LTV" and "rolling lifetime value" route to `ROLLING_LTV` (rule above), never here;
    "rolling LTDays", "predicted LTV" and "predicted LTDays" are `NO_CAPABILITY` (stated as
    unsupported, with the registered domains listed). Neither this capability nor
    `experiment.predicted_recovery` or `experiment.predicted_active_dau_days` is used in their place.
- A request for session length or time spent routes to sessions. That capability reports the metric as
  `UNCONFIRMED` / not reported, as `analyses/sessions.md` states, and the Master carries that state
  unchanged.
- A domain no capability serves is recorded as `NO_CAPABILITY` with the registered domains listed. No
  proxy is substituted.
- ENGAGEMENT is Clear-first (`analyses/engagement.md`): the primary metric is `clear` (Clear / DAU) and
  is implicit, so no action is required in the request and a request that names `clear` routes
  identically. `view`, `use_hint` and `w_clear` are supporting diagnostics the capability selects at the
  same scope; they are not domains, aliases or routes. The Master applies no `action_type` routing, no
  top-N default, and there is no generic "actions per DAU".
- PAB is not a domain: it has no alias and no capability (see PAB).

## Supported cuts

Each analysis file is the only source of truth for its supported cuts, crossings, grouping and
last-layer dimensions. The registry keeps no copy.

## Cost estimates — CONFIGURABLE

Estimated query statements, used for `estimated_cost` and `budget_cost` in `master-state.md`. They are
configuration values, upper bounds that assume no reuse; a series already in state at the same
experiment-version, window and grain may be reused, which lowers the actual spend. One statement per
table covers one experiment-version unit and, for engagement, its Clear and supporting-diagnostic
actions.

| Capability | Stage 1 statements (analysis) | Stage 1 PAB statements | Stage 2 statements per analytical step | PAB re-check statements |
|---|---|---|---|---|
| revenue | 2 | 2 | 2 | 2 |
| retention | 1 | 1 | 1 | 1 |
| engagement | 2 | 2 | 2 | 2 |
| sessions | 1 | 1 | 1 | 1 |
| classic_retention | 2 | — (no PAB) | 2 | — (no PAB) |
| ltv_ltdays | 3 | — (no PAB) | 3 | — (no PAB) |
| rolling_ltv | 1 | — (out of scope) | 1 | — (out of scope) |
| economy | 2 | 2 | 2 | 2 |

An analytical step is one cut, crossing or grouping that the capability's analysis file selects. The
default cut set (`analysis-contract.md` § Default cut set) is part of the mandatory floor of a FULL read;
its cells are read from the cut statements the analysis file names, one statement per cut dimension and
metric group. Beyond the default set the capability, not the Master, decides which steps run, adaptively:
the Master prices each step it is asked to run, and the finite budget bounds how many do. Stage 1 across
the eight capabilities is 14 analysis statements plus 8 PAB statements (revenue 2, retention 1, engagement
2, sessions 1, economy 2), 22 in all, for one experiment-version unit; PAB is part of Stage 1 and is
spent with it, not as a follow-up. Every capability declares PERIOD evidence, so Stage 1 across the
PERIOD-evidence capabilities is the same statements per unit. A user-requested PAB re-check is priced per
scheduled check, not per cell.

## PAB — CONFIGURABLE metadata

PAB is a capability-owned adjustment, not a domain, capability or mode. It runs in Stage 1 with the
capability's own analysis (`purpose: ANALYSIS`, `pab_config.pab_mode = ADJUST`) and again for every cell
that has a pre-test counterpart, and the generic adjustment rule is `analysis-contract.md` § PAB
adjustment. A user may also ask for a re-check of one result: an `AnalysisRequest` with
`purpose: PAB_CHECK` to the capability that owns it.

| Capability | PAB table(s) read |
|---|---|
| revenue | `experiment.pre_revenue_2`, `experiment.pre_dau_2` |
| retention | `experiment.pre_rolling_retention_2` |
| engagement | `experiment.pre_engagement_2`, `experiment.pre_dau_2` |
| sessions | `experiment.pre_sessions_2` |
| classic_retention | none: PAB is not supported (no PAB table or methodology) |
| ltv_ltdays | none: PAB is not supported (no PAB table or methodology) |
| rolling_ltv | none: PAB is out of scope for this capability |
| economy | `experiment.pre_economy_2`, `experiment.pre_dau_2` |

- Classic Retention and LTV & LTDays run no PAB and never schedule a `PAB_CHECK`. A user-requested PAB check on one of
  their results is recorded `UNSUPPORTED` / `NO_PAB` (no PAB methodology or table) without a coverage
  probe or a dispatch; no PAB figure is produced.
- PAB is out of scope for Rolling LTV: it never schedules or suggests a `PAB_CHECK`, and a requested PAB
  check on its results is stated as out of scope, with no probe, dispatch or PAB figure.

- PAB is part of Stage 1 for revenue, retention, engagement, sessions and economy in FULL_EXPERIMENT_READ
  and TARGETED_DIAGNOSIS: the whole-scope result and every default-cut cell with a pre-test counterpart
  gets a `pab[]` entry with `adjusted`. A PERIOD request runs PAB for the capabilities and units it
  dispatches, under the same rule. A capability no longer waits for a `followups[]` suggestion.
- Before dispatch, one bounded `COVERAGE` probe covers the PAB table(s) for that unit, as context spend.
  A PAB table with no rows for the unit gives `pab` status `NOT_IN_TABLE`; the results of that capability
  are read observed (†) and the reason is stated.
- The registry carries only table names and cost. Tables, keys, windows and formulas stay in the analysis
  files; the adjustment, PAB uncertainty and Conf are the generic rule of `analysis-contract.md` § PAB
  adjustment.

## Coverage and availability

Run before any capability executes:

1. One bounded `COVERAGE` probe (`protocols/context-resolution.md` § Probes) per source and dependency
   table, for all units in scope, over the analysis window.
2. Result per `(capability, exp_id, version)`: `AVAILABLE`, or `NOT_IN_TABLE` (no rows for that
   `(exp_id, version)` in the window) with the probe quoted. A dependency table that is `NOT_IN_TABLE`
   also makes the capability `NOT_IN_TABLE` for that unit, with reason `DEPENDENCY`. For `ltv_ltdays`,
   `experiment.recovery` and `experiment.active_dau_days` each gate only their own metric families (the
   absent one is `NOT_IN_TABLE` at `METRIC` scope while the other runs); the capability is `NOT_IN_TABLE`
   only when both are absent, or with reason `DEPENDENCY` when `experiment.installs` is.
3. A capability that is `NOT_IN_TABLE` for a unit is not dispatched for it; it is recorded in
   `unresolved` and reported as `NOT_IN_TABLE`.

Coverage is always a live probe: no earlier observation, including a table or game once seen absent,
stands in for it. Data handling for each table is in its analysis file.

## Selection by mode

Applied independently to each experiment-version unit in scope.

- **Engagement runs Clear-first in every mode.** `clear` is the implicit primary action; no action is
  named by the user, nothing is asked about one, and no top-N or volume-ranked default is applied.
  Whether `clear` or a diagnostic exists in a unit is reported by the capability (`NOT_IN_TABLE` at
  metric scope), not a Master dispatch gate.
- **FULL_EXPERIMENT_READ:** select all eight capabilities; run the coverage probes; dispatch each one
  only where it is `AVAILABLE`; report `NOT_IN_TABLE` for the rest. Classic Retention runs its default
  days; LTV & LTDays runs all four families at its default horizons; Rolling
  LTV runs its three metrics at D7; Economy runs its six metrics for each currency present. Every capability
  runs its Stage 1 PAB (where it has a PAB table) and the default cut set (`analysis-contract.md`
  § Default cut set) as part of the mandatory floor.
- **Negative versions (Classic Retention, LTV & LTDays, Rolling LTV and Economy only).** A `version`
  value that starts with `-` has unresolved semantics and is never reinterpreted. It stays among the
  discovered candidates (labelled "version semantics unknown"); it is never removed from discovery. For
  `classic_retention`, `ltv_ltdays`, `rolling_ltv` and `economy`, each on its own (for `economy`, its PAB
  too):
  - **explicitly requested** (`version_ref` names it): not dispatched; recorded `UNSUPPORTED` with reason
    `VERSION_SEMANTICS_UNKNOWN`, keeping the requested `(exp_id, version)` and stating that rows exist
    when the coverage probe found them;
  - **not explicitly requested**: never auto-selected. When the shared selection rules (a period, or the
    latest version) pick such a version as a unit, the capability is not dispatched for that unit and
    the unit is recorded for it as `SKIPPED_NOT_AUTO_SELECTED` with reason `VERSION_SEMANTICS_UNKNOWN`;
    the version remains listed as a candidate;
  - in both cases no other version is substituted and nothing is pooled. Version selection and the other
    capabilities are unchanged.
- **TARGETED_DIAGNOSIS:** select the capability matching `domain_ref`, after its coverage probe. Add a
  partner only when the question itself names another domain, or a follow-up justifies it; each partner
  passes the same coverage probe.
- **Scope, FULL and TARGETED:** a requested segment (`segment_ref`) is resolved to lens `L1`
  (`protocols/context-resolution.md` step 2b) and sent as the identical canonical scope to every
  selected capability for a unit; coverage is scope-bounded, and a unit with no scoped rows is
  `NO_SCOPED_EXPOSURE`. Scope never changes which capabilities are selected.
- **PERIOD_IMPACT_ANALYSIS:** the trigger metric (`period-evidence.md` § Trigger, scope and evidence)
  names the trigger capability, which must declare PERIOD `trigger` support (§ Registry); it never limits
  selection, and it resolves to exactly one canonical metric of that capability (an ambiguous trigger is
  asked once; metrics are never pooled). The cross-capability set — the first `cross_capability_max_units`
  investigable units in candidate-priority order (Tier 1 → Tier 2 → Tier 3; tier orders the filling and
  is not an eligibility cut) — gets every capability that declares PERIOD `evidence`, each where its
  coverage probe (scope-bounded when there is a scope) finds the unit: the trigger capability with basis
  `PERIOD_TRIGGER`, the others `PERIOD_CROSS_CAPABILITY`. Every other investigable unit gets the trigger
  capability only. As evidence a capability runs its own Stage 1 under its analysis file's PERIOD rules,
  not every metric it can produce; each result is computed once and its role never changes its identity.
  A unit with `NO_SCOPED_EXPOSURE` is listed and not dispatched. The phases and spend order are in
  `master-state.md` § Budget; the cost estimates above are unchanged and apply to scoped requests too.
  No capability is ever substituted for the trigger capability: when its data is unavailable for a unit,
  its own data states apply. A capability that declares no PERIOD trigger role (none currently) is
  handled by `period-evidence.md` Q14.
