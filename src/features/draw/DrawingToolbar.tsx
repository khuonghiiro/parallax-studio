import React from 'react';
import {
  Paintbrush,
  Eraser,
  Pipette,
  PaintBucket,
  RotateCcw,
  RotateCw,
  Trash2,
  Sparkles,
  Upload,
  ArrowRight,
  SplitSquareVertical,
  Lamp,
  ZoomIn,
  ZoomOut,
  PenTool,
  Feather,
  Highlighter,
  User,
} from 'lucide-react';
import type { BrushType } from './stroke-smoother.js';
import type { DrawTool } from './DrawingCanvas.js';
import './DrawingToolbar.css';

const COLOR_PALETTE = [
  '#6380ff', '#818cf8', '#ef4444', '#f59e0b',
  '#10b981', '#06b6d4', '#ec4899', '#ffffff', '#111827',
];

export interface DrawingToolbarProps {
  tool: DrawTool;
  setTool: (tool: DrawTool) => void;
  brushType: BrushType;
  setBrushType: (type: BrushType) => void;
  color: string;
  setColor: (color: string) => void;
  size: number;
  setSize: (size: number) => void;
  symmetry: boolean;
  setSymmetry: (s: boolean | ((prev: boolean) => boolean)) => void;
  lightTable: boolean;
  setLightTable: (l: boolean | ((prev: boolean) => boolean)) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDrawSample: () => void;
  onSendToRig: () => void;
  isExporting: boolean;
  currentAssetName?: string;
  onLoadAssetImage?: () => void;
  onOpenMannequinModal?: () => void;
}

/**
 * Professional 2D Drawing Toolbar with inking tools, symmetry, light table, and canvas zoom.
 */
