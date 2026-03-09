# DavinciResolveToSteinbergNuendoBridge

## Phase 3D status: external-execution package boundary

This repository now includes a deterministic **external-execution package layer** on top of staged outputs and handoff contracts.

What this phase adds:
- Deterministic external package model (`ExternalExecutionPackage`, versioned as `3d.v1`).
- Deterministic package files under `package/`:
  - `external-execution-manifest.json`
  - `external-execution-index.json`
  - `external-execution-summary.json`
  - `checksums.json`
  - `deferred-writer-inputs.json`
  - `generated-artifact-index.json`
- Explicit generated vs deferred classification for package members.
- Deterministic checksums for generated staged + handoff artifacts.
- External readiness evaluation:
  - `ready`
  - `partial`
  - `blocked`
- Optional Node-only materialization helper for writing package files to disk without writer execution.

What remains out of scope:
- Native Nuendo project/session writing.
- Any binary artifact generation by a writer.
- UI redesign.

Architectural boundaries remain intact:
- `exporter.ts` is planning-only.
- `delivery-execution.ts` is payload-generation-only.
- `delivery-staging.ts` is staging-only.
- `delivery-handoff.ts` is contract/handoff-only.
- `external-execution-package.ts` is external package export-only.
