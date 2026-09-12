import React from 'react';
import {
  Save, Upload, Download, Undo2, Redo2, Sparkles, FolderOpen, Search,
} from 'lucide-react';
import { Button } from '../../ui/Button.js';
import './MenuBar.css';

/**
 * 5 primary workspace environments defined in UI_SPECIFICATION.md.
 */
export type WorkspaceId = 'draw' | 'rig' | 'animate' | 'compose' | 'edit';

/**
 * Backward compatibility alias for legacy mode.
 */
export type EditorMode = WorkspaceId;

export interface WorkspaceDefinition {
  id: WorkspaceId;
  labelVi: string;
  labelEn: string;
  icon: string;
}

export const WORKSPACES: readonly WorkspaceDefinition[] = [
  { id: 'draw', labelVi: 'Vẽ', labelEn: 'Draw', icon: '🎨' },
  { id: 'rig', labelVi: 'Khung xương', labelEn: 'Rig', icon: '🦴' },
  { id: 'animate', labelVi: 'Diễn hoạt', labelEn: 'Animate', icon: '🎬' },
  { id: 'compose', labelVi: 'Dàn cảnh', labelEn: 'Compose', icon: '📐' },
  { id: 'edit', labelVi: 'Dựng phim', labelEn: 'Edit', icon: '🎞️' },
];

export interface MenuBarProps {
  /** Current editor workspace. */
  mode: WorkspaceId;
  /** Callback when workspace changes. */
  onModeChange: (workspace: WorkspaceId) => void;
  /** Optional breadcrumb hierarchy string (e.g. Project / Asset / Clip). */
  breadcrumb?: string;
  /** Whether undo is available. */
  canUndo: boolean;
  /** Whether redo is available. */
  canRedo: boolean;
  /** Callbacks for menu actions. */
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onOpenProject?: () => void;
  onImport: () => void;
  onExport: () => void;
  /** Whether the AI director drawer is currently open. */
  isAiDrawerOpen?: boolean;
  /** Callback to toggle AI director drawer. */
  onToggleAiDrawer?: () => void;
  /** Callback to open Command Palette. */
  onOpenCommandPalette?: () => void;
}

/**
 * Top menu bar with 5-workspace tabs, breadcrumb, file actions, and history.
 */
export function MenuBar({
  mode,
  onModeChange,
  breadcrumb,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onOpenProject,
  onImport,
  onExport,
  isAiDrawerOpen,
  onToggleAiDrawer,
  onOpenCommandPalette,
}: MenuBarProps): React.JSX.Element {
  return (
    <header className="menubar">
      {/* Logo / App Name */}
      <div className="menubar__brand">
        <span className="menubar__logo">◈</span>
        <span className="menubar__name">Parallax Studio</span>
      </div>

      {/* Breadcrumb Context */}
      {breadcrumb && (
        <div className="menubar__breadcrumbs" title={breadcrumb}>
          <span className="menubar__breadcrumb-item">{breadcrumb}</span>
        </div>
      )}

      {/* 5-Workspace Switcher */}
      <div className="menubar__modes" role="tablist" aria-label="Workspaces">
        {WORKSPACES.map((ws) => {
          const isActive = mode === ws.id;
          return (
            <button
              key={ws.id}
              role="tab"
              aria-selected={isActive}
              className={`menubar__mode ${isActive ? 'menubar__mode--active' : ''}`}
              onClick={() => onModeChange(ws.id)}
              title={`${ws.labelVi} / ${ws.labelEn} workspace`}
            >
              <span aria-hidden="true">{ws.icon}</span>
              <span>{ws.labelVi}</span>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="menubar__spacer" />

      {/* Actions */}
      <div className="menubar__actions">
        <Button
          icon={Search} iconOnly size="sm" variant="ghost"
          title="Command Palette (Ctrl+K)" onClick={onOpenCommandPalette}
          id="btn-command-palette"
        />
        <div className="menubar__divider" />
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
          icon={FolderOpen} iconOnly size="sm" variant="ghost"
          title="Open Project (Ctrl+O)" onClick={onOpenProject}
          id="btn-open"
        />
        <Button
          icon={Save} iconOnly size="sm" variant="ghost"
          title="Save Project (Ctrl+S)" onClick={onSave}
          id="btn-save"
        />
        <Button
          icon={Upload} iconOnly size="sm" variant="ghost"
          title="Import Image" onClick={onImport}
          id="btn-import"
        />
        <div className="menubar__divider" />
        <Button
          icon={Sparkles}
          size="sm"
          variant={isAiDrawerOpen ? 'primary' : 'ghost'}
          title="Trợ lý Đạo diễn AI (AI Filmmaker Assistant)"
          onClick={onToggleAiDrawer}
          id="btn-ai-director"
        >
          AI Director
        </Button>
        <Button
          icon={Download}
          size="sm"
          variant="primary"
          title="Export Animation Video (.webm)"
          onClick={onExport}
          id="btn-export"
        >
          Export
        </Button>
      </div>
    </header>
  );
}
