# BUNDLE SPEC

## Delivery handoff additions (Phase 3C)

New deterministic handoff files (logical paths):
- `handoff/deferred-writer-inputs.json`
- `handoff/delivery-handoff-manifest.json`
- `handoff/delivery-handoff-summary.json`

### Contract version
- `DeferredWriterInputVersion`: `3c.v1`

### Writer readiness statuses
- `ready-for-writer`
- `blocked`
- `partial`
- `deferred-with-known-gaps`

### Notes
- These files define writer inputs and readiness only.
- They do not contain Nuendo/session binary payloads.
