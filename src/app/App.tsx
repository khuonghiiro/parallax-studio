import React, { useState, useCallback } from 'react';
import { MenuBar, type EditorMode } from './layout/MenuBar.js';
import { StatusBar } from './layout/StatusBar.js';
import { HierarchyPanel } from '../features/rig/HierarchyPanel.js';
import { PropertiesPanel } from '../features/rig/PropertiesPanel.js';
import { ViewportPanel } from '../features/stage/ViewportPanel.js';
import { TimelinePanel } from '../features/timeline/TimelinePanel.js';
import '../ui/tokens.css';
import './App.css';

/**
 * Root application component.
 * Professional 4-panel layout matching Spine/Live2D/Rive architecture.
 */
export function App(): React.JSX.Element {
  const [mode, setMode] = useState<EditorMode>('setup');

  const handleUndo = useCallback(() => {
    // TODO: wire to UndoRedoManager
  }, []);

  const handleRedo = useCallback(() => {
    // TODO: wire to UndoRedoManager
  }, []);

  const handleSave = useCallback(() => {
    // TODO: wire to project save
  }, []);

  const handleImport = useCallback(() => {
    // TODO: wire to asset import dialog
  }, []);

  const handleExport = useCallback(() => {
    // TODO: wire to export dialog
  }, []);

  return (
    <div className="editor">
      {/* Top Menu Bar */}
      <MenuBar
        mode={mode}
        onModeChange={setMode}
        canUndo={false}
        canRedo={false}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
        onImport={handleImport}
        onExport={handleExport}
      />

      {/* Main Content Area: Left | Center | Right */}
      <div className="editor__body">
        {/* Left Panel — Hierarchy */}
        <aside className="editor__left">
          <HierarchyPanel mode={mode} />
        </aside>

        {/* Center — Viewport */}
        <main className="editor__center">
          <ViewportPanel mode={mode} />
        </main>

        {/* Right Panel — Properties */}
        <aside className="editor__right">
          <PropertiesPanel mode={mode} />
        </aside>
      </div>

      {/* Bottom — Timeline */}
      <div className="editor__bottom">
        <TimelinePanel />
      </div>

      {/* Status Bar */}
      <StatusBar
        message="Ready"
        fps={60}
        currentFrame={0}
        totalFrames={300}
        gpuReady={true}
      />
    </div>
  );
}
