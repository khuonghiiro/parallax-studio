import type { ExportProfile } from '@parallax/contracts';

/**
 * Job progress callback for encoding.
 */
export type EncoderProgressCallback = (
  encodedFrames: number,
  totalFrames: number,
) => void;

/**
 * Port interface for video encoding (FFmpeg/NVENC).
 *
 * The application layer pushes rendered frames to the encoder.
 * The encoder produces the final video file.
 */
export interface EncoderPort {
  /**
   * Probe available encoders on the system.
   * Returns the list of supported encoder names.
   */
  probeEncoders(): Promise<readonly string[]>;

  /**
   * Check if NVENC hardware encoding is available.
   */
  isNvencAvailable(): Promise<boolean>;

  /**
   * Start an encoding session for a new video.
   *
   * @param outputPath Absolute path for the output video file.
   * @param profile Export settings (resolution, FPS, codec, quality).
   * @param totalFrames Total number of frames to encode.
   * @returns A session handle for pushing frames.
   */
  startSession(
    outputPath: string,
    profile: ExportProfile,
    totalFrames: number,
  ): Promise<EncoderSession>;
}

/**
 * Active encoding session.
 * Frames are pushed sequentially; the session finalizes the video.
 */
export interface EncoderSession {
  /**
   * Push a rendered frame (RGBA pixel data) for encoding.
   * Frames must be pushed in order.
   */
  pushFrame(pixelData: Uint8Array): Promise<void>;

  /**
   * Finalize the encoding and produce the output file.
   * Must be called after all frames have been pushed.
   */
  finalize(): Promise<void>;

  /**
   * Cancel the encoding session and clean up.
   */
  cancel(): Promise<void>;

  /**
   * Subscribe to encoding progress updates.
   */
  onProgress(callback: EncoderProgressCallback): void;
}
