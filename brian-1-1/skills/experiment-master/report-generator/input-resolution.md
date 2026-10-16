# Input resolution — user-stated inputs and the one optional follow-up

Presentation only. It reads what the user already said, uses it, and, when a material input is missing,
ends the answer with one optional question. It runs no query, calls no capability and changes no mode,
depth, budget, routing, tier rule, statistic, classification or threshold. The Master's own clarification
rules (`SKILL.md`, `protocols/context-resolution.md`) stay in force and take precedence.

The question is a per-response presentation question of the same kind as the read-type question in
`report-generator.md` step 1a. A reasonable default exists, which is to leave the dependent part out, so
the answer is delivered in full and the question rides alongside it, never instead of it (brian-master
SR-21, `depth-policy.md`).

## Inputs

A closed list. Nothing outside it is asked or recorded here.

| ID | Input | Used for | Home | Withheld when absent |
|---|---|---|---|---|
| I1 | Primary metric | the display tier and order of that metric's result (`evidence-selection.md`); Verdict bullet 2; Primary metric outcomes | Experiment Card row "Primary metric" | nothing: it is inferred from the test type and labelled (`evidence-selection.md` § Primary metric); Primary metric outcomes (the user-named block) |
| I2 | Intended direction per metric: up, down or no change | `metric.intended_direction` (`adapter.md`); the stated-intent clause (`template-population.md` § Verdict composition) | Experiment Card row "Intended direction per metric" | the stated-intent wording |
| I3 | Guardrail metrics | the Named guardrails line | Experiment Card row "Guardrail metrics" | the Named guardrails line |
| I4 | Objective, and the change each variant carries | Detailed Read sections 2 and 3 | Experiment Card row "Objective, specification link, owner, minimum build"; `template-population.md` rows 2 and 3 | the text of sections 2 and 3, which read "not provided" as today |

Not inputs of this step: experiment, game, platform, version, period, segment, cohort, country,
comparison and investigation priority. They change the analysis, so they are request inputs for the
Master (`report-templates.md` § Experiment Card). A reply that names one is a new request and is not
applied here.

## Resolution order

1. **The user's words.** The request (`MasterState.request.raw`) and the earlier turns of this
   conversation. An input is resolved only by an explicit statement. An objective sentence gives I4 only:
   an intended direction is never derived from it or from a metric's name. A confirmed plan's
   `expected_direction` is the other typed source; the Master holds none today, so only the user's
   statements apply.
2. **The resolved context, for matching only.** A metric the user names is matched to the metric labels
   of this read's ledger (`metric.label`). A label matches when it equals the user's phrase, ignoring
   case, spacing around "/" and a trailing parenthetical qualifier such as "(overall)". Exactly one
   match: matched. No match, or several: not matched, shown as given with the label "not matched to a
   result" and used nowhere. Nothing is chosen for the user, and no closest or likely metric is
   substituted.
3. **Nothing else.** No default, no value from another experiment or conversation, no inference.

## When the follow-up is asked

All of these hold, otherwise nothing is asked and the answer is unchanged:
- the answer is a Standard Experiment Read or a Detailed Read of a `FULL_EXPERIMENT_READ`;
- at least one input is material and absent. I1 is material when the ledger holds a computed result. I2
  is material when a computed result has an established `direction`. I3 is material when the ledger holds
  a computed result. I4 is material in a Detailed Read only;
- the request is not stream-origin, and the answer does not carry a clarification of the Master;
- the follow-up has not been asked in this conversation for this experiment-version unit, and the user
  has not declined the input.

A stated value that is not matched or not validated counts as absent for the second condition, so the
follow-up asks for it once.

## The follow-up

One message in the next-question slot (Template A "Next question"; Detailed Read section 10), after the
report is complete:
- a one-line lead saying every item is optional and can be skipped;
- up to four numbered items, only for inputs that are material and absent, in the order I1, I2, I3, I4,
  each on one line: the question, then "Without it, withheld: " and the part named in the Inputs table;
- the Master's recorded follow-ups, when any exist, close the message as one offer line, not a second
  question: "Or say which recorded follow-up to run: <recorded>.", where `<recorded>` names each recorded
  follow-up that has not run as the Master recorded it (`MasterState.pending_followups`, built from the
  responses' `followups[]`), separated by semicolons. When none is recorded there is no offer line: no
  analysis, check, query or action is offered that the Master did not record, a PAB check included, and
  none is added because it might be useful;
- no other question, no suggested default and no assumption.

Example, all four missing (Detailed Read):

> Everything below is optional; reply to any item or say "skip".
> 1. Which metric is your primary metric (name it as it appears in the results table)? Without it, it is inferred from the test type and labelled as inferred.
> 2. Which way did you want each metric to move (up, down or no change)? Without it, withheld: the stated-intent wording.
> 3. Which metrics are guardrails? Without it, withheld: the Named guardrails line.
> 4. What is the objective, and what does each variant change? Without it, withheld: the text of sections 2 and 3.

## Replies

- An item a reply leaves out is "not provided". "Skip", "no" or "none" for an item, or for the message, is
  "skipped". Both are final: the follow-up is not asked again in this conversation for this unit.
- A reply that supplies inputs is applied by running steps 2b to 6 of `report-generator.md` again on the
  same stored results. Nothing is queried and no value, statistic or classification changes; the display
  tier and order of a result follow `evidence-selection.md`, as they already do when the request names a
  primary metric. The new answer states once, in Evidence quality and limitations (Standard) or section 10
  (Detailed), "Rendered again with your inputs from stored results; nothing was re-queried."
- A reply that asks for new analysis is a new request for the Master.

## Validation

- I1 and I3 are matched as above. I2 is one of up, down or no change; anything else is shown as given,
  labelled "not validated", and used nowhere. I4 is shown as given; a link is never opened.
- A user-provided value is always labelled "user-provided" and never fills or replaces a confirmed field.

## Recording what is unanswered

One line in Evidence quality and limitations (Standard) or section 10 (Detailed), written when a material
input is not provided, skipped, not matched or not validated, or a stated intent is not applied, and the
follow-up is not part of this answer.
It has one sentence per label that applies, in the order not provided, skipped, not matched, not
validated: "Inputs <label>: <names>." The line ends with "Withheld: <parts>." Names are those of the
Inputs table (primary metric, intended direction, guardrail metrics, objective and variant changes) and
parts are the entries of its last column, each once, in the order I1 to I4, separated by semicolons. When a stated intent is not
applied to a stored-sign Economy metric, the line adds "Stated intent not applied: <metrics>, stored sign
makes up and down ambiguous." The line is never a Verdict bullet and never a section of its own.

## Never

- Invent or assume an intended direction, a guardrail, an objective, a default, a formula, a threshold or
  a unit. The primary metric is the one exception: it is inferred from the test type and labelled
  (`evidence-selection.md` § Primary metric).
- Block the report, reorder it or change a result because an input is missing.
- Ask more than one message per response, more than four items, or the same item twice.
- Ask about scope, or accept a scope as an input.
- Offer an analysis, check, query or action that the Master did not record in `pending_followups`, in the
  closing line or anywhere else in the answer, or offer one because it might be useful. A PAB check is
  offered only when it is a recorded follow-up. A `NOT_TESTED` or `OFFERED` follow-up is recorded there,
  so the offer `output-format.md` attaches to one is a recorded offer.
- Let a user statement change a result's `direction`, colour, tier rule, classification or any number.
