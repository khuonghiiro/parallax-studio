import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Volume2, VolumeX, Mic } from 'lucide-react';
import './AudioTrackStrip.css';

export interface AudioTrackStripProps {
  currentFrame: number;
  totalFrames: number;
  onSeekFrame: (frame: number) => void;
}

/**
 * Audio / Dialogue track visualizer with waveform rendering and volume controls.
 */
export function AudioTrackStrip({
  currentFrame,
  totalFrames,
  onSeekFrame,
}: AudioTrackStripProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [gain, setGain] = useState(1.0);

  // Generate realistic cinematic voiceover + music waveform peaks (120 points)
  const waveformData = useMemo(() => {
    const data: number[] = [];
    for (let i = 0; i < totalFrames; i++) {
      // Periodic speech cadence with pauses
      const speechEnvelope = Math.sin(i * 0.12) * Math.cos(i * 0.05);
      const isPause = (i > 45 && i < 60) || (i > 105 && i < 115);
      if (isPause) {
        data.push(0.08 + Math.sin(i * 0.5) * 0.04);
      } else {
        const energy = Math.abs(speechEnvelope) * 0.7 + Math.random() * 0.25;
        data.push(Math.min(0.95, energy));
      }
    }
    return data;
  }, [totalFrames]);

  // Draw audio waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const midY = h / 2;
    const barWidth = w / totalFrames;

    // Draw center baseline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    // Draw waveform bars
    for (let i = 0; i < totalFrames; i++) {
      const peak = (waveformData[i] ?? 0.1) * (isMuted ? 0 : gain);
      const barH = Math.max(2, peak * (h * 0.85));
      const x = i * barWidth;

      const hasPlayed = i <= currentFrame;
      if (hasPlayed) {
        ctx.fillStyle = isMuted ? '#64748b' : '#38bdf8'; // Played: bright cyan
      } else {
        ctx.fillStyle = 'rgba(100, 116, 139, 0.4)'; // Upcoming: muted slate
      }

      ctx.fillRect(x + 0.5, midY - barH / 2, Math.max(1, barWidth - 1), barH);
    }
  }, [currentFrame, totalFrames, waveformData, isMuted, gain]);

  // Handle click on waveform to seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetFrame = Math.round(ratio * totalFrames);
    onSeekFrame(targetFrame);
  };

  const playheadPercent = Math.min(100, (currentFrame / totalFrames) * 100);

  return (
    <div className="audio-track-strip">
      <div className="audio-track-strip__header">
        <div className="audio-track-strip__meta">
          <span className="audio-track-strip__title">
            <Mic size={13} color="var(--accent)" />
            <span>A1: Thoại & Nhạc Nền (Dialogue / BGM)</span>
          </span>
          <span className="badge badge--info" style={{ fontSize: '9px' }}>
            48kHz Stereo
          </span>
        </div>

        <div className="audio-track-strip__controls">
          <button
            className="btn btn--sm btn--ghost"
            style={{ padding: '2px 6px', height: '22px' }}
            onClick={() => setIsMuted((m) => !m)}
            title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng (Mute)'}
          >
            {isMuted ? <VolumeX size={12} color="#f43f5e" /> : <Volume2 size={12} />}
          </button>

          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Gain:</span>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={gain}
            disabled={isMuted}
            onChange={(e) => setGain(Number(e.target.value))}
            style={{ width: '60px' }}
            title={`Âm lượng: ${Math.round(gain * 100)}%`}
          />
          <span style={{ fontSize: '10px', width: '28px' }}>
            {isMuted ? '0%' : `${Math.round(gain * 100)}%`}
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="audio-track-strip__waveform-container"
        onClick={handleSeek}
        title="Click vào dạng sóng để nhảy khung hình"
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={42}
          className="audio-track-strip__waveform-canvas"
        />
        <div
          className="audio-track-strip__playhead"
          style={{ left: `${playheadPercent}%` }}
        />
      </div>
    </div>
  );
}
