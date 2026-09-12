import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  MousePointer2, Move, RotateCcw, Maximize2,
  Pentagon, Paintbrush, Bone,
  Grid3x3, Sparkles, Upload,
  Camera, Sun,
} from 'lucide-react';
import { applyPoseToSkeleton } from '@parallax/runtime';
import type { ViewAngle } from '@parallax/contracts';
import { Button } from '../../ui/Button.js';
import { useEditor } from '../../app/EditorContext.js';
import { ViewportController, type OverlaySettings } from './viewport-controller.js';
import { buildAssetMesh, type BuiltMeshResult } from './mesh-builder.js';
import {
  applyWeightBrush,
  computeHeatmapColors,
  type WeightBrushConfig,
} from './weight-painter.js';
import './ViewportPanel.css';

export interface ViewportPanelProps {
  mode: 'setup' | 'animate';
}

export type ActiveTool = 'select' | 'move' | 'rotate' | 'scale' | 'weight-paint';

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
    setSelectedAssetId,
    selectedBoneId,
    projectState,
    getAssetData,
    setFps,
    currentFrame,
    setCurrentFrame,
    isPlaying,
    activeClipId,
    importImageFile,
    loadDemoCharacter,
    dispatch,
  } = useEditor();

  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [brushConfig, setBrushConfig] = useState<WeightBrushConfig>({
    radius: 45,
    intensity: 0.35,
    mode: 'add',
  });
  const [isPainting, setIsPainting] = useState<boolean>(false);
  const tempWeightsRef = useRef<import('@parallax/contracts').VertexWeight[] | null>(null);

  const [overlays, setOverlaysState] = useState<OverlaySettings>({
    showGrid: true,
    showWireframe: false,
    showSkeleton: true,
    showHeatmap: false,
  });

  const [cameraMode, setCameraMode] = useState<'orthographic' | 'perspective'>('orthographic');
  const [showShadows, setShowShadows] = useState<boolean>(true);

  // Auto-select first asset if none is selected and assets exist
  useEffect(() => {
    if (!selectedAssetId && snapshot?.assets && snapshot.assets.size > 0) {
      const firstId = snapshot.assets.keys().next().value;
      if (firstId) {
        setSelectedAssetId(firstId);
      }
    }
  }, [selectedAssetId, snapshot, setSelectedAssetId]);

  const asset = selectedAssetId ? getAssetData(selectedAssetId) : undefined;
  const activeViewAngle = (asset?.viewSet?.activeView ?? 'front') as ViewAngle;

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

    const currentAsset = getAssetData(selectedAssetId);
    if (!currentAsset) return;

    let isCancelled = false;

    buildAssetMesh(currentAsset).then((built) => {
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
  }, [selectedAssetId, snapshot, getAssetData]);

  // Playback & deformation animation loop
  useEffect(() => {
    const built = currentBuiltRef.current;
    if (!built?.skeleton) return;

    if (built.skeletonHelper) {
      built.skeletonHelper.visible = mode === 'setup' && !isPlaying;
    }

    // Evaluate procedural or keyframed pose for preview
    const t = currentFrame * 0.08;
    const rotations = new Map<string, number>();

    if (mode === 'animate' || isPlaying) {
      if (activeClipId === 'idle') {
        // 1. Natural Breathing Idle: Single harmonic biological rhythm
        // Chest gently lifts, head counter-balances. Legs are firmly planted (ZERO wobbling).
        const breath = Math.sin(t * 0.45) * 0.028;

        rotations.set('spine', breath * 0.8);
        rotations.set('neck', -breath * 0.35);
        rotations.set('head', Math.sin(t * 0.25) * 0.015);

        // Arms hang naturally at rest with gentle micro-follow of breath
        rotations.set('upper_arm_l', 0.02 + breath * 0.25);
        rotations.set('forearm_l', 0.04);
        rotations.set('hand_l', 0);

        rotations.set('upper_arm_r', -0.02 - breath * 0.25);
        rotations.set('forearm_r', 0.04);
        rotations.set('hand_r', 0);

        // Legs are firmly planted on the ground (zero wobbling)
        rotations.set('thigh_l', 0);
        rotations.set('shin_l', 0);
        rotations.set('foot_l', 0);
        rotations.set('thigh_r', 0);
        rotations.set('shin_r', 0);
        rotations.set('foot_r', 0);
      } else if (activeClipId === 'walk') {
        // 2. Royal Knight Walk: Noble front-facing stride with coordinated smooth sway
        // Pure harmonic curves guarantee zero popping, tearing, or limb pinching
        const walkPhase = t * 0.9;
        const stride = Math.sin(walkPhase);

        // Smooth subtle weight shift
        rotations.set('thigh_l', stride * 0.04);
        rotations.set('shin_l', (1 - Math.cos(walkPhase)) * 0.025);
        rotations.set('foot_l', -stride * 0.02);

        rotations.set('thigh_r', -stride * 0.04);
        rotations.set('shin_r', (1 - Math.cos(walkPhase + Math.PI)) * 0.025);
        rotations.set('foot_r', stride * 0.02);

        // Smooth arm counter-swing
        rotations.set('upper_arm_l', -stride * 0.05);
        rotations.set('forearm_l', 0.02 + (1 - Math.cos(walkPhase)) * 0.02);
        rotations.set('hand_l', 0);

        rotations.set('upper_arm_r', stride * 0.05);
        rotations.set('forearm_r', -0.02 - (1 - Math.cos(walkPhase + Math.PI)) * 0.02);
        rotations.set('hand_r', 0);

        // Torso vertical bounce (two beats per full cycle)
        rotations.set('spine', Math.sin(walkPhase * 2) * 0.008);
        rotations.set('neck', 0);
        rotations.set('head', -Math.sin(walkPhase * 2) * 0.005);
      } else if (activeClipId === 'ready') {
        // 3. Combat Ready Stance: Heroic guard posture framing chest & sword hilt
        const breath = Math.sin(t * 0.5) * 0.012;

        // Grounded, braced stance
        rotations.set('thigh_l', -0.02);
        rotations.set('shin_l', 0.02);
        rotations.set('foot_l', 0);
        rotations.set('thigh_r', 0.02);
        rotations.set('shin_r', -0.02);
        rotations.set('foot_r', 0);

        // Arms poised inward in heroic combat guard
        rotations.set('upper_arm_l', 0.04);
        rotations.set('forearm_l', 0.08);
        rotations.set('hand_l', 0.02);

        rotations.set('upper_arm_r', -0.04);
        rotations.set('forearm_r', -0.08);
        rotations.set('hand_r', -0.02);

        // Alert torso posture
        rotations.set('spine', -0.02 + breath * 0.5);
        rotations.set('neck', 0.01);
        rotations.set('head', 0.015 - breath * 0.25);
      }
    } else {
      // Rest pose in setup mode
      rotations.set('spine', 0);
      rotations.set('neck', 0);
      rotations.set('head', 0);
      rotations.set('upper_arm_l', 0);
      rotations.set('forearm_l', 0);
      rotations.set('hand_l', 0);
      rotations.set('upper_arm_r', 0);
      rotations.set('forearm_r', 0);
      rotations.set('hand_r', 0);
      rotations.set('thigh_l', 0);
      rotations.set('shin_l', 0);
      rotations.set('foot_l', 0);
      rotations.set('thigh_r', 0);
      rotations.set('shin_r', 0);
      rotations.set('foot_r', 0);
    }

    applyPoseToSkeleton(built.skeleton, rotations);
  }, [currentFrame, mode, isPlaying, activeClipId]);

  // Animation timeline advance when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % 120);
    }, 1000 / 24);

    return () => clearInterval(interval);
  }, [isPlaying, setCurrentFrame]);

  // Heatmap overlay & brush preview update
  useEffect(() => {
    if (!controllerRef.current || !asset?.mesh) return;

    if (overlays.showHeatmap && selectedBoneId && asset.weights) {
      const colors = computeHeatmapColors(
        tempWeightsRef.current || asset.weights,
        selectedBoneId,
        asset.mesh.vertexCount,
      );
      controllerRef.current.updateMeshHeatmap(colors);
    } else {
      controllerRef.current.updateMeshHeatmap(null);
    }
  }, [overlays.showHeatmap, selectedBoneId, asset]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === 'weight-paint' && e.button === 0 && selectedBoneId && asset?.mesh && asset?.weights) {
        setIsPainting(true);
        tempWeightsRef.current = [...asset.weights];
        if (!controllerRef.current) return;
        const worldPos = controllerRef.current.clientToWorld(e.clientX, e.clientY);
        const curWeights = tempWeightsRef.current || asset.weights;
        const newWeights = applyWeightBrush(
          asset.mesh.vertices,
          curWeights,
          selectedBoneId,
          { x: worldPos.x, y: worldPos.y },
          brushConfig,
        );
        tempWeightsRef.current = newWeights;
        const colors = computeHeatmapColors(newWeights, selectedBoneId, asset.mesh.vertexCount);
        controllerRef.current.updateMeshHeatmap(colors);
      }
    },
    [activeTool, selectedBoneId, asset, brushConfig],
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPainting && activeTool === 'weight-paint' && selectedBoneId && asset?.mesh && controllerRef.current) {
        const worldPos = controllerRef.current.clientToWorld(e.clientX, e.clientY);
        const curWeights = tempWeightsRef.current || asset.weights || [];
        const newWeights = applyWeightBrush(
          asset.mesh.vertices,
          curWeights,
          selectedBoneId,
          { x: worldPos.x, y: worldPos.y },
          brushConfig,
        );
        tempWeightsRef.current = newWeights;
        const colors = computeHeatmapColors(newWeights, selectedBoneId, asset.mesh.vertexCount);
        controllerRef.current.updateMeshHeatmap(colors);
      }
    },
    [isPainting, activeTool, selectedBoneId, asset, brushConfig],
  );

  const handleCanvasMouseUp = useCallback(async () => {
    if (isPainting) {
      setIsPainting(false);
      if (tempWeightsRef.current && selectedAssetId) {
        await dispatch({
          type: 'set_weights',
          domain: 'rig',
          targetId: selectedAssetId,
          data: { assetId: selectedAssetId, weights: tempWeightsRef.current },
        });
        tempWeightsRef.current = null;
      }
    }
  }, [isPainting, selectedAssetId, dispatch]);

  const handleSwitchView = useCallback(
    async (angle: ViewAngle) => {
      if (!selectedAssetId) return;
      await dispatch({
        type: 'set_active_view',
        domain: 'asset',
        targetId: selectedAssetId,
        data: { assetId: selectedAssetId, viewAngle: angle },
      });
    },
    [selectedAssetId, dispatch],
  );

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
            title="Select (V)" active={activeTool === 'select'}
            onClick={() => setActiveTool('select')}
          />
          <Button
            icon={Move} iconOnly size="sm" variant="ghost"
            title="Move (G)" active={activeTool === 'move'}
            onClick={() => setActiveTool('move')}
          />
          <Button
            icon={RotateCcw} iconOnly size="sm" variant="ghost"
            title="Rotate (R)" active={activeTool === 'rotate'}
            onClick={() => setActiveTool('rotate')}
          />
          <Button
            icon={Maximize2} iconOnly size="sm" variant="ghost"
            title="Scale (S)" active={activeTool === 'scale'}
            onClick={() => setActiveTool('scale')}
          />
          {mode === 'setup' && (
            <Button
              icon={Paintbrush} iconOnly size="sm" variant="ghost"
              title="Weight Paint Brush"
              active={activeTool === 'weight-paint'}
              onClick={() => {
                setActiveTool('weight-paint');
                setOverlaysState((p) => ({ ...p, showHeatmap: true }));
              }}
            />
          )}
          {mode === 'setup' && activeTool === 'weight-paint' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '0 4px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
              }}
            >
              <span>{brushConfig.radius}px</span>
              <input
                type="range"
                min="15"
                max="120"
                value={brushConfig.radius}
                onChange={(e) =>
                  setBrushConfig((prev) => ({
                    ...prev,
                    radius: Number(e.target.value),
                  }))
                }
                style={{ width: '50px', height: '14px' }}
                title={`Brush Radius: ${brushConfig.radius}px`}
              />
            </div>
          )}
        </ToolGroup>

        {mode === 'setup' && (
          <ToolGroup label="View Angles">
            <div style={{ display: 'flex', gap: 2 }}>
              {(['front', 'quarter-left', 'quarter-right', 'side-left', 'back'] as const).map((angle) => {
                const labelMap: Record<string, string> = {
                  'front': 'Front',
                  'quarter-left': '3/4 L',
                  'quarter-right': '3/4 R',
                  'side-left': 'Side',
                  'back': 'Back',
                };
                return (
                  <button
                    key={angle}
                    className={`btn btn--sm ${activeViewAngle === angle ? 'btn--primary' : 'btn--ghost'}`}
                    style={{ fontSize: '11px', padding: '2px 6px', height: '26px' }}
                    onClick={() => handleSwitchView(angle)}
                  >
                    {labelMap[angle] ?? angle}
                  </button>
                );
              })}
            </div>
          </ToolGroup>
        )}

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

        {/* Filmmaking & Camera Parallax */}
        <ToolGroup label="Filmmaking">
          <Button
            icon={Camera}
            iconOnly
            size="sm"
            variant="ghost"
            title={cameraMode === 'perspective' ? 'Camera: 2.5D Parallax' : 'Camera: 2D Orthographic'}
            active={cameraMode === 'perspective'}
            onClick={() =>
              setCameraMode((prev) => (prev === 'perspective' ? 'orthographic' : 'perspective'))
            }
          />
          <Button
            icon={Sun}
            iconOnly
            size="sm"
            variant="ghost"
            title={showShadows ? 'Realtime Shadows: Active' : 'Realtime Shadows: Off'}
            active={showShadows}
            onClick={() => setShowShadows((prev) => !prev)}
          />
        </ToolGroup>

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
      <div
        className="viewport__canvas"
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        style={{ cursor: activeTool === 'weight-paint' ? 'crosshair' : 'default' }}
      >
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
