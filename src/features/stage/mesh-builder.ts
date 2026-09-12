import * as THREE from 'three';
import {
  createSkeleton,
  createSkinnedMesh,
  createStaticMesh,
  type SkinWeightData,
} from '@parallax/runtime';
import type { AssetData } from '@parallax/application';

export interface BuiltMeshResult {
  mesh: THREE.Mesh | THREE.SkinnedMesh | THREE.Group;
  skeleton: THREE.Skeleton | null;
  skeletonHelper: THREE.SkeletonHelper | null;
}

/**
 * Builds Three.js mesh and skeleton objects from Parallax AssetData.
 */
export function buildAssetMesh(asset: AssetData): Promise<BuiltMeshResult> {
  return new Promise((resolve) => {
    if (asset.layers && asset.layers.length > 0 && asset.skeleton) {
      buildDecomposedLayerMesh(asset, resolve);
      return;
    }

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
    textureLoader.load(
      asset.imageDataUrl,
      (texture) => {
        const finalTexture = processTexture(texture);
        finalTexture.colorSpace = THREE.SRGBColorSpace;
        finalTexture.minFilter = THREE.LinearFilter;
        finalTexture.magFilter = THREE.LinearFilter;

        if (asset.skeleton && asset.weights) {
          const skeleton = createSkeleton(asset.skeleton);
          const skinWeightData = convertWeightsToSkinData(
            asset.weights,
            asset.skeleton.bones,
          );
          const skinnedMesh = createSkinnedMesh(
            asset.mesh!,
            finalTexture,
            skeleton,
            skinWeightData,
          );
          const skeletonHelper = new THREE.SkeletonHelper(skinnedMesh);

          resolve({
            mesh: skinnedMesh,
            skeleton,
            skeletonHelper,
          });
        } else {
          const staticMesh = createStaticMesh(asset.mesh!, finalTexture);
          resolve({
            mesh: staticMesh,
            skeleton: null,
            skeletonHelper: null,
          });
        }
      },
      undefined,
      () => {
        // Fallback if texture loading fails (e.g. dataUrl parse)
        const fallbackTex = new THREE.DataTexture(
          new Uint8Array([99, 128, 255, 255]),
          1,
          1,
          THREE.RGBAFormat,
        );
        fallbackTex.needsUpdate = true;
        if (asset.skeleton && asset.weights) {
          const skeleton = createSkeleton(asset.skeleton);
          const skinWeightData = convertWeightsToSkinData(
            asset.weights,
            asset.skeleton.bones,
          );
          const skinnedMesh = createSkinnedMesh(
            asset.mesh!,
            fallbackTex,
            skeleton,
            skinWeightData,
          );
          const skeletonHelper = new THREE.SkeletonHelper(skinnedMesh);
          resolve({
            mesh: skinnedMesh,
            skeleton,
            skeletonHelper,
          });
        } else {
          const staticMesh = createStaticMesh(asset.mesh!, fallbackTex);
          resolve({
            mesh: staticMesh,
            skeleton: null,
            skeletonHelper: null,
          });
        }
      },
    );
  });
}

function buildDecomposedLayerMesh(
  asset: AssetData,
  resolve: (res: BuiltMeshResult) => void,
): void {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    asset.imageDataUrl,
    async (masterTexture) => {
      const finalMaster = processTexture(masterTexture);
      finalMaster.colorSpace = THREE.SRGBColorSpace;
      finalMaster.minFilter = THREE.LinearFilter;
      finalMaster.magFilter = THREE.LinearFilter;

      const skeleton = createSkeleton(asset.skeleton!);
      const group = new THREE.Group();
      group.name = asset.name || 'cutout_character';

      for (const bone of skeleton.bones) {
        if (bone.parent === null) {
          group.add(bone);
        }
      }

      const boneMap = new Map<string, THREE.Bone>();
      skeleton.bones.forEach((b) => boneMap.set(b.name, b));
      const boneDefMap = new Map<string, (typeof asset.skeleton)!.bones[number]>();
      asset.skeleton!.bones.forEach((b) => boneDefMap.set(b.name, b));

      const sortedLayers = [...(asset.layers || [])].sort(
        (a, b) => (a.drawOrder ?? 0) - (b.drawOrder ?? 0),
      );

      for (const layer of sortedLayers) {
        const w = layer.dimensions.width;
        const h = layer.dimensions.height;
        const planeGeo = new THREE.PlaneGeometry(w, h);

        if (layer.uvBounds) {
          const { uMin, vMin, uMax, vMax } = layer.uvBounds;
          const uvs = new Float32Array([
            uMin, vMax,
            uMax, vMax,
            uMin, vMin,
            uMax, vMin,
          ]);
          planeGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        }

        let layerTexture = finalMaster;
        if (layer.imageDataUrl) {
          layerTexture = await loadTextureAsync(layer.imageDataUrl);
        }

        const mat = new THREE.MeshBasicMaterial({
          map: layerTexture,
          transparent: true,
          opacity: layer.opacity ?? 1.0,
          alphaTest: 0.05,
          depthWrite: true,
          side: THREE.DoubleSide,
        });

        const layerMesh = new THREE.Mesh(planeGeo, mat);
        layerMesh.name = layer.name;
        layerMesh.renderOrder = layer.drawOrder ?? 0;
        layerMesh.visible = layer.visible !== false;

        const zOffset = (layer.drawOrder ?? 0) * 0.1;

        if (layer.bindBoneName && boneMap.has(layer.bindBoneName)) {
          const targetBone = boneMap.get(layer.bindBoneName)!;
          const boneDef = boneDefMap.get(layer.bindBoneName);
          if (layer.position && boneDef) {
            const offsetX = layer.position.x - boneDef.head.x;
            const offsetY = layer.position.y - boneDef.head.y;
            layerMesh.position.set(offsetX, offsetY, zOffset);
          } else {
            layerMesh.position.set(0, 0, zOffset);
          }
          targetBone.add(layerMesh);
        } else {
          const posX = layer.position?.x ?? 0;
          const posY = layer.position?.y ?? 0;
          layerMesh.position.set(posX, posY, zOffset);
          group.add(layerMesh);
        }
      }

      const skeletonHelper = new THREE.SkeletonHelper(group);
      resolve({
        mesh: group,
        skeleton,
        skeletonHelper,
      });
    },
    undefined,
    () => {
      resolve({
        mesh: new THREE.Group(),
        skeleton: null,
        skeletonHelper: null,
      });
    },
  );
}

