import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paintbrush,
  Eraser,
  Pipette,
  PaintBucket,
  RotateCcw,
  RotateCw,
  Trash2,
  Sparkles,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { Button } from '../../ui/Button.js';
import { useEditor } from '../../app/EditorContext.js';
import { floodFill, hexToRgba } from './flood-fill.js';
import { renderOnionSkin } from './onion-skin.js';
import { LayerStackPanel, type CanvasLayer } from './LayerStackPanel.js';
import { CelStrip, type CelItem } from './CelStrip.js';
import './DrawingCanvas.css';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;

const COLOR_PALETTE = [
  '#6380ff', '#818cf8', '#ef4444', '#f59e0b',
  '#10b981', '#06b6d4', '#ec4899', '#ffffff', '#111827',
];

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

  const [tool, setTool] = useState<DrawTool>('brush');
  const [color, setColor] = useState<string>('#6380ff');
  const [size, setSize] = useState<number>(12);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  // Layers stack
  const [layers, setLayers] = useState<CanvasLayer[]>(() => [
    {
      id: 'layer-lineart',
      name: 'Line Art',
      visible: true,
      opacity: 1,
      locked: false,
      canvas: createBlankCanvas(),
    },
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>('layer-lineart');

  // Cel Animation timeline
  const [cels, setCels] = useState<CelData[]>([
    { id: 'cel-1', name: 'Cel 1', layersData: {} },
  ]);
  const [activeCelIndex, setActiveCelIndex] = useState<number>(0);

  // Onion skin & loop playback
  const [showOnionSkin, setShowOnionSkin] = useState<boolean>(false);
  const [onionOpacity, setOnionOpacity] = useState<number>(0.35);
  const [isPlayingLoop, setIsPlayingLoop] = useState<boolean>(false);

  // Undo / Redo history
  const historyRef = useRef<ImageData[]>([]);
  const historyStepRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const {
    dispatch,
    selectedAssetId,
    setSelectedAssetId,
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
        ctx.globalAlpha = layer.opacity;
        ctx.drawImage(layer.canvas, 0, 0);
      }
    }
    ctx.globalAlpha = 1.0;
  }, [layers]);

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

    // Get previous cel composite snapshot
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

  // Cel playback loop
  useEffect(() => {
    if (!isPlayingLoop || cels.length <= 1) return;
    const interval = setInterval(() => {
      setActiveCelIndex((prev) => (prev + 1) % cels.length);
    }, 125); // 8 FPS
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

    // Clear layer canvases for new cel
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
    const newIndex = Math.max(0, activeCelIndex - 1);
    setActiveCelIndex(newIndex);

    const targetCel = newCels[newIndex];
    if (targetCel) {
      for (const l of layers) {
        const ctx = l.canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          const data = targetCel.layersData[l.id];
          if (data) ctx.putImageData(data, 0, 0);
        }
      }
    }
    compositeLayers();
  }, [cels, activeCelIndex, layers, compositeLayers]);

  // Layer management
  const handleAddLayer = useCallback(() => {
    const newId = `layer-${Date.now().toString(36)}`;
    const newLayer: CanvasLayer = {
      id: newId,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      opacity: 1,
      locked: false,
      canvas: createBlankCanvas(),
    };
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newId);
  }, [layers.length]);

  const handleDeleteLayer = useCallback((id: string) => {
    if (layers.length <= 1) return;
    const updated = layers.filter((l) => l.id !== id);
    setLayers(updated);
    if (activeLayerId === id && updated[0]) {
      setActiveLayerId(updated[0].id);
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

  const handleChangeOpacity = useCallback((id: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l)),
    );
  }, []);

  // Pointer drawing handlers
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeLayer || activeLayer.locked || !activeLayer.visible) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const pt = getCanvasCoords(e);
    const layerCtx = activeLayer.canvas.getContext('2d');
    if (!layerCtx) return;

    // Eyedropper tool
    if (tool === 'eyedropper') {
      const mainCanvas = mainCanvasRef.current;
      const mainCtx = mainCanvas?.getContext('2d');
      if (mainCtx) {
        const p = mainCtx.getImageData(pt.x, pt.y, 1, 1).data;
        const hex = `#${((1 << 24) + (p[0]! << 16) + (p[1]! << 8) + p[2]!).toString(16).slice(1)}`;
        setColor(hex);
        setTool('brush');
      }
      return;
    }

    // Flood fill tool
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
    setLastPoint(pt);

    layerCtx.save();
    if (tool === 'eraser') {
      layerCtx.globalCompositeOperation = 'destination-out';
      layerCtx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      layerCtx.globalCompositeOperation = 'source-over';
      layerCtx.fillStyle = color;
    }

    layerCtx.beginPath();
    layerCtx.arc(pt.x, pt.y, size / 2, 0, Math.PI * 2);
    layerCtx.fill();
    layerCtx.restore();

    compositeLayers();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPoint || !activeLayer || activeLayer.locked) return;
    const currentPoint = getCanvasCoords(e);
    const layerCtx = activeLayer.canvas.getContext('2d');
    if (!layerCtx) return;

    layerCtx.save();
    if (tool === 'eraser') {
      layerCtx.globalCompositeOperation = 'destination-out';
      layerCtx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      layerCtx.globalCompositeOperation = 'source-over';
      layerCtx.strokeStyle = color;
    }
    layerCtx.lineWidth = size;
    layerCtx.lineCap = 'round';
    layerCtx.lineJoin = 'round';

    layerCtx.beginPath();
    layerCtx.moveTo(lastPoint.x, lastPoint.y);
    layerCtx.lineTo(currentPoint.x, currentPoint.y);
    layerCtx.stroke();
    layerCtx.restore();

    setLastPoint(currentPoint);
    compositeLayers();
  };

  const handlePointerUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setLastPoint(null);
      pushHistory();
    }
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

  // Preset silhouette
  const handleDrawSample = useCallback(() => {
    if (!activeLayer || activeLayer.locked) return;
    const ctx = activeLayer.canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = color;
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    ctx.beginPath();
    ctx.arc(cx, cy - 120, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(cx - 45, cy - 60, 90, 160, 16);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(cx - 105, cy - 50, 30, 130, 12);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(cx + 75, cy - 50, 30, 130, 12);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(cx - 50, cy + 110, 35, 170, 14);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(cx + 15, cy + 110, 35, 170, 14);
    ctx.fill();

    compositeLayers();
    pushHistory();
  }, [activeLayer, color, compositeLayers, pushHistory]);

  // Send composite to Rig
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
      const result = await dispatch({
        type: 'import_image',
        domain: 'asset',
        data: {
          name: currentAsset ? `${currentAsset.name} (Cel)` : `Hand-drawn Cel ${timeStr}`,
          dataUrl,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          alphaData,
        },
      });

      if (result.status === 'success' && result.entityId) {
        setSelectedAssetId(result.entityId);
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
      {/* Top Drawing Toolbar */}
      <div className="drawing-toolbar">
        <div className="drawing-toolbar__left">
          {/* Tool buttons: Brush, Eraser, Eyedropper, Fill Bucket */}
          <Button
            icon={Paintbrush}
            size="sm"
            variant="ghost"
            active={tool === 'brush'}
            onClick={() => setTool('brush')}
            title="Cọ vẽ (Brush)"
          >
            Vẽ
          </Button>
          <Button
            icon={Eraser}
            size="sm"
            variant="ghost"
            active={tool === 'eraser'}
            onClick={() => setTool('eraser')}
            title="Tẩy (Eraser)"
          >
            Tẩy
          </Button>
          <Button
            icon={Pipette}
            iconOnly
            size="sm"
            variant="ghost"
            active={tool === 'eyedropper'}
            onClick={() => setTool('eyedropper')}
            title="Hút màu từ canvas (Eyedropper)"
          />
          <Button
            icon={PaintBucket}
            iconOnly
            size="sm"
            variant="ghost"
            active={tool === 'fill'}
            onClick={() => setTool('fill')}
            title="Đổ thùng sơn (Fill Bucket)"
          />

          <div className="drawing-toolbar__divider" />

          {/* Size slider */}
          <div className="drawing-size-control">
            <span>{size}px</span>
            <input
              type="range"
              min="2"
              max="64"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              title={`Cỡ nét: ${size}px`}
            />
          </div>

          <div className="drawing-toolbar__divider" />

          {/* Palette */}
          <div className="drawing-palette">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                className={[
                  'drawing-palette__swatch',
                  color === c && tool === 'brush' ? 'drawing-palette__swatch--active' : '',
                ].filter(Boolean).join(' ')}
                style={{ backgroundColor: c }}
                onClick={() => {
                  setColor(c);
                  if (tool === 'eraser') setTool('brush');
                }}
                title={c}
              />
            ))}
            <input
              type="color"
              className="drawing-palette__picker"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                if (tool === 'eraser') setTool('brush');
              }}
              title="Màu tùy chỉnh"
            />
          </div>
        </div>

        <div className="drawing-toolbar__right">
          <Button
            icon={RotateCcw}
            iconOnly
            size="sm"
            variant="ghost"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Hoàn tác (Undo)"
          />
          <Button
            icon={RotateCw}
            iconOnly
            size="sm"
            variant="ghost"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Làm lại (Redo)"
          />
          <Button
            icon={Trash2}
            iconOnly
            size="sm"
            variant="ghost"
            onClick={handleClear}
            title="Xóa trắng layer hiện tại (Clear)"
          />

          <div className="drawing-toolbar__divider" />

          {currentAsset?.imageDataUrl && (
            <Button
              icon={Upload}
              size="sm"
              variant="secondary"
              onClick={handleLoadAssetImage}
              title={`Nạp ảnh của '${currentAsset.name}' lên canvas để vẽ đè / chỉnh sửa`}
            >
              Nạp {currentAsset.name}
            </Button>
          )}

          <Button
            icon={Sparkles}
            size="sm"
            variant="ghost"
            onClick={handleDrawSample}
            title="Vẽ mẫu hình bóng nhân vật tự động"
          >
            Mẫu
          </Button>

          <button
            className="btn-send-to-rig"
            onClick={handleSendToRig}
            disabled={isExporting}
            title="Trích xuất lưới 2.5D và chuyển sang Khung xương (Rig)"
          >
            <span>Chuyển sang Rig</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Body: Center Viewport + Right Layer Stack */}
      <div className="drawing-workspace-body">
        <div className="drawing-viewport">
          <div className="drawing-surface-wrapper">
            {/* Onion Skin ghost canvas */}
            <canvas
              ref={onionCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="drawing-canvas drawing-canvas--onion"
            />
            {/* Main Interactive drawing canvas */}
            <canvas
              ref={mainCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="drawing-canvas drawing-canvas--main"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>
        </div>

        {/* Right side: Layer Stack */}
        <LayerStackPanel
          layers={layers}
          activeLayerId={activeLayerId}
          onSelectLayer={setActiveLayerId}
          onAddLayer={handleAddLayer}
          onDeleteLayer={handleDeleteLayer}
          onToggleVisibility={handleToggleVisibility}
          onToggleLock={handleToggleLock}
          onChangeOpacity={handleChangeOpacity}
        />
      </div>

      {/* Bottom: Cel Timeline Strip & Onion Skinning Controls */}
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
