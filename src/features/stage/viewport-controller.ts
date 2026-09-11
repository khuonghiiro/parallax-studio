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
    this.renderer.setClearColor(0x1a1a24, 1.0);
    this.container.appendChild(this.renderer.domElement);

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.add(this.contentGroup);
    this.scene.add(this.overlayGroup);

    // Setup ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    // Setup directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(200, 400, 500);
    this.scene.add(dirLight);

    // Create orthographic camera centered at origin
    const aspect = width / height;
    const viewSize = 800;
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

    this.setupGrid();
    this.bindEvents();
    this.startRenderLoop();
  }

  private setupGrid(): void {
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
    }
    // 2D grid in XY plane rotated from XZ
    const size = 2000;
    const divisions = 40;
    this.gridHelper = new THREE.GridHelper(size, divisions, 0x3a3a50, 0x272736);
    this.gridHelper.rotation.x = Math.PI / 2;
    this.gridHelper.position.z = -1;
    this.gridHelper.visible = this.overlays.showGrid;
    this.scene.add(this.gridHelper);

    this.axesHelper = new THREE.AxesHelper(100);
    this.axesHelper.position.z = 0;
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
    const viewSize = 800 / this.zoom;

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
