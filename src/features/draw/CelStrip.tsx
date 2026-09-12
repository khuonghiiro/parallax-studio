import React from 'react';
import {
  Film,
  Plus,
  Copy,
  Trash2,
  Eye,
  Play,
  Square,
} from 'lucide-react';
import { Button } from '../../ui/Button.js';
import './CelStrip.css';

export interface CelItem {
  id: string;
  name: string;
}

export interface CelStripProps {
  cels: CelItem[];
  activeCelIndex: number;
  onSelectCel: (index: number) => void;
  onAddCel: () => void;
  onDuplicateCel: () => void;
  onDeleteCel: () => void;
  showOnionSkin: boolean;
  onToggleOnionSkin: () => void;
  onionOpacity: number;
  onChangeOnionOpacity: (val: number) => void;
  isPlayingLoop: boolean;
  onTogglePlayLoop: () => void;
}

export function CelStrip({
  cels,
  activeCelIndex,
  onSelectCel,
  onAddCel,
  onDuplicateCel,
  onDeleteCel,
  showOnionSkin,
  onToggleOnionSkin,
  onionOpacity,
  onChangeOnionOpacity,
  isPlayingLoop,
  onTogglePlayLoop,
}: CelStripProps): React.JSX.Element {
  return (
    <div className="cel-strip">
      {/* Left: Playback & Cel chips */}
      <div className="cel-strip__left">
        <Button
          icon={isPlayingLoop ? Square : Play}
          size="sm"
          variant={isPlayingLoop ? 'primary' : 'ghost'}
          onClick={onTogglePlayLoop}
          title={isPlayingLoop ? 'Dừng xem trước' : 'Phát vòng lặp các Cel hoạt hình'}
        >
          {isPlayingLoop ? 'Dừng' : 'Phát Cel'}
        </Button>

        <div className="cel-strip__divider" />

        {/* Cels list */}
        <div className="cel-strip__cels">
          {cels.map((cel, idx) => {
            const isActive = idx === activeCelIndex;
            return (
              <button
                key={cel.id}
                className={`cel-chip ${isActive ? 'cel-chip--active' : ''}`}
                onClick={() => onSelectCel(idx)}
                title={`Chọn ${cel.name}`}
              >
                <Film size={12} />
                <span>{cel.name}</span>
              </button>
            );
          })}
        </div>

        {/* Cel manipulation buttons */}
        <Button
          icon={Plus}
          size="sm"
          variant="ghost"
          onClick={onAddCel}
          title="Thêm Cel trắng mới (+)"
        >
          Thêm Cel
        </Button>
        <Button
          icon={Copy}
          iconOnly
          size="sm"
          variant="ghost"
          onClick={onDuplicateCel}
          title="Nhân đôi Cel hiện tại"
        />
        {cels.length > 1 && (
          <Button
            icon={Trash2}
            iconOnly
            size="sm"
            variant="ghost"
            onClick={onDeleteCel}
            title="Xóa Cel hiện tại"
          />
        )}
      </div>

      {/* Right: Onion Skinning controls */}
      <div className="cel-strip__right">
        <div className="cel-strip__onion-control">
          <button
            className={`cel-strip__onion-btn ${
              showOnionSkin ? 'cel-strip__onion-btn--active' : ''
            }`}
            onClick={onToggleOnionSkin}
            title="Bật/Tắt bóng mờ Onion Skin (xem nét vẽ frame trước/sau)"
          >
            <Eye size={12} />
            <span>Onion Skin</span>
          </button>

          {showOnionSkin && (
            <>
              <input
                type="range"
                min="10"
                max="80"
                value={Math.round(onionOpacity * 100)}
                onChange={(e) => onChangeOnionOpacity(Number(e.target.value) / 100)}
                style={{ width: '60px', height: '12px' }}
                title={`Độ trong suốt bóng mờ: ${Math.round(onionOpacity * 100)}%`}
              />
              <span style={{ fontSize: '10px', opacity: 0.7 }}>
                {Math.round(onionOpacity * 100)}%
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
