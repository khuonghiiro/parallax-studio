import * as THREE from 'three';
import type { Camera } from '@parallax/contracts';

/**
 * Create or update a Three.js camera from a Parallax Camera schema.
 * Supports orthographic and perspective projections.
 */
export function createCamera(
  cameraData: Camera,
): THREE.OrthographicCamera | THREE.PerspectiveCamera {
  if (cameraData.projection === 'orthographic') {
    return createOrthographicCamera(cameraData);
  }

  return createPerspectiveCamera(cameraData);
}

/**
 * Create an orthographic camera for consistent 2D appearance.
 */
function createOrthographicCamera(
  data: Camera,
): THREE.OrthographicCamera {
  const halfWidth = (data.viewport.width / 2) / data.zoom;
  const halfHeight = (data.viewport.height / 2) / data.zoom;

  const camera = new THREE.OrthographicCamera(
    -halfWidth,
    halfWidth,
    halfHeight,
    -halfHeight,
    0.1,
    10000,
  );

  camera.name = data.name;
  camera.position.set(data.position.x, data.position.y, 1000);
  camera.rotation.z = data.rotation;
  camera.lookAt(data.position.x, data.position.y, 0);

  return camera;
}

/**
 * Create a perspective camera for parallax depth effects.
 */
function createPerspectiveCamera(
  data: Camera,
): THREE.PerspectiveCamera {
  const aspect = data.viewport.width / data.viewport.height;

  const camera = new THREE.PerspectiveCamera(
    data.fov,
    aspect,
    0.1,
    10000,
  );

  camera.name = data.name;
  camera.position.set(
    data.position.x,
    data.position.y,
    data.focalDepth + 500 / data.zoom,
  );
  camera.rotation.z = data.rotation;
  camera.lookAt(data.position.x, data.position.y, data.focalDepth);

  return camera;
}

/**
 * Update an existing camera's properties without creating a new one.
 */
export function updateCamera(
  camera: THREE.Camera,
  data: Camera,
): void {
  camera.name = data.name;
  camera.position.set(data.position.x, data.position.y, camera.position.z);
  camera.rotation.z = data.rotation;

  if (camera instanceof THREE.OrthographicCamera) {
    const halfWidth = (data.viewport.width / 2) / data.zoom;
    const halfHeight = (data.viewport.height / 2) / data.zoom;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }

  if (camera instanceof THREE.PerspectiveCamera) {
    camera.fov = data.fov;
    camera.aspect = data.viewport.width / data.viewport.height;
    camera.updateProjectionMatrix();
  }
}
