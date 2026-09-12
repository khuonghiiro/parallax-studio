import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useEditor } from '../../app/EditorContext.js';
import { LayerStackPanel, type CanvasLayer } from './LayerStackPanel.js';
import { CelStrip, type CelItem } from './CelStrip.js';
import { renderOnionSkin } from './onion-skin.js';
import { floodFill, hexToRgba } from './flood-fill.js';
import { DrawingToolbar } from './DrawingToolbar.js';
import {
  type Point,
  type BrushType,
  type BrushSettings,
  drawSmoothedSegment,
} from './stroke-smoother.js';
import {
  type ViewportTransform,
  screenToCanvasCoords,
  mirrorPoint,
} from './canvas-navigator.js';
import './DrawingCanvas.css';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;

export type DrawTool = 'brush' | 'eraser' | 'eyedropper' | 'fill';

interface CelData {
  id: string;
  name: string;
  layersData: Record<string, ImageData>;
}

function createBlankCanvas(w = CANVAS_WIDTH, h = CANVAS_HEIGHT): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  return c;
}

export function DrawingCanvas(): React.JSX.Element {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const onionCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<DrawTool>('brush');
  const [brushType, setBrushType] = useState<BrushType>('pen');
  const [color, setColor] = useState<string>('#6380ff');
  const [size, setSize] = useState<number>(12);
  const [symmetry, setSymmetry] = useState<boolean>(false);
  const [lightTable, setLightTable] = useState<boolean>(false);

  // Zoom and Pan transform
  const [transform, setTransform] = useState<ViewportTransform>({
    zoom: 1.0,
    panX: 0,
    panY: 0,
  });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const pointsRef = useRef<Point[]>([]);

  const isSpaceDownRef = useRef<boolean>(false);

  // Layers stack
  const [layers, setLayers] = useState<CanvasLayer[]>(() => [
    {
      id: 'layer-bg',
      name: 'Phác thảo (Sketch)',
      visible: true,
      locked: false,
      opacity: 1.0,
      canvas: createBlankCanvas(),
    },
    {
      id: 'layer-ink',
      name: 'Nét mực (Inking)',
      visible: true,
      locked: false,
      opacity: 1.0,
      canvas: createBlankCanvas(),
    },
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>('layer-ink');

  // Cel sequence & Onion Skin
  const [cels, setCels] = useState<CelData[]>([
    { id: 'cel-1', name: 'Cel 1', layersData: {} },
  ]);
  const [activeCelIndex, setActiveCelIndex] = useState<number>(0);
  const [showOnionSkin, setShowOnionSkin] = useState<boolean>(true);
  const [onionOpacity, setOnionOpacity] = useState<number>(0.35);
  const [isPlayingLoop, setIsPlayingLoop] = useState<boolean>(false);

  // Undo / Redo
  const historyRef = useRef<ImageData[]>([]);
  const historyStepRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const {
    dispatch,
    selectedAssetId,
    setSelectedAssetId,
    setSelectedInstanceId,
    projectState,
    getAssetData,
    setWorkspace,
    setMode,
  } = useEditor();

  const currentAsset = selectedAssetId ? getAssetData(selectedAssetId) : undefined;
  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  // Composite all visible layers onto the display canvas
  const compositeLayers = useCallback(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    for (const layer of layers) {
      if (layer.visible && layer.opacity > 0) {
        ctx.globalAlpha = lightTable && layer.id === 'layer-bg' ? 0.35 : layer.opacity;
        ctx.drawImage(layer.canvas, 0, 0);
      }
    }
    ctx.globalAlpha = 1.0;
  }, [layers, lightTable]);

  // Push main canvas snapshot to history
  const pushHistory = useCallback(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    compositeLayers();
    const snap = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
    historyRef.current.push(snap);
    historyStepRef.current = historyRef.current.length - 1;

    setCanUndo(historyStepRef.current > 0);
    setCanRedo(false);
  }, [compositeLayers]);

  // Update onion skin overlay
  const updateOnionSkin = useCallback(() => {
    const onionCanvas = onionCanvasRef.current;
    if (!onionCanvas || !showOnionSkin) {
      if (onionCanvas) {
        const ctx = onionCanvas.getContext('2d');
        ctx?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      return;
    }
    const ctx = onionCanvas.getContext('2d');
    if (!ctx) return;

    const prevCel = activeCelIndex > 0 ? cels[activeCelIndex - 1] : null;
    const nextCel = activeCelIndex < cels.length - 1 ? cels[activeCelIndex + 1] : null;

    const prevImg = prevCel?.layersData[activeLayerId] || null;
    const nextImg = nextCel?.layersData[activeLayerId] || null;

    renderOnionSkin(ctx, prevImg, nextImg, { opacity: onionOpacity });
  }, [showOnionSkin, activeCelIndex, cels, activeLayerId, onionOpacity]);

  useEffect(() => {
    compositeLayers();
    updateOnionSkin();
  }, [compositeLayers, updateOnionSkin]);

  // Space key tracking for canvas panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        isSpaceDownRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDownRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Cel playback loop
  useEffect(() => {
    if (!isPlayingLoop || cels.length <= 1) return;
    const interval = setInterval(() => {
      setActiveCelIndex((prev) => (prev + 1) % cels.length);
    }, 125);
    return () => clearInterval(interval);
  }, [isPlayingLoop, cels.length]);

  // Save current layers to active cel snapshot before changing
  const saveActiveCelSnapshot = useCallback(() => {
    const activeCel = cels[activeCelIndex];
    if (!activeCel) return;
    const snapData: Record<string, ImageData> = {};
    for (const l of layers) {
      const ctx = l.canvas.getContext('2d');
      if (ctx) {
        snapData[l.id] = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }
    activeCel.layersData = snapData;
  }, [cels, activeCelIndex, layers]);

  // Switch cel
  const handleSelectCel = useCallback((index: number) => {
    if (index === activeCelIndex || index < 0 || index >= cels.length) return;
    saveActiveCelSnapshot();
    setActiveCelIndex(index);

    const targetCel = cels[index];
    if (!targetCel) return;

    for (const l of layers) {
      const ctx = l.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const data = targetCel.layersData[l.id];
        if (data) {
          ctx.putImageData(data, 0, 0);
        }
      }
    }
    compositeLayers();
  }, [activeCelIndex, cels, saveActiveCelSnapshot, layers, compositeLayers]);

  // Add blank cel
  const handleAddCel = useCallback(() => {
    saveActiveCelSnapshot();
    const newId = `cel-${Date.now().toString(36)}`;
    const newName = `Cel ${cels.length + 1}`;
    const newCel: CelData = { id: newId, name: newName, layersData: {} };

    for (const l of layers) {
      const ctx = l.canvas.getContext('2d');
      ctx?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    setCels((prev) => [...prev, newCel]);
    setActiveCelIndex(cels.length);
    compositeLayers();
  }, [saveActiveCelSnapshot, cels.length, layers, compositeLayers]);

  // Duplicate active cel
  const handleDuplicateCel = useCallback(() => {
    saveActiveCelSnapshot();
    const activeCel = cels[activeCelIndex];
    const newId = `cel-${Date.now().toString(36)}`;
    const newName = `${activeCel?.name || 'Cel'} (Copy)`;
    const copySnapData: Record<string, ImageData> = {};

    for (const l of layers) {
      const ctx = l.canvas.getContext('2d');
      if (ctx) {
        copySnapData[l.id] = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }
    const newCel: CelData = { id: newId, name: newName, layersData: copySnapData };
    setCels((prev) => [...prev, newCel]);
    setActiveCelIndex(cels.length);
  }, [saveActiveCelSnapshot, cels, activeCelIndex, layers]);

  // Delete active cel
  const handleDeleteCel = useCallback(() => {
    if (cels.length <= 1) return;
    const newCels = cels.filter((_, idx) => idx !== activeCelIndex);
    setCels(newCels);
    setActiveCelIndex((prev) => Math.min(prev, newCels.length - 1));
  }, [cels, activeCelIndex]);

  // Layer stack actions
  const handleAddLayer = useCallback(() => {
    const newId = `layer-${Date.now().toString(36)}`;
    const newLayer: CanvasLayer = {
      id: newId,
      name: `Lớp ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1.0,
      canvas: createBlankCanvas(),
    };
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newId);
  }, [layers.length]);

  const handleDeleteLayer = useCallback((id: string) => {
    if (layers.length <= 1) return;
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (activeLayerId === id) {
      const remaining = layers.filter((l) => l.id !== id);
      setActiveLayerId(remaining[0]?.id || '');
    }
  }, [layers, activeLayerId]);

  const handleToggleVisibility = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    );
  }, []);

  const handleToggleLock = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
    );
  }, []);

  const handleOpacityChange = useCallback((id: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l)),
    );
  }, []);

  // Pointer drawing handlers with Zoom/Pan & Coordinate conversion
  const getCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const container = viewportRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return screenToCanvasCoords(e.clientX, e.clientY, rect, CANVAS_WIDTH, CANVAS_HEIGHT, transform);
  }, [transform]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Space or middle-click panning
    if (e.button === 1 || isSpaceDownRef.current) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - transform.panX, y: e.clientY - transform.panY };
      return;
    }

    if (!activeLayer || activeLayer.locked || !activeLayer.visible) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const pt = getCoords(e);
    const layerCtx = activeLayer.canvas.getContext('2d');
    if (!layerCtx) return;

    // Eyedropper
    if (tool === 'eyedropper') {
      const mainCanvas = mainCanvasRef.current;
      const mainCtx = mainCanvas?.getContext('2d');
      if (mainCtx && pt.x >= 0 && pt.x < CANVAS_WIDTH && pt.y >= 0 && pt.y < CANVAS_HEIGHT) {
        const p = mainCtx.getImageData(pt.x, pt.y, 1, 1).data;
        const hex = `#${((1 << 24) + (p[0]! << 16) + (p[1]! << 8) + p[2]!).toString(16).slice(1)}`;
        setColor(hex);
        setTool('brush');
      }
      return;
    }

    // Flood Fill
    if (tool === 'fill') {
      const imgData = layerCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const rgba = hexToRgba(color, 255);
      const changed = floodFill(imgData, pt.x, pt.y, rgba, 32);
      if (changed) {
        layerCtx.putImageData(imgData, 0, 0);
        compositeLayers();
        pushHistory();
      }
      return;
    }

    // Brush or Eraser stroke start
    setIsDrawing(true);
    pointsRef.current = [pt, pt, pt];

    const brushSettings: BrushSettings = {
      type: brushType,
      size,
      color,
      smoothing: 0.35,
    };

    drawSmoothedSegment(layerCtx, pt, pt, pt, brushSettings);
    if (symmetry) {
      const mPt = mirrorPoint(pt, CANVAS_WIDTH / 2);
      drawSmoothedSegment(layerCtx, mPt, mPt, mPt, brushSettings);
    }

    compositeLayers();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setTransform((prev) => ({
        ...prev,
        panX: e.clientX - panStartRef.current.x,
        panY: e.clientY - panStartRef.current.y,
      }));
      return;
    }

    if (!isDrawing || !activeLayer || activeLayer.locked) return;
    const pt = getCoords(e);
    const layerCtx = activeLayer.canvas.getContext('2d');
    if (!layerCtx) return;

    pointsRef.current.push(pt);
    if (pointsRef.current.length > 3) {
      pointsRef.current.shift();
    }

    const p0 = pointsRef.current[0]!;
    const p1 = pointsRef.current[1]!;
    const p2 = pointsRef.current[2]!;

    if (tool === 'eraser') {
      layerCtx.save();
      layerCtx.globalCompositeOperation = 'destination-out';
      layerCtx.lineWidth = size * 1.5;
      layerCtx.lineCap = 'round';
      layerCtx.lineJoin = 'round';
      layerCtx.beginPath();
      layerCtx.moveTo(p1.x, p1.y);
      layerCtx.lineTo(p2.x, p2.y);
      layerCtx.stroke();
      if (symmetry) {
        const m1 = mirrorPoint(p1, CANVAS_WIDTH / 2);
        const m2 = mirrorPoint(p2, CANVAS_WIDTH / 2);
        layerCtx.beginPath();
        layerCtx.moveTo(m1.x, m1.y);
        layerCtx.lineTo(m2.x, m2.y);
        layerCtx.stroke();
      }
      layerCtx.restore();
    } else {
      const brushSettings: BrushSettings = {
        type: brushType,
        size,
        color,
        smoothing: 0.35,
      };
      drawSmoothedSegment(layerCtx, p0, p1, p2, brushSettings);
      if (symmetry) {
        const m0 = mirrorPoint(p0, CANVAS_WIDTH / 2);
        const m1 = mirrorPoint(p1, CANVAS_WIDTH / 2);
        const m2 = mirrorPoint(p2, CANVAS_WIDTH / 2);
        drawSmoothedSegment(layerCtx, m0, m1, m2, brushSettings);
      }
    }

    compositeLayers();
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDrawing) {
      setIsDrawing(false);
      pointsRef.current = [];
      pushHistory();
    }
  };

  // Canvas Zoom via wheel
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setTransform((prev) => ({
      ...prev,
      zoom: Math.max(0.25, Math.min(4.0, prev.zoom * zoomFactor)),
    }));
  };

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyStepRef.current <= 0 || !activeLayer) return;
    historyStepRef.current -= 1;
    const prev = historyRef.current[historyStepRef.current];
    const ctx = activeLayer.canvas.getContext('2d');
    if (ctx && prev) {
      ctx.putImageData(prev, 0, 0);
      compositeLayers();
    }
    setCanUndo(historyStepRef.current > 0);
    setCanRedo(historyStepRef.current < historyRef.current.length - 1);
  }, [activeLayer, compositeLayers]);

  const handleRedo = useCallback(() => {
    if (historyStepRef.current >= historyRef.current.length - 1 || !activeLayer) return;
    historyStepRef.current += 1;
    const next = historyRef.current[historyStepRef.current];
    const ctx = activeLayer.canvas.getContext('2d');
    if (ctx && next) {
      ctx.putImageData(next, 0, 0);
      compositeLayers();
    }
    setCanUndo(true);
    setCanRedo(historyStepRef.current < historyRef.current.length - 1);
  }, [activeLayer, compositeLayers]);

  const handleClear = useCallback(() => {
    if (!activeLayer || activeLayer.locked) return;
    const ctx = activeLayer.canvas.getContext('2d');
    ctx?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    compositeLayers();
    pushHistory();
  }, [activeLayer, compositeLayers, pushHistory]);

  // Load existing asset image onto canvas
  const handleLoadAssetImage = useCallback(() => {
    if (!currentAsset?.imageDataUrl || !activeLayer) return;
    const ctx = activeLayer.canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      compositeLayers();
      pushHistory();
    };
    img.src = currentAsset.imageDataUrl;
  }, [currentAsset, activeLayer, compositeLayers, pushHistory]);

  // Draw sample humanoid character
  const handleDrawSample = useCallback(() => {
    if (!activeLayer || activeLayer.locked) return;
    const ctx = activeLayer.canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = color;
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    // Head & Neck
    ctx.beginPath();
    ctx.arc(cx, cy - 120, 50, 0, Math.PI * 2);
    ctx.roundRect(cx - 18, cy - 80, 36, 30, 4);
    ctx.fill();

    // Torso
    ctx.beginPath();
    ctx.roundRect(cx - 50, cy - 65, 100, 160, 16);
    ctx.fill();

    // Left & Right Arms (attached to shoulders)
    ctx.beginPath();
    ctx.roundRect(cx - 85, cy - 60, 38, 145, 12);
    ctx.roundRect(cx + 47, cy - 60, 38, 145, 12);
    ctx.fill();

    // Left & Right Legs
    ctx.beginPath();
    ctx.roundRect(cx - 45, cy + 90, 38, 180, 14);
    ctx.roundRect(cx + 7, cy + 90, 38, 180, 14);
    ctx.fill();

    compositeLayers();
    pushHistory();
  }, [activeLayer, color, compositeLayers, pushHistory]);

  // Send composite to Rig with Auto-Skeleton & Scene Staging
  const handleSendToRig = async () => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    compositeLayers();

    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const alphaData: number[] = [];
    let hasDrawnPixels = false;

    for (let i = 3; i < imgData.data.length; i += 4) {
      const alpha = imgData.data[i]!;
      alphaData.push(alpha);
      if (alpha > 10) hasDrawnPixels = true;
    }

    if (!hasDrawnPixels) {
      alert('Vui lòng vẽ nhân vật hoặc hình dạng trước khi chuyển sang Rig!');
      return;
    }

    setIsExporting(true);
    try {
      const dataUrl = mainCanvas.toDataURL('image/png');
      const timeStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const assetName = currentAsset ? `${currentAsset.name} (Cel)` : `Hand-drawn Cel ${timeStr}`;

      // 1. Import image and triangulate mesh
      const result = await dispatch({
        type: 'import_image',
        domain: 'asset',
        data: {
          name: assetName,
          dataUrl,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          alphaData,
        },
      });

      if (result.status === 'success' && result.entityId) {
        const assetId = result.entityId;
        setSelectedAssetId(assetId);

        // 2. Automatically generate humanoid skeleton & compute skinning weights
        await dispatch({
          type: 'apply_rig_template',
          domain: 'rig',
          targetId: assetId,
          data: { assetId, template: 'humanoid' },
        });

        // 3. Automatically stage character on 2.5D scene
        const sceneData = projectState.getAllSceneData()[0];
        const sceneId = sceneData?.id ?? 'scene-default';
        const instRes = await dispatch({
          type: 'add_instance',
          domain: 'scene',
          data: {
            sceneId,
            assetId,
            name: assetName,
            position: { x: 0, y: 0 },
            depth: 0,
            scale: 1,
            rotation: 0,
          },
        });
        if (instRes.status === 'success' && instRes.entityId) {
          setSelectedInstanceId(instRes.entityId);
        }

        // 4. Switch to Rig workspace
        if (setWorkspace) setWorkspace('rig');
        if (setMode) setMode('rig');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const celItems: CelItem[] = useMemo(
    () => cels.map((c) => ({ id: c.id, name: c.name })),
    [cels],
  );

  return (
    <div className="drawing-canvas-container">
      {/* Professional Drawing Toolbar */}
      <DrawingToolbar
        tool={tool}
        setTool={setTool}
        brushType={brushType}
        setBrushType={setBrushType}
        color={color}
        setColor={setColor}
        size={size}
        setSize={setSize}
        symmetry={symmetry}
        setSymmetry={setSymmetry}
        lightTable={lightTable}
        setLightTable={setLightTable}
        zoom={transform.zoom}
        onZoomIn={() =>
          setTransform((prev) => ({ ...prev, zoom: Math.min(4.0, prev.zoom * 1.25) }))
        }
        onZoomOut={() =>
          setTransform((prev) => ({ ...prev, zoom: Math.max(0.25, prev.zoom * 0.8) }))
        }
        onZoomReset={() => setTransform({ zoom: 1.0, panX: 0, panY: 0 })}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onDrawSample={handleDrawSample}
        onSendToRig={handleSendToRig}
        isExporting={isExporting}
        currentAssetName={currentAsset?.name}
        onLoadAssetImage={currentAsset?.imageDataUrl ? handleLoadAssetImage : undefined}
      />

      {/* Main Body: Center Viewport + Right Layer Stack */}
      <div className="drawing-workspace-body">
        <div
          className="drawing-viewport"
          ref={viewportRef}
          onWheel={handleWheel}
        >
          <div
            className="drawing-surface-wrapper"
            style={{
              transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Onion Skin ghost canvas */}
            <canvas
              ref={onionCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="drawing-canvas drawing-canvas--onion"
            />

            {/* Main Interactive Drawing Canvas */}
            <canvas
              ref={mainCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="drawing-canvas drawing-canvas--active"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                cursor: tool === 'eyedropper' ? 'crosshair' : tool === 'fill' ? 'cell' : 'default',
              }}
            />

            {/* Symmetry Vertical Axis Guide */}
            {symmetry && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: '50%',
                  width: '1px',
                  background: 'rgba(99, 102, 241, 0.45)',
                  pointerEvents: 'none',
                  borderRight: '1px dashed rgba(255, 255, 255, 0.3)',
                }}
              />
            )}
          </div>
        </div>

        {/* Right Panel: Layer Stack */}
        <LayerStackPanel
          layers={layers}
          activeLayerId={activeLayerId}
          onSelectLayer={setActiveLayerId}
          onAddLayer={handleAddLayer}
          onDeleteLayer={handleDeleteLayer}
          onToggleVisibility={handleToggleVisibility}
          onToggleLock={handleToggleLock}
          onChangeOpacity={handleOpacityChange}
        />
      </div>

      {/* Bottom: Cel Timeline Strip */}
      <CelStrip
        cels={celItems}
        activeCelIndex={activeCelIndex}
        onSelectCel={handleSelectCel}
        onAddCel={handleAddCel}
        onDuplicateCel={handleDuplicateCel}
        onDeleteCel={handleDeleteCel}
        showOnionSkin={showOnionSkin}
        onToggleOnionSkin={() => setShowOnionSkin((prev) => !prev)}
        onionOpacity={onionOpacity}
        onChangeOnionOpacity={setOnionOpacity}
        isPlayingLoop={isPlayingLoop}
        onTogglePlayLoop={() => setIsPlayingLoop((prev) => !prev)}
      />
    </div>
  );
}
