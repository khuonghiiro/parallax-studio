import React from 'react';
import {
  Save, Upload, Download, Undo2, Redo2,
} from 'lucide-react';
import { Button } from '../../ui/Button.js';
import './MenuBar.css';

/**
 * Editor operating mode.
 */
export type EditorMode = 'setup' | 'animate';

export interface MenuBarProps {
  /** Current editor mode. */
  mode: EditorMode;
  /** Callback when mode changes. */
  onModeChange: (mode: EditorMode) => void;
  /** Whether undo is available. */
  canUndo: boolean;
  /** Whether redo is available. */
  canRedo: boolean;
  /** Callbacks for menu actions. */
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onImport: () => void;
  onExport: () => void;
}

/**
 * Top menu bar with mode toggle, file actions, and history.
 */
export function MenuBar({
  mode,
  onModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onImport,
  onExport,
}: MenuBarProps): React.JSX.Element {
  return (
    <header className="menubar">
      {/* Logo / App Name */}
      <div className="menubar__brand">
        <span className="menubar__logo">◈</span>
        <span className="menubar__name">Parallax Studio</span>
      </div>

      {/* Mode Toggle */}
      <div className="menubar__modes">
        <button
          className={`menubar__mode ${mode === 'setup' ? 'menubar__mode--active' : ''}`}
          onClick={() => onModeChange('setup')}
        >
          Setup
        </button>
        <button
          className={`menubar__mode ${mode === 'animate' ? 'menubar__mode--active' : ''}`}
          onClick={() => onModeChange('animate')}
        >
          Animate
        </button>
      </div>

      {/* Spacer */}
      <div className="menubar__spacer" />

      {/* Actions */}
      <div className="menubar__actions">
        <Button
          icon={Undo2} iconOnly size="sm" variant="ghost"
          title="Undo (Ctrl+Z)" onClick={onUndo}
          disabled={!canUndo}
        />
        <Button
          icon={Redo2} iconOnly size="sm" variant="ghost"
          title="Redo (Ctrl+Shift+Z)" onClick={onRedo}
          disabled={!canRedo}
        />
        <div className="menubar__divider" />
        <Button
          icon={Upload} iconOnly size="sm" variant="ghost"
          title="Import Image" onClick={onImport}
          id="btn-import"
        />
        <Button
          icon={Save} iconOnly size="sm" variant="ghost"
          title="Save Project (Ctrl+S)" onClick={onSave}
          id="btn-save"
        />
        <Button
          icon={Download} iconOnly size="sm" variant="ghost"
          title="Export Video" onClick={onExport}
          id="btn-export"
        />
      </div>
    </header>
  );
}
