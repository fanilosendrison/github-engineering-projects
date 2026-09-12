---
okf_version: "1.0"
kind: "KnowledgeAsset"
asset_type: "documentation"
domain: "github-engineering-projects"
severity: "guideline"
name: "GitHub Engineering Projects CLI"
version: "0.1.0"
---

# GitHub Engineering Projects

`github-engineering-projects` is a mechanical GitHub Project V2 adapter for
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
`$XDG_DATA_HOME/github-engineering-projects`, falling back to
`~/.local/share/github-engineering-projects`, and exposes:

```text
~/.local/bin/github-engineering-projects
```

The installed command does not depend on this checkout or invoke pnpm.

## Commands

```text
github-engineering-projects doctor
github-engineering-projects project inspect --project-owner <owner> --project-number <number>
github-engineering-projects item inspect --project-owner <owner> --project-number <number> --repo <owner/repository> --issue <number>
github-engineering-projects item add --project-owner <owner> --project-number <number> --repo <owner/repository> --issue <number> --issue-url <url>
github-engineering-projects field set --project-owner <owner> --project-number <number> --repo <owner/repository> --issue <number> --field-name <field> --option-name <option>
github-engineering-projects dependency add-blocker --repo <owner/repository> --issue <number> --blocker <number>
```

See [the CLI contract](docs/cli-contract.md) and
[the architecture](docs/architecture.md) for authority and output guarantees.
