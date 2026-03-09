import { describe, expect, it } from 'vitest';
import { generateDeliveryHandoff, DeliveryHandoffInput } from '../src/lib/services/delivery-handoff.js';
import { materializeStagedDeliveryBundle } from '../src/lib/services/delivery-staging.js';
import { buildExternalExecutionPackage } from '../src/lib/services/external-execution-package.js';
import { buildExportJobDetailViewModel } from '../src/lib/ui/export-job-detail.js';

function baseInput(): DeliveryHandoffInput {
  return {
    sourceSignature: {
      intakeSignature: 'intake-abc',
      canonicalSignature: 'canonical-xyz',
      packageVersion: '3.0.0',
      packageSignature: 'pkg-sig'
    },
    reviewSignature: {
      reviewStateRevision: 'rev-4',
      reviewStateSignature: 'review-sig'
    },
    planning: {
      deferredArtifacts: [
        {
          kind: 'native-nuendo-session' as const,
          plannedOutputPath: 'deferred/nuendo/project.npr',
          stagedLocation: 'handoff/nuendo/project.npr.contract.json',
          requiredWriterCapability: 'writer.nuendo.native-session',
          explanation: 'Native session writer intentionally deferred.',
          dependencies: [
            {
              id: 'writer-capability-native',
              type: 'capability' as const,
              reference: 'writer.nuendo.native-session',
              required: false
            }
          ]
        }
      ]
    },
    execution: {
      generatedArtifactPaths: ['staged/README.md', 'staged/edl/master.edl'],
      missingPrerequisitePaths: [],
      unresolvedPreservationIssues: [],
      unresolvedFieldRecorderBlockers: [],
      incompleteMappingDecisions: [],
      unsupportedKinds: [],
      availableWriterCapabilities: []
    },
    staging: {
      stagedArtifactPaths: ['staged/README.md', 'staged/edl/master.edl']
    }
  };
}

describe('buildExternalExecutionPackage', () => {
  it('builds deterministic package manifests, indexes and checksums', () => {
    const handoff = generateDeliveryHandoff(baseInput());
    const stagedBundle = materializeStagedDeliveryBundle(['staged/edl/master.edl', 'staged/README.md'], 'bundle-root');
    const stagedFileContents = {
      'staged/README.md': 'staged readme',
      'staged/edl/master.edl': 'TITLE: MASTER'
    };

    const first = buildExternalExecutionPackage({ rootLabel: 'job-001', stagedBundle, stagedFileContents, handoff });
    const second = buildExternalExecutionPackage({ rootLabel: 'job-001', stagedBundle, stagedFileContents, handoff });

    expect(first.manifest).toEqual(second.manifest);
    expect(first.index).toEqual(second.index);
    expect(first.checksums).toEqual(second.checksums);
    expect(Object.keys(first.files)).toEqual([
      'package/external-execution-manifest.json',
      'package/external-execution-index.json',
      'package/external-execution-summary.json',
      'package/checksums.json',
      'package/deferred-writer-inputs.json',
      'package/generated-artifact-index.json'
    ]);
  });

  it('reports partial status for deferred contract-only artifacts and includes review/source signatures', () => {
    const input = baseInput();
    const handoff = generateDeliveryHandoff(input);
    const stagedBundle = materializeStagedDeliveryBundle(input.staging.stagedArtifactPaths, 'bundle-root');
    const pkg = buildExternalExecutionPackage({
      rootLabel: 'job-002',
      stagedBundle,
      stagedFileContents: {
        'staged/README.md': 'staged readme',
        'staged/edl/master.edl': 'TITLE: MASTER'
      },
      handoff
    });

    expect(pkg.manifest.status).toBe('partial');
    expect(pkg.summary.sourceSignature).toBe('pkg-sig');
    expect(pkg.summary.reviewSignature).toBe('review-sig');
    expect(pkg.index.deferred[0].classification).toBe('deferred');
  });

  it('reports blocked status when staged payload content is missing', () => {
    const input = baseInput();
    const handoff = generateDeliveryHandoff(input);
    const stagedBundle = materializeStagedDeliveryBundle(input.staging.stagedArtifactPaths, 'bundle-root');
    const pkg = buildExternalExecutionPackage({
      rootLabel: 'job-003',
      stagedBundle,
      stagedFileContents: {
        'staged/README.md': 'staged readme'
      },
      handoff
    });

    expect(pkg.manifest.status).toBe('blocked');
    expect(pkg.summary.blockedDependencies.some((reason) => reason.includes('Missing generated payload content'))).toBe(true);
  });

  it('keeps export detail view-model stable while exposing package fields', () => {
    const handoff = generateDeliveryHandoff(baseInput());
    const stagedBundle = materializeStagedDeliveryBundle(['staged/README.md', 'staged/edl/master.edl'], 'bundle-root');
    const pkg = buildExternalExecutionPackage({
      rootLabel: 'job-004',
      stagedBundle,
      stagedFileContents: {
        'staged/README.md': 'staged readme',
        'staged/edl/master.edl': 'TITLE: MASTER'
      },
      handoff
    });

    const detail = buildExportJobDetailViewModel(handoff, pkg);
    expect(detail.externalPackage?.status).toBe('partial');
    expect(detail.externalPackage?.generatedEntries.length).toBeGreaterThan(0);
    expect(Object.keys(detail.externalPackage?.checksums ?? {}).length).toBeGreaterThan(0);
  });
});
