/**
 * Browser-based video recorder using MediaRecorder and Canvas captureStream.
 * Records the Three.js viewport into a standard video file.
 */
export async function recordCanvasToWebm(
  canvas: HTMLCanvasElement,
  durationMs: number = 5000,
  fps: number = 30,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const stream = canvas.captureStream(fps);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };

      recorder.onerror = (e) => {
        reject(new Error(`Recording error: ${String(e)}`));
      };

      recorder.start(100);

      const startTime = performance.now();
      const interval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(100, Math.round((elapsed / durationMs) * 100));
        onProgress?.(progress);

        if (elapsed >= durationMs) {
          clearInterval(interval);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      }, 100);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Trigger browser file download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
