---
layout: article
title: Better output makes shallow review more dangerous
date: 2026-09-01
permalink: /thinking/better-output-makes-shallow-review-more-dangerous/
summary: AI can make work look ready before its reasoning deserves trust. Review depth should follow the consequences of the decision, not the polish of the output.
topics:
  - ai-and-automation
  - teams-and-collaboration
---

AI does more than reduce the time required to produce something. It also changes when the work begins to look ready.

A summary reads clearly. A proposal has a sensible structure. A product requirement includes scope, acceptance criteria, and open questions. A technical plan uses the right vocabulary and explains the architecture with confidence.

The result may genuinely be useful but its presentation can mature faster than the reasoning behind it.

And that changes the review.

## Polished work changes the reviewer’s posture

A rough draft makes some of its uncertainty visible. Missing sections, awkward transitions, and unresolved questions signal that the work is still being formed. The natural response is to challenge it, add context, and ask what is missing.

A polished draft feels closer to approval and completion. And there’s a risk that reviewers move from examining the reasoning to checking the wording, filling small gaps, or confirming that the structure looks reasonable.

Roughness is not evidence of honesty, and polish is not evidence of weak thinking. But polish removes some of the friction that used to make people slow down.

The result is work that looks coherent at a glance and might be easier to trust. So it becomes easier to review the document in front of us than to investigate the decision underneath it.

## What a polished draft can hide

A product requirement can describe a solution clearly while relying on weak evidence about the customer problem.

An implementation plan may name the right components but say little about failure modes, migration constraints, or operational ownership.

A customer summary can be accurate sentence by sentence and still compress the disagreement or uncertainty that would change the priority.

Making these documents clearer helps the discussion but it does not resolve what is missing.

A deeper review needs to ask where the evidence ends, which decision has already been embedded in the framing, and what has been excluded or treated as somebody else’s problem. It also needs someone who can take responsibility for the trade-off being approved.

These questions matter without AI too. But AI raises the stakes because it can create a convincing bridge before anyone has examined the gap underneath it.

## Seven comments did not create seven insights

I encountered a smaller version of this while reviewing this note in [August](/thinking/i-built-august-because-copy-and-paste-was-not-collaboration/).

Several reviewer profiles stopped at almost the same passage. They all saw the same weakness: the article said that fluent output changes review behavior, but did not explain clearly enough what a stronger review should examine.

And they were right.

But seven similar comments did not give me seven different insights. Repeating that review needed stronger verification and clearer boundaries still left the editorial decision unresolved.

I had to consolidate those reactions and decide what the article was missing. That led to a more useful distinction between surface quality, evidence, hidden decisions, boundaries, and ownership.

Review output can suffer from the same problem as generated content. It can be fluent, reasonable, and repetitive without moving the decision forward.

My take-away: the number of comments is not evidence of depth.

## A working reviewer still needs calibration

I recently helped a software company introduce an AI reviewer into its merge-request workflow.

The technical loop worked. During the tests, the reviewer placed comments on the relevant lines and proposed changes that could be applied directly.

That was not enough to make the review useful.

The initial prompt was generic. Some comments created noise, while repository-specific rules and failure modes still had to be made explicit. The team needed to observe false positives, notice what the reviewer missed, and refine the instructions against real changes.

A comment arriving in the correct place is not evidence that it deserves attention.

This is the same distinction at a different scale. Generating a plausible review is relatively easy. Calibrating that review so it changes the right decisions requires context, feedback, and ownership over time.

## Public evidence points to the same calibration problem

This is not only a property of one internal implementation.

[GitHub’s documentation for Copilot code review](https://docs.github.com/en/copilot/concepts/agents/code-review) says that the reviewer is not guaranteed to find every problem, may make mistakes, and should be supplemented with human review. The same documentation recommends repository-level instructions and context to improve the usefulness of its comments.

A July 2026 study by Lin et al., [“Is Agentic Code Review Helpful?”](https://arxiv.org/abs/2607.03316), examined 31,073 agentic review and developer-feedback pairs across 239 public repositories using CodeRabbit. Developers rejected 56.3% of the reviewed suggestions. The reported reasons included false positives, redundant or out-of-scope comments, and mismatch with developer intent or repository practices.

That result belongs to one product and an open-source dataset, so it should not be treated as a universal rejection rate for AI review. It does reinforce the narrower point: producing a plausible comment is not the same as earning a place in the team’s review process.

## Review should follow the consequence

Not every AI-assisted output needs an investigation.

An early outline, a private summary, or an exploratory comparison may only need a quick check. Other artifacts create commitments or dependencies. A requirement shapes what a team builds. A customer summary can change a priority. An architecture proposal may constrain future changes.

The prose should not decide how deeply these artifacts are reviewed. The cost of being wrong is a better signal.

For consequential work, I would want at least four things to remain visible:

- the source material behind the output;

- the difference between assumptions and verified facts;

- the important exclusions and boundaries;

- the person responsible for approving the consequences.

This is why “human in the loop” often feels insufficient. A person can be present and still perform little more than a final glance.

What matters is whether that person has the context and authority required by the decision, and whether the review is designed to use them.

## Contribution and review now separate more clearly

This extends the distinction I explored in [AI accelerates contribution, not mastery](/thinking/ai-accelerates-contribution-not-mastery/).

AI makes it possible to retrieve context, form a proposal, and express it clearly much earlier. That is valuable.

It also means reviewers increasingly encounter work that looks mature before the contributor has built a complete mental model of the system.

A useful contribution, a well-presented artifact, and reasoning that deserves to be trusted often arrive in the same package. They are still different things.

Review has to preserve that distinction.

## A less comfortable review

Clearer proposals, summaries, and plans can make collaboration much better. I do not think the answer is to distrust polished work or deliberately make it rough.

But a polished draft should still be allowed to feel unfinished where the evidence is incomplete or the decision remains uncertain.

That may mean exposing assumptions instead of smoothing them into prose. It may mean leaving a question open, asking for the source, or naming the person who has to accept the trade-off.

I am still working out how much structure is enough without turning every review into bureaucracy. Different work deserves different levels of scrutiny.

But I no longer want the finish of the output to make that decision for me.
