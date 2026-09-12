import React from 'react';
import { Layers, Eye, EyeOff, Plus, Trash2, Lock, Unlock } from 'lucide-react';
import { Button } from '../../ui/Button.js';
import './LayerStackPanel.css';

export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  canvas: HTMLCanvasElement;
}

export interface LayerStackPanelProps {
  layers: CanvasLayer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onChangeOpacity: (id: string, opacity: number) => void;
}

export function LayerStackPanel({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onToggleVisibility,
  onToggleLock,
  onChangeOpacity,
}: LayerStackPanelProps): React.JSX.Element {
  const activeLayer = layers.find((l) => l.id === activeLayerId);

  return (
    <div className="layer-stack">
      {/* Header */}
      <div className="layer-stack__header">
        <div className="layer-stack__title">
          <Layers size={14} />
          <span>Lớp vẽ (Layers)</span>
        </div>
        <Button
          icon={Plus}
          iconOnly
          size="sm"
          variant="ghost"
          onClick={onAddLayer}
          title="Thêm layer vẽ mới (+)"
        />
      </div>

      {/* Layer items list (reversed so top layer is visually at top) */}
      <div className="layer-stack__list">
        {[...layers].reverse().map((layer) => {
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              className={`layer-item ${isActive ? 'layer-item--active' : ''}`}
              onClick={() => onSelectLayer(layer.id)}
            >
              <div className="layer-item__left">
                <button
                  className={`layer-item__btn ${layer.visible ? 'layer-item__btn--active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                  }}
                  title={layer.visible ? 'Ẩn layer' : 'Hiện layer'}
                >
                  {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <span
                  className="layer-item__name"
                  style={{ opacity: layer.visible ? 1 : 0.4 }}
                >
                  {layer.name}
                </span>
              </div>

              <div className="layer-item__actions">
                <button
                  className="layer-item__btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(layer.id);
                  }}
                  title={layer.locked ? 'Mở khóa layer' : 'Khóa nét layer'}
                >
                  {layer.locked ? <Lock size={12} color="#f59e0b" /> : <Unlock size={12} />}
                </button>
                {layers.length > 1 && (
                  <button
                    className="layer-item__btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                    title="Xóa layer này"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer controls: Opacity of active layer */}
      {activeLayer && (
        <div className="layer-stack__footer">
          <div className="layer-stack__opacity">
            <span>Độ mờ đục:</span>
            <span>{Math.round(activeLayer.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(activeLayer.opacity * 100)}
            onChange={(e) => onChangeOpacity(activeLayer.id, Number(e.target.value) / 100)}
            style={{ width: '100%', height: '14px', cursor: 'pointer' }}
            title="Độ mờ đục của layer đang chọn"
          />
        </div>
      )}
    </div>
  );
}
