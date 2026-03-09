export interface DeliveryExecutionPrep {
  generatedArtifactPaths: string[];
  missingPrerequisitePaths: string[];
}

export function prepareDeliveryExecutionPayload(paths: string[], missing: string[] = []): DeliveryExecutionPrep {
  return {
    generatedArtifactPaths: [...paths].sort(),
    missingPrerequisitePaths: [...missing].sort()
  };
}
