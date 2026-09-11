import { describe, it, expect } from 'vitest';
import type { ExportProfile } from '@parallax/contracts';
import { ExportJobQueue } from './export-job-queue.js';

describe('export-job-queue', () => {
  const dummyProfile: ExportProfile = {
    name: '1080p-24',
    resolutionName: '1080p',
    resolution: { width: 1920, height: 1080 },
    fps: '24',
    codec: 'h264',
    encoder: 'auto',
    quality: 'high',
    crf: 20,
    maxBitrateKbps: null,
  };

  it('enqueues a job and sets status to rendering', () => {
    const queue = new ExportJobQueue();
    const job = queue.enqueueJob('scene-1', dummyProfile, 'out.mp4', 100);

    expect(job.id).toBeDefined();
    expect(job.status).toBe('rendering');
    expect(job.totalFrames).toBe(100);
  });

  it('updates job progress and completes when all frames are reached', () => {
    const queue = new ExportJobQueue();
    const job = queue.enqueueJob('scene-1', dummyProfile, 'out.mp4', 50);

    queue.updateProgress(job.id, 25);
    expect(job.progress).toBe(50);
    expect(job.status).toBe('rendering');

    queue.updateProgress(job.id, 50);
    expect(job.progress).toBe(100);
    expect(job.status).toBe('completed');
    expect(job.completedAt).toBeDefined();
  });

  it('cancels an active job', () => {
    const queue = new ExportJobQueue();
    const job = queue.enqueueJob('scene-1', dummyProfile, 'out.mp4', 100);

    const cancelled = queue.cancelJob(job.id);
    expect(cancelled).toBe(true);
    expect(job.status).toBe('cancelled');
  });
});
