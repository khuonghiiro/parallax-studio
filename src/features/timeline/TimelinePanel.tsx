import React, { useState } from 'react';
import {
  Play, Square, SkipBack, SkipForward,
  Diamond, KeyRound,
} from 'lucide-react';
import { Button } from '../../ui/Button.js';
import './TimelinePanel.css';

/**
 * Bottom timeline panel — track list, playhead, and playback controls.
 */
export function TimelinePanel(): React.JSX.Element {
  const [autoKey, setAutoKey] = useState(false);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="timeline">
      {/* Timeline Header */}
      <div className="timeline__header">
        <span className="timeline__clip-name">
          No clip selected
        </span>

        <div className="timeline__spacer" />

        {/* Playback Controls */}
        <div className="timeline__controls">
          <Button
            icon={SkipBack} iconOnly size="sm" variant="ghost"
            title="Previous Keyframe"
          />
          <Button
            icon={playing ? Square : Play}
            iconOnly size="sm"
            variant={playing ? 'primary' : 'ghost'}
            title={playing ? 'Stop' : 'Play (Space)'}
            onClick={() => setPlaying(!playing)}
            id="btn-play"
          />
          <Button
            icon={SkipForward} iconOnly size="sm" variant="ghost"
            title="Next Keyframe"
          />
        </div>

        <div className="timeline__divider" />

        {/* Key Controls */}
        <Button
          icon={Diamond} iconOnly size="sm" variant="ghost"
          title="Insert Keyframe (K)"
        />
        <Button
          icon={KeyRound} iconOnly size="sm"
          variant="ghost"
          active={autoKey}
          title="Auto-Key Toggle"
          onClick={() => setAutoKey(!autoKey)}
        />

        <div className="timeline__divider" />

        {/* Time Display */}
        <span className="timeline__time">
          00:00 / 00:00
        </span>
      </div>

      {/* Track Area */}
      <div className="timeline__body">
        {/* Track Labels */}
        <div className="timeline__labels">
          <div className="timeline__empty-label">
            No tracks
          </div>
        </div>

        {/* Track Grid */}
        <div className="timeline__grid">
          {/* Ruler */}
          <div className="timeline__ruler">
            {Array.from({ length: 11 }).map((_, i) => (
              <span key={i} className="timeline__ruler-mark">
                {(i * 0.1).toFixed(1)}
              </span>
            ))}
          </div>

          {/* Playhead */}
          <div
            className="timeline__playhead"
            style={{ left: '0%' }}
          />

          {/* Empty state */}
          <div className="timeline__tracks-empty">
            Create animation clips to see tracks here
          </div>
        </div>
      </div>
    </div>
  );
}
