# TASKLIST

## Completed in Phase 3D
- [x] Added external package boundary service (`external-execution-package.ts`).
- [x] Added explicit external package types and versioning (`external-execution-package.ts` type module).
- [x] Added deterministic package manifest/index/checksum generation.
- [x] Added generated vs deferred package classification and readiness states (`ready`, `partial`, `blocked`).
- [x] Added package summary propagation of source/review signatures and blocker reasons.
- [x] Added export/job detail view-model integration for package status and indexed members.
- [x] Added Node-only disk materialization helper for package write-out.
- [x] Added deterministic and readiness-focused regression tests.

## Remaining
- [ ] Implement actual external writer execution adapter.
- [ ] Implement Nuendo/native session generation (future phase).
