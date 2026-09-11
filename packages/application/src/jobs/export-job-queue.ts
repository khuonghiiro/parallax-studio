import type { ExportProfile } from '@parallax/contracts';

/**
 * Lifecycle state of a headless export job.
 */
export type ExportJobStatus =
  | 'queued'
  | 'rendering'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Data structure representing a background video render job.
 */
export interface ExportJob {
  readonly id: string;
  readonly sceneId: string;
  readonly profile: ExportProfile;
  readonly outputPath: string;
  readonly totalFrames: number;
  status: ExportJobStatus;
  progress: number; // 0 to 100 percentage
  currentFrame: number;
  error?: string;
  readonly createdAt: string;
  completedAt?: string;
}

function generateJobId(): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 6);
  return `job-export-${ts}-${rnd}`;
}

/**
 * Headless Export Job Queue for managing background film rendering.
 */
export class ExportJobQueue {
  private readonly jobs = new Map<string, ExportJob>();
  private activeJobId: string | null = null;

  /**
   * Enqueue a new film export job.
   */
  enqueueJob(
    sceneId: string,
    profile: ExportProfile,
    outputPath: string,
    totalFrames = 120,
  ): ExportJob {
    const id = generateJobId();
    const job: ExportJob = {
      id,
      sceneId,
      profile,
      outputPath,
      totalFrames,
      status: 'queued',
      progress: 0,
      currentFrame: 0,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(id, job);
    this.processNext();
    return job;
  }

  /**
   * Get an export job by ID.
   */
  getJob(id: string): ExportJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all registered export jobs.
   */
  listJobs(): readonly ExportJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Update progress for an active job.
   */
  updateProgress(jobId: string, currentFrame: number): void {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'cancelled' || job.status === 'completed') {
      return;
    }

    job.currentFrame = currentFrame;
    job.progress = Math.min(100, Math.round((currentFrame / job.totalFrames) * 100));
    if (job.status === 'queued') {
      job.status = 'rendering';
    }

    if (currentFrame >= job.totalFrames) {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      if (this.activeJobId === jobId) {
        this.activeJobId = null;
        this.processNext();
      }
    }
  }

  /**
   * Cancel an in-progress or queued export job.
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed') {
      return false;
    }

    job.status = 'cancelled';
    if (this.activeJobId === jobId) {
      this.activeJobId = null;
      this.processNext();
    }
    return true;
  }

  private processNext(): void {
    if (this.activeJobId) return;

    for (const job of this.jobs.values()) {
      if (job.status === 'queued') {
        this.activeJobId = job.id;
        job.status = 'rendering';
        break;
      }
    }
  }
}
