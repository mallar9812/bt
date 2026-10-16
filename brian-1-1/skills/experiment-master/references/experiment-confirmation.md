# Confirming the experiment (before any setup question or analysis)

A user-origin FULL_EXPERIMENT_READ or TARGETED_DIAGNOSIS that names an experiment must start on the experiment the user means.
When the request is not absolutely clear, the Master confirms it first. This changes no request, statistic or contract; it
only decides whether the read starts on the right `(gid, platform, experiment, version)`.

## When the request is clear (no question)

All three hold:

1. The experiment is given as its exact name (case-insensitive match to one `experiment` value) or as an `exp_id`.
2. The game and platform are named, or implied by the `exp_id`.
3. The `CANDIDATES` probe (`protocols/context-resolution.md` step 2) returns exactly one experiment name for it.

Then the Master states the resolved experiment in one line and goes on to the setup questions (`analysis-area-selection.md`):
"Reading <experiment>, <game> <platform>, <exp_id>, version <v> (latest; earlier versions: <list>), <arm A> vs <arm B>."
A version or period the user did name is used as named. A version not named is not a reason to ask when everything else is
clear: the latest is used and the earlier ones are listed, as before.

## When it is vague (confirm first)

The request is vague when any of these holds: no experiment name, or only a loose fragment or description ("the level one",
"the new ad test"); the name matches more than one experiment, or only an approximate match; the game or the platform is not
given and the name exists on several; the version or period the user gave matches nothing; the user's words conflict with the
candidates (for example a version that belongs to another experiment).

Procedure:

1. Run the bounded `CANDIDATES` probe only (a Druid context probe, bounded by `gid` where known; nothing else is queried).
   Zero candidates: list the nearest names and ask which one, or for the exact name.
2. Ask in one `AskUserQuestion` call, with only the questions that are unclear (at most three):
   - **Which experiment?** up to four candidates, nearest first, each with its name, game and platform, `exp_id`, latest version,
     active dates and arms (for example "level_tagging · Word Connect Association Android · 42::0::level_tagging::62 · v4 ·
     Aug 14 to Sep 7 · var1, var2"). The "Other" box takes a name or `exp_id`. Never list more than four; if more match, show the
     four nearest and say how many others matched.
   - **Which platform?** only when the name exists on several and the user did not say: each platform, or "All platforms (read
     separately)". Platforms are never pooled.
   - **Which version?** only when the user did not name one and the chosen experiment has several: **Latest, <v> (Recommended)**
     and the earlier ones (up to three; the "Other" box takes another).
3. The answer is restated in the same one line as above and is the experiment the read starts on. If the user's answer names
   something that is still not in the candidates, ask again once with the nearest names; never guess.
4. Stored as `experiment_confirmation: {status: EXACT | CONFIRMED_BY_USER | UNATTENDED_SINGLE_MATCH, resolved[]: [{gid, platform, experiment, exp_id, version}]}`
   in `request.extracted`.

## Not asked

- **Unattended, scheduled and stream-origin reads** never ask. If exactly one candidate matches, proceed on it (status
  `UNATTENDED_SINGLE_MATCH`) and state the interpretation at the top of the answer. If the request is vague and more than one
  or no candidate matches, nothing is started: report the nearest candidates and the decision needed.
- **PERIOD_IMPACT_ANALYSIS** has no named experiment, so nothing is confirmed here (its own clarification rules apply).
- A request that explicitly names several experiments is confirmed experiment by experiment, in the same single call (up to
  four questions), only for the ones that are vague.
- The confirmation is not repeated when the same experiment is read again in the session, unless the user names a different one.

## Order and cost

It is the first step of a read, before the area and data-source questions and before any analysis query. The only statement it
may run is the bounded `CANDIDATES` probe, which the context resolution would run anyway; its result is kept and not run
again (`context-resolution.md` step 2). No budget is spent on an experiment the user did not mean.
