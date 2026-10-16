# Live progress table

An experiment read takes tens of minutes. While it runs, the user is shown a progress table: which step is
running, what has finished, how long each took, and roughly how long is left. This is presentation only; it
spends no budget and changes no result.

## State

The Master keeps `run/progress.json` current and is its only writer:

```json
{"started_at": "<UTC ISO>", "mode": "SEQUENTIAL | PARALLEL", "parallel_workers_max": 4,
 "steps": [{"id": "revenue", "label": "Revenue", "group": "workers",
            "state": "QUEUED | RUNNING | DONE | PARTIAL | FAILED | SKIPPED",
            "started_at": null, "ended_at": null, "done": 0, "total": 41, "note": ""}]}
```

- Steps, in order (every read is a two-part read, `two-part-read.md`; each step carries `part`: 1 or 2, `context` none):
  `context` (context, coverage, and under parallel dispatch the frozen `run/context.json`; once);
  **Part 1:** one step per selected capability `<id>_p1` (group `workers1`; ids as in the registry), `merge_p1` (checks, § 4 of
  `parallel-dispatch.md`; omit under `SEQUENTIAL`), `report_p1` (the Verdict in chat), `dashboard_p1` (build and publish
  without Appendix data); **Part 2:** `<id>_p2` (group `workers2`), `merge_p2` (omit under `SEQUENTIAL`), `followups` (added
  when the loop approves any), `report_p2` (closing line), `dashboard_p2` (Appendix datasets, in place).
  A capability that is not selected or not available is `SKIPPED` with the reason in `note`.
- `done` / `total` on a capability step are executed statements out of the statements expected for it (its
  demand, not its slice); omit them when unknown.
- A step's `started_at` is set when it starts, `ended_at` when it finishes. Times are UTC.

## Rendering

`python3 scripts/progress_table.py run/progress.json` prints the table and the footer line. Estimates:

- Baseline minutes per step are in `scripts/progress_baselines.json` (CONFIGURABLE, measured on one read).
- Once a step has finished, all baselines are scaled by the median of actual / baseline over the finished
  steps (kept between 0.5 and 2.5), so the estimate follows the real pace of the warehouse.
- A running step with `done` / `total` is estimated from its own rate; otherwise from its scaled baseline.
- Sequential: the remaining steps add up. Parallel: the `workers` group is scheduled greedily over
  `parallel_workers_max` slots, so the estimate is the slowest slot, then the later steps follow.
- The range is 0.8x to 1.3x the point estimate, always labelled approximate and "baseline estimate" until a
  step has finished. No clock time is shown.
- Two footers: before Part 1 is delivered, "Part 1 (Summary and dashboard) in about X min; whole read in about Y min"
  (the Part 1 time is the schedule of the steps with `part` 1); after it, "Part 1 delivered. Part 2 (Appendix and
  detailed read): about Z min left". The Part 1 / Part 2 split of the baselines is an estimate until a two-part read
  has been measured.

## When the user sees it

1. Right after the first context probe: all steps `QUEUED` apart from `context`, with the baseline estimate, and again when
   Part 1 is delivered (Part 1 done, Part 2 queued).
2. At every step change (a step starts or finishes, a worker finishes, a merge check fails).
3. While one long step runs, at most once every 90 seconds, and only if its estimate moved by more than 25%.

Delivery: print the table as a message to the user (`SendUserMessage` where available). Where the session also
has a task list, keep one task per step and update it in place with the state and remaining time in its
subject, so the user has a live view without extra messages. A message is not a push; it is a new snapshot, so
keep each short: the table, the footer, nothing else.

## Under parallel dispatch

A batch of workers returns together, so the Master cannot refresh the table while it waits. Instead:

- before the batch starts, show the table with every worker `RUNNING` or `QUEUED` and the estimate;
- each worker writes `run/<capability>/heartbeat.json` after every query
  (`{"state": "RUNNING", "done": 9, "total": 17, "updated_at": "<UTC ISO>"}`), and when it finishes sends the
  user one line only: `<Capability> finished: <n> queries, <minutes> min`;
- when the batch returns, the Master reads the heartbeats and status files, updates `run/progress.json` and shows
  the full table.

If worker messages do not reach the user in the current host, the table is shown before and after the batch only,
and that is stated in the first table's footer. Run one parallel read to confirm which case applies.

## Never

Never show a precise finish time before a step has finished, never hide a `FAILED` or `PARTIAL` step to make the
table look clean, and never let table updates delay the work.
