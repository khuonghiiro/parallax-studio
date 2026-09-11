import * as THREE from 'three';
import {
  createSkeleton,
  createSkinnedMesh,
  createStaticMesh,
  type SkinWeightData,
} from '@parallax/runtime';
import type { AssetData } from '@parallax/application';

export interface BuiltMeshResult {
  mesh: THREE.Mesh | THREE.SkinnedMesh;
  skeleton: THREE.Skeleton | null;
  skeletonHelper: THREE.SkeletonHelper | null;
}

/**
 * Builds Three.js mesh and skeleton objects from Parallax AssetData.
 */
export function buildAssetMesh(asset: AssetData): Promise<BuiltMeshResult> {
  return new Promise((resolve) => {
    if (!asset.mesh) {
      const dummyGeo = new THREE.PlaneGeometry(asset.dimensions.width, asset.dimensions.height);
      const dummyMat = new THREE.MeshBasicMaterial({ color: 0x6380ff, wireframe: true });
      resolve({
        mesh: new THREE.Mesh(dummyGeo, dummyMat),
        skeleton: null,
        skeletonHelper: null,
      });
      return;
    }

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(asset.imageDataUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      if (asset.skeleton && asset.weights) {
        const skeleton = createSkeleton(asset.skeleton);
        const skinWeightData = convertWeightsToSkinData(asset.weights, asset.skeleton.bones);
        const skinnedMesh = createSkinnedMesh(asset.mesh!, texture, skeleton, skinWeightData);
        const skeletonHelper = new THREE.SkeletonHelper(skinnedMesh);

        resolve({
          mesh: skinnedMesh,
          skeleton,
          skeletonHelper,
        });
      } else {
        const staticMesh = createStaticMesh(asset.mesh!, texture);
        resolve({
          mesh: staticMesh,
          skeleton: null,
          skeletonHelper: null,
        });
      }
    });
  });
}

type VertexWeightInput = {
  readonly vertexIndex: number;
  readonly influences: readonly { boneId: string; weight: number }[];
};

function convertWeightsToSkinData(
  weights: readonly VertexWeightInput[],
  bones: readonly { readonly id: string }[],
): SkinWeightData {
  const boneIndexMap = new Map<string, number>();
  bones.forEach((b, idx) => boneIndexMap.set(b.id, idx));

  const vertexCount = weights.length;
  const skinIndices: number[] = new Array(vertexCount * 4).fill(0);
  const skinWeights: number[] = new Array(vertexCount * 4).fill(0);

  for (let vi = 0; vi < vertexCount; vi++) {
    const vw = weights[vi];
    if (!vw) continue;

    const infls = vw.influences.slice(0, 4);
    for (let infIdx = 0; infIdx < infls.length; infIdx++) {
      const inf = infls[infIdx]!;
      const boneIdx = boneIndexMap.get(inf.boneId) ?? 0;
      skinIndices[vi * 4 + infIdx] = boneIdx;
      skinWeights[vi * 4 + infIdx] = inf.weight;
    }
  }

  return { skinIndices, skinWeights };
}
