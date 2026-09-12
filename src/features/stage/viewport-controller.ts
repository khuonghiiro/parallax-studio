import * as THREE from 'three';

export interface ViewportOptions {
  container: HTMLElement;
  onFpsUpdate?: (fps: number) => void;
}

export interface OverlaySettings {
  showGrid: boolean;
  showWireframe: boolean;
  showSkeleton: boolean;
  showHeatmap: boolean;
}

/**
 * Interactive controller for the Three.js viewport canvas.
 * Handles camera navigation (pan/zoom), grid rendering, and layer display.
 */
export class ViewportController {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly orthoCamera: THREE.OrthographicCamera;
  private readonly perspectiveCamera: THREE.PerspectiveCamera;
  private activeCamera: THREE.Camera;
  private cameraMode: 'orthographic' | 'perspective' = 'orthographic';
  private gridHelper: THREE.GridHelper | null = null;
  private axesHelper: THREE.AxesHelper | null = null;

  private overlays: OverlaySettings = {
    showGrid: true,
    showWireframe: false,
    showSkeleton: true,
    showHeatmap: false,
  };

  // Camera navigation & 2.5D orbit state
  private zoom: number = 1.0;
  private panOffset: THREE.Vector2 = new THREE.Vector2(0, 0);
  private orbitAngle: THREE.Vector2 = new THREE.Vector2(0, 0);
  private isPanning: boolean = false;
  private isOrbiting: boolean = false;
  private lastMousePos: THREE.Vector2 = new THREE.Vector2(0, 0);

  // Performance tracking
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private onFpsUpdate?: (fps: number) => void;
  private animFrameId: number | null = null;
  private isDisposed: boolean = false;

  // Scene content groups
  private groundGroup: THREE.Group = new THREE.Group();
  private contentGroup: THREE.Group = new THREE.Group();
  private overlayGroup: THREE.Group = new THREE.Group();
  private stagePlanesGroup: THREE.Group = new THREE.Group();

  constructor(options: ViewportOptions) {
    this.container = options.container;
    this.onFpsUpdate = options.onFpsUpdate;

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0b10, 1.0);
    this.container.appendChild(this.renderer.domElement);

    // Create scene with dedicated layers
    this.scene = new THREE.Scene();
    this.scene.add(this.groundGroup);
    this.scene.add(this.stagePlanesGroup);
    this.scene.add(this.contentGroup);
    this.scene.add(this.overlayGroup);

