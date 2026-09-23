---
okf_version: "1.0"
kind: "KnowledgeAsset"
asset_type: "documentation"
domain: "proto-lithify"
severity: "guideline"
name: "Proto-Lithify standalone installation"
version: "0.2.0"
---

# Standalone installation

Run `pnpm run install:standalone` from a validated source checkout. The installer
builds a self-contained payload, computes its SHA-256 tree digest, installs it in
an immutable version-and-digest directory, and atomically selects it through the
relative `current` symlink.

The public executable is the stable symlink
`~/.local/bin/proto-lithify`. An existing unmanaged file or
symlink at that path causes installation to fail closed.

Old releases are preserved. Rollback consists of atomically selecting a
previous verified release; no release or target GitHub state is deleted during
rollback. The installed runtime requires Node.js and `gh`, but not pnpm or the
source checkout.
