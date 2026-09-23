---
okf_version: "1.0"
kind: "KnowledgeAsset"
asset_type: "documentation"
domain: "proto-lithify"
severity: "guideline"
name: "Proto-Lithify CLI"
version: "0.2.0"
---

# Proto-Lithify

`proto-lithify` is a mechanical GitHub Project V2 adapter for
coding-agent workflows. It discovers live GitHub identities, performs explicit
Project mutations, verifies postconditions, and emits versioned JSON receipts.

It does not decide workflow status, priority, readiness, Issue scope, or product
semantics. Those decisions remain with the invoking agent policy and the target
repository's Engineering Project profile.

## Requirements

- Node.js 22.19.0 or newer
- pnpm 11.24.0 for development and installation
- the official authenticated GitHub CLI

## Development

```bash
pnpm install
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

Tests use fake `gh` executables and never mutate live GitHub state.

## Installation

```bash
pnpm run install:standalone
```

The installer deploys an immutable content-addressed release below
`$XDG_DATA_HOME/proto-lithify`, falling back to
`~/.local/share/proto-lithify`, and exposes:

```text
~/.local/bin/proto-lithify
```

The installed command does not depend on this checkout or invoke pnpm.

## Commands

```text
proto-lithify doctor
proto-lithify project inspect --project-owner <owner> --project-number <number>
proto-lithify item inspect --project-owner <owner> --project-number <number> --repo <owner/repository> --issue <number>
proto-lithify item add --project-owner <owner> --project-number <number> --repo <owner/repository> --issue <number> --issue-url <url>
proto-lithify field set --project-owner <owner> --project-number <number> --repo <owner/repository> --issue <number> --field-name <field> --option-name <option>
proto-lithify dependency add-blocker --repo <owner/repository> --issue <number> --blocker <number>
```

See [the CLI contract](docs/cli-contract.md) and
[the architecture](docs/architecture.md) for authority and output guarantees.
