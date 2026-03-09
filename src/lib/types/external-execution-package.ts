import { DeferredArtifactKind, DeliveryReviewSignature, DeliverySourceSignature } from './delivery-handoff.js';

export type ExternalExecutionPackageVersion = '3d.v1';

export type ExternalExecutionStatus = 'ready' | 'partial' | 'blocked';

export type ExternalExecutionArtifactKind =
  | 'generated-staged-artifact'
  | 'generated-handoff-artifact'
  | 'deferred-writer-contract';

export interface ExternalExecutionChecksum {
  algorithm: 'sha256';
  value: string;
}

export interface ExternalExecutionDeferredInput {
  contractId: string;
  artifactId: string;
  kind: DeferredArtifactKind;
  plannedOutputPath: string;
  stagedLocation: string;
  readinessStatus: string;
  reason: string;
  blockers: string[];
}

export interface ExternalExecutionEntry {
  id: string;
  relativePath: string;
  kind: ExternalExecutionArtifactKind;
  classification: 'generated' | 'deferred';
  status: ExternalExecutionStatus;
  reason?: string;
  sizeBytes?: number;
  checksum?: ExternalExecutionChecksum;
}

export interface ExternalExecutionManifest {
  id: string;
  version: ExternalExecutionPackageVersion;
  status: ExternalExecutionStatus;
  reason: string;
  reasons: string[];
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  generatedCount: number;
  deferredCount: number;
  blockedCount: number;
  partialCount: number;
}

export interface ExternalExecutionIndex {
  generated: ExternalExecutionEntry[];
  deferred: ExternalExecutionEntry[];
}

export interface ExternalExecutionPackage {
  rootLabel: string;
  layout: {
    stagedRoot: 'staged/';
    handoffRoot: 'handoff/';
    packageRoot: 'package/';
  };
  manifest: ExternalExecutionManifest;
  index: ExternalExecutionIndex;
  deferredInputs: ExternalExecutionDeferredInput[];
  checksums: Record<string, ExternalExecutionChecksum>;
  files: Record<string, string>;
  summary: {
    sourceSignature: string;
    reviewSignature: string;
    status: ExternalExecutionStatus;
    reason: string;
    generatedPaths: string[];
    deferredPaths: string[];
    blockedDependencies: string[];
  };
}
