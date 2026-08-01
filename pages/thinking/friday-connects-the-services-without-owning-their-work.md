---
layout: article
title: Friday connects the services without owning their work
date: "2026-08-01T10:00:00+02:00"
last_modified_at: 2026-08-01
permalink: /thinking/friday-connects-the-services-without-owning-their-work/
summary: A coordinating layer can compare state, explain disagreement, and direct attention without becoming the source of truth for the services it connects.
meta_description: How Carlo Caprini uses Friday to coordinate March and August while preserving source ownership, visible uncertainty, and independent operation.
meta_image: /assets/og-ai-operating-system-series-v1.png
meta_image_alt: Building My Own AI Operating System by Carlo Caprini, illustrated as colorful connected services converging into one system.
topics:
  - ai-and-automation
  - software-systems
series: building-my-ai-operating-system
series_order: 5
series_context: "Friday now has to coordinate live signals without becoming the owner of the documents, plans, or decisions behind them."
show_related_notes: false
intro:
  - Putting several systems in one view solves only half the problem.
  - The harder question is who owns each fact when the sources disagree.
---

When several systems contribute to the same work, putting them in one view solves only half of the problem.

The other half is deciding who owns each fact, which system is allowed to change it, and what should happen when the sources disagree.

{% include series-context.html %}

A convenient shared view can become dangerous. A status may be current in one source and stale in another. A coordinating layer may infer a conclusion that neither source actually owns. If it can also write, ambiguity can quietly turn into an unauthorized decision.

Coordination therefore needs a narrow contract. The shared layer can compare state, explain disagreement, and propose where attention should go. The underlying facts remain with the systems that produced them, while uncertainty stays visible until something with the right authority resolves it.

This separation also leaves an escape route. If the coordinating layer disappears, the original work remains usable. If an integration fails, its last observation becomes suspect rather than becoming truth by default.

The goal is coordination without creating a shadow system that every other tool must eventually obey.

In this setup, [Friday](/thinking/why-i-started-building-friday/) currently observes two private services I use for editorial work: March holds my publishing plan, while August holds documents and their review state. Friday applies explicit rules to surface what may deserve my attention.

It can centralize attention without becoming the canonical home for the document or the plan. Its view must be rebuildable, each source must remain independently usable, and ambiguity must not silently become permission to write.

## The combined view is not the source

Suppose a note has a target month in March and an unresolved review in August. Friday can turn those facts into a signal: the publication window is approaching, but the document still needs attention.

The signal is Friday's. The facts are not.

If the document changes, August remains authoritative. If the target month changes, March remains authoritative. Friday can rebuild its view from both sources instead of becoming the canonical home for either.

## Different signals require different responses

Friday has started producing several kinds of signals from the same underlying services.

It can raise the priority of developing an article based on its position in the runway and the work still required. When the source state changes, Friday can reconsider that priority.

It can notice that an article has a place in March while its document is still a draft in August. This may be a normal stage of the work rather than an inconsistency, but it becomes relevant as the publication window approaches.

A document can also appear complete while still waiting for a decision about whether it is ready. Friday can surface that decision without making it for me.

These situations may look similar in a queue, but they do not authorize the same action. One requires development, another may only need monitoring, and another must stop at human judgment.

## Sometimes the correct integration does nothing

One of the first live reconciliation cycles compared nine uniquely linked March–August records.

It changed nothing.

That was the correct result. The records were consistent, no publication window was open, and Friday had no authorized reason to touch either service.

The useful behavior was not writing. It was recognizing when no write was justified and leaving evidence of that decision.

When a signal does become work, Friday can prepare a bounded handoff for Codex. The work happens in the appropriate service or workspace; Friday retains the trigger and result.

## Attention without lock-in

I can continue using March and August directly through their interfaces, or through AI clients such as Codex using their MCP tools. I can revise a document in August or change the runway in March without routing the action through Friday.

When the integrations are healthy, Friday observes those changes and refreshes its view. When one is not, the underlying source remains available and the stale observation can be treated as a problem rather than silently becoming truth.

This is the most practical test of the ownership boundary: coordination has not made the underlying services unsafe to use on their own.

## The first real disagreement

While reviewing another note, I marked it ready in August. March still described the same note as drafting.

Friday had already observed August's new editorial state, but its March integration was offline after a contract mismatch. It therefore continued to hold March's last observed state and showed a high-priority readiness risk instead of presenting the two systems as synchronized.

From Friday alone, I could not tell whether the document still needed work or the planning state was stale. I opened August and confirmed that the document had the `ready` tag, no `draft` tag, and no unresolved review work. I then checked March and confirmed that its item had not changed.

That distinction determined the next step. The document did not need another editorial pass. The propagation between services needed attention. Friday had identified the condition, but it did not have enough current authority and evidence to repair it by inference.

This also exposed the maintenance cost I can already see. Independent services keep their responsibilities clear, but their interfaces and state mappings have to remain compatible. A changed contract can leave one observation current and another stale. The coordination layer must preserve that uncertainty, explain where each fact came from, and stop short of turning a partial view into an automatic write.

## Integration without erasure

The practical test is simple: if Friday disappeared tomorrow, could I still understand and use the work in March and August?

So far, yes. The harder test is whether Friday can keep earning trust when the sources disagree, an integration fails, and doing nothing is no longer the whole answer.
