import * as THREE from 'three';

/**
 * Frame loop for preview playback.
 *
 * Uses requestAnimationFrame for preview rendering.
 * The same pose evaluator (from core) is used for both
 * preview and export — this module only manages the loop timing.
 */
export class FrameLoop {
  private animationId: number | null = null;
  private lastTimestamp: number = 0;
  private currentFrame: number = 0;
  private playing: boolean = false;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly getCamera: () => THREE.Camera,
    private readonly onFrame: (frameIndex: number) => void,
    private fps: number = 60,
  ) {}

  /**
   * Start the playback loop.
   */
  play(): void {
    if (this.playing) {
      return;
    }

    this.playing = true;
    this.lastTimestamp = performance.now();
    this.tick(this.lastTimestamp);
  }

  /**
   * Pause the playback loop.
   */
  pause(): void {
    this.playing = false;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Stop playback and reset to frame 0.
   */
  stop(): void {
    this.pause();
    this.currentFrame = 0;
  }

  /**
   * Seek to a specific frame.
   */
  seek(frame: number): void {
    this.currentFrame = Math.max(0, frame);
    this.renderCurrentFrame();
  }

  /**
   * Set the preview FPS.
   */
  setFps(fps: number): void {
    this.fps = Math.max(1, fps);
  }

  /**
   * Get the current frame index.
   */
  get frame(): number {
    return this.currentFrame;
  }

  /**
   * Whether playback is active.
   */
  get isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Render a single frame at the current position.
   */
  renderCurrentFrame(): void {
    this.onFrame(this.currentFrame);
    this.renderer.render(this.scene, this.getCamera());
  }

  /**
   * Dispose the loop (stop and clean up).
   */
  dispose(): void {
    this.stop();
  }

  private tick(timestamp: number): void {
    if (!this.playing) {
      return;
    }

    this.animationId = requestAnimationFrame(
      (ts) => this.tick(ts),
    );

    const elapsed = timestamp - this.lastTimestamp;
    const frameDuration = 1000 / this.fps;

    if (elapsed >= frameDuration) {
      this.lastTimestamp = timestamp - (elapsed % frameDuration);
      this.currentFrame++;
      this.renderCurrentFrame();
    }
  }
}
