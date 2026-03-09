import {
  DeferredWriterInput,
  DeliveryHandoffArtifact,
  DeliveryHandoffManifest,
  DeliveryHandoffSummary,
  DeliveryReviewSignature,
  DeliverySourceSignature,
  WriterDependency,
  WriterReadinessStatus,
  stableId,
  stableStringify
} from '../types/delivery-handoff.js';

export interface DeferredArtifactPlan {
  kind: DeliveryHandoffArtifact['kind'];
  plannedOutputPath: string;
  stagedLocation: string;
  requiredWriterCapability: string;
  explanation: string;
  dependencies: Array<{
    id: string;
    type: WriterDependency['type'];
    reference: string;
    required: boolean;
  }>;
}

export interface DeliveryPlanningContext {
  deferredArtifacts: DeferredArtifactPlan[];
}

export interface DeliveryExecutionContext {
  generatedArtifactPaths: string[];
  missingPrerequisitePaths: string[];
  unresolvedPreservationIssues: string[];
  unresolvedFieldRecorderBlockers: string[];
  incompleteMappingDecisions: string[];
  unsupportedKinds: DeliveryHandoffArtifact['kind'][];
  availableWriterCapabilities: string[];
}

export interface DeliveryStagingContext {
  stagedArtifactPaths: string[];
}

export interface DeliveryHandoffInput {
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  planning: DeliveryPlanningContext;
  execution: DeliveryExecutionContext;
  staging: DeliveryStagingContext;
}

export interface DeliveryHandoffOutput {
  writerInputs: DeferredWriterInput[];
  manifest: DeliveryHandoffManifest;
  summary: DeliveryHandoffSummary;
  handoffFiles: Record<string, string>;
}

function evaluateDependency(
  dep: DeferredArtifactPlan['dependencies'][number],
  input: DeliveryHandoffInput
): WriterDependency {
  if (dep.type === 'staged-artifact') {
    const exists = input.staging.stagedArtifactPaths.includes(dep.reference);
    return {
      ...dep,
      status: exists ? 'satisfied' : 'missing',
      reason: exists ? undefined : `Missing staged prerequisite file: ${dep.reference}`
    };
  }

  if (dep.type === 'source-asset') {
    const blocked = input.execution.unresolvedPreservationIssues.includes(dep.reference);
    return {
      ...dep,
      status: blocked ? 'blocked' : 'satisfied',
      reason: blocked ? `Preservation issue unresolved for source asset: ${dep.reference}` : undefined
    };
  }

  if (dep.type === 'review-decision') {
    const missing = input.execution.incompleteMappingDecisions.includes(dep.reference);
    return {
      ...dep,
      status: missing ? 'missing' : 'satisfied',
      reason: missing ? `Incomplete mapping decision: ${dep.reference}` : undefined
    };
  }

  const supported = input.execution.availableWriterCapabilities.includes(dep.reference);
  return {
    ...dep,
    status: supported ? 'satisfied' : 'unsupported',
    reason: supported ? undefined : `Missing writer capability: ${dep.reference}`
  };
}

function resolveReadiness(
  dependencies: WriterDependency[],
  plan: DeferredArtifactPlan,
  input: DeliveryHandoffInput
): { status: WriterReadinessStatus; blockers: string[]; reason: string } {
  const blockers = dependencies
    .filter((dep) => dep.required && dep.status !== 'satisfied')
    .map((dep) => dep.reason ?? `Dependency ${dep.id} is ${dep.status}`);

  if (input.execution.unsupportedKinds.includes(plan.kind)) {
    blockers.push(`Unsupported deferred artifact kind: ${plan.kind}`);
  }

  blockers.push(...input.execution.unresolvedFieldRecorderBlockers);

  if (input.execution.missingPrerequisitePaths.includes(plan.plannedOutputPath)) {
    blockers.push(`Missing execution prerequisite for planned output: ${plan.plannedOutputPath}`);
  }

  if (blockers.length > 0) {
    return { status: 'blocked', blockers, reason: blockers[0] };
  }

  const optionalMissing = dependencies.some((dep) => !dep.required && dep.status !== 'satisfied');
  if (optionalMissing) {
    return {
      status: 'deferred-with-known-gaps',
      blockers: [],
      reason: 'Optional dependencies are incomplete but writer contract is still usable.'
    };
  }

  const hasDeferredArtifactKinds = plan.kind === 'native-nuendo-session';
  if (hasDeferredArtifactKinds) {
    return {
      status: 'partial',
      blockers: [],
      reason: 'Native Nuendo/session writing is intentionally deferred in Phase 3C.'
    };
  }

  return { status: 'ready-for-writer', blockers: [], reason: 'All required writer inputs are satisfied.' };
}

export function generateDeliveryHandoff(input: DeliveryHandoffInput): DeliveryHandoffOutput {
  const writerInputs = input.planning.deferredArtifacts
    .map((plan) => {
      const dependencies = plan.dependencies.map((dep) => evaluateDependency(dep, input));
      const readiness = resolveReadiness(dependencies, plan, input);
      const artifactPayload = {
        kind: plan.kind,
        plannedOutputPath: plan.plannedOutputPath,
        stagedLocation: plan.stagedLocation,
        requiredWriterCapability: plan.requiredWriterCapability
      };
      const artifactId = stableId('deferred-artifact', artifactPayload);
      const payload = {
        sourceSignature: input.sourceSignature,
        reviewSignature: input.reviewSignature,
        dependencies,
        readinessStatus: readiness.status
      };

      return {
        id: stableId('writer-input', { artifactId, payload }),
        version: '3c.v1' as const,
        artifact: {
          id: artifactId,
          ...artifactPayload,
          explanation: plan.explanation
        },
        dependencies,
        sourceSignature: input.sourceSignature,
        reviewSignature: input.reviewSignature,
        blockers: readiness.blockers,
        readinessStatus: readiness.status,
        reason: readiness.reason,
        payload
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const deferredArtifacts: DeliveryHandoffArtifact[] = writerInputs.map((item) => ({
    id: item.artifact.id,
    kind: item.artifact.kind,
    readinessStatus: item.readinessStatus,
    blockers: item.blockers,
    contractId: item.id
  }));

  const unresolvedBlockers = Array.from(new Set(writerInputs.flatMap((item) => item.blockers))).sort();

  const summary: DeliveryHandoffSummary = {
    stagedArtifactCount: input.staging.stagedArtifactPaths.length,
    deferredArtifactCount: writerInputs.length,
    readyCount: writerInputs.filter((item) => item.readinessStatus === 'ready-for-writer').length,
    blockedCount: writerInputs.filter((item) => item.readinessStatus === 'blocked').length,
    partialCount: writerInputs.filter((item) => item.readinessStatus === 'partial').length,
    deferredWithKnownGapsCount: writerInputs.filter((item) => item.readinessStatus === 'deferred-with-known-gaps').length,
    unresolvedBlockers
  };

  const manifest: DeliveryHandoffManifest = {
    version: '3c.v1',
    sourceSignature: input.sourceSignature,
    reviewSignature: input.reviewSignature,
    stagedArtifacts: [...input.execution.generatedArtifactPaths].sort(),
    deferredArtifacts,
    summary
  };

  return {
    writerInputs,
    manifest,
    summary,
    handoffFiles: {
      'handoff/deferred-writer-inputs.json': stableStringify(writerInputs),
      'handoff/delivery-handoff-manifest.json': stableStringify(manifest),
      'handoff/delivery-handoff-summary.json': stableStringify(summary)
    }
  };
}
