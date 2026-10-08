---
layout: article
title: An API is not an agent interface
date: 2026-10-08
permalink: /thinking/an-api-is-not-an-agent-interface/
summary: An existing API can make an agent prototype possible, but the useful agent interface still depends on deliberate choices about intent, context, permissions and authority.
topics:
  - ai-and-automation
  - software-systems
---

When a product already has an API, it is tempting to treat the first agent integration as plumbing. The data is available, the operations exist and MCP gives an AI client a standard way to reach them. This was enough for us to get a prototype working quickly when I recently helped a software company connect an AI client to one of its internal operational systems.

The uncertainty started only when we asked it to do actual work. Some responses had been shaped for the existing application and were awkward for an agent to use, while reading information worked with the initial permissions but changing it required different access. Several operations were available as well, although their names assumed that the caller already knew the system.

All of those problems could be fixed, but the right interface could not be derived automatically from the API. We still had to decide how the agent should interpret a request, what it needed to know before acting and how much authority it should have.

## An API assumes a knowledgeable caller

API operations tend to describe implementation through actions such as search, retrieve, create or update. That works well for a developer who understands the domain and knows why several similar operations exist.

An agent, however, starts from a sentence written by a user and has to translate it into an operation. It often does so without the background knowledge that makes the API obvious to its usual callers.

A method called *search* may return several kinds of records, while two update operations may look interchangeable even though they have different consequences. Even a field used safely by an internal application may be a poor choice to expose through a general AI client. The schema can describe the input and output, but it does not necessarily explain the product reasoning behind them.

In this case, thinking about the user's complete job was more helpful than copying the API surface. “Find the information needed to understand this case” gave the agent a clearer task than a collection of search and retrieval methods, while “update these fields without replacing the rest” expressed a boundary that would otherwise have remained implicit.

Those tools can still call several endpoints behind the scenes, so the API remains useful and stable while the agent receives a smaller vocabulary shaped around the work it is expected to perform.

I do not think every endpoint needs to be hidden or combined, and a direct mapping is perfectly sensible when an operation is simple and unambiguous. However, exposing everything by default leaves the model to reconstruct choices that the product team is better placed to make. The [MCP maintainers have noted](https://blog.modelcontextprotocol.io/posts/mcp-roadmap/) a related problem, as selecting the right tool becomes harder when tool surfaces grow.

## A permission error raised a product question

During the prototype, one write operation failed because the token did not have the required permission. At first this looked like an ordinary configuration problem, but even after fixing it we still needed to answer a more important question: which operations did we actually want the agent to perform?

Saying that an agent “has access” was not precise enough because reading a record, creating one and changing an existing one have different consequences. Some changes may be safe to make directly, whereas others should require confirmation or stop when the information supporting the action is incomplete.

Permissions therefore stopped feeling like infrastructure configuration and became part of the product experience. The technical mechanism could enforce a boundary, but we still had to choose where to place it.

MCP provides common mechanisms for exposing tools and handling authorization. Nevertheless, it does not know whether changing a particular record is routine, sensitive or potentially expensive to undo. That knowledge remains with the people building and operating the product.

## The failed tasks showed us the interface

We did not discover the useful agent surface by reading the API documentation more carefully. Instead, it emerged while we watched the agent attempt real tasks and noticed where it hesitated, chose badly or reached a limit we had not made explicit.

For this system, I expect the API to remain the integration layer, with agent-facing tools sitting on top of it and providing clearer names, more useful results and narrower permissions. The API can continue serving its existing callers, while the agent receives an interface suited to a different kind of interaction.

I would not add that layer to every API. Although direct exposure may be enough when the operations are obvious and the user already understands the system, the additional interface becomes worthwhile when the agent is expected to interpret a goal, choose among similar actions or change something on the user's behalf.

The API got us to a working prototype, but trying to use it showed us what the interface still needed.
