"""Render the live progress table for an experiment read.

Usage:  python3 progress_table.py run/progress.json [baselines.json]
The Master keeps run/progress.json current (see references/progress-table.md) and prints this table to the
user at every step change. Pure arithmetic over that file: no queries, no statistics.
"""
import json, sys, os, datetime as dt
from statistics import median

LOW, HIGH = 0.8, 1.3                     # ETA range around the point estimate
STATES = {'QUEUED': 'Queued', 'RUNNING': 'Running', 'DONE': 'Done', 'PARTIAL': 'Partial',
          'FAILED': 'Failed', 'SKIPPED': 'Skipped'}


def _t(s):
    return dt.datetime.fromisoformat(s.replace('Z', '+00:00')) if s else None


def _mins(a, b):
    return max(0.0, (b - a).total_seconds() / 60)


def fmt(m):
    if m is None:
        return '-'
    if m < 1:
        return '<1 min'
    return '%d min' % round(m)


def estimate(state, baselines, now):
    steps = state['steps']
    done = [s for s in steps if s['state'] == 'DONE' and s.get('started_at') and s.get('ended_at') and baselines.get(s['id'])]
    f = 1.0
    if done:
        f = median(_mins(_t(s['started_at']), _t(s['ended_at'])) / baselines[s['id']] for s in done)
        f = min(2.5, max(0.5, f))
    rem = {}
    for s in steps:
        b = baselines.get(s['id'], 1.0) * f
        if s['state'] in ('DONE', 'PARTIAL', 'FAILED', 'SKIPPED'):
            rem[s['id']] = 0.0
        elif s['state'] == 'RUNNING':
            el = _mins(_t(s['started_at']), now)
            d, tot = s.get('done'), s.get('total')
            r = el * (tot - d) / d if tot and d else b - el
            rem[s['id']] = max(0.3, r)
        else:
            rem[s['id']] = b
    return rem, _schedule(steps, rem, state), f


def _schedule(steps, rem, state):
    # groups run one after another; a 'parallel' group (id starting 'workers') runs with at most `slots` at once
    t = 0.0
    groups = []
    for s in steps:
        if not groups or groups[-1][0] != s.get('group', s['id']):
            groups.append((s.get('group', s['id']), []))
        groups[-1][1].append(s)
    slots = state.get('parallel_workers_max', 1) if state.get('mode') == 'PARALLEL' else 1
    for g, ss in groups:
        par = state.get('mode') == 'PARALLEL' and str(g).startswith('workers')
        todo = [rem[s['id']] for s in ss if rem[s['id']] > 0]
        if not todo:
            continue
        if par:
            free = [0.0] * max(1, slots)
            for r in sorted(todo, reverse=True):
                i = free.index(min(free)); free[i] += r
            t += max(free)
        else:
            t += sum(todo)
    return t


def render(state, baselines, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    rem, total, f = estimate(state, baselines, now)
    p1 = [s for s in state['steps'] if s.get('part') == 1]
    p1_total = _schedule(p1, rem, state) if p1 else None
    start = _t(state['started_at'])
    rows = ['| Step | Status | Elapsed | Est. remaining | Detail |', '|---|---|---|---|---|']
    for s in state['steps']:
        st = s['state']
        if s.get('started_at'):
            el = _mins(_t(s['started_at']), _t(s['ended_at']) if s.get('ended_at') else now)
        else:
            el = None
        r = rem[s['id']]
        detail = s.get('note', '')
        if s.get('total'):
            detail = ('%s/%s queries' % (s.get('done', 0), s['total'])) + ('; ' + detail if detail else '')
        rows.append('| %s | %s | %s | %s | %s |' % (
            s['label'], STATES[st], fmt(el) if el is not None else '-',
            fmt(r) if st in ('QUEUED', 'RUNNING') else '-', detail))
    finished = all(s['state'] in ('DONE', 'PARTIAL', 'FAILED', 'SKIPPED') for s in state['steps'])
    el_all = _mins(start, now)
    if finished:
        foot = 'Finished in %s.' % fmt(el_all)
    else:
        basis = 'baseline estimate' if not any(s['state'] == 'DONE' for s in state['steps']) else 'pace so far x%.1f' % f
        def rng(x):
            lo, hi = round(x * LOW), round(x * HIGH)
            return 'under 1 min' if hi < 1 else ('about %d min' % lo if lo == hi else 'about %d-%d min' % (lo, hi))
        foot = 'Elapsed %s, %s left (%s). Approximate.' % (fmt(el_all), rng(total), basis)
        if p1_total is not None and p1_total > 0:
            foot = 'Part 1 (Summary and dashboard) in %s; whole read in %s. Elapsed %s (%s). Approximate.' % (
                rng(p1_total), rng(total), fmt(el_all), basis)
        elif p1 and any(s.get('part') == 2 for s in state['steps']):
            foot = 'Part 1 delivered. Part 2 (Appendix and detailed read): %s left. Elapsed %s (%s). Approximate.' % (
                rng(total), fmt(el_all), basis)
    return '\n'.join(rows) + '\n\n' + foot


if __name__ == '__main__':
    base_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'progress_baselines.json')
    base = {k: v for k, v in json.load(open(base_path)).items() if not k.startswith('_')}
    print(render(json.load(open(sys.argv[1])), base))
