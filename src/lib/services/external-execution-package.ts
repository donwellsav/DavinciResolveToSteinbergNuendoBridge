import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, posix as pathPosix } from 'node:path';
import { DeliveryHandoffOutput } from './delivery-handoff.js';
import { StagedDeliveryBundle } from './delivery-staging.js';
import {
  ExternalExecutionChecksum,
  ExternalExecutionDeferredInput,
  ExternalExecutionEntry,
  ExternalExecutionIndex,
  ExternalExecutionManifest,
  ExternalExecutionPackage,
  ExternalExecutionStatus
} from '../types/external-execution-package.js';
import { stableId, stableStringify } from '../types/delivery-handoff.js';

export interface ExternalExecutionPackageInput {
  rootLabel: string;
  stagedBundle: StagedDeliveryBundle;
  stagedFileContents: Record<string, string>;
  handoff: DeliveryHandoffOutput;
}

function sha256(content: string): ExternalExecutionChecksum {
  return {
    algorithm: 'sha256',
    value: createHash('sha256').update(content).digest('hex')
  };
}

function classifyStatus(input: ExternalExecutionPackageInput): { status: ExternalExecutionStatus; reason: string; blockers: string[] } {
  const blockers = new Set<string>();

  if (input.handoff.summary.blockedCount > 0) {
    input.handoff.summary.unresolvedBlockers.forEach((item) => blockers.add(item));
  }

  input.handoff.writerInputs.forEach((writerInput) => {
    if (writerInput.readinessStatus === 'blocked') {
      writerInput.blockers.forEach((item) => blockers.add(item));
    }
  });

  for (const stagedPath of input.stagedBundle.stagedArtifactPaths) {
    if (!(stagedPath in input.stagedFileContents)) {
      blockers.add(`Missing generated payload content: ${stagedPath}`);
    }
  }

  if (blockers.size > 0) {
    return { status: 'blocked', reason: Array.from(blockers).sort()[0], blockers: Array.from(blockers).sort() };
  }

  const hasPartial =
    input.handoff.summary.partialCount > 0 || input.handoff.summary.deferredWithKnownGapsCount > 0 || input.handoff.writerInputs.length > 0;

  if (hasPartial) {
    return {
      status: 'partial',
      reason: 'Generated artifacts are packaged, while deferred writer artifacts remain contract-only for external execution.',
      blockers: []
    };
  }

  return { status: 'ready', reason: 'All package members are generated and available for external execution.', blockers: [] };
}

