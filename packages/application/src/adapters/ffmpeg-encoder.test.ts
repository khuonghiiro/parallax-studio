import { describe, it, expect } from 'vitest';
import type { ExportProfile } from '@parallax/contracts';
import { FfmpegEncoder } from './ffmpeg-encoder.js';

describe('ffmpeg-encoder', () => {
  const profile4K: ExportProfile = {
    name: '4k-uhd-60',
    resolutionName: '4k-uhd',
    resolution: { width: 3840, height: 2160 },
    fps: '60',
    codec: 'hevc',
    encoder: 'nvenc',
    quality: 'high',
    crf: 18,
    maxBitrateKbps: 50000,
  };

  it('probes available hardware encoders', async () => {
    const encoder = new FfmpegEncoder();
    const list = await encoder.probeEncoders();
    expect(list).toContain('h264_nvenc');
    expect(list).toContain('hevc_nvenc');
    expect(await encoder.isNvencAvailable()).toBe(true);
  });

  it('builds FFmpeg command arguments with NVENC hardware flags', () => {
    const encoder = new FfmpegEncoder();
    const args = encoder.buildEncoderArgs('C:/renders/film_4k.mp4', profile4K);

    expect(args).toContain('-c:v');
    expect(args).toContain('hevc_nvenc');
    expect(args).toContain('-preset');
    expect(args).toContain('p6');
    expect(args).toContain('3840x2160');
    expect(args).toContain('60');
  });

  it('runs an active encoding session and pushes frames with progress notifications', async () => {
    const encoder = new FfmpegEncoder();
    const session = await encoder.startSession('test.mp4', profile4K, 10);

    let reportedFrames = 0;
    session.onProgress((cur, total) => {
      reportedFrames = cur;
      expect(total).toBe(10);
    });

    // Push 3 frames
    const dummyFrame = new Uint8Array([255, 0, 0, 255]);
    await session.pushFrame(dummyFrame);
    await session.pushFrame(dummyFrame);
    await session.pushFrame(dummyFrame);

    expect(reportedFrames).toBe(3);

    await session.finalize();
  });
});
