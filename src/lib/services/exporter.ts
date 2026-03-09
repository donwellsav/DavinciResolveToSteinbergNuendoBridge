import { DeferredArtifactPlan } from './delivery-handoff.js';

export interface DeliveryPlan {
  deferredArtifacts: DeferredArtifactPlan[];
}

export function createDeliveryPlan(deferredArtifacts: DeferredArtifactPlan[]): DeliveryPlan {
  return {
    deferredArtifacts: [...deferredArtifacts]
  };
}
