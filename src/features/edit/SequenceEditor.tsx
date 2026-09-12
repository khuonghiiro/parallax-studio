import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Film,
  Play,
  Square,
  Download,
  ExternalLink,
  Layers,
  Sparkles,
  CheckCircle,
  Scissors,
  MessageSquare,
} from 'lucide-react';
import type { Shot } from '@parallax/contracts';
import { Button } from '../../ui/Button.js';
import { useEditor } from '../../app/EditorContext.js';
import { recordCanvasToWebm, downloadBlob } from '../export/video-exporter.js';
import {
  calculateTransition,
  renderTransitionEffect,
  type TransitionType,
} from './transitions.js';
import { AudioTrackStrip } from './AudioTrackStrip.js';
import './SequenceEditor.css';

const TOTAL_FRAMES = 120; // 5 seconds at 24fps

/**
 * Edit Workspace: Sequence Master Viewport, Audio Track, Subtitles, and Transitions.
 */
export function SequenceEditor(): React.JSX.Element {
  const {
    currentFrame,
    setCurrentFrame,
    isPlaying,
    setIsPlaying,
    projectState,
    setMode,
  } = useEditor();

  type ProfileChoice = '4k-uhd-60' | '1080p-cine-24' | '720p-preview';
  const [selectedProfile, setSelectedProfile] = useState<ProfileChoice>('1080p-cine-24');
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [showRenderModal, setShowRenderModal] = useState<boolean>(false);
  const canvasPreviewRef = useRef<HTMLCanvasElement>(null);

  // Transitions configuration mapped by shot ID
  const [transitions, setTransitions] = useState<
    Record<string, { type: TransitionType; duration: number }>
  >({
    'shot-1': { type: 'cut', duration: 0 },
    'shot-2': { type: 'fade', duration: 15 },
  });

  // Editable subtitles per shot
  const [subtitles, setSubtitles] = useState<Record<string, string>>({
    'shot-1': 'Parallax Studio: Dàn cảnh 2.5D và làm phim hoạt hình chuyên nghiệp',
    'shot-2': 'Xuất video điện ảnh chuẩn 4K / 1080p với hiệu ứng thị sai mượt mà',
  });

  const activeScene = projectState.getAllSceneData()[0];
  const defaultShots: Shot[] = [
    {
      id: 'shot-1',
      name: 'Shot 1: Wide',
      cameraId: 'camera-main',
      startFrame: 0,
      endFrame: 60,
      clipAssignments: {},
      transitionIn: 'cut',
      transitionDuration: 0,
    },
    {
      id: 'shot-2',
      name: 'Shot 2: Close-up',
      cameraId: 'camera-main',
      startFrame: 60,
      endFrame: 120,
      clipAssignments: {},
      transitionIn: 'fade',
      transitionDuration: 15,
    },
  ];

  const rawShots = activeScene?.shots && activeScene.shots.length > 0
    ? activeScene.shots
    : defaultShots;

  const currentShot =
    rawShots.find((s) => currentFrame >= s.startFrame && currentFrame < s.endFrame) ||
    rawShots[0]!;

  const currentTrans = transitions[currentShot.id] ?? {
    type: (currentShot.transitionIn as TransitionType) || 'cut',
    duration: currentShot.transitionDuration || 0,
  };

  const currentSubtitle =
    subtitles[currentShot.id] ??
    'Parallax Studio: Hoạt hình 2D & Dàn cảnh 2.5D điện ảnh';

  // Format timecode: HH:MM:SS:FF
  const seconds = Math.floor(currentFrame / 24);
  const remFrames = currentFrame % 24;
  const timecode = `00:00:0${seconds}:${remFrames.toString().padStart(2, '0')}`;

  // Advance timeline during playback
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % TOTAL_FRAMES);
    }, 1000 / 24);
    return () => clearInterval(interval);
  }, [isPlaying, setCurrentFrame]);

  // Render video sequence frame onto preview canvas
  useEffect(() => {
    const canvas = canvasPreviewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background cinema grade color
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (currentShot.id === 'shot-2') {
      bgGrad.addColorStop(0, '#111428');
      bgGrad.addColorStop(1, '#06070d');
    } else {
      bgGrad.addColorStop(0, '#0c1020');
      bgGrad.addColorStop(1, '#05060a');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle film grid floor
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 1;
    for (let y = h * 0.6; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw stylized animated character silhouette
    const charX = w / 2 + Math.sin(currentFrame * 0.08) * 15;
    const charY = h / 2 + 10;
    const charScale = currentShot.id === 'shot-2' ? 1.6 : 1.0;

    ctx.save();
    ctx.translate(charX, charY);
    ctx.scale(charScale, charScale);

    // Head
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(0, -60, 32, 0, Math.PI * 2);
    ctx.fill();

    // Torso
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.roundRect(-24, -20, 48, 90, 8);
    ctx.fill();

    // Arms
    const breath = Math.sin(currentFrame * 0.1) * 8;
    ctx.fillStyle = '#818cf8';
    ctx.beginPath();
    ctx.roundRect(-42, -15 + breath * 0.3, 16, 70, 6);
    ctx.roundRect(26, -15 - breath * 0.3, 16, 70, 6);
    ctx.fill();

    ctx.restore();

    // Render transitions using modular transition effect pipeline
    const transState = calculateTransition(
      currentFrame,
      currentShot.startFrame,
      currentTrans.duration,
      currentTrans.type,
    );
    if (transState) {
      renderTransitionEffect(ctx, w, h, transState);
    }
  }, [currentFrame, currentShot, currentTrans]);

  // Handle video export
  const handleStartExport = useCallback(async () => {
    const canvas = canvasPreviewRef.current;
    if (!canvas) return;

    setIsPlaying(true);
    setExportProgress(0);
    setExportStatus('Đang tổng hợp frames...');

    try {
      const durationMs = 5000;
      const blob = await recordCanvasToWebm(canvas, durationMs, 24, (p) => {
        setExportProgress(p);
        setExportStatus(`Đang encode video: ${p}%`);
      });

      setExportStatus('Hoàn tất! Đang tải file...');
      downloadBlob(blob, `parallax_sequence_${selectedProfile}.webm`);
      setTimeout(() => {
        setExportProgress(null);
        setExportStatus('');
        setShowRenderModal(false);
      }, 1200);
    } catch (err) {
      setExportStatus(`Lỗi: ${String(err)}`);
      setExportProgress(null);
    }
  }, [selectedProfile, setIsPlaying]);

  return (
    <div className="sequence-editor">
      {/* Top Bar */}
      <div className="sequence-editor__top-bar">
        <div className="sequence-editor__shot-info">
          <span className="sequence-editor__shot-title">
            <Film size={16} />
            <span>Sequence Master View</span>
          </span>
          <span className="badge badge--success">{currentShot.name}</span>
          <span className="sequence-editor__timecode">{timecode}</span>
        </div>

        <div className="sequence-editor__actions">
          <Button
            size="sm"
            variant="ghost"
            icon={isPlaying ? Square : Play}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? 'Tạm dừng' : 'Phát phim'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            icon={ExternalLink}
            onClick={() => setMode('compose')}
            title="Mở shot này trên Sân khấu 2.5D để tinh chỉnh camera và lớp"
          >
            Sửa trên Sân khấu
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={Download}
            onClick={() => setShowRenderModal((p) => !p)}
          >
            Xuất Phim...
          </Button>
        </div>
      </div>

      {/* Main Preview Screen */}
      <div className="sequence-editor__preview-area">
        <div className="sequence-editor__screen-frame">
          <canvas
            ref={canvasPreviewRef}
            width={960}
            height={540}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />

          {/* Current Shot Badge & Transition Settings */}
          <div className="sequence-editor__shot-overlay">
            <Layers size={13} />
            <span>
              {currentShot.name} (Khung {currentShot.startFrame} - {currentShot.endFrame})
            </span>

            {/* Transition Controls */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
              <Scissors size={11} color="var(--text-muted)" />
              <select
                value={currentTrans.type}
                onChange={(e) => {
                  const type = e.target.value as TransitionType;
                  setTransitions((prev) => ({
                    ...prev,
                    [currentShot.id]: {
                      type,
                      duration: prev[currentShot.id]?.duration || 15,
                    },
                  }));
                }}
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '10px',
                  borderRadius: '3px',
                  padding: '1px 4px',
                }}
                title="Chọn hiệu ứng chuyển cảnh đầu Shot"
              >
                <option value="cut">Cắt (Cut)</option>
                <option value="fade">Nháy đen (Dip to Black)</option>
                <option value="dissolve">Hòa tan (Cross Dissolve)</option>
                <option value="wipe-left">Gạt trái (Wipe Left)</option>
                <option value="wipe-right">Gạt phải (Wipe Right)</option>
              </select>

              {currentTrans.type !== 'cut' && (
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={currentTrans.duration}
                  onChange={(e) => {
                    const dur = Math.max(1, Number(e.target.value));
                    setTransitions((prev) => ({
                      ...prev,
                      [currentShot.id]: {
                        type: prev[currentShot.id]?.type || 'fade',
                        duration: dur,
                      },
                    }));
                  }}
                  style={{
                    width: '38px',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    fontSize: '10px',
                    borderRadius: '3px',
                    textAlign: 'center',
                    padding: '1px 2px',
                  }}
                  title="Thời lượng chuyển cảnh (frames)"
                />
              )}
            </div>
          </div>

          {/* Broadcast Safe Area (90% action safe) */}
          <div
            className="sequence-editor__safe-area"
            title="Vùng an toàn khung hình (Safe Area 90%)"
          />

          {/* Subtitle Preview Overlay */}
          <div className="sequence-editor__subtitle-bar">
            {currentSubtitle}
          </div>
        </div>

        {/* Subtitle Editor Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '11px',
          }}
        >
          <MessageSquare size={13} color="var(--accent)" />
          <span style={{ color: 'var(--text-muted)' }}>Lời thoại ({currentShot.name}):</span>
          <input
            type="text"
            value={currentSubtitle}
            onChange={(e) => {
              const val = e.target.value;
              setSubtitles((prev) => ({ ...prev, [currentShot.id]: val }));
            }}
            placeholder="Nhập phụ đề cho phân cảnh này..."
            style={{
              flex: 1,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
            }}
          />
        </div>

        {/* Audio / Voiceover Track Visualizer */}
        <AudioTrackStrip
          currentFrame={currentFrame}
          totalFrames={TOTAL_FRAMES}
          onSeekFrame={(f) => setCurrentFrame(f)}
        />

        {/* Render Queue & Export Modal */}
        {showRenderModal && (
          <div className="sequence-editor__render-modal">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Sparkles size={14} color="var(--accent)" />
                <span>Render Queue & Xuất Video</span>
              </span>
              <button
                className="btn btn--sm btn--ghost"
                onClick={() => setShowRenderModal(false)}
                style={{ padding: '2px 6px', height: '20px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '11px' }}>
              <div>
                <label
                  style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}
                >
                  Profile Xuất Phim:
                </label>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value as typeof selectedProfile)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                  }}
                >
                  <option value="4k-uhd-60">4K UHD (3840×2160, 60fps)</option>
                  <option value="1080p-cine-24">1080p Cinema (1920×1080, 24fps)</option>
                  <option value="720p-preview">720p Preview (1280×720, 24fps)</option>
                </select>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Định dạng: WebM / VP9</span>
                <span>Thời lượng: 5.0s (120f)</span>
              </div>

              {exportProgress !== null ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 4,
                    }}
                  >
                    <span>{exportStatus}</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <div className="sequence-editor__progress-bar">
                    <div
                      className="sequence-editor__progress-fill"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle}
                    onClick={handleStartExport}
                  >
                    Bắt đầu Render & Tải về
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
