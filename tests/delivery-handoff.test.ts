import { describe, expect, it } from 'vitest';
import { DeliveryHandoffInput, generateDeliveryHandoff } from '../src/lib/services/delivery-handoff.js';

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
          kind: 'nuendo-ready-aaf' as const,
          plannedOutputPath: 'deferred/nuendo/project.aaf',
          stagedLocation: 'handoff/nuendo/project.aaf.contract.json',
          requiredWriterCapability: 'writer.nuendo.aaf',
          explanation: 'AAF is deferred to external writer.',
          dependencies: [
            {
              id: 'safe-edl',
              type: 'staged-artifact' as const,
              reference: 'staged/edl/master.edl',
              required: true
            },
            {
              id: 'mapping-dialogue',
              type: 'review-decision' as const,
              reference: 'map.dialogue.bus',
              required: true
            },
            {
              id: 'writer-capability',
              type: 'capability' as const,
              reference: 'writer.nuendo.aaf',
              required: true
            }
          ]
        },
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
      availableWriterCapabilities: ['writer.nuendo.aaf']
    },
    staging: {
      stagedArtifactPaths: ['staged/README.md', 'staged/edl/master.edl']
    }
  };
}

describe('generateDeliveryHandoff', () => {
  it('is deterministic for writer contract generation and manifest output', () => {
    const input = baseInput();
    const first = generateDeliveryHandoff(input);
    const second = generateDeliveryHandoff(input);

    expect(first.handoffFiles).toEqual(second.handoffFiles);
    expect(first.writerInputs.map((item) => item.id)).toEqual(second.writerInputs.map((item) => item.id));
  });

  it('marks blocked artifacts when dependencies are unresolved', () => {
    const input = baseInput();
    input.execution.incompleteMappingDecisions = ['map.dialogue.bus'];
    const output = generateDeliveryHandoff(input);

    expect(output.writerInputs.find((item) => item.artifact.kind === 'nuendo-ready-aaf')?.readinessStatus).toBe('blocked');
    expect(output.summary.blockedCount).toBeGreaterThan(0);
  });

  it('captures saved review-state influence in contract payloads', () => {
    const input = baseInput();
    const output = generateDeliveryHandoff(input);

    expect(output.writerInputs[0].reviewSignature.reviewStateRevision).toBe('rev-4');
    expect(output.manifest.reviewSignature.reviewStateSignature).toBe('review-sig');
  });

  it('serializes versioned contracts and keeps staging consistency', () => {
    const input = baseInput();
    const output = generateDeliveryHandoff(input);

    expect(output.writerInputs.every((item) => item.version === '3c.v1')).toBe(true);
    expect(output.manifest.stagedArtifacts).toEqual(['staged/README.md', 'staged/edl/master.edl']);
    expect(output.handoffFiles['handoff/delivery-handoff-manifest.json']).toContain('"version":"3c.v1"');
  });
});
