import React from 'react';
import {
  Camera,
  Sliders,
  Eye,
  Key,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '../../ui/Button.js';
import './CameraControlBar.css';

export interface CameraControlBarProps {
  onPan: (dx: number) => void;
  onDolly: (dz: number) => void;
  onCrane: (dy: number) => void;
  onResetCamera: () => void;
  focusZ: number;
  onFocusZChange: (z: number) => void;
  aperture: number;
  onApertureChange: (a: number) => void;
  showPath: boolean;
  onToggleShowPath: () => void;
  onAddCameraKey?: () => void;
}

/**
 * 2.5D Animated Camera control toolbar for Compose workspace.
 * Provides camera motions (Pan, Dolly, Crane), Depth-of-field focus,
 * and camera trajectory spline visualization.
 */
export function CameraControlBar({
  onPan,
  onDolly,
  onCrane,
  onResetCamera,
  focusZ,
  onFocusZChange,
  aperture,
  onApertureChange,
  showPath,
  onToggleShowPath,
  onAddCameraKey,
}: CameraControlBarProps): React.JSX.Element {
  return (
    <div className="camera-control-bar">
      {/* Section 1: Camera Movements */}
      <div className="camera-control-bar__section">
        <span className="camera-control-bar__label">
          <Camera size={12} style={{ display: 'inline', marginRight: 3 }} />
          Máy quay 2.5D
        </span>

        {/* Pan Left / Right */}
        <div className="camera-control-bar__btn-group">
          <button
            className="camera-control-bar__btn"
            onClick={() => onPan(-30)}
            title="Lia máy sang trái (Pan Left)"
          >
            <ArrowLeft size={11} /> Pan L
          </button>
          <button
            className="camera-control-bar__btn"
            onClick={() => onPan(30)}
            title="Lia máy sang phải (Pan Right)"
          >
            Pan R <ArrowRight size={11} />
          </button>
        </div>

        {/* Crane Up / Down */}
        <div className="camera-control-bar__btn-group">
          <button
            className="camera-control-bar__btn"
            onClick={() => onCrane(25)}
            title="Nâng góc máy lên (Crane Up)"
          >
            <ArrowUp size={11} /> Lên
          </button>
          <button
            className="camera-control-bar__btn"
            onClick={() => onCrane(-25)}
            title="Hạ góc máy xuống (Crane Down)"
          >
            <ArrowDown size={11} /> Xuống
          </button>
        </div>

        {/* Dolly In / Out */}
        <div className="camera-control-bar__btn-group">
          <button
            className="camera-control-bar__btn"
            onClick={() => onDolly(-40)}
            title="Đẩy máy lại gần (Dolly In / Push)"
          >
            <ZoomIn size={11} /> Gần
          </button>
          <button
            className="camera-control-bar__btn"
            onClick={() => onDolly(40)}
            title="Kéo máy lùi xa (Dolly Out / Pull)"
          >
            <ZoomOut size={11} /> Xa
          </button>
        </div>

        <button
          className="camera-control-bar__btn"
          onClick={onResetCamera}
          title="Đặt lại vị trí máy quay mặc định"
        >
          <RotateCcw size={11} /> Reset
        </button>
      </div>

      <div className="camera-control-bar__divider" />

      {/* Section 2: Depth of Field & Focus */}
      <div className="camera-control-bar__section">
        <span className="camera-control-bar__label">
          <Sliders size={12} style={{ display: 'inline', marginRight: 3 }} />
          Lấy nét (DoF)
        </span>

        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tiêu cự Z:</span>
        <input
          type="range"
          min="-200"
          max="200"
          step="5"
          value={focusZ}
          onChange={(e) => onFocusZChange(Number(e.target.value))}
          style={{ width: '70px' }}
          title={`Tiêu cự lấy nét: Z = ${focusZ}`}
        />
        <span style={{ fontSize: '10px', width: '28px' }}>{focusZ}</span>

        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Bokeh:</span>
        <input
          type="range"
          min="0"
          max="8"
          step="0.5"
          value={aperture}
          onChange={(e) => onApertureChange(Number(e.target.value))}
          style={{ width: '55px' }}
          title={`Độ mờ hậu cảnh ngoài tiêu cự: ${aperture}px`}
        />
      </div>

      <div className="camera-control-bar__divider" />

      {/* Section 3: Visualizer & Keying */}
      <div className="camera-control-bar__section">
        <button
          className={[
            'camera-control-bar__btn',
            showPath ? 'camera-control-bar__btn--active' : '',
          ].join(' ')}
          onClick={onToggleShowPath}
          title="Bật/Tắt hiển thị đường cong quỹ đạo di chuyển của máy quay"
        >
          <Eye size={11} /> Quỹ đạo Camera
        </button>

        {onAddCameraKey && (
          <Button
            size="sm"
            variant="ghost"
            icon={Key}
            onClick={onAddCameraKey}
            title="Lưu Keyframe vị trí máy quay hiện tại vào Playhead"
          >
            Đặt Key
          </Button>
        )}
      </div>
    </div>
  );
}
