---
layout: article
title: Stop asking people for information the system already has
date: 2026-08-20
last_modified_at: 2026-08-20
permalink: /thinking/stop-asking-people-for-information-the-system-already-has/
summary: Much process work moves facts between tools. Useful automation connects what is already recorded while keeping system interpretations separate from source truth and human judgment.
meta_description: Carlo Caprini explains why automation should connect recorded facts, keep system interpretations separate and ask people only for judgment the source cannot provide.
meta_image: /assets/og-thinking-v2.png
meta_image_alt: Thinking by Carlo Caprini, notes on product decisions, AI, software systems and teams.
topics:
  - software-systems
intro:
  - A lot of what looks like process work is just moving facts by hand.
---

A ticket says one thing while the real status lives in another tool. Someone asks an engineer for a delivery date because the dashboard is stale. A decision has already been recorded, but people downstream still need a message before they can act on it.

We tend to describe these situations as missing information. Often the information is there. It is simply not where the process expects to find it.

Once people stop trusting the official view, a private checklist usually appears somewhere. Someone keeps a parallel document up to date. Meetings fill the remaining gaps. The shared process becomes a little less reliable each time.

A [newsletter by Luca Rossi](https://refactoring.fm/p/good-relationships-automation-and), drawing on a conversation with Antonia Scheidel, separates information that already exists somewhere from information that still lives only in people's heads. Rossi's practical advice was to connect what is already recorded and ask people only for what is still in their heads.

I found that I needed one more category. Systems now produce their own reading of the information they collect.

The due date may be a recorded fact. Calling the item urgent is something the system concluded.

## When the alert is wrong but the data is right

I ran into this while building Friday, a small system that [connects several services without owning their work](/thinking/friday-connects-the-services-without-owning-their-work/) and decides what may deserve my attention.

August stores my documents and review decisions. Friday reads them and chooses what to show me.

At one point Friday kept presenting a document as requiring action after I had rejected it in August.

The evidence was real. A failed review was associated with the document. Friday was treating that history as work I still intended to continue.

I considered adding a rule for rejected documents. It would have removed the alert, but every similar mistake would eventually need its own exception.

Instead, I added a general dismiss action for anything Friday surfaces.

Dismissing an alert does not touch the document or its review history in August. It records only that I no longer find Friday's interpretation useful.

I wanted Friday to remember the dismissal without gaining permission to rewrite the service it had read from. Otherwise I would either lose the review history or find myself filtering the same noise again tomorrow.

The architectural pattern [Revert to Source](https://martinfowler.com/articles/patterns-legacy-displacement/revert-to-source.html) follows a related principle. Information should remain attributable to where it originated. Friday adds a wrinkle because its signal has a lifecycle of its own.

Connecting existing facts can remove a lot of copying. Judgment is still needed when a system ranks work or raises an alert.

When Friday makes a suggestion, I want to see enough of its reasoning to challenge it. If the suggestion is wrong, I need to correct the suggestion or the rule that produced it. The source should change only when the source itself is wrong.

Moving facts between tools is work I want to remove. Letting Friday's interpretation quietly become another fact would create a different problem.

I now look at where each correction lands. Dismissing an item should make Friday quieter and leave August untouched. If the document changes too, Friday has crossed a boundary it was never meant to own.