export function buildExternalExecutionPackage(input: ExternalExecutionPackageInput): ExternalExecutionPackage {
  const handoffFiles = Object.entries(input.handoff.handoffFiles).sort(([a], [b]) => a.localeCompare(b));
  const stagedFiles = Object.entries(input.stagedFileContents).sort(([a], [b]) => a.localeCompare(b));

  const generatedEntries: ExternalExecutionEntry[] = [];
  const checksums: Record<string, ExternalExecutionChecksum> = {};

  stagedFiles.forEach(([relativePath, content]) => {
    const checksum = sha256(content);
    checksums[relativePath] = checksum;
    generatedEntries.push({
      id: stableId('package-entry', { relativePath, kind: 'generated-staged-artifact' }),
      relativePath,
      kind: 'generated-staged-artifact',
      classification: 'generated',
      status: 'ready',
      sizeBytes: Buffer.byteLength(content, 'utf8'),
      checksum
    });
  });

  handoffFiles.forEach(([relativePath, content]) => {
    const checksum = sha256(content);
    checksums[relativePath] = checksum;
    generatedEntries.push({
      id: stableId('package-entry', { relativePath, kind: 'generated-handoff-artifact' }),
      relativePath,
      kind: 'generated-handoff-artifact',
      classification: 'generated',
      status: 'ready',
      sizeBytes: Buffer.byteLength(content, 'utf8'),
      checksum
    });
  });

  const deferredInputs: ExternalExecutionDeferredInput[] = input.handoff.writerInputs
    .map((item) => ({
      contractId: item.id,
      artifactId: item.artifact.id,
      kind: item.artifact.kind,
      plannedOutputPath: item.artifact.plannedOutputPath,
      stagedLocation: item.artifact.stagedLocation,
      readinessStatus: item.readinessStatus,
      reason: item.reason,
      blockers: [...item.blockers].sort()
    }))
    .sort((a, b) => a.contractId.localeCompare(b.contractId));

  const deferredEntries: ExternalExecutionEntry[] = deferredInputs.map((item) => ({
    id: stableId('package-entry', { contractId: item.contractId, path: item.plannedOutputPath }),
    relativePath: item.plannedOutputPath,
    kind: 'deferred-writer-contract',
    classification: 'deferred',
    status: item.readinessStatus === 'blocked' ? 'blocked' : 'partial',
    reason: item.reason
  }));

  const readiness = classifyStatus(input);

  const manifest: ExternalExecutionManifest = {
    id: stableId('external-package', {
      rootLabel: input.rootLabel,
      source: input.handoff.manifest.sourceSignature,
      review: input.handoff.manifest.reviewSignature,
      staged: input.stagedBundle.stagedArtifactPaths,
      handoffFiles: handoffFiles.map(([path]) => path)
    }),
    version: '3d.v1',
    status: readiness.status,
    reason: readiness.reason,
    sourceSignature: input.handoff.manifest.sourceSignature,
    reviewSignature: input.handoff.manifest.reviewSignature,
    generatedCount: generatedEntries.length,
    deferredCount: deferredEntries.length,
    blockedCount: deferredEntries.filter((item) => item.status === 'blocked').length,
    partialCount: deferredEntries.filter((item) => item.status === 'partial').length
  };

  const index: ExternalExecutionIndex = {
    generated: generatedEntries.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    deferred: deferredEntries.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  };

  const packageFiles: Record<string, string> = {
    'package/external-execution-manifest.json': stableStringify(manifest),
    'package/external-execution-index.json': stableStringify(index),
    'package/external-execution-summary.json': stableStringify({
      sourceSignature: input.handoff.manifest.sourceSignature,
      reviewSignature: input.handoff.manifest.reviewSignature,
      status: manifest.status,
      reason: manifest.reason,
      blockedDependencies: readiness.blockers
    }),
    'package/checksums.json': stableStringify(checksums),
    'package/deferred-writer-inputs.json': stableStringify(deferredInputs),
    'package/generated-artifact-index.json': stableStringify(index.generated)
  };

  return {
    rootLabel: input.rootLabel,
    manifest,
    index,
    deferredInputs,
    checksums,
    files: packageFiles,
    summary: {
      sourceSignature: input.handoff.manifest.sourceSignature.packageSignature,
      reviewSignature: input.handoff.manifest.reviewSignature.reviewStateSignature,
      status: manifest.status,
      reason: manifest.reason,
      generatedPaths: index.generated.map((item) => item.relativePath),
      deferredPaths: index.deferred.map((item) => item.relativePath),
      blockedDependencies: readiness.blockers
    }
  };
}

export async function writeExternalExecutionPackageToDisk(
  outputRoot: string,
  pkg: ExternalExecutionPackage,
  stagedFileContents: Record<string, string>,
  handoffFiles: Record<string, string>
): Promise<string[]> {
  const root = pathPosix.join(outputRoot, pkg.rootLabel);
  const writes: Array<[string, string]> = [
    ...Object.entries(stagedFileContents),
    ...Object.entries(handoffFiles),
    ...Object.entries(pkg.files)
  ].sort(([a], [b]) => a.localeCompare(b));

  for (const [relativePath, content] of writes) {
    const absolutePath = pathPosix.join(root, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');
  }

  return writes.map(([relativePath]) => pathPosix.join(root, relativePath));
}
