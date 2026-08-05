---
layout: article
title: Designing for unattended development
date: 2026-08-01
last_modified_at: 2026-08-01
permalink: /thinking/designing-for-unattended-development/
summary: Unattended development is not the same as leaving an agent alone. It requires explicit eligibility, isolation, verification, stop conditions, and a separate decision about what may enter the stable codebase.
meta_description: Carlo Caprini describes the boundaries behind unattended AI development, from approved issues and isolated workspaces to verification and human-controlled merge.
meta_image: /assets/og-thinking-v2.png
meta_image_alt: Thinking by Carlo Caprini, notes on product decisions, AI, software systems and teams.
topics:
  - ai-and-automation
  - software-systems
intro:
  - I no longer need to be present while every line of code is being written.
  - That makes the boundaries around the work more important, not less.
---

I already use AI for much of the implementation work in my personal projects on GitHub. The process now runs in two modes.

Sometimes I drive it manually: I choose an issue, start the agent, follow the work, review the pull request, run manual or visual checks, and merge it.

Other work runs on a schedule at night. The agent can implement a prepared issue, respond to CI failures, and leave a pull request for me to review in the morning. I no longer need to be present while the code is being written.

Both modes use the same conventional boundaries. `main` is protected. Work starts from a descriptive issue, gets its own branch, and reaches the stable codebase through a pull request. CI runs the repository's tests. `AGENTS.md` explains the project, commands, constraints, and stop conditions.

This already gives the agent substantial ability without giving it control over the stable state. But the workflow is still paced by transitions that I manage: deciding what may start, recognizing when a run is blocked, and preparing the next piece of work.

The next step I am preparing is automation at the repository level.

## Autonomy depends on the decision

In this workflow, autonomy means allowing the system to advance from an approved issue to a reviewable result without my supervision. It does not mean delegating every decision.

The system may select eligible work, implement it, and verify the result. Whether that result may enter `main` remains a separate decision.

I want the system to continue through a small queue of approved work without requiring me to supervise every transition. An orchestrator should claim an eligible issue, create an isolated workspace, start the agent, track retries, and leave a legible result: ready for review, blocked, safe to retry, or waiting for a decision.

OpenAI's [Symphony specification](https://openai.com/index/open-source-codex-orchestration-symphony/) uses an issue tracker as the control plane for a similar workflow. It combines isolated workspaces, bounded concurrency, explicit retries, and handoff states such as `Human Review`.

That model matters because unattended development is not the same as leaving an agent alone. A useful system must know what it may start, why it stopped, and when authority returns to a person.

## Discovery should not become authorization

Implementation often reveals adjacent work: a missing test, a nearby bug, a useful refactoring, or a larger opportunity outside the issue.

I want agents to preserve those discoveries without expanding the current task or creating their own mandate.

An agent may create a linked issue containing the evidence, likely impact, risks, and possible acceptance criteria. That issue must remain mechanically ineligible for unattended execution until I approve it.

This separates discovery from commitment. It also limits the effect of mistakes, stale assumptions, or untrusted instructions inside issues and comments. Being present in the tracker cannot be enough to make work executable.

## Instructions need executable support

`AGENTS.md` is useful because it places expectations close to the code, but prose is still interpreted.

A recurring review correction may first become a clearer instruction. If it is important and mechanically checkable, it should later become a lint, test, branch rule, smoke test, or inspectable preview.

OpenAI's account of [harness engineering](https://openai.com/index/harness-engineering/) describes this progression from written expectations toward structural tests and environments agents can inspect. GitHub [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) provide another layer by requiring pull requests and status checks and restricting changes to protected branches.

Since publishing [that Friday note](/thinking/why-i-started-building-friday/), I have started extracting these rules into a private repository and integrating them into Friday. The repository is intended to make issue eligibility, scope, discovery, verification, escalation, and merge authority reusable across projects.

This is work in progress, not a proven system. The integration exists, but I have not yet tested the complete unattended cycle enough to treat the contract as settled.

## The merge remains a separate experiment

For now, I review and merge every pull request.

I am curious about agentic merge, but I do not see it as the automatic destination of this work. Generating a change and authorizing it are different responsibilities. GitHub applies the same conservative boundary to its [cloud coding agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations), which cannot approve or merge its own pull requests.

I may experiment with automatic merge for narrow, mechanically recognizable changes with comprehensive checks, limited diffs, and straightforward rollback. Dependencies, permissions, workflows, data, infrastructure, and product behavior would remain outside that experiment.

The boundary should move because repeated evidence shows that a class of work is contained, not because models have become more capable in general.

## Making judgment reusable

The most valuable result of a review may not be the merged code. It may be an improvement to the system that handles the next issue.

A repeated correction can become an instruction. An ignored instruction can become a test. A recurring manual check can become a preview or smoke test. A blocked run can reveal missing context or a missing stop condition.

My role does not disappear. It shifts toward approving intent, examining exceptions, judging product choices, and improving the environment in which agents work.

The next experiment is not to remove the human gate. It is to make everything before that gate more continuous, observable, and capable of stopping for the right reasons.
