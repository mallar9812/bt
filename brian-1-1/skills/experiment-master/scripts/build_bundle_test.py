import json, os, tempfile, build_bundle
d = tempfile.mkdtemp(); o = tempfile.mkdtemp()
json.dump([{'a': 1}, {'a': 2}], open(os.path.join(d, 'results.json'), 'w'))
json.dump([], open(os.path.join(d, 'cuts.json'), 'w'))
json.dump([{'part2': 'RUNNING'}], open(os.path.join(d, 'run_state.json'), 'w'))
p = build_bundle.build(d, o)
rows = json.load(open(p[0]))
assert len(p) == 1 and [r['_ds'] for r in rows] == ['results', 'results', 'run_state'] and rows[0]['a'] == 1, rows
print('OK')
