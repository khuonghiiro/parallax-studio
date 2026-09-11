import React, { useState, useCallback, useRef } from 'react';
import {
  Play, Square, SkipBack, SkipForward,
  Diamond, KeyRound, Clapperboard, Plus,
} from 'lucide-react';
import type { Shot } from '@parallax/contracts';
import { Button } from '../../ui/Button.js';
import { useEditor } from '../../app/EditorContext.js';
import './TimelinePanel.css';

const TOTAL_FRAMES = 120; // 5.0 seconds at 24fps

/**
 * Bottom timeline panel — track list, playhead, scrubbing, and playback controls.
 */
export function TimelinePanel(): React.JSX.Element {
  const [autoKey, setAutoKey] = useState(false);
  const [activeShotId, setActiveShotId] = useState<string>('shot-1');
  const gridRef = useRef<HTMLDivElement>(null);

  const {
    currentFrame,
    setCurrentFrame,
    isPlaying,
    setIsPlaying,
    selectedAssetId,
    projectState,
    dispatch,
  } = useEditor();

  const scenes = projectState.getAllSceneData();
  const scene = scenes[0];

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

  const shots = (scene?.shots && scene.shots.length > 0) ? scene.shots : defaultShots;

  const handleAddShot = async () => {
    const lastShot = shots[shots.length - 1];
    const newStart = lastShot ? lastShot.endFrame : 0;
    const newEnd = Math.min(TOTAL_FRAMES, newStart + 40);

    await dispatch({
      type: 'add_shot',
      domain: 'scene',
      data: {
        name: `Shot ${shots.length + 1}`,
        startFrame: newStart,
        endFrame: newEnd,
        transitionIn: 'fade',
        transitionDuration: 12,
      },
    });
  };

  const asset = selectedAssetId ? projectState.getAssetData(selectedAssetId) : undefined;
  const hasRig = Boolean(asset?.skeleton);

  const tracks = hasRig
    ? [
        { name: 'Root Position', keys: [0, 60, 120] },
        { name: 'Spine Sway', keys: [0, 30, 60, 90, 120] },
        { name: 'Left Arm Swing', keys: [0, 40, 80, 120] },
        { name: 'Right Arm Swing', keys: [0, 40, 80, 120] },
        { name: 'Legs Stride', keys: [0, 30, 60, 90, 120] },
      ]
    : [];

  const handleGridClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const targetFrame = Math.round(ratio * TOTAL_FRAMES);
      setCurrentFrame(targetFrame);
    },
    [setCurrentFrame],
  );

  const handleInsertKey = async () => {
    await dispatch({
      type: 'set_keyframe',
      domain: 'animation',
      data: {
        property: 'bones.spine.rotation',
        frame: currentFrame,
        value: 0.15,
      },
    });
  };

  const playheadPercent = (currentFrame / TOTAL_FRAMES) * 100;
  const currentTimeSec = (currentFrame / 24).toFixed(2);
  const totalTimeSec = (TOTAL_FRAMES / 24).toFixed(1);

  return (
    <div className="timeline">
      {/* Timeline Header */}
      <div className="timeline__header">
        <span className="timeline__clip-name">
          {asset ? `${asset.name} (Walk Loop)` : 'No clip selected'}
        </span>

        <div className="timeline__spacer" />

        {/* Playback Controls */}
        <div className="timeline__controls">
          <Button
            icon={SkipBack}
            iconOnly
            size="sm"
            variant="ghost"
            title="Beginning (Home)"
            onClick={() => setCurrentFrame(0)}
          />
          <Button
            icon={isPlaying ? Square : Play}
            iconOnly
            size="sm"
            variant={isPlaying ? 'primary' : 'ghost'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            onClick={() => setIsPlaying(!isPlaying)}
            id="btn-play"
          />
          <Button
            icon={SkipForward}
            iconOnly
            size="sm"
            variant="ghost"
            title="End (End)"
            onClick={() => setCurrentFrame(TOTAL_FRAMES)}
          />
        </div>

        <div className="timeline__divider" />

        {/* Key Controls */}
        <Button
          icon={Diamond}
          iconOnly
          size="sm"
          variant="ghost"
          title="Insert Keyframe (K)"
          onClick={handleInsertKey}
        />
        <Button
          icon={KeyRound}
          iconOnly
          size="sm"
          variant="ghost"
          active={autoKey}
          title="Auto-Key Toggle"
          onClick={() => setAutoKey(!autoKey)}
        />

        <div className="timeline__divider" />

        {/* Time Display */}
        <span className="timeline__time">
          Frame {currentFrame} ({currentTimeSec}s / {totalTimeSec}s)
        </span>
      </div>

      {/* Shots Strip for Filmmaking */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: '11px',
          overflowX: 'auto',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginRight: 4,
          }}
        >
          <Clapperboard size={13} />
          Shots:
        </span>

        {shots.map((shot) => {
          const isActive = shot.id === activeShotId;
          return (
            <button
              key={shot.id}
              className={`btn btn--sm ${isActive ? 'btn--primary' : 'btn--ghost'}`}
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onClick={() => {
                setActiveShotId(shot.id);
                setCurrentFrame(shot.startFrame);
              }}
            >
              <span>{shot.name}</span>
              <span style={{ opacity: 0.7, fontSize: '10px' }}>
                ({shot.startFrame}-{shot.endFrame}f)
              </span>
              {shot.transitionIn && shot.transitionIn !== 'cut' && (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    padding: '0 3px',
                    borderRadius: '2px',
                    fontSize: '9px',
                  }}
                >
                  {shot.transitionIn}
                </span>
              )}
            </button>
          );
        })}

        <Button
          icon={Plus}
          size="sm"
          variant="ghost"
          onClick={handleAddShot}
          title="Add New Shot"
        >
          Shot
        </Button>
      </div>

      {/* Track Area */}
      <div className="timeline__body">
        {/* Track Labels */}
        <div className="timeline__labels">
          {tracks.length === 0 ? (
            <div className="timeline__empty-label">No tracks active</div>
          ) : (
            tracks.map((t, idx) => (
              <div key={idx} className="timeline__track-label">
                {t.name}
              </div>
            ))
          )}
        </div>

        {/* Track Grid */}
        <div className="timeline__grid" ref={gridRef} onClick={handleGridClick}>
          {/* Ruler */}
          <div className="timeline__ruler">
            {Array.from({ length: 13 }).map((_, i) => (
              <span key={i} className="timeline__ruler-mark">
                {i * 10}f
              </span>
            ))}
          </div>

          {/* Playhead */}
          <div
            className="timeline__playhead"
            style={{ left: `${playheadPercent}%` }}
          />

          {/* Tracks and Keyframes */}
          {tracks.length === 0 ? (
            <div className="timeline__tracks-empty">
              Import and rig an asset to view animation timeline tracks
            </div>
          ) : (
            <div className="timeline__track-rows">
              {tracks.map((track, tIdx) => (
                <div key={tIdx} className="timeline__track-row">
                  {track.keys.map((kf, kIdx) => (
                    <div
                      key={kIdx}
                      className="timeline__keyframe-diamond"
                      style={{ left: `${(kf / TOTAL_FRAMES) * 100}%` }}
                      title={`Frame ${kf}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
