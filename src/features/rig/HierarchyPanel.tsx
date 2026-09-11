import React from 'react';
import { Layers, Bone, Image } from 'lucide-react';
import { Panel } from '../../ui/Panel.js';
import { Icon } from '../../ui/Icon.js';
import type { EditorMode } from '../../app/layout/MenuBar.js';
import './HierarchyPanel.css';

export interface HierarchyPanelProps {
  mode: EditorMode;
}

/**
 * Left panel — hierarchy tree showing layers, bones, and views.
 * Content changes based on Setup vs Animate mode.
 */
export function HierarchyPanel({
  mode,
}: HierarchyPanelProps): React.JSX.Element {
  return (
    <div className="hierarchy">
      {/* Search */}
      <div className="hierarchy__search">
        <input
          type="text"
          placeholder="Search hierarchy..."
          className="hierarchy__search-input"
        />
      </div>

      {/* Layers Panel */}
      <Panel title="Layers" id="panel-layers">
        <div className="hierarchy__empty">
          <Icon icon={Layers} size="lg" color="var(--text-muted)" />
          <span>Import an image to begin</span>
        </div>
      </Panel>

      {/* Skeleton Panel — visible in both modes */}
      <Panel title="Skeleton" id="panel-skeleton" defaultCollapsed>
        <div className="hierarchy__empty">
          <Icon icon={Bone} size="lg" color="var(--text-muted)" />
          <span>No rig applied</span>
        </div>
      </Panel>

      {/* Views Panel — Setup mode only */}
      {mode === 'setup' && (
        <Panel title="Views" id="panel-views" defaultCollapsed>
          <div className="hierarchy__empty">
            <Icon icon={Image} size="lg" color="var(--text-muted)" />
            <span>Front view only</span>
          </div>
        </Panel>
      )}

      {/* Animations Panel — Animate mode only */}
      {mode === 'animate' && (
        <Panel title="Animations" id="panel-animations">
          <div className="hierarchy__empty">
            <span>No clips created</span>
          </div>
        </Panel>
      )}
    </div>
  );
}
