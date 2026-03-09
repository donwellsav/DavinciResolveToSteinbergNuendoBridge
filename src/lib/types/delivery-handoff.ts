import { createHash } from 'node:crypto';

export type WriterReadinessStatus =
  | 'ready-for-writer'
  | 'blocked'
  | 'partial'
  | 'deferred-with-known-gaps';

export type WriterDependencyStatus = 'satisfied' | 'missing' | 'blocked' | 'unsupported';

export type DeferredWriterInputVersion = '3c.v1';

export type DeferredArtifactKind =
  | 'nuendo-ready-aaf'
  | 'reference-video-binary-handoff'
  | 'native-nuendo-session';

export interface DeliverySourceSignature {
  intakeSignature: string;
  canonicalSignature: string;
  packageVersion: string;
  packageSignature: string;
}

export interface DeliveryReviewSignature {
  reviewStateRevision: string;
  reviewStateSignature: string;
}

export interface WriterDependency {
  id: string;
  type: 'staged-artifact' | 'source-asset' | 'review-decision' | 'capability';
  reference: string;
  required: boolean;
  status: WriterDependencyStatus;
  reason?: string;
}

export interface DeferredWriterArtifact {
  id: string;
  kind: DeferredArtifactKind;
  plannedOutputPath: string;
  stagedLocation: string;
  requiredWriterCapability: string;
  explanation: string;
}

export interface DeferredWriterInput {
  id: string;
  version: DeferredWriterInputVersion;
  artifact: DeferredWriterArtifact;
  dependencies: WriterDependency[];
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  blockers: string[];
  readinessStatus: WriterReadinessStatus;
  reason: string;
  payload: Record<string, unknown>;
}

export interface DeliveryHandoffArtifact {
  id: string;
  kind: DeferredArtifactKind;
  readinessStatus: WriterReadinessStatus;
  blockers: string[];
  contractId: string;
}

export interface DeliveryHandoffSummary {
  stagedArtifactCount: number;
  deferredArtifactCount: number;
  readyCount: number;
  blockedCount: number;
  partialCount: number;
  deferredWithKnownGapsCount: number;
  unresolvedBlockers: string[];
}

export interface DeliveryHandoffManifest {
  version: DeferredWriterInputVersion;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  stagedArtifacts: string[];
  deferredArtifacts: DeliveryHandoffArtifact[];
  summary: DeliveryHandoffSummary;
}

export function stableStringify(input: unknown): string {
  if (Array.isArray(input)) {
    return `[${input.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(input);
}

export function stableId(prefix: string, payload: unknown): string {
  const digest = createHash('sha256').update(stableStringify(payload)).digest('hex').slice(0, 16);
  return `${prefix}-${digest}`;
}
