---
layout: article
title: I need my AI dashboard to leave things out
date: "2026-08-01T11:00:00+02:00"
last_modified_at: 2026-08-01
permalink: /thinking/i-need-my-ai-dashboard-to-leave-things-out/
summary: A useful AI dashboard should reduce the first pass over the work, not reproduce every open item. Its omissions, priorities, and explanations all need to remain inspectable.
meta_description: Why Carlo Caprini wants Friday's AI dashboard to prioritize a small, explainable shortlist and leave the rest of the observed state out.
meta_image: /assets/og-ai-operating-system-series-v1.png
meta_image_alt: Building My Own AI Operating System by Carlo Caprini, illustrated as colorful connected services converging into one system.
topics:
  - ai-and-automation
  - software-systems
series: building-my-ai-operating-system
series_order: 6
series_context: "The Morning Bridge tests whether a shared attention layer can omit most of what it observes without becoming confidently quiet and blind."
show_related_notes: false
intro:
  - Most dashboards try to help by showing more.
  - When the problem is attention, a useful dashboard has to leave most things out.
---

Most dashboards try to help by showing more. That works when the problem is access. It works less well when the problem is attention.

When work is spread across different tools, I can usually find every open item myself. The expensive part is repeatedly scanning those systems, comparing their state, and deciding what deserves attention first.

{% include series-context.html %}

An attention layer should take that first pass. It should collect the available signals, reduce them to a short list, and explain why those items appear now. The benefit is not discovering something I could never have found. It is letting me begin with the closest or most important decisions instead of reconstructing the whole landscape each time.

That makes omission part of the product. A system that shows everything has transferred information, but it has not reduced the work of deciding.

## A shortlist is already a decision

Prioritization cannot be treated as neutral presentation.

Every slot given to one item makes another item less visible. A useful attention layer therefore needs an opinion about urgency, proximity, and consequence. It also needs limits. Otherwise weaker signals gradually fill the available space and the shortlist becomes another inbox.

Those choices must remain inspectable. For each item, I should be able to understand why it appeared, what may happen if I ignore it, and where the underlying state comes from.

I do not need the system to make the final decision. I need it to perform enough of the first reading that my judgment starts from a smaller, better-organized set of options.

## The Morning Bridge as a test

Two private services currently feed [Friday](/thinking/why-i-started-building-friday/): March holds my publishing plan, while August holds documents and their review state.

Friday's first live synchronization read 22 entities from March and 23 documents from August. The Morning Bridge showed four signals: two publishing-runway items and two documents with unresolved review work.

The reduction from 45 records to four signals proved that the adapters, links, and initial suppression rules worked. It did not prove that the ranking was right, but it created a small enough surface for me to evaluate it.

Friday shows no more than seven items on the Bridge. Seven is not a magic number. It simply makes it harder to fill the page with weaker signals.

Completed work belongs in the Timeline. Integration health belongs in status. A document assigned to a future month can remain quiet if nothing needs to happen yet. Empty space does not need to be filled.

## Correct information can still be noise

Friday has already produced a useful negative example.

It surfaced a failed-review signal from August for a document I had demoted to source material. August really reported the failure, so the signal was not invented. But I no longer intended to advance that document.

I dismissed the item.

Friday remembered the dismissal without changing the document in August. The failed review still exists in the system that owns it; it simply no longer occupies my attention queue.

This matters because filtering stale data is not enough. Current, source-backed information can still be noise when it no longer relates to work I intend to continue. An attention layer needs a way to learn that distinction without rewriting the source.

## The benefit I am looking for

I would probably notice the things Friday shows me anyway.

The useful change is that I no longer have to give every signal the same initial attention. Friday can examine the state across services, bring the nearer or more important items forward, and leave the rest where it belongs.

The quality of the Morning Bridge will depend on whether its priorities continue to make sense, its omissions remain recoverable, and its explanations are good enough to challenge. A quiet Bridge could mean that nothing needs me. It could also mean that Friday missed something.

Trust will have to come from comparing its shortlist with the source systems over time.

I do not need Friday to know something I could never know. I need it to make the first pass well enough that I can concentrate on what deserves me now.
