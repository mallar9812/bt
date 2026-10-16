"""Bundle the dashboard datasets into as few files as possible, so the Dashboard needs as few uploads and approvals as possible.

Usage:  python3 build_bundle.py <dir with one <id>.json (a list of row objects) per dataset> <out_dir>
Writes <out_dir>/bundle.json (and bundle2.json, ... when one file would exceed 7 MB; the page limit is 8 MB per file).
Every row gets `_ds` = the dataset id; the page (`ok()` in assets/page.js) splits the rows back by `_ds`. Empty datasets are
not written (dashboard.md: a dataset the stored records cannot fill is not written). Pure repackaging: no value is changed.
"""
import json, os, sys

LIMIT = 7 * 1024 * 1024


def build(src, out):
    os.makedirs(out, exist_ok=True)
    chunks, cur, size = [], [], 0
    for name in sorted(os.listdir(src)):
        if not name.endswith('.json'):
            continue
        ds = name[:-5]
        rows = json.load(open(os.path.join(src, name)))
        if not rows:
            continue
        enc = [dict(r, _ds=ds) for r in rows]
        n = len(json.dumps(enc, separators=(',', ':')))
        if n > LIMIT:
            raise SystemExit('dataset %s is %d bytes, over the 7 MB bundle limit' % (ds, n))
        if cur and size + n > LIMIT:
            chunks.append(cur); cur, size = [], 0
        cur.extend(enc); size += n
    if cur:
        chunks.append(cur)
    paths = []
    for i, rows in enumerate(chunks):
        p = os.path.join(out, 'bundle.json' if i == 0 else 'bundle%d.json' % (i + 1))
        json.dump(rows, open(p, 'w'), separators=(',', ':'))
        paths.append(p)
    return paths


if __name__ == '__main__':
    for p in build(sys.argv[1], sys.argv[2]):
        print(p, os.path.getsize(p))
