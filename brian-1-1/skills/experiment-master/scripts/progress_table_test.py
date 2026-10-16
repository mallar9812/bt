import datetime as dt, json, os
import progress_table as P
base = {k: v for k, v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'progress_baselines.json'))).items() if not k.startswith('_')}
now = dt.datetime(2026, 1, 1, 12, 0, tzinfo=dt.timezone.utc)
iso = lambda m: (now - dt.timedelta(minutes=m)).isoformat()
def S(i, label, state, group, **k): return dict(id=i, label=label, state=state, group=group, **k)
seq = dict(mode='SEQUENTIAL', started_at=iso(10), steps=[
    S('context', 'Context and coverage', 'DONE', 'context', started_at=iso(10), ended_at=iso(5)),
    S('revenue_p1', 'Revenue', 'RUNNING', 'workers1', started_at=iso(5), done=4, total=8, part=1),
    S('engagement_p1', 'Engagement', 'QUEUED', 'workers1', part=1),
    S('report_p1', 'Summary', 'QUEUED', 'report1', part=1),
    S('revenue_p2', 'Revenue (Part 2)', 'QUEUED', 'workers2', part=2)])
rem, tot, f = P.estimate(seq, base, now)
assert abs(f - 5 / 6.5) < 1e-9 and abs(rem['revenue_p1'] - 5.0) < 1e-9, (f, rem)     # 4 of 8 after 5 min -> 5 min left
assert abs(tot - (5.0 + (base['engagement_p1'] + base['report_p1'] + base['revenue_p2']) * f)) < 1e-9
par = dict(seq, mode='PARALLEL', parallel_workers_max=2, steps=[
    S('context', 'Context', 'DONE', 'context', started_at=iso(10), ended_at=iso(5)),
    S('revenue_p1', 'Revenue', 'QUEUED', 'workers1', part=1), S('engagement_p1', 'Engagement', 'QUEUED', 'workers1', part=1),
    S('sessions_p1', 'Sessions', 'QUEUED', 'workers1', part=1), S('merge_p1', 'Merge', 'QUEUED', 'merge1', part=1),
    S('revenue_p2', 'Revenue (Part 2)', 'QUEUED', 'workers2', part=2)])
_, tp, fp = P.estimate(par, base, now)
b = [base['revenue_p1'] * fp, base['engagement_p1'] * fp, base['sessions_p1'] * fp]
exp = max(b[0], b[1] + b[2]) + base['merge_p1'] * fp + base['revenue_p2'] * fp
assert abs(tp - exp) < 1e-9, tp                                                         # 2 slots, greedy, then Part 2
out = P.render(par, base, now)
assert 'Part 1 (Summary and dashboard) in' in out.splitlines()[-1], out
out = P.render(seq, base, now)
assert '| Revenue | Running |' in out and '4/8 queries' in out and out.splitlines()[0].startswith('| Step')
p1done = dict(seq, steps=[dict(s, state='DONE', started_at=iso(3), ended_at=iso(1)) if s.get('part') != 2 else s for s in seq['steps']])
assert 'Part 1 delivered. Part 2' in P.render(p1done, base, now).splitlines()[-1]
assert 'Finished in' in P.render(dict(seq, steps=[dict(s, state='DONE', started_at=iso(3), ended_at=iso(1)) for s in seq['steps']]), base, now)
print('OK')
