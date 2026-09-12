import React, { useCallback, useState, useEffect, useRef } from 'react';
import { MenuBar } from './layout/MenuBar.js';
import { StatusBar } from './layout/StatusBar.js';
import { HierarchyPanel } from '../features/rig/HierarchyPanel.js';
import { PropertiesPanel } from '../features/rig/PropertiesPanel.js';
import { ViewportPanel } from '../features/stage/ViewportPanel.js';
import { TimelinePanel } from '../features/timeline/TimelinePanel.js';
import { EditorProvider, useEditor } from './EditorContext.js';
import { recordCanvasToWebm, downloadBlob } from '../features/export/video-exporter.js';
import { AiDirectorDrawer } from '../features/director/AiDirectorDrawer.js';
import { CommandPalette } from '../ui/CommandPalette.js';
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
    setCurrentFrame,
    snapshot,
    projectState,
    selectedAssetId,
    getAssetData,
    activeClipId,
    isPlaying,
    setIsPlaying,
    importImageFile,
    loadDemoCharacter,
    loadProjectFile,
  } = useEditor();

  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  const selectedAsset = selectedAssetId ? getAssetData(selectedAssetId) : undefined;
  const projectName = snapshot?.manifest.name || 'Parallax Film Project';

  const breadcrumb = React.useMemo(() => {
    const assetLabel = selectedAsset ? selectedAsset.name : 'Drawing Canvas';
    switch (mode) {
      case 'draw':
        return `${projectName} / ${assetLabel} (Drawing Cels)`;
      case 'rig':
        return `${projectName} / ${assetLabel} / Mesh & Skeleton`;
      case 'animate':
        return `${projectName} / ${assetLabel} / Clip: ${activeClipId}`;
      case 'compose':
        return `${projectName} / Scene 1 / 2.5D Stage`;
      case 'edit':
        return `${projectName} / Sequence / Render Profile`;
      default:
        return projectName;
    }
  }, [projectName, mode, selectedAsset, activeClipId]);

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
    imageFileInputRef.current?.click();
  }, []);

  const handleImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await importImageFile(file);
      }
      if (e.target) e.target.value = '';
    },
    [importImageFile],
  );

  const handleOpenProject = useCallback(() => {
    projectFileInputRef.current?.click();
  }, []);

  const handleProjectFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const success = await loadProjectFile(file);
        if (!success) {
          alert('Không thể mở tệp dự án. Vui lòng kiểm tra định dạng .parallax.json');
        }
      }
      if (e.target) e.target.value = '';
    },
    [loadProjectFile],
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (e.target as HTMLElement)?.tagName,
      );

      // Ctrl+K / Cmd+K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl+S / Cmd+S: Save Project
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Ctrl+O / Cmd+O: Open Project
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenProject();
        return;
      }

      // Non-input shortcuts
      if (!isInput) {
        if (e.code === 'Space') {
          e.preventDefault();
          setIsPlaying(!isPlaying);
          return;
        }
        if (e.key === '1') setMode('draw');
        else if (e.key === '2') setMode('rig');
        else if (e.key === '3') setMode('animate');
        else if (e.key === '4') setMode('compose');
        else if (e.key === '5') setMode('edit');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleOpenProject, isPlaying, setIsPlaying, setMode]);

  const handleCommandSelect = useCallback(
    (cmdId: string) => {
      if (cmdId === 'ws:draw') setMode('draw');
      else if (cmdId === 'ws:rig') setMode('rig');
      else if (cmdId === 'ws:animate') setMode('animate');
      else if (cmdId === 'ws:compose') setMode('compose');
      else if (cmdId === 'ws:edit') setMode('edit');
      else if (cmdId === 'proj:save') handleSave();
      else if (cmdId === 'proj:open') handleOpenProject();
      else if (cmdId === 'proj:import') handleImport();
      else if (cmdId === 'proj:demo') loadDemoCharacter();
      else if (cmdId === 'proj:export') handleExport();
      else if (cmdId === 'ai:drawer') setIsAiDrawerOpen(true);
      else if (cmdId === 'play:toggle') setIsPlaying(!isPlaying);
      else if (cmdId === 'play:rewind') setCurrentFrame(0);
    },
    [
      setMode,
      handleSave,
      handleOpenProject,
      handleImport,
      loadDemoCharacter,
      handleExport,
      isPlaying,
      setIsPlaying,
      setCurrentFrame,
    ],
  );

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
        }}
        breadcrumb={breadcrumb}
        canUndo={false}
        canRedo={false}
        onUndo={() => {}}
        onRedo={() => {}}
        onSave={handleSave}
        onOpenProject={handleOpenProject}
        onImport={handleImport}
        onExport={handleExport}
        isAiDrawerOpen={isAiDrawerOpen}
        onToggleAiDrawer={() => setIsAiDrawerOpen((prev) => !prev)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* Hidden file inputs for global image and project import */}
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFileChange}
      />
      <input
        ref={projectFileInputRef}
        type="file"
        accept=".json,.parallax.json"
        style={{ display: 'none' }}
        onChange={handleProjectFileChange}
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

      {/* AI Filmmaker Assistant Drawer */}
      <AiDirectorDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectCommand={handleCommandSelect}
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
