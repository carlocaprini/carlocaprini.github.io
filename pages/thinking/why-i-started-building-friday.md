---
layout: article
title: Why I started building Friday
date: "2026-07-22T09:00:00+02:00"
last_modified_at: 2026-07-22
published: true
permalink: /thinking/why-i-started-building-friday/
summary: Friday is my second attempt at the original Jarvis ambition. It began when August and March created a concrete coordination problem between them.
meta_description: Why Carlo Caprini returned to Friday after August and March created a concrete job for orchestration across services.
meta_image: /assets/og-thinking-v2.png
meta_image_alt: Thinking by Carlo Caprini, notes on product decisions, AI, software systems and teams.
topics:
  - ai-and-automation
  - software-systems
series: building-my-ai-operating-system
series_order: 4
show_related_notes: false
intro:
  - I stopped building Jarvis because it had no recurring job.
  - Friday began when August and March created one between them.
---

I [stopped building Jarvis](/thinking/i-stopped-trying-to-build-jarvis/) because it had no recurring job.

Then I built [August](/thinking/i-built-august-because-copy-and-paste-was-not-collaboration/) and [March](/thinking/i-built-march-to-plan-with-ai-without-becoming-a-content-machine/).

Friday is my second attempt at the original ambition. It began when those two useful services created a new problem between them.

## The problem was not asking

August knew the state of my documents and reviews. March knew the publishing plan.

Both exposed MCP tools, so I could ask an agent to inspect them together. Once I knew the question, active orchestration was already quite simple. Codex could collect the relevant context without making me copy information from one screen to another.

I was still responsible for noticing that there was a question to ask.

March could show an article in a publication slot while August still had an open thread on the draft. Neither service was wrong. They were answering different questions.

To understand what deserved attention, I still had to look at both, reconstruct the situation, and decide what mattered next.

That was the missing job.

I did not need another way to ask my tools for information. I needed a signal before the question: something that could notice a relevant change, explain why it mattered, and bring me to the right place.

That was my trigger to start building Friday.

<figure class="article-figure">
  <a class="article-figure-link" href="/assets/friday-morning-bridge-public-demo.png" aria-label="Open the Friday Morning Bridge interface image at full size">
    <img src="/assets/friday-morning-bridge-public-demo.png" alt="Friday dashboard combining fictional March, August, Home and GitHub signals into a Morning Bridge and priority queue." width="1639" height="960" loading="lazy" decoding="async">
  </a>
  <figcaption>Friday brings signals from separate services into one attention queue. The interface is shown with fictional demonstration data.</figcaption>
</figure>

## The same ambition had a different starting point

Jarvis had started from the center. I imagined a general orchestration system and kept adding decisions, action items, context, and agents before any recurring work had earned that structure.

August and March developed in the opposite direction. Each began with work I was already doing and a problem I could recognize without explaining the future platform around it.

They also changed how I thought about the technical boundary.

Markdown had made the first direction especially tempting. AI agents eat Markdown for breakfast, and I am comfortable working with it too. But an artifact that an AI can read is not automatically a reliable operational contract.

August and March could now expose their state and supported operations without asking a consumer to interpret private folders. That mattered because I no longer had to begin by inventing every concept and owning every workflow.

The useful pieces already existed. The new question was whether something smaller could coordinate them.

This is what made the second attempt feel different. I was not rebuilding Jarvis because the original feature list had become more achievable. I was returning to the ambition because a concrete job had finally appeared.

## One job before the platform

Friday begins with one question: what deserves my attention now?

That is intentionally smaller than “build my personal AI operating system.” It gives me something I can observe and disagree with. A signal can be useful, irrelevant, late, or simply wrong. Those outcomes are more informative than a long list of capabilities waiting for a reason to exist.

It also gives me a reason to resist the fun part.

Once several services can be queried by AI, it is easy to imagine connecting everything. The more useful constraint is to test one connection at a time, starting with August and March.

I do not know the answer yet.

The next experiment is about integration: can Friday connect services without owning their work?

After that comes attention: can the Morning Bridge be useful because of what it leaves out?

I have not earned either answer yet. For now, they are promises to test, not conclusions.

Jarvis started as a platform looking for its first job. Friday starts with a job and has to earn the platform around it.

For now, that is enough to keep building and tinkering.
