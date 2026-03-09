# DavinciResolveToSteinbergNuendoBridge

## Phase 3C status: deferred-writer contract hardening

This repository now includes a **formal handoff-contract layer** for deferred binary artifacts.

What this phase adds:
- Deterministic deferred writer-input contracts (`DeferredWriterInput`, versioned as `3c.v1`).
- Deterministic handoff manifests and summaries under:
  - `handoff/deferred-writer-inputs.json`
  - `handoff/delivery-handoff-manifest.json`
  - `handoff/delivery-handoff-summary.json`
- Readiness validation for deferred artifacts:
  - `ready-for-writer`
  - `blocked`
  - `partial`
  - `deferred-with-known-gaps`
- A stable UI view-model adapter for export/job detail inspection.

What remains out of scope:
- Native Nuendo project/session writing.
- Any binary artifact generation by a writer.
- UI redesign.

Architectural boundaries remain intact:
- `exporter.ts` is planning-only.
- `delivery-execution.ts` is payload-generation-only.
- `delivery-staging.ts` is staging-only.
- `delivery-handoff.ts` is contract/handoff-only.
