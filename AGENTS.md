---
okf_version: "1.0"
kind: "KnowledgeAsset"
asset_type: "agent-directives"
domain: "github-engineering-projects"
severity: "strict"
name: "GitHub Engineering Projects contributor directives"
---

# GitHub Engineering Projects contributor directives

## Mission

Maintain a standalone CLI that performs verified mechanical GitHub Project V2
operations for coding-agent workflows. Keep GitHub as the durable workflow-state
owner, repository profiles as local policy adapters, and dotagents as the owner
of agent decisions.

## Authority boundary

The CLI may inspect GitHub state, resolve live identities, apply an explicitly
requested mutation, and verify its postcondition. It must never decide whether
work should start, block, enter review, complete, change priority, or create a
finding.

Do not parse repository Markdown profiles. Callers must pass exact routing,
field, option, Issue, and relationship inputs.

## GitHub Engineering Project

For Issue, Project, backlog, agent-queue, or finding work, apply the shared
GitHub Engineering Projects operational protocol and
[`docs/repository-governance/gpe-engineering.md`](docs/repository-governance/gpe-engineering.md).
Resolve unqualified Issue numbers against this repository. Keep mutable work
state in the live Project and native GitHub relationships; do not mirror it in
repository dashboards or Issue prose.

## Runtime requirements

- Require Node.js 22.19.0 or newer and pnpm 11.24.0 for development.
- Implement runtime behavior in strict TypeScript without `any`.
- Execute the official authenticated `gh` client with argument arrays and
  `shell: false`.
- Discover opaque GitHub IDs live; never persist them as configuration.
- Paginate complete GraphQL connections and reject missing or ambiguous
  identities.
- Re-read every mutation and fail when its postcondition is not proven.
- Emit versioned JSON on stdout and sanitized diagnostics on stderr.
- Never expose tokens, authorization headers, credential-bearing URLs, or raw
  environment contents.

## Module boundaries

- `src/cli/` parses syntax without owning GitHub behavior.
- `src/github/` owns authenticated process execution, GraphQL pagination, and
  GitHub response normalization.
- `src/project-items/` owns mechanical Project-item operations.
- `src/issue-relations/` owns explicit native Issue dependency operations.
- `src/receipts/` owns public machine-readable output contracts.
- `src/installation/` owns immutable standalone release installation.

Do not create generic helper or utility modules. Keep each source and test file
below 400 physical lines.

## Installation boundary

Install releases under `$XDG_DATA_HOME/github-engineering-projects`, falling
back to `~/.local/share/github-engineering-projects`. Preserve immutable releases
and atomically switch the relative `current` symlink. Keep the stable public
launcher at `~/.local/bin/github-engineering-projects`.

The installed runtime must not invoke pnpm or consult the source checkout.

## Testing

Use `node:test` and `node:assert/strict`. Tests must inject a fake `gh`
executable and must never mutate live GitHub state. Cover pagination, access
denial, identity ambiguity, idempotent no-ops, mutation failure, postcondition
failure, argument safety, diagnostic redaction, and installation rollback.

## Required validation

Run:

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
pnpm run install:standalone
"$HOME/.local/bin/github-engineering-projects" doctor

git diff --check
```

Use `~/.local/bin/git-commits-push` for commit and push. Never invoke raw
`git commit` or `git push`.
