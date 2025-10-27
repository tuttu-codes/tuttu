import type { MapStore } from 'nanostores';
import type { ArtifactState } from './workbench.client';
import { type PartId } from 'tuttu-agent/partId.js';

export type { PartId };

export type Artifacts = MapStore<Record<PartId, ArtifactState>>;
