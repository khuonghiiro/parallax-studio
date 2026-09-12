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
  private readonly camera: THREE.OrthographicCamera;
  private gridHelper: THREE.GridHelper | null = null;
  private axesHelper: THREE.AxesHelper | null = null;

  private overlays: OverlaySettings = {
    showGrid: true,
    showWireframe: false,
    showSkeleton: true,
    showHeatmap: false,
  };

  // Camera state
  private zoom: number = 1.0;
  private panOffset: THREE.Vector2 = new THREE.Vector2(0, 0);
  private isPanning: boolean = false;
  private lastMousePos: THREE.Vector2 = new THREE.Vector2(0, 0);

  // Performance tracking
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private onFpsUpdate?: (fps: number) => void;
  private animFrameId: number | null = null;
  private isDisposed: boolean = false;

  // Scene content group
  private groundGroup: THREE.Group = new THREE.Group();
  private contentGroup: THREE.Group = new THREE.Group();
  private overlayGroup: THREE.Group = new THREE.Group();

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
    this.camera = new THREE.OrthographicCamera(
      (-viewSize * aspect) / 2,
      (viewSize * aspect) / 2,
      viewSize / 2,
      -viewSize / 2,
      0.1,
      2000,
    );
    this.camera.position.set(0, 0, 1000);
    this.camera.lookAt(0, 0, 0);

    this.setupGroundShadow();
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

  private setupGrid(): void {
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
    }
    // High-end subtle studio grid (softened to prevent birdcage visual distraction)
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
    window.addEventListener('resize', this.handleResize);
  }

  private unbindEvents(): void {
    const el = this.renderer.domElement;
    el.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    el.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('resize', this.handleResize);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    // Middle click or Alt+Left click triggers pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.lastMousePos.set(e.clientX, e.clientY);
      e.preventDefault();
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isPanning) return;

    const dx = e.clientX - this.lastMousePos.x;
    const dy = e.clientY - this.lastMousePos.y;
    this.lastMousePos.set(e.clientX, e.clientY);

    // Pan camera in world coordinates
    const scale = 1 / this.zoom;
    this.panOffset.x -= dx * scale;
    this.panOffset.y += dy * scale;

    this.updateCameraBounds();
  };

  private handleMouseUp = (e: MouseEvent): void => {
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
    this.updateCameraBounds();
  }

  private updateCameraBounds(): void {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    const aspect = width / height;
    const viewSize = 1400 / this.zoom;

    this.camera.left = (-viewSize * aspect) / 2 + this.panOffset.x;
    this.camera.right = (viewSize * aspect) / 2 + this.panOffset.x;
    this.camera.top = viewSize / 2 + this.panOffset.y;
    this.camera.bottom = -viewSize / 2 + this.panOffset.y;
    this.camera.updateProjectionMatrix();
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
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Update or remove heatmap vertex colors on the active mesh.
   */
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

  /**
   * Convert client window coordinates (e.g. from mouse event) to world 2D coordinates.
   */
  public clientToWorld(clientX: number, clientY: number): THREE.Vector2 {
    const rect = this.container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const width = rect.width || 800;
    const height = rect.height || 600;
    const aspect = width / height;
    const viewSize = 800 / this.zoom;

    const worldX = (x / width - 0.5) * (viewSize * aspect) + this.panOffset.x;
    const worldY = -(y / height - 0.5) * viewSize + this.panOffset.y;

    return new THREE.Vector2(worldX, worldY);
  }

  private startRenderLoop(): void {
    const loop = (timestamp: number): void => {
      if (this.isDisposed) return;

      this.renderer.render(this.scene, this.camera);
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
