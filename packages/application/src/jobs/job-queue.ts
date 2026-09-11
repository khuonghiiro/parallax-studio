import type { RenderJob, JobState } from '@parallax/contracts';

/**
 * Listener for job state changes.
 */
export type JobListener = (job: RenderJob) => void;

/**
 * Render job queue — manages lifecycle of export jobs.
 *
 * Jobs follow the state machine:
 * pending → rendering → encoding → completed
 *              ↓            ↓
 *          cancelled    cancelled
 *              ↓            ↓
 *           failed        failed
 */
export class JobQueue {
  private readonly jobs = new Map<string, RenderJob>();
  private readonly listeners: JobListener[] = [];

  /**
   * Submit a new render job.
   * Starts in 'pending' state.
   */
  submit(job: RenderJob): void {
    if (this.jobs.has(job.id)) {
      throw new Error(`Job already exists: ${job.id}`);
    }
    this.jobs.set(job.id, job);
    this.notify(job);
  }

  /**
   * Update a job's state and progress.
   */
  updateJob(
    jobId: string,
    update: Partial<Pick<RenderJob, 'progress' | 'error'>>,
    newState?: JobState,
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const updatedProgress = update.progress
      ? { ...job.progress, ...update.progress }
      : job.progress;

    const finalProgress = newState
      ? { ...updatedProgress, state: newState }
      : updatedProgress;

    const updatedJob: RenderJob = {
      ...job,
      progress: finalProgress,
      error: update.error ?? job.error,
      updatedAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, updatedJob);
    this.notify(updatedJob);
  }

  /**
   * Cancel a running or pending job.
   */
  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    const cancelable: JobState[] = ['pending', 'rendering', 'encoding'];
    if (!cancelable.includes(job.progress.state)) {
      return false;
    }

    this.updateJob(jobId, {}, 'cancelled');
    return true;
  }

  /**
   * Get a job by ID.
   */
  get(jobId: string): RenderJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * List all jobs, optionally filtered by state.
   */
  list(stateFilter?: JobState): readonly RenderJob[] {
    const all = [...this.jobs.values()];

    if (stateFilter) {
      return all.filter((job) => job.progress.state === stateFilter);
    }

    return all;
  }

  /**
   * Remove completed or cancelled jobs from the queue.
   */
  prune(): number {
    const removable: JobState[] = ['completed', 'cancelled', 'failed'];
    let removed = 0;

    for (const [id, job] of this.jobs) {
      if (removable.includes(job.progress.state)) {
        this.jobs.delete(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Subscribe to job state changes.
   */
  onJobUpdate(listener: JobListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notify(job: RenderJob): void {
    for (const listener of this.listeners) {
      try {
        listener(job);
      } catch {
        // Listener errors must not break job management
      }
    }
  }
}
