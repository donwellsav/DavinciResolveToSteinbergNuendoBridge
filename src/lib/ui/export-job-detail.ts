import { DeliveryHandoffOutput } from '../services/delivery-handoff.js';
import { ExternalExecutionPackage } from '../types/external-execution-package.js';

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
  externalPackage?: {
    status: ExternalExecutionPackage['manifest']['status'];
    reason: string;
    generatedEntries: ExternalExecutionPackage['index']['generated'];
    deferredEntries: ExternalExecutionPackage['index']['deferred'];
    checksums: ExternalExecutionPackage['checksums'];
    blockedDependencies: string[];
  };
}

export function buildExportJobDetailViewModel(
  handoff: DeliveryHandoffOutput,
  externalPackage?: ExternalExecutionPackage
): ExportJobDetailViewModel {
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
    handoffSummary: handoff.summary,
    externalPackage: externalPackage
      ? {
          status: externalPackage.manifest.status,
          reason: externalPackage.manifest.reason,
          generatedEntries: externalPackage.index.generated,
          deferredEntries: externalPackage.index.deferred,
          checksums: externalPackage.checksums,
          blockedDependencies: externalPackage.summary.blockedDependencies
        }
      : undefined
  };
}