function loadTextureAsync(url: string): Promise<THREE.Texture> {
  return new Promise((res) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        res(t);
      },
      undefined,
      () => {
        const fb = new THREE.DataTexture(
          new Uint8Array([255, 255, 255, 255]),
          1,
          1,
          THREE.RGBAFormat,
        );
        fb.needsUpdate = true;
        res(fb);
      },
    );
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

/**
 * Automatically detects solid white backgrounds and turns them transparent
 * using edge-connected flood fill, preserving interior specular highlights.
 */
function processTexture(tex: THREE.Texture): THREE.Texture {
  if (typeof document === 'undefined' || !tex.image) return tex;
  try {
    const img = tex.image as HTMLImageElement;
    const w = img.width || (img as any).videoWidth || 512;
    const h = img.height || (img as any).videoHeight || 768;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return tex;

    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Check top-left corner pixel (solid background)
    const isWhiteBg = data[0]! > 235 && data[1]! > 235 && data[2]! > 235;
    if (isWhiteBg) {
      const visited = new Uint8Array(w * h);
      const queue = new Int32Array(w * h);
      let qHead = 0;
      let qTail = 0;

      const isBg = (idx: number) => {
        const pi = idx * 4;
        return data[pi]! > 230 && data[pi + 1]! > 230 && data[pi + 2]! > 230;
      };

      // Seed all 4 border edges
      for (let x = 0; x < w; x++) {
        const top = x;
        const bot = (h - 1) * w + x;
        if (isBg(top) && !visited[top]) {
          visited[top] = 1;
          queue[qTail++] = top;
        }
        if (isBg(bot) && !visited[bot]) {
          visited[bot] = 1;
          queue[qTail++] = bot;
        }
      }
      for (let y = 0; y < h; y++) {
        const left = y * w;
        const right = y * w + (w - 1);
        if (isBg(left) && !visited[left]) {
          visited[left] = 1;
          queue[qTail++] = left;
        }
        if (isBg(right) && !visited[right]) {
          visited[right] = 1;
          queue[qTail++] = right;
        }
      }

      // BFS outwards only
      while (qHead < qTail) {
        const curr = queue[qHead++]!;
        data[curr * 4 + 3] = 0; // set alpha to transparent

        const cx = curr % w;
        const cy = (curr / w) | 0;

        if (cx > 0) {
          const n = curr - 1;
          if (!visited[n] && isBg(n)) {
            visited[n] = 1;
            queue[qTail++] = n;
          }
        }
        if (cx < w - 1) {
          const n = curr + 1;
          if (!visited[n] && isBg(n)) {
            visited[n] = 1;
            queue[qTail++] = n;
          }
        }
        if (cy > 0) {
          const n = curr - w;
          if (!visited[n] && isBg(n)) {
            visited[n] = 1;
            queue[qTail++] = n;
          }
        }
        if (cy < h - 1) {
          const n = curr + w;
          if (!visited[n] && isBg(n)) {
            visited[n] = 1;
            queue[qTail++] = n;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const canvasTex = new THREE.CanvasTexture(canvas);
      return canvasTex;
    }
  } catch {}
  return tex;
}
