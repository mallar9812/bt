"""Shared numeric helpers for experiment reads.

One implementation of the arithmetic in references/analysis-contract.md (Paired test, PAB adjustment)
and of the meaningfulness rule in references/master-state.md (Results and meaningfulness).
Capability workers import paired_effect / pab_half_width / adjust. Only the Master imports classify.
Never re-implement any of these in a worker: results must be identical whichever worker computed them.
Run `python3 stats_common_test.py` before any dispatch; it must print OK.
"""
import math
from scipy import special, stats as st

_TC = [0, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160,
       2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056,
       2.052, 2.048, 2.045, 2.042]


def tcrit(df):
    """Two-sided 95% critical value; table up to 30 df, exact t quantile above."""
    if df < 1:
        raise ValueError('df must be >= 1')
    return _TC[df] if df <= 30 else float(st.t.ppf(0.975, df))


def _mean(a):
    return sum(a) / len(a)


def _sd(a):
    m = _mean(a)
    return math.sqrt(sum((x - m) ** 2 for x in a) / (len(a) - 1))


def paired_effect(ref, cmp, kind):
    """ref, cmp: lists of (numerator, denominator) per paired unit, same order.
    kind: 'pct' (relative % change vs reference) or 'bps' (retention, basis points).
    Returns dict(ref, cmp, val, lo, hi, n, p, delta) or a reason string when not computable."""
    pairs = [(r, c) for r, c in zip(ref, cmp) if r[1] > 0 and c[1] > 0]
    n = len(pairs)
    if n < 2:
        return 'NOT_COMPUTABLE_DF_LT_1'
    scale = 1.0
    rr = [r[0] / r[1] * scale for r, _ in pairs]
    cc = [c[0] / c[1] * scale for _, c in pairs]
    d = [c - r for r, c in zip(rr, cc)]
    s = _sd(d)
    if not s > 0:
        return 'NOT_COMPUTABLE_ZERO_VARIANCE'
    refv = sum(r[0] for r, _ in pairs) / sum(r[1] for r, _ in pairs)   # pooled over paired units
    cmpv = sum(c[0] for _, c in pairs) / sum(c[1] for _, c in pairs)
    m = _mean(d)
    h = tcrit(n - 1) * s / math.sqrt(n)
    p = float(2 * st.t.sf(abs(m / (s / math.sqrt(n))), n - 1))
    if kind == 'bps':
        return dict(ref=refv, cmp=cmpv, val=(cmpv - refv) * 1e4, lo=(m - h) * 1e4, hi=(m + h) * 1e4, n=n, p=p, delta=cmpv - refv)
    if refv == 0:
        return 'NOT_COMPUTABLE_ZERO_REFERENCE'
    return dict(ref=refv, cmp=cmpv, val=(cmpv - refv) / refv * 100, lo=(m - h) / refv * 100, hi=(m + h) / refv * 100, n=n, p=p, delta=cmpv - refv)


def pab_half_width(daily_diffs):
    """t_crit(days-1) * sd / sqrt(days) over the daily pre-test paired differences (>= 10 days required)."""
    n = len(daily_diffs)
    if n < 10:
        return None
    return tcrit(n - 1) * _sd(daily_diffs) / math.sqrt(n)


def conf_from_interval(lo, hi, n):
    """1 - two-sided p of the effect against the standard error implied by the interval."""
    if lo is None or hi is None or n is None or n < 2:
        return None
    df = n - 1
    se = (hi - lo) / 2 / tcrit(df)
    if not se > 0:
        return None
    t = abs((lo + hi) / 2) / se
    return float(1 - special.betainc(df / 2, 0.5, df / (df + t * t)))


def adjust(obs, pab_value, pab_half, old_share=1.0):
    """PAB-adjusted effect: observed minus old_share x PAB; interval half-widths combined in quadrature.

    PAB is measured on users who existed before the test, so a result that mixes old and new users takes only the
    old users' part of it: the PAB value and its half-width are both scaled by old_share (old-user DAU-days / all
    DAU-days of the result's own scope, both variants pooled, over the days of the observed result). old_share = 1
    (a user_type = old cut, or a result whose population is old users only) gives the full PAB; 0 means no PAB
    applies and the caller reports the observed value (OBSERVED_NO_PAB)."""
    if old_share is None or not (0 <= old_share <= 1):
        raise ValueError('old_share must be between 0 and 1')
    pab_value = old_share * pab_value
    pab_half = old_share * pab_half
    h_obs = (obs['hi'] - obs['lo']) / 2
    centre = (obs['lo'] + obs['hi']) / 2 - pab_value
    half = math.sqrt(h_obs ** 2 + pab_half ** 2)
    lo, hi = centre - half, centre + half
    return dict(val=obs['val'] - pab_value, lo=lo, hi=hi, conf=conf_from_interval(lo, hi, obs['n']), pab_applied=pab_value, old_share=old_share)


def classify(kind, lo, hi, val, conf):
    """Master only. Meaningful line: 1% (10 bps for retention)."""
    line = 10 if kind == 'bps' else 1
    if lo > line or hi < -line:
        return 'MEANINGFUL'
    if kind != 'bps' and lo > -line and hi < line:
        return 'NO_MEANINGFUL_MOVEMENT'
    if conf is not None and conf > 0.85:
        return 'MEANINGFUL' if abs(val) >= line else 'NO_MEANINGFUL_MOVEMENT'
    return 'INSUFFICIENT_EVIDENCE'