    // Studio 3-point lighting setup
    const ambientLight = new THREE.AmbientLight(0xd4dcff, 0.85);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
    keyLight.position.set(300, 500, 600);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6366f1, 0.65);
    rimLight.position.set(-300, 300, -200);
    this.scene.add(rimLight);

    // Create orthographic camera centered at origin
    const aspect = width / height;
    const viewSize = 1400;
    this.orthoCamera = new THREE.OrthographicCamera(
      (-viewSize * aspect) / 2,
      (viewSize * aspect) / 2,
      viewSize / 2,
      -viewSize / 2,
      0.1,
      5000,
    );
    this.orthoCamera.position.set(0, 0, 1000);
    this.orthoCamera.lookAt(0, 0, 0);

    // Create perspective camera for 2.5D multiplane parallax
    this.perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 1, 10000);
    const fovRad = (45 * Math.PI) / 180;
    const defaultDist = (1400 / 2) / Math.tan(fovRad / 2);
    this.perspectiveCamera.position.set(0, 0, defaultDist);
    this.perspectiveCamera.lookAt(0, 0, 0);

    this.activeCamera = this.orthoCamera;

    this.setupGroundShadow();
    this.setupStagePlanes();
    this.setupGrid();
    this.bindEvents();
    this.startRenderLoop();
  }

  private setupGroundShadow(): void {
    if (typeof document === 'undefined') return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const grad = ctx.createRadialGradient(128, 64, 0, 128, 64, 110);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.10)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 128);

      const shadowTex = new THREE.CanvasTexture(canvas);
      const shadowGeo = new THREE.PlaneGeometry(680, 160);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.90,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.position.set(0, -625, -0.05); // Directly anchored under character boots
      this.groundGroup.add(shadowMesh);
    } catch {}
  }

  private setupStagePlanes(): void {
    // 2.5D Reference Stage Planes: Foreground (+150), Midground (0), Background (-250)
    const planes = [
      { depth: 150, color: 0x38bdf8, opacity: 0.35, name: 'Foreground Plane' },
      { depth: 0, color: 0x818cf8, opacity: 0.45, name: 'Midground Plane' },
      { depth: -250, color: 0x64748b, opacity: 0.30, name: 'Background Plane' },
    ];

    const planeGeo = new THREE.PlaneGeometry(1800, 1100);
    const edges = new THREE.EdgesGeometry(planeGeo);

    planes.forEach(({ depth, color, opacity, name }) => {
      const lineMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
      });
      const frame = new THREE.LineSegments(edges, lineMat);
      frame.position.set(0, 0, depth);
      frame.name = name;
      this.stagePlanesGroup.add(frame);
    });

    // Hidden by default in 2D, enabled in 2.5D compose staging
    this.stagePlanesGroup.visible = false;
  }

  private setupGrid(): void {
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
    }
    const size = 2400;
    const divisions = 24;
    this.gridHelper = new THREE.GridHelper(size, divisions, 0x303650, 0x181c2c);
    this.gridHelper.rotation.x = Math.PI / 2;
    this.gridHelper.position.z = -1;
    if (this.gridHelper.material) {
      (this.gridHelper.material as THREE.Material).transparent = true;
      (this.gridHelper.material as THREE.Material).opacity = 0.35;
    }
    this.gridHelper.visible = this.overlays.showGrid;
    this.scene.add(this.gridHelper);

    this.axesHelper = new THREE.AxesHelper(60);
    this.axesHelper.position.z = -0.5;
    this.scene.add(this.axesHelper);
  }

  private bindEvents(): void {
    const el = this.renderer.domElement;
    el.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    el.addEventListener('wheel', this.handleWheel, { passive: false });
    el.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('resize', this.handleResize);
  }

  private unbindEvents(): void {
    const el = this.renderer.domElement;
    el.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    el.removeEventListener('wheel', this.handleWheel);
    el.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('resize', this.handleResize);
  }

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private handleMouseDown = (e: MouseEvent): void => {
    // Right click or Shift + Left click triggers 3D orbit tilt
    if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
      this.isOrbiting = true;
      this.lastMousePos.set(e.clientX, e.clientY);
      e.preventDefault();
    } else if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.lastMousePos.set(e.clientX, e.clientY);
      e.preventDefault();
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.isOrbiting) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.lastMousePos.set(e.clientX, e.clientY);

      this.orbitAngle.x += dx * 0.005;
      this.orbitAngle.y = Math.max(-0.65, Math.min(0.65, this.orbitAngle.y + dy * 0.005));
      this.updateCameraBounds();
      return;
    }

    if (this.isPanning) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.lastMousePos.set(e.clientX, e.clientY);

      const scale = 1 / this.zoom;
      this.panOffset.x -= dx * scale;
      this.panOffset.y += dy * scale;
      this.updateCameraBounds();
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 2 || (e.button === 0 && !e.altKey)) {
      this.isOrbiting = false;
    }
    if (e.button === 1 || e.button === 0) {
      this.isPanning = false;
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    this.setZoom(this.zoom * zoomFactor);
  };

  public setZoom(newZoom: number): void {
    this.zoom = Math.max(0.1, Math.min(10.0, newZoom));
    this.updateCameraBounds();
  }

  public resetView(): void {
    this.zoom = 1.0;
    this.panOffset.set(0, 0);
    this.orbitAngle.set(0, 0);
    this.updateCameraBounds();
  }

  public setCameraMode(mode: 'orthographic' | 'perspective'): void {
    this.cameraMode = mode;
    this.activeCamera = mode === 'perspective' ? this.perspectiveCamera : this.orthoCamera;
    this.updateCameraBounds();
  }

  public getCameraMode(): 'orthographic' | 'perspective' {
    return this.cameraMode;
  }

  public setOrbitAngle(yawDeg: number, pitchDeg: number): void {
    this.orbitAngle.set((yawDeg * Math.PI) / 180, (pitchDeg * Math.PI) / 180);
    this.updateCameraBounds();
  }

  public setShowShadows(show: boolean): void {
    this.groundGroup.visible = show;
  }

  public setStagePlanesVisible(show: boolean): void {
    this.stagePlanesGroup.visible = show;
  }

  private updateCameraBounds(): void {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    const aspect = width / height;

    if (this.cameraMode === 'orthographic') {
      const viewSize = 1400 / this.zoom;
      this.orthoCamera.left = (-viewSize * aspect) / 2 + this.panOffset.x;
      this.orthoCamera.right = (viewSize * aspect) / 2 + this.panOffset.x;
      this.orthoCamera.top = viewSize / 2 + this.panOffset.y;
      this.orthoCamera.bottom = -viewSize / 2 + this.panOffset.y;
      this.orthoCamera.position.set(this.panOffset.x, this.panOffset.y, 1000);
      this.orthoCamera.lookAt(this.panOffset.x, this.panOffset.y, 0);
      this.orthoCamera.updateProjectionMatrix();
    } else {
      this.perspectiveCamera.aspect = aspect;
      const fovRad = (45 * Math.PI) / 180;
      const dist = (1400 / 2) / Math.tan(fovRad / 2) / this.zoom;
      const yaw = this.orbitAngle.x;
      const pitch = this.orbitAngle.y;
      const camX = this.panOffset.x + dist * Math.sin(yaw) * Math.cos(pitch);
      const camY = this.panOffset.y + dist * Math.sin(pitch);
      const camZ = dist * Math.cos(yaw) * Math.cos(pitch);
      this.perspectiveCamera.position.set(camX, camY, camZ);
      this.perspectiveCamera.lookAt(this.panOffset.x, this.panOffset.y, 0);
      this.perspectiveCamera.updateProjectionMatrix();
    }
  }

  public handleResize = (): void => {
    if (this.isDisposed) return;
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    this.renderer.setSize(width, height);
    this.updateCameraBounds();
  };

  public setOverlays(overlays: Partial<OverlaySettings>): void {
    this.overlays = { ...this.overlays, ...overlays };
    if (this.gridHelper) {
      this.gridHelper.visible = this.overlays.showGrid;
    }
    this.overlayGroup.visible = this.overlays.showSkeleton;
    this.updateWireframeState();
  }

  private updateWireframeState(): void {
    this.contentGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.wireframe = this.overlays.showWireframe;
          });
        } else {
          child.material.wireframe = this.overlays.showWireframe;
        }
      }
    });
  }

  public addContent(object: THREE.Object3D): void {
    this.contentGroup.add(object);
    this.updateWireframeState();
  }

  public clearContent(): void {
    while (this.contentGroup.children.length > 0) {
      const child = this.contentGroup.children[0]!;
      this.contentGroup.remove(child);
    }
  }

  public addOverlay(object: THREE.Object3D): void {
    this.overlayGroup.add(object);
  }

  public clearOverlays(): void {
    while (this.overlayGroup.children.length > 0) {
      const child = this.overlayGroup.children[0]!;
      this.overlayGroup.remove(child);
    }
  }

  public getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.Camera {
    return this.activeCamera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public updateMeshHeatmap(colors: Float32Array | null): void {
    this.contentGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        if (colors) {
          child.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => {
                m.vertexColors = true;
                m.needsUpdate = true;
              });
            } else {
              child.material.vertexColors = true;
              child.material.needsUpdate = true;
            }
          }
        } else {
          child.geometry.deleteAttribute('color');
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => {
                m.vertexColors = false;
                m.needsUpdate = true;
              });
            } else {
              child.material.vertexColors = false;
              child.material.needsUpdate = true;
            }
          }
        }
      }
    });
  }

  public clientToWorld(clientX: number, clientY: number): THREE.Vector2 {
    const rect = this.container.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / (rect.width || 800)) * 2 - 1;
    const ndcY = -((clientY - rect.top) / (rect.height || 600)) * 2 + 1;

    if (this.cameraMode === 'orthographic') {
      const width = rect.width || 800;
      const height = rect.height || 600;
      const aspect = width / height;
      const viewSize = 1400 / this.zoom;
      const worldX = (ndcX * (viewSize * aspect)) / 2 + this.panOffset.x;
      const worldY = (ndcY * viewSize) / 2 + this.panOffset.y;
      return new THREE.Vector2(worldX, worldY);
    }

    const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(this.perspectiveCamera);
    const dir = vec.sub(this.perspectiveCamera.position).normalize();
    const dist = -this.perspectiveCamera.position.z / (dir.z || 0.0001);
    const hit = this.perspectiveCamera.position.clone().add(dir.multiplyScalar(dist));
    return new THREE.Vector2(hit.x, hit.y);
  }

  private startRenderLoop(): void {
    const loop = (timestamp: number): void => {
      if (this.isDisposed) return;

      this.renderer.render(this.scene, this.activeCamera);
      this.frameCount++;

      if (timestamp - this.lastFpsTime >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsTime));
        this.frameCount = 0;
        this.lastFpsTime = timestamp;
        this.onFpsUpdate?.(fps);
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public dispose(): void {
    this.isDisposed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.unbindEvents();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
