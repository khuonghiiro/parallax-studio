import React, { useRef } from 'react';
import {
  MousePointer2, Move, RotateCcw, Maximize2,
  Pentagon, Paintbrush, Bone, MapPin,
  Grid3x3, Eye,
} from 'lucide-react';
import { Button } from '../../ui/Button.js';
import type { EditorMode } from '../../app/layout/MenuBar.js';
import './ViewportPanel.css';

export interface ViewportPanelProps {
  mode: EditorMode;
}

/**
 * Central viewport — Three.js canvas + toolbar + overlay toggles.
 */
export function ViewportPanel({
  mode,
}: ViewportPanelProps): React.JSX.Element {
  const canvasRef = useRef<HTMLDivElement>(null);

  return (
    <div className="viewport">
      {/* Toolbar Strip */}
      <div className="viewport__toolbar">
        <ToolGroup label="Transform">
          <Button
            icon={MousePointer2} iconOnly size="sm" variant="ghost"
            title="Select (V)" active
          />
          <Button
            icon={Move} iconOnly size="sm" variant="ghost"
            title="Move (G)"
          />
          <Button
            icon={RotateCcw} iconOnly size="sm" variant="ghost"
            title="Rotate (R)"
          />
          <Button
            icon={Maximize2} iconOnly size="sm" variant="ghost"
            title="Scale (S)"
          />
        </ToolGroup>

        {mode === 'setup' && (
          <ToolGroup label="Setup">
            <Button
              icon={Pentagon} iconOnly size="sm" variant="ghost"
              title="Mesh Edit (E)" id="tool-mesh-edit"
            />
            <Button
              icon={Paintbrush} iconOnly size="sm" variant="ghost"
              title="Weight Paint (W)" id="tool-weight-paint"
            />
            <Button
              icon={Bone} iconOnly size="sm" variant="ghost"
              title="Bone Tool (B)"
            />
            <Button
              icon={MapPin} iconOnly size="sm" variant="ghost"
              title="Landmark (L)"
            />
          </ToolGroup>
        )}

        <div className="viewport__toolbar-spacer" />

        {/* Overlay Toggles */}
        <ToolGroup label="Overlays">
          <Button
            icon={Grid3x3} iconOnly size="sm" variant="ghost"
            title="Toggle Mesh (Ctrl+M)"
          />
          <Button
            icon={Bone} iconOnly size="sm" variant="ghost"
            title="Toggle Skeleton (Ctrl+B)"
          />
          <Button
            icon={Eye} iconOnly size="sm" variant="ghost"
            title="Toggle Heatmap (Ctrl+W)"
          />
        </ToolGroup>
      </div>

      {/* Canvas Area */}
      <div className="viewport__canvas" ref={canvasRef}>
        <div className="viewport__empty">
          <span className="viewport__empty-icon">◈</span>
          <h3>Parallax Studio</h3>
          <p>Import an image or create one with AI to start</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Toolbar group with visual separator.
 */
function ToolGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="tool-group" title={label}>
      {children}
    </div>
  );
}
