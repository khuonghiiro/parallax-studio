import * as THREE from 'three';

/**
 * Renders individual frames for video export.
 *
 * Uses an offscreen WebGLRenderer to produce pixel data
 * that can be piped to FFmpeg through the encoder port.
 */
export class FrameRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly renderTarget: THREE.WebGLRenderTarget;
  private readonly pixelBuffer: Uint8Array;

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {
    // Create offscreen renderer
    const canvas = new OffscreenCanvas(width, height);
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas as unknown as HTMLCanvasElement,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);

    // Render target for pixel readback
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    // Pre-allocate pixel buffer
    this.pixelBuffer = new Uint8Array(width * height * 4);
  }

  /**
   * Render a single frame and return RGBA pixel data.
   *
   * @param scene The Three.js scene to render.
   * @param camera The camera to render from.
   * @returns RGBA pixel data as Uint8Array.
   */
  renderFrame(
    scene: THREE.Scene,
    camera: THREE.Camera,
  ): Uint8Array {
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(scene, camera);
    this.renderer.readRenderTargetPixels(
      this.renderTarget,
      0,
      0,
      this.width,
      this.height,
      this.pixelBuffer,
    );
    this.renderer.setRenderTarget(null);

    // Return a copy so the buffer can be reused
    return new Uint8Array(this.pixelBuffer);
  }

  /**
   * Get the output dimensions.
   */
  get dimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Dispose GPU resources.
   */
  dispose(): void {
    this.renderTarget.dispose();
    this.renderer.dispose();
  }
}
