import React from 'react';
import {
  Layers,
  Plus,
  Camera,
  Eye,
  Sun,
  Maximize,
  Compass,
} from 'lucide-react';
import type { SceneInstance } from '@parallax/contracts';
import { Button } from '../../ui/Button.js';
import './ComposeStagingBar.css';

export interface ComposeStagingBarProps {
  instances: readonly SceneInstance[];
  selectedInstanceId: string | null;
  onSelectInstance: (id: string) => void;
  onStageAsset: () => void;
  canStageAsset: boolean;
  selectedAssetName?: string;
  cameraMode: 'orthographic' | 'perspective';
  onToggleCameraMode: () => void;
  onSetOrbitView: () => void;
  onResetFrontView: () => void;
  showDepthPlanes: boolean;
  onToggleDepthPlanes: () => void;
  showShadows: boolean;
  onToggleShadows: () => void;
  onUpdateInstanceDepth: (instanceId: string, depth: number) => void;
}

/**
 * 2.5D Multiplane staging control bar for the Compose workspace.
 * Allows quick staging, layer depth assignment (Fore/Mid/Back),
 * camera projection toggle, and 3D parallax orbit inspection.
 */
export function ComposeStagingBar({
  instances,
  selectedInstanceId,
  onSelectInstance,
  onStageAsset,
  canStageAsset,
  selectedAssetName,
  cameraMode,
  onToggleCameraMode,
  onSetOrbitView,
  onResetFrontView,
  showDepthPlanes,
  onToggleDepthPlanes,
  showShadows,
  onToggleShadows,
  onUpdateInstanceDepth,
}: ComposeStagingBarProps): React.JSX.Element {
  const selectedInstance = instances.find((i) => i.id === selectedInstanceId);

  return (
    <div className="compose-bar">
      {/* Instances Staged on 2.5D Stage */}
      <div className="compose-bar__section">
        <span className="compose-bar__label">2.5D Instances</span>
        {instances.length === 0 ? (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Chưa có instance trên sân khấu
          </span>
        ) : (
          <div className="compose-bar__instances">
            {instances.map((inst) => {
              const isSelected = inst.id === selectedInstanceId;
              const depthLabel =
                inst.depth > 50
                  ? 'Hậu cảnh'
                  : inst.depth < -50
                    ? 'Tiền cảnh'
                    : 'Trung cảnh';
              return (
                <button
                  key={inst.id}
                  className={`compose-bar__instance-chip ${
                    isSelected ? 'compose-bar__instance-chip--active' : ''
                  }`}
                  onClick={() => onSelectInstance(inst.id)}
                  title={`Click để chọn ${inst.name} (Depth: ${inst.depth})`}
                >
                  <Layers size={12} />
                  <span>{inst.name}</span>
                  <span className="compose-bar__depth-badge">
                    {depthLabel} ({inst.depth})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {canStageAsset && (
          <Button
            size="sm"
            variant="primary"
            icon={Plus}
            onClick={onStageAsset}
            title={`Thêm '${selectedAssetName || 'Asset'}' vào Sân khấu 2.5D`}
          >
            Lắp vào Sân khấu
          </Button>
        )}
      </div>

      {/* Quick Depth Assignment for Selected Instance */}
      {selectedInstance && (
        <div className="compose-bar__section">
          <span className="compose-bar__label">Tầng sâu (Z-Depth)</span>
          <div className="compose-bar__depth-btns">
            <button
              className={`btn btn--sm ${
                selectedInstance.depth === -150 ? 'btn--primary' : 'btn--ghost'
              }`}
              style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }}
              onClick={() => onUpdateInstanceDepth(selectedInstance.id, -150)}
              title="Tiền cảnh (Gần camera, Z = +150)"
            >
              Tiền cảnh (+150)
            </button>
            <button
              className={`btn btn--sm ${
                selectedInstance.depth === 0 ? 'btn--primary' : 'btn--ghost'
              }`}
              style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }}
              onClick={() => onUpdateInstanceDepth(selectedInstance.id, 0)}
              title="Trung cảnh (Mặt phẳng tiêu cự chính, Z = 0)"
            >
              Trung cảnh (0)
            </button>
            <button
              className={`btn btn--sm ${
                selectedInstance.depth === 250 ? 'btn--primary' : 'btn--ghost'
              }`}
              style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }}
              onClick={() => onUpdateInstanceDepth(selectedInstance.id, 250)}
              title="Hậu cảnh (Xa camera, Z = -250)"
            >
              Hậu cảnh (-250)
            </button>
          </div>
        </div>
      )}

      {/* Camera Projection & Orbit Controls */}
      <div className="compose-bar__section compose-bar__camera-btns">
        <span className="compose-bar__label">Camera & View</span>
        <Button
          size="sm"
          variant={cameraMode === 'perspective' ? 'primary' : 'ghost'}
          icon={Camera}
          onClick={onToggleCameraMode}
          title={
            cameraMode === 'perspective'
              ? 'Chế độ: 2.5D Perspective Parallax (Thị sai đa tầng)'
              : 'Chế độ: 2D Orthographic (Khung phẳng)'
          }
        >
          {cameraMode === 'perspective' ? '2.5D Parallax' : '2D Ortho'}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          icon={Compass}
          onClick={onSetOrbitView}
          title="Xoay nghiêng 3D để xem phân tầng chiều sâu (Orbit View)"
        >
          Góc nghiêng 3D
        </Button>

        <Button
          size="sm"
          variant="ghost"
          icon={Maximize}
          onClick={onResetFrontView}
          title="Đặt lại khung nhìn chính diện (Front View)"
        >
          Chính diện
        </Button>

        <Button
          size="sm"
          variant={showDepthPlanes ? 'primary' : 'ghost'}
          icon={Eye}
          iconOnly
          onClick={onToggleDepthPlanes}
          title="Bật/Tắt mặt phẳng phân tầng Tiền cảnh / Trung cảnh / Hậu cảnh"
        />

        <Button
          size="sm"
          variant={showShadows ? 'primary' : 'ghost'}
          icon={Sun}
          iconOnly
          onClick={onToggleShadows}
          title="Bật/Tắt bóng đổ mặt đất thời gian thực"
        />
      </div>
    </div>
  );
}
