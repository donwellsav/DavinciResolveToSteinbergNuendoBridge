# BUNDLE SPEC

## External execution package additions (Phase 3D)

New deterministic package files (logical paths):
- `package/external-execution-manifest.json`
- `package/external-execution-index.json`
- `package/external-execution-summary.json`
- `package/checksums.json`
- `package/deferred-writer-inputs.json`
- `package/generated-artifact-index.json`

### Package version
- `ExternalExecutionPackageVersion`: `3d.v1`

### Package statuses
- `ready`
- `partial`
- `blocked`

### Notes
- Staged artifact layout is preserved.
- Handoff outputs are preserved.
- Package files add export-level indexing, provenance summary, and deterministic checksums.
- Deferred binary targets are represented as contract-only entries.
- No Nuendo/session binaries are generated in this phase.
