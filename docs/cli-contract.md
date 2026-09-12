---
okf_version: "1.0"
kind: "KnowledgeAsset"
asset_type: "contract"
domain: "github-engineering-projects"
severity: "strict"
name: "GitHub Engineering Projects CLI contract"
version: "0.1.0"
---

# CLI contract

## Input

Commands accept explicit textual routing and semantic names. They never accept
persisted opaque GitHub IDs as configuration. Unknown commands, flags, duplicate
flags, malformed repositories, and non-positive Issue or Project numbers fail
before GitHub access.

## Output

Success writes exactly one JSON receipt to stdout. Diagnostics and errors write
to stderr. Receipt schema version 1 distinguishes `inspected`, `applied`, and
`noop`. Mutation success requires a fresh read proving the requested
postcondition.

Published JSON Schemas are generated under `schemas/` from the runtime Zod
contracts.

## Failure

Failures use a nonzero exit code and a versioned error receipt. Access denial,
missing or ambiguous identities, malformed GitHub responses, mutation failure,
and postcondition mismatch fail closed. Diagnostics redact authorization
headers, GitHub token forms, bearer values, and credential-bearing URLs.

## Mechanical boundary

The CLI may inspect Projects and items, add an explicitly identified Issue to a
Project, set an explicitly named single-select option, and add an explicitly
identified same-repository blocker. It does not create findings, choose fields,
select options, infer dependencies, or close Issues.
