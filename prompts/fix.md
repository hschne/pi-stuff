---
description: Fix open FIX issues
model: anthropic/claude-sonnet-4-6
thinking: medium
---

Scan files for `FIX` comments — these are problems the user pointed out during review. Address each one, then remove the FIX comment.

## Instructions

1. Get the list of FIX comments with file paths and line numbers.
2. For each FIX comment, read the surrounding context, understand the issue, and fix it.
3. Remove the FIX comment after addressing it.
4. If no FIX comments are found, report that there's nothing to fix.

$@
