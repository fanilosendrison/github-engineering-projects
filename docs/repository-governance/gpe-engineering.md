---
okf_version: "1.0"
kind: "KnowledgeAsset"
asset_type: "agent-directives"
domain: "github-engineering-projects"
severity: "strict"
name: "GPE Engineering Project governance profile"
---

# GPE Engineering Project governance profile

Apply the shared GitHub Engineering Projects operational protocol with this
repository-specific profile. Keep workflow decisions in the protocol and this
profile; use `github-engineering-projects` only as the mechanical adapter.

## Routing

- Project owner: `fanilosendrison`
- Project title: `GPE Engineering`
- Project number: `9`
- Project URL: <https://github.com/users/fanilosendrison/projects/9>
- Visibility: private
- Ownership type: user-owned GitHub Project V2
- Default repository: `fanilosendrison/github-engineering-projects`

Resolve unqualified Issue numbers against the default repository. Discover all
opaque Project, view, field, option, item, and Issue node IDs from live GitHub
state for each operation. Never persist those IDs in repository documentation.

## Authority boundary

Use `GPE Engineering` as the authority for durable work existence, workflow
state, work classification, and scheduling priority. Do not use it to define CLI
semantics, adapter architecture, installation behavior, or implementation
rules.

Apply this technical-authority order:

1. `docs/cli-contract.md` owns externally observable CLI behavior and
   failure/output guarantees.
2. `docs/architecture.md` owns the adapter authority boundary and module/runtime
   architecture.
3. `docs/installation.md` owns standalone installation and rollback behavior.
4. `AGENTS.md` owns contributor implementation and validation guardrails.
5. Runtime source, generated schemas, and tests provide implementation and
   executable evidence consistent with the governing documents.

Report conflicts and update the artifact that owns the affected contract. Never
treat an Issue, Project field, comment, discussion, or Pull Request as technical
authority.

## Live work-state ownership

Apply this rule:

```text
Reference, do not mirror.
```

Use exactly one canonical owner for each mutable fact:

- GitHub Issues own durable work items and open/closed state.
- Project `Status` owns workflow state.
- Project `Kind` owns work-item classification.
- Project `Priority` owns scheduling priority.
- Native GitHub relationships own parent/sub-issue, blocking/blocked-by, and
  Pull Request linkage.
- Each Issue body owns that Issue's acceptance criteria.
- The technical authorities above own repository contracts and architecture.
- Source code and tests own executable implementation and evidence.

Do not copy current Project fields or native relationship state into Issue
bodies or repository dashboards.

## Project fields

Reject duplicate or ambiguous field names before relying on the affected field.
Treat option names as exact and case-sensitive.

### Status

Use exactly these options:

- `Backlog`: retained work that is not currently independently executable.
- `Ready`: independently executable work whose scope, authority, dependencies,
  acceptance criteria, and validation are sufficient for pickup.
- `In Progress`: active execution.
- `Review`: execution is complete and only an explicit external review,
  approval, or merge gate remains.
- `Done`: the Issue's acceptance criteria and required repository validation are
  complete.

Do not add a blocked status. Keep durable work in `Backlog` when an unresolved
native blocker prevents safe progress. Never mark an item `Ready` while it has
an unresolved native blocker.

### Kind

Use exactly these options:

- `Agent Task`: independently scoped work intended for direct execution.
- `Follow-up`: downstream work created by another task, finding, accepted
  decision, or completed change.
- `Finding`: a validated concern requiring separate adjudication, design, or
  correction.

Do not retain an unvalidated observation as `Finding`.

### Priority

Use exactly these options:

- `P0`: delay blocks current meaningful progress or permits a material integrity
  breach in mutation correctness, retry safety, credential safety, durable
  GitHub work-state correctness, or repository-governance enforcement.
- `P1`: required by the current hardening program while other safe hardening
  work can still proceed.
- `P2`: important retained robustness, compatibility, or maintenance work that
  is not on the current critical path.
- `P3`: useful retained work that can safely wait without meaningful current
  scheduling cost.

Use priority only for scheduling. Never use it to override dependencies,
repository authority, acceptance criteria, validation, or readiness.

### No Phase field

Do not define a `Phase` field. GPE Issues commonly combine contract,
architecture, implementation, assurance, and hardening concerns. Add a future
lifecycle-domain taxonomy only through an explicit governance change supported
by a demonstrated recurring need.

## Project views

Maintain these views and treat any live mismatch as an inconsistency to report
before relying on the affected routing:

- `Now`: board filtered to `Status = In Progress`.
- `Agent Queue`: table filtered to `Status = Ready OR Status = In Progress`,
  with `Status`, `Kind`, and `Priority` visible.
- `Backlog`: table filtered to `Status = Backlog`, with `Status`, `Kind`, and
  `Priority` visible.
- `Findings`: table filtered to `Kind = Finding`, with `Status`, `Kind`, and
  `Priority` visible.

## Autonomous pickup

Use this exact order:

1. Consider only items with `Status = Ready`.
2. Choose highest priority in the order `P0`, `P1`, `P2`, `P3`.
3. Exclude work with an unresolved native blocker.
4. Use existing Project manual order to break ties between independent items of
   equal priority.
5. Let a direct user selection override pickup order for that action only.

Priority never creates a dependency and never implies readiness.

## Priority revalidation

Re-evaluate every open Project Issue after:

1. durable Issue creation;
2. Issue completion, closure, or reopening;
3. native dependency creation or removal;
4. a repository contract or architecture change that changes another item's
   prerequisite or correctness risk;
5. a validated cross-cutting GPE finding that changes the safety of other work.

Do not trigger a portfolio pass solely for comments, labels, assignees,
formatting, or a Priority correction itself. Mutate only priorities justified by
current live Issue, Project, dependency, contract, and architecture state.

## Issue requirements

Require every normal GPE Issue to state:

- the observable defect, missing guarantee, or required outcome;
- the current authoritative contract or boundary;
- the affected commands, APIs, modules, or installation surfaces;
- relevant side-effect, idempotence, retry, compatibility, or security
  consequences;
- mechanically checkable acceptance criteria local to the Issue;
- required tests and repository validation;
- public receipt, schema, or documentation compatibility impact when relevant.

## Completion

Set an Issue to `Done` only when:

- its local acceptance criteria are satisfied;
- governing contract, architecture, and installation documentation is
  synchronized when affected;
- runtime schemas and generated artifacts are current when affected;
- focused tests and the complete validation sequence in `AGENTS.md` pass;
- no required external review, approval, or merge gate remains;
- final GitHub Issue, Project, and native relationship state is freshly read and
  consistent.

Use the repository-authorized Git publication path in `AGENTS.md`. Do not claim
branch protection, a ruleset, or another GitHub feature without verifying its
live availability.
