/**
 * Port interface for the renderer service.
 * The renderer converts scene state into frames (WebGL/Three.js).
 *
 * This port abstracts the renderer so the application layer
 * doesn't depend on Three.js directly.
 */
export interface RendererPort {
  /**
   * Check if a renderer instance is connected and ready.
   */
  isAvailable(): boolean;

  /**
   * Request the renderer to produce a single frame.
   * Used for export (frame-by-frame rendering).
   *
   * @param sceneState Serialized scene state for the frame.
   * @param outputWidth Target frame width.
   * @param outputHeight Target frame height.
   * @returns Raw pixel data (RGBA Uint8Array) for the rendered frame.
   */
  renderFrame(
    sceneState: unknown,
    outputWidth: number,
    outputHeight: number,
  ): Promise<Uint8Array>;

  /**
   * Request a preview thumbnail.
   * Lower resolution, faster, for asset browser / timeline scrubbing.
   */
  renderThumbnail(
    sceneState: unknown,
    maxSize: number,
  ): Promise<Uint8Array>;
}