export function DrawingToolbar({
  tool,
  setTool,
  brushType,
  setBrushType,
  color,
  setColor,
  size,
  setSize,
  symmetry,
  setSymmetry,
  lightTable,
  setLightTable,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onDrawSample,
  onSendToRig,
  isExporting,
  currentAssetName,
  onLoadAssetImage,
  onOpenMannequinModal,
}: DrawingToolbarProps): React.JSX.Element {
  return (
    <div className="drawing-toolbar-pro">
      {/* Group 1: Tools & Brush Presets */}
      <div className="drawing-toolbar-pro__group">
        <button
          className={`drawing-toolbar-pro__btn ${tool === 'brush' ? 'drawing-toolbar-pro__btn--active' : ''}`}
          onClick={() => setTool('brush')}
          title="Cọ vẽ (Brush)"
        >
          <Paintbrush size={12} />
          <span>Vẽ</span>
        </button>

        {tool === 'brush' && (
          <div
            style={{
              display: 'inline-flex',
              gap: 2,
              background: 'var(--bg-card)',
              padding: '1px',
              borderRadius: 4,
            }}
          >
            <button
              className={`drawing-toolbar-pro__btn ${brushType === 'pen' ? 'drawing-toolbar-pro__btn--active' : ''}`}
              style={{ height: 22, padding: '1px 5px', fontSize: 10 }}
              onClick={() => setBrushType('pen')}
              title="Bút Mực (Inking Pen): Nét viền sắc nét, thanh đậm"
            >
              <PenTool size={10} /> Mực
            </button>
            <button
              className={`drawing-toolbar-pro__btn ${brushType === 'pencil' ? 'drawing-toolbar-pro__btn--active' : ''}`}
              style={{ height: 22, padding: '1px 5px', fontSize: 10 }}
              onClick={() => setBrushType('pencil')}
              title="Bút Chì (Sketch Pencil): Nét phác thảo mờ"
            >
              <Feather size={10} /> Chì
            </button>
            <button
              className={`drawing-toolbar-pro__btn ${brushType === 'marker' ? 'drawing-toolbar-pro__btn--active' : ''}`}
              style={{ height: 22, padding: '1px 5px', fontSize: 10 }}
              onClick={() => setBrushType('marker')}
              title="Cọ Marker: Tô mảng phẳng"
            >
              <Highlighter size={10} /> Marker
            </button>
          </div>
        )}

        <button
          className={`drawing-toolbar-pro__btn ${tool === 'eraser' ? 'drawing-toolbar-pro__btn--active' : ''}`}
          onClick={() => setTool('eraser')}
          title="Cục tẩy (Eraser)"
        >
          <Eraser size={12} />
          <span>Tẩy</span>
        </button>

        <button
          className={`drawing-toolbar-pro__btn ${tool === 'fill' ? 'drawing-toolbar-pro__btn--active' : ''}`}
          onClick={() => setTool('fill')}
          title="Thùng sơn đổ màu kín (Flood Fill)"
        >
          <PaintBucket size={12} />
          <span>Tô</span>
        </button>

        <button
          className={`drawing-toolbar-pro__btn ${tool === 'eyedropper' ? 'drawing-toolbar-pro__btn--active' : ''}`}
          onClick={() => setTool('eyedropper')}
          title="Ống hút màu (Eyedropper)"
        >
          <Pipette size={12} />
        </button>

        <div className="drawing-toolbar-pro__divider" />

        {/* Brush size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
          <span>{size}px</span>
          <input
            type="range"
            min="1"
            max="64"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ width: 50, height: 14 }}
            title={`Cỡ nét: ${size}px`}
          />
        </div>

        <div className="drawing-toolbar-pro__divider" />

        {/* Professional Palette */}
        <div className="drawing-toolbar-pro__swatches">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              className={[
                'drawing-toolbar-pro__swatch',
                color === c && tool === 'brush' ? 'drawing-toolbar-pro__swatch--active' : '',
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
            className="drawing-toolbar-pro__picker"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              if (tool === 'eraser') setTool('brush');
            }}
            title="Màu tùy chỉnh"
          />
        </div>
      </div>

      {/* Group 2: Symmetry, Light Table, Zoom & Send to Rig */}
      <div className="drawing-toolbar-pro__group">
        {/* Bilateral Symmetry */}
        <button
          className={`drawing-toolbar-pro__btn ${symmetry ? 'drawing-toolbar-pro__btn--active' : ''}`}
          onClick={() => setSymmetry((prev) => !prev)}
          title="Bật/Tắt trục đối xứng gương dọc (Vẽ 1 bên tự động phản chiếu bên kia)"
        >
          <SplitSquareVertical size={12} />
          <span>Đối xứng</span>
        </button>

        {/* Light Table */}
        <button
          className={`drawing-toolbar-pro__btn ${lightTable ? 'drawing-toolbar-pro__btn--active' : ''}`}
          onClick={() => setLightTable((prev) => !prev)}
          title="Bật/Tắt bàn hắt sáng đồ nét (Light Table non-photo blue)"
        >
          <Lamp size={12} />
          <span>Bàn sáng</span>
        </button>

        <div className="drawing-toolbar-pro__divider" />

        {/* Canvas Zoom Navigation */}
        <button
          className="drawing-toolbar-pro__btn"
          onClick={onZoomOut}
          title="Thu nhỏ canvas (Zoom Out)"
        >
          <ZoomOut size={11} />
        </button>
        <span
          onClick={onZoomReset}
          style={{ fontSize: 10, cursor: 'pointer', minWidth: 32, textAlign: 'center' }}
          title="Click để đặt lại 100%"
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="drawing-toolbar-pro__btn"
          onClick={onZoomIn}
          title="Phóng to canvas (Zoom In)"
        >
          <ZoomIn size={11} />
        </button>

        <div className="drawing-toolbar-pro__divider" />

        {/* Undo / Redo / Clear */}
        <button
          className="drawing-toolbar-pro__btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Hoàn tác (Undo Ctrl+Z)"
        >
          <RotateCcw size={11} />
        </button>
        <button
          className="drawing-toolbar-pro__btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Làm lại (Redo Ctrl+Y)"
        >
          <RotateCw size={11} />
        </button>
        <button
          className="drawing-toolbar-pro__btn"
          onClick={onClear}
          title="Xóa trắng layer hiện tại"
        >
          <Trash2 size={11} />
        </button>

        <div className="drawing-toolbar-pro__divider" />

        {/* Asset loading or Sample */}
        {currentAssetName && onLoadAssetImage && (
          <button
            className="drawing-toolbar-pro__btn"
            onClick={onLoadAssetImage}
            title={`Nạp ảnh của '${currentAssetName}' lên canvas để vẽ đè`}
          >
            <Upload size={11} /> Nạp {currentAssetName}
          </button>
        )}

        {onOpenMannequinModal && (
          <button
            className="drawing-toolbar-pro__btn"
            onClick={onOpenMannequinModal}
            title="Chọn phôi mẫu cơ thể 2D chuẩn tỷ lệ giải phẫu (Nam, Nữ, Chibi, Quái thú)"
          >
            <User size={11} /> Phôi mẫu
          </button>
        )}

        <button
          className="drawing-toolbar-pro__btn"
          onClick={onDrawSample}
          title="Vẽ phác thảo nhân vật mẫu tự động"
        >
          <Sparkles size={11} /> Mẫu
        </button>

        {/* Send to Rig */}
        <button
          className="btn-send-rig-pro"
          onClick={onSendToRig}
          disabled={isExporting}
          title="Trích xuất lưới 2.5D, tự động gắn xương và chuyển sang Khung Xương (Rig)"
        >
          <span>Chuyển sang Rig</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
