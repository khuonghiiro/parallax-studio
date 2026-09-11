import React from 'react';
import './StatusBar.css';

export interface StatusBarProps {
  /** Status message. */
  message: string;
  /** Current FPS (from renderer). */
  fps: number;
  /** Current frame number. */
  currentFrame: number;
  /** Total frame count. */
  totalFrames: number;
  /** Whether GPU is available. */
  gpuReady: boolean;
}

/**
 * Bottom status bar — displays contextual info about the editor state.
 */
export function StatusBar({
  message,
  fps,
  currentFrame,
  totalFrames,
  gpuReady,
}: StatusBarProps): React.JSX.Element {
  return (
    <footer className="statusbar">
      <span className="statusbar__message">{message}</span>
      <div className="statusbar__spacer" />
      <span className="statusbar__stat">
        FPS: <strong>{fps}</strong>
      </span>
      <span className="statusbar__divider" />
      <span className="statusbar__stat">
        Frame: <strong>{currentFrame}</strong>/{totalFrames}
      </span>
      <span className="statusbar__divider" />
      <span className={`statusbar__gpu ${gpuReady ? '' : 'statusbar__gpu--error'}`}>
        GPU: {gpuReady ? '✓ Ready' : '✗ N/A'}
      </span>
    </footer>
  );
}
