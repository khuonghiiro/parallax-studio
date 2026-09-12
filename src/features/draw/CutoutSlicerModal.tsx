// Parallax Studio - Cutout Slicer Modal Component
// Provides interactive body part slicing, underlap padding adjustment,
// AI prompt generation per anatomical part, and part assembling into canvas layers.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Scissors,
  Sparkles,
  Layers,
  Check,
  Copy,
  Upload,
  ArrowRight,
  X,
  FileDown,
} from 'lucide-react';
import {
  sliceCanvasIntoParts,
  generatePartPrompts,
  STYLE_PRESETS,
  type CutoutPart,
  type CutoutMode,
  type StylePresetId,
} from './cutout-slicer.js';
import { compositePartsToCanvas, createBlankCanvas } from './layer-ops.js';
import './CutoutSlicerModal.css';

export interface CutoutSlicerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCanvas: HTMLCanvasElement | null;
  onApplyPartsAsLayers: (parts: CutoutPart[]) => void;
  onApplyCompositeToCanvas: (canvas: HTMLCanvasElement) => void;
  onSendCompositeToRig: (canvas: HTMLCanvasElement) => void;
}

export function CutoutSlicerModal({
  isOpen,
  onClose,
  sourceCanvas,
  onApplyPartsAsLayers,
  onApplyCompositeToCanvas,
  onSendCompositeToRig,
}: CutoutSlicerModalProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<'slice' | 'ai' | 'assemble'>('slice');
  const [cutoutMode, setCutoutMode] = useState<CutoutMode>('basic-6');
  const [underlapPadding, setUnderlapPadding] = useState<number>(8);
  const [characterDescription, setCharacterDescription] = useState<string>(
    'Heroic fighter in battle outfit'
  );
  const [selectedStyle, setSelectedStyle] = useState<StylePresetId>('cyberpunk');
  const [copiedPartId, setCopiedPartId] = useState<string | null>(null);

  // Sliced parts state
  const [parts, setParts] = useState<CutoutPart[]>([]);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Re-slice whenever sourceCanvas, mode, or underlapPadding changes
  useEffect(() => {
    if (!isOpen || !sourceCanvas) return;
    const sliced = sliceCanvasIntoParts(sourceCanvas, cutoutMode, underlapPadding);
    setParts(sliced);
  }, [isOpen, sourceCanvas, cutoutMode, underlapPadding]);

  // Update preview canvas in assembler tab
  useEffect(() => {
    if (activeTab === 'assemble' && previewCanvasRef.current && parts.length > 0) {
      compositePartsToCanvas(parts, previewCanvasRef.current);
    }
  }, [activeTab, parts]);

  // Generated AI Prompts Brief
  const aiBrief = useMemo(() => {
    return generatePartPrompts(characterDescription, selectedStyle, cutoutMode);
  }, [characterDescription, selectedStyle, cutoutMode]);

  const handleCopyPrompt = (partId: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedPartId(partId);
      setTimeout(() => setCopiedPartId(null), 2000);
    }
  };

  const handleDownloadBriefJson = () => {
    const jsonStr = JSON.stringify(aiBrief, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cutout-ai-brief-${aiBrief.style.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePartImageUpload = (partId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setParts((prevParts) =>
          prevParts.map((p) => {
            if (p.id !== partId) return p;
            const newCanvas = createBlankCanvas(img.width, img.height);
            const ctx = newCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
            }
            return {
              ...p,
              canvas: newCanvas,
              bounds: [p.bounds[0], p.bounds[1], p.bounds[0] + img.width, p.bounds[1] + img.height],
            };
          })
        );
      };
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyAsLayers = () => {
    if (parts.length === 0) return;
    onApplyPartsAsLayers(parts);
    onClose();
  };

  const handleApplyComposite = () => {
    const compCanvas = createBlankCanvas(600, 600);
    compositePartsToCanvas(parts, compCanvas);
    onApplyCompositeToCanvas(compCanvas);
    onClose();
  };

  const handleSendToRig = () => {
    const compCanvas = createBlankCanvas(600, 600);
    compositePartsToCanvas(parts, compCanvas);
    onSendCompositeToRig(compCanvas);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="cutout-modal-overlay" onClick={onClose}>
      <div className="cutout-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cutout-modal-header">
          <div className="cutout-modal-title">
            <Scissors size={18} />
            <span>Tách Bộ Phận (Cutout Slicer) & Sinh Prompt AI</span>
          </div>
          <button
            className="cutout-modal-close-btn"
            onClick={onClose}
            title="Đóng (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="cutout-tabs">
          <button
            className={`cutout-tab-btn ${
              activeTab === 'slice' ? 'cutout-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('slice')}
          >
            <Scissors size={14} />
            <span>Phân Rã Bộ Phận</span>
          </button>

          <button
            className={`cutout-tab-btn ${
              activeTab === 'ai' ? 'cutout-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('ai')}
          >
            <Sparkles size={14} />
            <span>Tạo Prompt AI Từng Phần</span>
          </button>

          <button
            className={`cutout-tab-btn ${
              activeTab === 'assemble' ? 'cutout-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('assemble')}
          >
            <Layers size={14} />
            <span>Ghép & Nạp Ảnh AI</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="cutout-modal-body">
          {/* Tab 1: Slicer */}
          {activeTab === 'slice' && (
            <div>
              <div className="cutout-controls-bar">
                <div className="cutout-control-group">
                  <span>Chế độ giải phẫu:</span>
                  <div className="cutout-radio-group">
                    <button
                      className={`cutout-radio-btn ${
                        cutoutMode === 'basic-6' ? 'cutout-radio-btn--active' : ''
                      }`}
                      onClick={() => setCutoutMode('basic-6')}
                    >
                      6 Phần Cơ Bản
                    </button>
                    <button
                      className={`cutout-radio-btn ${
                        cutoutMode === 'detailed-10'
                          ? 'cutout-radio-btn--active'
                          : ''
                      }`}
                      onClick={() => setCutoutMode('detailed-10')}
                    >
                      10 Khớp Chi Tiết
                    </button>
                  </div>
                </div>

                <div className="cutout-control-group">
                  <label className="cutout-slider-label">
                    <span>Đệm viền khớp xoay:</span>
                    <input
                      type="range"
                      min={0}
                      max={16}
                      step={2}
                      value={underlapPadding}
                      onChange={(e) => setUnderlapPadding(Number(e.target.value))}
                      className="cutout-slider"
                    />
                    <span>{underlapPadding}px</span>
                  </label>
                </div>
              </div>

              <div className="cutout-parts-grid">
                {parts.map((part) => {
                  const dataUrl = part.canvas.toDataURL ? part.canvas.toDataURL() : '';
                  return (
                    <div key={part.id} className="cutout-part-card">
                      <div className="cutout-part-thumb">
                        {dataUrl ? (
                          <img src={dataUrl} alt={part.nameVi} />
                        ) : (
                          <div style={{ color: '#64748b', fontSize: 10 }}>Trống</div>
                        )}
                      </div>
                      <div className="cutout-part-info">
                        <div className="cutout-part-name-vi">{part.nameVi}</div>
                        <div className="cutout-part-name-en">{part.nameEn}</div>
                        <div className="cutout-part-meta">
                          <span className="cutout-badge">Z: {part.zIndex}</span>
                          <span className="cutout-badge">{part.category}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: AI Part Prompts */}
          {activeTab === 'ai' && (
            <div className="cutout-ai-container">
              <div className="cutout-ai-settings">
                <input
                  type="text"
                  className="cutout-input-box"
                  placeholder="Mô tả nhân vật (ví dụ: Nữ ninja tóc tím, áo giáp nano...)"
                  value={characterDescription}
                  onChange={(e) => setCharacterDescription(e.target.value)}
                />

                <select
                  className="cutout-select"
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value as StylePresetId)}
                >
                  {STYLE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.nameVi}
                    </option>
                  ))}
                </select>

                <button
                  className="cutout-copy-btn"
                  onClick={handleDownloadBriefJson}
                  title="Tải toàn bộ file JSON Brief"
                >
                  <FileDown size={14} />
                  <span>Xuất JSON Brief</span>
                </button>
              </div>

              <div className="cutout-prompt-list">
                {aiBrief.parts.map((item) => (
                  <div key={item.partId} className="cutout-prompt-item">
                    <div className="cutout-prompt-content">
                      <div className="cutout-prompt-title">
                        {item.nameVi} ({item.nameEn}) • Khuyên dùng:{' '}
                        {item.recommendedResolution}
                      </div>
                      <div className="cutout-prompt-text">{item.prompt}</div>
                    </div>
                    <button
                      className="cutout-copy-btn"
                      onClick={() => handleCopyPrompt(item.partId, item.prompt)}
                    >
                      {copiedPartId === item.partId ? (
                        <>
                          <Check size={14} color="#10b981" />
                          <span style={{ color: '#10b981' }}>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Part Assembler */}
          {activeTab === 'assemble' && (
            <div className="cutout-assembler-layout">
              <div className="cutout-assembler-preview">
                <canvas
                  ref={previewCanvasRef}
                  width={600}
                  height={600}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              <div className="cutout-assembler-parts">
                {parts.map((part) => (
                  <div key={part.id} className="cutout-upload-item">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {part.nameVi}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        Khớp: ({part.pivot[0]}, {part.pivot[1]})
                      </div>
                    </div>

                    <label className="cutout-copy-btn" style={{ cursor: 'pointer' }}>
                      <Upload size={14} />
                      <span>Nạp ảnh AI</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePartImageUpload(part.id, file);
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="cutout-modal-footer">
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {parts.length} bộ phận sẵn sàng chuyển thành Layers hoạt hình độc lập
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {activeTab === 'assemble' ? (
              <>
                <button
                  className="cutout-modal-footer-btn cutout-modal-footer-btn--secondary"
                  onClick={handleApplyComposite}
                >
                  Áp Dụng Toàn Thân Lên Canvas
                </button>
                <button
                  className="cutout-modal-footer-btn cutout-modal-footer-btn--primary"
                  onClick={handleSendToRig}
                >
                  <span>Chuyển Thẳng Sang Rig</span>
                  <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <button
                className="cutout-modal-footer-btn cutout-modal-footer-btn--primary"
                onClick={handleApplyAsLayers}
              >
                <Layers size={14} />
                <span>Tạo Thành Các Layers Riêng Biệt</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
