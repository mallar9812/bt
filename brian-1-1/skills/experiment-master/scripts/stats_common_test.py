import math, sys
from scipy import stats as st
import stats_common as S

# independent path: scipy quantiles, and a hand-built paired sample
assert abs(S.tcrit(25) - st.t.ppf(0.975, 25)) < 6e-3 and abs(S.tcrit(29) - st.t.ppf(0.975, 29)) < 6e-3
assert abs(S.tcrit(120) - st.t.ppf(0.975, 120)) < 1e-9
ref = [(100 + i, 10) for i in range(26)]
cmp_ = [(103 + i + (i % 3), 10) for i in range(26)]
o = S.paired_effect(ref, cmp_, 'pct')
d = [(c[0] / c[1]) - (r[0] / r[1]) for r, c in zip(ref, cmp_)]
m = sum(d) / len(d); s = math.sqrt(sum((x - m) ** 2 for x in d) / 25)
t, p = st.ttest_1samp(d, 0)
assert abs(o['p'] - p) < 1e-12, (o['p'], p)
assert o['lo'] < o['val'] < o['hi'] and o['n'] == 26
c = S.conf_from_interval(o['lo'], o['hi'], o['n'])
assert abs(c - (1 - p)) < 5e-3, (c, 1 - p)          # interval-implied Conf matches the test to table precision
assert S.paired_effect(ref[:1], cmp_[:1], 'pct') == 'NOT_COMPUTABLE_DF_LT_1'
assert S.paired_effect([(1, 1)] * 5, [(1, 1)] * 5, 'pct') == 'NOT_COMPUTABLE_ZERO_VARIANCE'
assert S.pab_half_width([0.1] * 9) is None
a = S.adjust(dict(val=2.0, lo=1.0, hi=3.0, n=26), 0.5, 0.4)
assert abs(a['val'] - 1.5) < 1e-12 and abs((a['hi'] - a['lo']) / 2 - math.sqrt(1 + 0.16)) < 1e-12
# weighted PAB: old_share scales the PAB value and its half-width; 1 is the full PAB, 0 leaves the observed value
w = S.adjust(dict(val=2.0, lo=1.0, hi=3.0, n=26), 0.5, 0.4, 0.66)
assert abs(w['val'] - (2.0 - 0.66 * 0.5)) < 1e-12 and abs((w['hi'] - w['lo']) / 2 - math.sqrt(1 + (0.66 * 0.4) ** 2)) < 1e-12
assert abs(S.adjust(dict(val=2.0, lo=1.0, hi=3.0, n=26), 0.5, 0.4, 1.0)['val'] - a['val']) < 1e-12
z = S.adjust(dict(val=2.0, lo=1.0, hi=3.0, n=26), 0.5, 0.4, 0.0)
assert abs(z['val'] - 2.0) < 1e-12 and abs((z['hi'] - z['lo']) / 2 - 1.0) < 1e-12
try:
    S.adjust(dict(val=2.0, lo=1.0, hi=3.0, n=26), 0.5, 0.4, 1.2); raise SystemExit('old_share > 1 accepted')
except ValueError:
    pass
# classification boundaries
assert S.classify('pct', 1.2, 3, 2, .9) == 'MEANINGFUL'
assert S.classify('pct', -.5, .5, 0, .2) == 'NO_MEANINGFUL_MOVEMENT'
assert S.classify('pct', -.5, 2.5, 1, .9) == 'MEANINGFUL'
assert S.classify('pct', -.5, 2.5, 1, .5) == 'INSUFFICIENT_EVIDENCE'
assert S.classify('bps', 11, 30, 20, .9) == 'MEANINGFUL'
assert S.classify('bps', -8, 8, 0, .5) == 'INSUFFICIENT_EVIDENCE'
print('OK')
