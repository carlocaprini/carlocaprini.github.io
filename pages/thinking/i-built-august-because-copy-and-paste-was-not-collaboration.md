---
layout: article
title: I built August because copy and paste was not collaboration
date: "2026-07-21T10:00:00+02:00"
last_modified_at: 2026-07-21
published: true
permalink: /thinking/i-built-august-because-copy-and-paste-was-not-collaboration/
summary: AI could help with a document, but the work around each answer kept falling apart. I built August to keep the draft, its review state and my decisions in one place.
meta_description: Why Carlo Caprini built August as a shared workspace for developing documents with AI while preserving continuity, authorship and human judgment.
meta_image: /assets/og-thinking-v2.png
meta_image_alt: Thinking by Carlo Caprini, notes on product decisions, AI, software systems and teams.
topics:
  - ai-and-automation
  - teams-and-collaboration
series: building-my-ai-operating-system
series_order: 2
show_related_notes: false
intro:
  - I needed a way to keep working on a document with AI without rebuilding the context in every conversation.
  - The AI could help with the text. But we did not have a comfortable place to continue the work together.
---

After [I stopped trying to build Jarvis](/thinking/i-stopped-trying-to-build-jarvis/), I did not immediately need another platform. But I still wanted to build.

I needed a way to keep working on a document with AI without rebuilding the context in every conversation.

AI models were already useful. I could paste a draft into a conversation and ask for a different structure, a critical reading, a clearer paragraph, or questions I had not considered.

The frustrating part was everything around the answer.

I had to copy the document into the conversation, copy useful suggestions back into my editor, decide which changes I had already applied, and remember which questions were still unresolved. If I started another session, I had to reconstruct the state again.

The AI could help with the text. But we did not have a comfortable place to continue the work together.

## The missing part was continuity

A document rarely improves in one pass.

One review may reveal a weak argument. Another may challenge an assumption. A suggestion can be useful without being correct. A question can remain open because I do not yet have the evidence or because I have not decided what I think.

A chat is good at producing the next response, but it is less good at showing the state of the collaboration around the document.

Which version are we discussing? Which suggestion did I accept? Which one did I reject? Is a question still open because I missed it, or because it genuinely needs more work?

I was spending too much time carrying those answers between the AI, the conversation, and the document.

That work was not intellectually difficult but it was constant.

So I kept on tinkering and started building August to remove that friction.

## I did not want the AI to write instead of me

The objective was never to put a document into a machine and receive a finished and polished version.

I wanted the AI to participate in the work without quietly becoming the author.

That means it can propose a rewrite, point out a contradiction, ask for evidence, or show me how a reader may interpret a passage.

But it is still me who decides what the document is trying to say.

I provide the experiences, opinions, constraints, and examples. I can reject a suggestion even when it sounds better. I can leave a question unresolved rather than accepting the most plausible answer the model can generate.

AI is very good at making a draft look complete. It can smooth over a missing argument or invent a convincing bridge between two ideas. The result may read better while representing my thinking less honestly.

A useful review may improve a paragraph. It may also leave an honest gap visible until I know what belongs there.

## August became the shared workspace

I did not find another tool that made this way of working comfortable enough for me, and maybe I did not even look for it too hard. Instead, I built the one I wanted, and I keep working on improving it.

The document remains easy to read and edit. Around it, August keeps the parts that are otherwise scattered across conversations and editors:

- versions of the document;

- comments attached to the relevant passage;

- proposed changes that I can accept or reject;

- questions that remain open;

- the current state of the review.

I do not need to explain the whole history every time. An agent can work from the current document and its visible review state. Its feedback returns to the same place instead of becoming another block of text I have to reconcile by hand.

I can inspect what changed and decide what to keep.

## Review does not belong to one model

Once the review state lives with the document, I am not limited to the model or interface I happen to have open.

August exposes a dedicated interface for AI agents through MCP, a protocol that gives them access to specific tools and data exposed by the service. Today, I can ask agents such as ChatGPT or Claude to read the current document, inspect the existing review, and contribute comments or proposed changes directly. They do not need a pasted copy or my summary of what happened in the previous session.

I also built specialized reviewer profiles into August that can run locally. Each profile is a reusable set of review instructions, not a separate model.

Some are deliberately general: an editor looks at the writing, while a reader looks for the points where the argument becomes difficult to follow. Others use a more specific perspective, such as a developer, a founder, or my future self.

I do not treat these profiles as a panel that votes on the correct version. They are different ways to put pressure on the same draft. A developer may notice that an architectural claim is vague. A founder may question why the problem matters. My future self may ask whether the document will still make sense after the current implementation changes.

Their feedback still arrives as comments and suggestions. I can compare conflicting readings, accept a precise change, reject an elegant one, or leave the question open.

The useful part is not having more reviewers. More feedback also creates more filtering work. August helps when it keeps that work visible and lets different reviewers contribute without losing the document's history or my responsibility for the result.

## It started with things I wanted to publish

The first use was deliberately narrow: documents and content I might publish as an article, a longer note, or something that had not found its final format yet.

The job already existed. I was writing, asking AI for feedback, and losing time moving the work between tools.

August did not need to invent a new habit. It made an existing one less fragmented.

This article went through the same process. Feedback from AI helped me recognize that the story needed a different center, while I remained in control of the rewrite.

## The scope expanded after the job was clear

I now also use August to develop early ideas and support planning work.

A rough note may accumulate questions and research before becoming a PRD whose assumptions need pressure-testing, a strategy document with unclear trade-offs, or something that has not found its final form yet.

The format changes, but the job remains recognizable: a piece of thinking needs continuity, AI can help explore it, and I need to see what still requires my judgment.

August expanded because that pattern repeated, not because it started as the home for every kind of knowledge work.

## Smaller was the important decision

Jarvis began with the shape of a large system and then looked for jobs to place inside it.

August began with work I was already doing badly: collaborating with AI on a document through copy and paste.

For August, the order mattered more than the technology. I already had the job, the friction, and a way to tell whether the tool was helping.

August can grow, and it already has. But each addition still has to answer the same question: does it help me continue a piece of thinking with AI without losing its state or my ownership of the result?

That question is the boundary [Jarvis did not have](/thinking/i-stopped-trying-to-build-jarvis/): if an addition does not help me continue a real piece of work, it does not belong in August.
