import React from 'react';
import { Panel } from '../../ui/Panel.js';
import type { EditorMode } from '../../app/layout/MenuBar.js';
import './PropertiesPanel.css';

export interface PropertiesPanelProps {
  mode: EditorMode;
}

/**
 * Right panel — context-sensitive inspector.
 * Content changes based on what is selected in the hierarchy/viewport.
 */
export function PropertiesPanel({
  mode,
}: PropertiesPanelProps): React.JSX.Element {
  return (
    <div className="properties">
      {/* Transform Section */}
      <Panel title="Transform" id="panel-transform">
        <div className="props-grid">
          <PropertyRow label="X" value="0.0" />
          <PropertyRow label="Y" value="0.0" />
          <PropertyRow label="Rotation" value="0°" />
          <PropertyRow label="Scale" value="1.0" />
        </div>
      </Panel>

      {/* Context-sensitive sections */}
      {mode === 'setup' && (
        <>
          <Panel title="Mesh Geometry" id="panel-mesh" defaultCollapsed>
            <div className="props-info">
              <span className="props-info__label">Vertices</span>
              <span className="props-info__value">—</span>
            </div>
            <div className="props-info">
              <span className="props-info__label">Triangles</span>
              <span className="props-info__value">—</span>
            </div>
          </Panel>

          <Panel title="Skin Weights" id="panel-weights" defaultCollapsed>
            <div className="props-empty">
              Select a bone to paint weights
            </div>
          </Panel>
        </>
      )}

      {mode === 'animate' && (
        <Panel title="Keyframe" id="panel-keyframe" defaultCollapsed>
          <div className="props-grid">
            <PropertyRow label="Time" value="0.000s" />
            <PropertyRow label="Value" value="0.0" />
            <PropertyRow label="Easing" value="Linear" />
          </div>
        </Panel>
      )}

      {/* Material always visible */}
      <Panel title="Material" id="panel-material" defaultCollapsed>
        <div className="props-grid">
          <PropertyRow label="Opacity" value="100%" />
          <PropertyRow label="Tint" value="#ffffff" />
        </div>
      </Panel>
    </div>
  );
}

/**
 * Single property row with label and editable value.
 */
function PropertyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="prop-row">
      <label className="prop-row__label">{label}</label>
      <input
        type="text"
        className="prop-row__input"
        defaultValue={value}
        readOnly
      />
    </div>
  );
}
