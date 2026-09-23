---
okf_version: "1.0"
kind: "KnowledgeAsset"
asset_type: "architecture"
domain: "proto-lithify"
severity: "strict"
name: "Proto-Lithify architecture"
version: "0.2.0"
---

# Architecture

## Authority

GitHub owns durable Project and Issue state. Target-repository profiles own
routing, exact field vocabulary, and local technical-authority order. Dotagents
owns agent workflow decisions. This repository owns only mechanical GitHub
access, mutation, verification, and receipt production.

## Runtime flow

```text
agent policy + repository profile
              |
              v
explicit CLI arguments
              |
              v
GitHub adapter -> official gh -> GitHub APIs
              |
              v
fresh postcondition read -> versioned receipt
```

The CLI never selects work or infers a desired status. Opaque Project, item,
field, option, and Issue IDs are discovered from live state for each operation.

## Modules

- `src/cli/` validates command syntax.
- `src/github/` owns shell-free process execution and GitHub response handling.
- `src/project-items/` owns exact item and field mutation orchestration.
- `src/issue-relations/` owns explicit blocked-by relationships.
- `src/receipts/` owns public output schemas.
- `src/installation/` owns immutable standalone installation.

## Exclusions

Version 0.2.0 has no LLM, daemon, SQLite database, Turnlock workflow, profile
parser, work selector, or GitHub command enforcer. Multi-command transactions
are not claimed; each command exposes and verifies only its own effect.
