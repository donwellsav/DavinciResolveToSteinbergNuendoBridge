import { DeliveryHandoffOutput } from '../services/delivery-handoff.js';

export interface ExportJobDetailViewModel {
  stagedArtifacts: string[];
  deferredWriterInputs: Array<{
    id: string;
    kind: string;
    readinessStatus: string;
    missingDependencies: string[];
    reason: string;
  }>;
  blockedArtifacts: string[];
  handoffSummary: DeliveryHandoffOutput['summary'];
}

export function buildExportJobDetailViewModel(handoff: DeliveryHandoffOutput): ExportJobDetailViewModel {
  return {
    stagedArtifacts: handoff.manifest.stagedArtifacts,
    deferredWriterInputs: handoff.writerInputs.map((item) => ({
      id: item.id,
      kind: item.artifact.kind,
      readinessStatus: item.readinessStatus,
      missingDependencies: item.dependencies
        .filter((dep) => dep.status !== 'satisfied')
        .map((dep) => dep.reason ?? dep.id),
      reason: item.reason
    })),
    blockedArtifacts: handoff.writerInputs.filter((item) => item.readinessStatus === 'blocked').map((item) => item.id),
    handoffSummary: handoff.summary
  };
}
