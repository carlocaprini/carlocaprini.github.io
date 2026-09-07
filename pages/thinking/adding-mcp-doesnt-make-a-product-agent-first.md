---
layout: article
title: Adding MCP doesn't make a product agent-first
date: 2026-09-07
permalink: /thinking/adding-mcp-doesnt-make-a-product-agent-first/
summary: Adding MCP to an existing API can create enormous value by making an established product accessible to agents. Designing a product with agents as first-class users is a different problem.
topics:
  - ai-and-automation
  - software-systems
intro:
  - MCP can make years of existing product functionality accessible to agents without requiring the underlying product to be redesigned.
  - This alone can create significant value.
  - But making a product accessible to agents and designing it for agents from the beginning are two different things.
---

## Making existing software accessible to agents

I've been [building a few small services as part of a personal AI operating system](/series/building-my-ai-operating-system/) where I want AI agents to be first-class users.

And that immediately raised an architectural question for me.

Should I build a standard API and expose it to agents through the Model Context Protocol (MCP)? Or should the fact that agents will use the product influence how the product itself is designed?

At first, these two approaches can look very similar.

If a service already exposes an API, adding an MCP server on top of it can make selected operations available to an agent.

The agent can discover tools, retrieve information, perform actions, and interact with functionality that previously required a human or a custom integration.

The product becomes accessible to agents.

But I'm increasingly convinced that this is different from designing the product for them.

## Accessibility alone can create enormous value

This distinction doesn't make adding MCP to an existing API less valuable.

There are countless existing services with mature APIs and years of accumulated functionality, but no interface designed for agents. And a well-designed MCP server can make selected capabilities from those APIs discoverable and usable by agents.

The underlying product doesn't become agent-first, and it doesn't need to.

Making an existing product accessible to agents is already a significant improvement. And in many cases, redesigning the product around agents would probably be unnecessary.

If the existing API represents the domain well and the operations exposed through MCP give an agent what it needs to accomplish its goals, an MCP layer may be exactly the right architecture.

MCP-enabled and agent-first describe different kinds of value. One extends the reach of an existing product; the other can influence how the product itself is designed.

## Existing APIs often expose operations

Traditional APIs are often shaped by the systems and interfaces around them.

They expose resources and operations: retrieve a document, create a comment, update a status, search a collection.

There is nothing inherently wrong with this model. In many cases, exposing the same operations through MCP may be exactly what is needed.

But an agent approaching the system has a slightly different problem.

It needs to understand not only which operations exist, but how they relate to what it is trying to accomplish.

What can I do here? What context do I need? What are the boundaries? What will happen if I perform this action? When should I ask for confirmation?

That is where access to operations can stop being enough.

## March as a concrete case

[March is the publishing runway service I built to plan with AI without turning the plan into a commitment](/thinking/i-built-march-to-plan-with-ai-without-becoming-a-content-machine/).

Its API can expose months, available slots, intentional gaps, planned pieces, their states, and links to the documents behind them. An MCP server can make those operations available to an agent.

But the job I care about is not simply retrieving or updating a content item. I want an agent to inspect the runway, question the sequence, surface gaps or inconsistencies, and propose changes without treating every empty slot as work that must be filled.

That requires more than knowing which endpoint changes a status.

The agent needs to understand that a gap can be intentional, that document maturity and publication planning belong to different services, and that a proposal is not permission to change the plan.

The March case does not show that the domain model had to be rebuilt around agents. It supports a narrower claim: MCP can expose the operations, but it does not decide which context, authority boundaries, or confirmation rules make those operations safe and useful. Those decisions still have to be designed deliberately, whether they live in the API, the MCP tool contract, or both.

March still has an API, and MCP still exposes its operations. What changes when I design for agents is the attention given to that operating contract, not necessarily the architecture underneath it.

## API-first, MCP-enabled, and agent-first

This is the distinction I currently find most useful.

A product can be **API-first**: its important capabilities are available programmatically, often before they appear in a UI.

It can also be **MCP-enabled**: selected capabilities can be discovered and used by agents through MCP.

And it can be **agent-first**: capabilities, context, permissions, and workflows have been designed considering agents as first-class consumers of the product.

These aren't maturity levels, and I don't think every product should try to move from one to the next. They solve different problems.

A mature product with a good API may get enormous value from becoming MCP-enabled without redesigning the underlying product.

But a new product expected to be used primarily by agents may have reasons to make different decisions much earlier.

## The question changes when agents are there from the beginning

When agents are expected to be a primary way a system is used, I find a different question more useful:

> If an agent had been one of the intended users from the beginning, would I have designed these capabilities the same way?

For March, that question changed what the agent needs to know before an operation and where human judgment remains explicit. The current case does not prove that the product needed a different domain model. It shows that adding the protocol did not answer those design questions.
