export interface StagedDeliveryBundle {
  stagedArtifactPaths: string[];
  bundleRoot: string;
}

export function materializeStagedDeliveryBundle(paths: string[], bundleRoot: string): StagedDeliveryBundle {
  return {
    stagedArtifactPaths: [...paths].sort(),
    bundleRoot
  };
}
