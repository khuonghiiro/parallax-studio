import React, { useCallback, useState } from 'react';
import { MenuBar } from './layout/MenuBar.js';
import { StatusBar } from './layout/StatusBar.js';
import { HierarchyPanel } from '../features/rig/HierarchyPanel.js';
import { PropertiesPanel } from '../features/rig/PropertiesPanel.js';
import { ViewportPanel } from '../features/stage/ViewportPanel.js';
import { TimelinePanel } from '../features/timeline/TimelinePanel.js';
import { EditorProvider, useEditor } from './EditorContext.js';
import { recordCanvasToWebm, downloadBlob } from '../features/export/video-exporter.js';
import '../ui/tokens.css';
import './App.css';

/**
 * Main application shell inside EditorProvider.
 */
function EditorLayout(): React.JSX.Element {
  const {
    mode,
    setMode,
    fps,
    currentFrame,
    snapshot,
    projectState,
    setIsPlaying,
  } = useEditor();

  const [exportProgress, setExportProgress] = useState<number | null>(null);

  const handleSave = useCallback(() => {
    if (!snapshot) return;

    const assetsData = projectState.getAllAssetData();
    const scenesData = projectState.getAllSceneData();

    const fullProject = {
      manifest: snapshot.manifest,
      assets: assetsData,
      scenes: scenesData,
      savedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(fullProject, null, 2);
    // Persist to browser storage
    try {
      localStorage.setItem('parallax_project', json);
    } catch {
      // Ignore if quota exceeded
    }

    // Also download JSON file
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `${snapshot.manifest.name.toLowerCase().replace(/\s+/g, '_')}.parallax.json`);

    projectState.markSaved();
  }, [snapshot, projectState]);

  const handleExport = useCallback(async () => {
    const canvas = document.querySelector('.viewport__canvas canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      alert('Viewport canvas not found for export');
      return;
    }

    setIsPlaying(true);
    setExportProgress(0);

    try {
      const blob = await recordCanvasToWebm(canvas, 5000, 24, (p) => {
        setExportProgress(p);
      });
      downloadBlob(blob, 'parallax_animation.webm');
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExportProgress(null);
    }
  }, [setIsPlaying]);

  const handleImport = useCallback(() => {
    const fileInput = document.querySelector('.viewport input[type="file"]') as HTMLInputElement | null;
    fileInput?.click();
  }, []);

  const statusMsg = exportProgress !== null
    ? `Exporting video: ${exportProgress}%`
    : snapshot?.dirty
    ? 'Unsaved changes'
    : 'Ready';

  return (
    <div className="editor">
      {/* Top Menu Bar */}
      <MenuBar
        mode={mode}
        onModeChange={(newMode) => {
          setMode(newMode);
          setIsPlaying(newMode === 'animate');
        }}
        canUndo={false}
        canRedo={false}
        onUndo={() => {}}
        onRedo={() => {}}
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
        message={statusMsg}
        fps={fps}
        currentFrame={currentFrame}
        totalFrames={120}
        gpuReady={true}
      />
    </div>
  );
}

/**
 * Root application component wrapped with context provider.
 */
export function App(): React.JSX.Element {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  );
}
