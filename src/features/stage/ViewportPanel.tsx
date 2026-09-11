import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  MousePointer2, Move, RotateCcw, Maximize2,
  Pentagon, Paintbrush, Bone,
  Grid3x3, Sparkles, Upload,
} from 'lucide-react';
import { applyPoseToSkeleton } from '@parallax/runtime';
import { Button } from '../../ui/Button.js';
import { useEditor } from '../../app/EditorContext.js';
import { ViewportController, type OverlaySettings } from './viewport-controller.js';
import { buildAssetMesh, type BuiltMeshResult } from './mesh-builder.js';
import './ViewportPanel.css';

export interface ViewportPanelProps {
  mode: 'setup' | 'animate';
}

/**
 * Central viewport — Three.js canvas + toolbar + overlay toggles.
 */
export function ViewportPanel({
  mode,
}: ViewportPanelProps): React.JSX.Element {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<ViewportController | null>(null);
  const currentBuiltRef = useRef<BuiltMeshResult | null>(null);

  const {
    snapshot,
    selectedAssetId,
    projectState,
    setFps,
    currentFrame,
    setCurrentFrame,
    isPlaying,
    importImageFile,
    loadDemoCharacter,
  } = useEditor();

  const [overlays, setOverlaysState] = useState<OverlaySettings>({
    showGrid: true,
    showWireframe: false,
    showSkeleton: true,
    showHeatmap: false,
  });

  // Initialize Three.js viewport controller
  useEffect(() => {
    if (!canvasRef.current) return;

    const controller = new ViewportController({
      container: canvasRef.current,
      onFpsUpdate: (fps) => setFps(fps),
    });
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [setFps]);

  // Sync overlays to controller
  useEffect(() => {
    controllerRef.current?.setOverlays(overlays);
  }, [overlays]);

  // Load and display selected asset mesh
  useEffect(() => {
    if (!selectedAssetId || !controllerRef.current) {
      if (!selectedAssetId && controllerRef.current) {
        controllerRef.current.clearContent();
        controllerRef.current.clearOverlays();
        currentBuiltRef.current = null;
      }
      return;
    }

    const asset = projectState.getAssetData(selectedAssetId);
    if (!asset) return;

    let isCancelled = false;

    buildAssetMesh(asset).then((built) => {
      if (isCancelled || !controllerRef.current) return;

      currentBuiltRef.current = built;
      controllerRef.current.clearContent();
      controllerRef.current.clearOverlays();

      controllerRef.current.addContent(built.mesh);

      if (built.skeletonHelper) {
        controllerRef.current.addOverlay(built.skeletonHelper);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedAssetId, snapshot, projectState]);

  // Playback & deformation animation loop
  useEffect(() => {
    const built = currentBuiltRef.current;
    if (!built?.skeleton) return;

    // Evaluate procedural or keyframed pose for preview
    const t = currentFrame * 0.08;
    const rotations = new Map<string, number>();

    if (mode === 'animate' || isPlaying) {
      // Natural sway/walk deformation demo
      rotations.set('spine', Math.sin(t) * 0.1);
      rotations.set('upper_arm_l', Math.sin(t) * 0.45);
      rotations.set('forearm_l', Math.max(0, Math.sin(t + 0.5) * 0.4));
      rotations.set('upper_arm_r', -Math.sin(t) * 0.45);
      rotations.set('forearm_r', Math.max(0, -Math.sin(t + 0.5) * 0.4));
      rotations.set('thigh_l', -Math.sin(t) * 0.35);
      rotations.set('shin_l', Math.max(0, Math.sin(t) * 0.35));
      rotations.set('thigh_r', Math.sin(t) * 0.35);
      rotations.set('shin_r', Math.max(0, -Math.sin(t) * 0.35));
      rotations.set('head', Math.sin(t * 0.5) * 0.08);
    } else {
      // Rest pose in setup mode
      rotations.set('spine', 0);
      rotations.set('upper_arm_l', 0);
      rotations.set('forearm_l', 0);
      rotations.set('upper_arm_r', 0);
      rotations.set('forearm_r', 0);
    }

    applyPoseToSkeleton(built.skeleton, rotations);
  }, [currentFrame, mode, isPlaying]);

  // Animation timeline advance when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % 120);
    }, 1000 / 24);

    return () => clearInterval(interval);
  }, [isPlaying, setCurrentFrame]);

  const handleToggleGrid = useCallback(() => {
    setOverlaysState((prev) => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const handleToggleWireframe = useCallback(() => {
    setOverlaysState((prev) => ({ ...prev, showWireframe: !prev.showWireframe }));
  }, []);

  const handleToggleSkeleton = useCallback(() => {
    setOverlaysState((prev) => ({ ...prev, showSkeleton: !prev.showSkeleton }));
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        importImageFile(file);
      }
    },
    [importImageFile],
  );

  const hasAssets = Boolean(snapshot && Object.keys(snapshot.manifest.assets).length > 0);

  return (
    <div className="viewport">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

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
              title="Mesh Wireframe (Ctrl+M)"
              active={overlays.showWireframe}
              onClick={handleToggleWireframe}
            />
            <Button
              icon={Paintbrush} iconOnly size="sm" variant="ghost"
              title="Weight Heatmap (W)"
              active={overlays.showHeatmap}
              onClick={() => setOverlaysState((p) => ({ ...p, showHeatmap: !p.showHeatmap }))}
            />
            <Button
              icon={Bone} iconOnly size="sm" variant="ghost"
              title="Skeleton Overlay (Ctrl+B)"
              active={overlays.showSkeleton}
              onClick={handleToggleSkeleton}
            />
          </ToolGroup>
        )}

        <div className="viewport__toolbar-spacer" />

        {/* Overlay Toggles */}
        <ToolGroup label="Overlays">
          <Button
            icon={Grid3x3} iconOnly size="sm" variant="ghost"
            title="Toggle Grid (G)"
            active={overlays.showGrid}
            onClick={handleToggleGrid}
          />
          <Button
            icon={Pentagon} iconOnly size="sm" variant="ghost"
            title="Toggle Wireframe (Ctrl+M)"
            active={overlays.showWireframe}
            onClick={handleToggleWireframe}
          />
          <Button
            icon={Bone} iconOnly size="sm" variant="ghost"
            title="Toggle Skeleton (Ctrl+B)"
            active={overlays.showSkeleton}
            onClick={handleToggleSkeleton}
          />
        </ToolGroup>
      </div>

      {/* Canvas Area */}
      <div className="viewport__canvas" ref={canvasRef}>
        {!hasAssets && (
          <div className="viewport__empty">
            <span className="viewport__empty-icon">◈</span>
            <h3>Parallax Studio</h3>
            <p>Import an image or launch a demo character to start 2.5D animation</p>
            <div className="viewport__empty-actions" style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button
                icon={Sparkles}
                variant="primary"
                onClick={loadDemoCharacter}
              >
                Load Demo Character
              </Button>
              <Button
                icon={Upload}
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Import Image...
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
