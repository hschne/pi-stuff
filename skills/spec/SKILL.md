---
name: spec
description: Turn current conversation context and codebase understanding into a feature spec or PRD for the project issue tracker. Use when the user wants to create, capture, or publish a product/implementation spec from existing context.
---

# Spec

Synthesize the current conversation and codebase understanding into a feature spec. Do not interview the user; work from what is already known unless a blocking ambiguity prevents progress.

## When to Use This Skill

- The user wants a spec, PRD, or product requirements document from the current conversation context.
- The user wants requirements or implementation decisions published to an issue tracker.
- The user wants implementation and testing decisions captured before ticket breakdown.

## Core Rules

- Use the project’s domain glossary vocabulary throughout.
- Respect ADRs in the area being changed.
- Actively look for deep modules that encapsulate behavior behind simple, testable interfaces.
- Identify testing seams. Prefer existing seams, choose the highest seam that proves external behavior, and minimize the number of new seams.
- Do not ask the user for confirmation before publishing unless a blocking ambiguity prevents a useful spec. The user will review your work.
- Do not include specific file paths or code snippets unless a prototype snippet captures a decision more precisely than prose.
- Preserve referenced assets such as screenshots, mockups, diagrams, prototypes, recordings, or uploaded files so downstream tickets can link back to them.

## Workflow

1. Explore the repo if needed to understand current implementation, domain language, relevant ADRs, and existing test seams.
2. Collect any assets supplied in the conversation: screenshots, mockups, diagrams, prototypes, recordings, uploaded files, or URLs.
3. Identify the major modules to build or modify, including any deep-module opportunities.
4. Determine test coverage and testing seams from conversation context and codebase patterns.
5. Write the spec using the template below, including an **Assets** section when assets exist.
6. Publish it to the documented spec/writeup home. If no such documented home can be found, request guidance from the user.

## Spec Template

```md
## Problem Statement

The problem the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A long numbered list of user stories:

1. As an <actor>, I want a <feature>, so that <benefit>

## Implementation Decisions

A list of implementation decisions, such as modules to build or modify, interfaces to change, technical clarifications, architectural decisions, schema changes, API contracts, and specific interactions.

## Testing Decisions

A list of testing decisions, including what makes a good test, the testing seams to use, which modules will be tested, and prior art for similar tests in the codebase.

## Assets

Links or attachments for design screenshots, mockups, prototypes, or other source material. Include a short note explaining what each asset shows and which user stories or decisions it informs. Omit this section if there are no assets.

## Out of Scope

Things explicitly outside this spec.

## Further Notes

Any further notes about the feature.
```
