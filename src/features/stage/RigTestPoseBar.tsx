import React from 'react';
import { Play, RotateCcw, AlertTriangle, Bone } from 'lucide-react';
import { Button } from '../../ui/Button.js';
import './RigTestPoseBar.css';

export interface RigTestPoseBarProps {
  isTestPose: boolean;
  onToggleTestPose: () => void;
  onResetPose: () => void;
  onApplyPresetPose: (preset: 'wave' | 'bow' | 'jump' | 'stretch') => void;
  selectedBoneId: string | null;
  currentRotation: number;
  onRotateBone: (angle: number) => void;
}

/**
 * Control bar for testing extreme skeleton poses in the Rig workspace.
 * Preserves rest pose while allowing designers to verify skin deformation.
 */
export function RigTestPoseBar({
  isTestPose,
  onToggleTestPose,
  onResetPose,
  onApplyPresetPose,
  selectedBoneId,
  currentRotation,
  onRotateBone,
}: RigTestPoseBarProps): React.JSX.Element {
  return (
    <div className={`rig-pose-bar ${isTestPose ? 'rig-pose-bar--active' : ''}`}>
      {/* Mode Status Indicator */}
      <div
        className={[
          'rig-pose-bar__badge',
          isTestPose ? 'rig-pose-bar__badge--test' : 'rig-pose-bar__badge--rest',
        ].join(' ')}
      >
        {isTestPose ? <AlertTriangle size={12} /> : <Bone size={12} />}
        <span>{isTestPose ? 'Test Pose' : 'Rest Pose'}</span>
      </div>

      <Button
        size="sm"
        variant={isTestPose ? 'primary' : 'ghost'}
        icon={Play}
        onClick={onToggleTestPose}
        title="Bật/Tắt chế độ Thử Dáng để kiểm tra biến dạng lưới"
      >
        {isTestPose ? 'Đang Thử Dáng' : 'Bật Thử Dáng'}
      </Button>

      {isTestPose && (
        <>
          <div className="rig-pose-bar__divider" />

          {/* Quick Extreme Poses to detect skin tears */}
          <span style={{ color: 'var(--text-muted)' }}>Dáng mẫu:</span>
          <div className="rig-pose-bar__presets">
            <button
              className="rig-pose-bar__btn"
              onClick={() => onApplyPresetPose('wave')}
              title="Thử vẫy tay (Kiểm tra vai và khuỷu tay)"
            >
              Vẫy tay
            </button>
            <button
              className="rig-pose-bar__btn"
              onClick={() => onApplyPresetPose('bow')}
              title="Thử cúi người (Kiểm tra cột sống và hông)"
            >
              Cúi gập
            </button>
            <button
              className="rig-pose-bar__btn"
              onClick={() => onApplyPresetPose('jump')}
              title="Thử co chân (Kiểm tra đầu gối và đùi)"
            >
              Co gối
            </button>
            <button
              className="rig-pose-bar__btn"
              onClick={() => onApplyPresetPose('stretch')}
              title="Thử căng cực đại (Extreme Stretch)"
            >
              Căng cực đại
            </button>
          </div>

          <div className="rig-pose-bar__divider" />

          {/* Selected Bone Angle Slider */}
          {selectedBoneId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Xương {selectedBoneId}:</span>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={Math.round((currentRotation * 180) / Math.PI)}
                onChange={(e) => {
                  const deg = Number(e.target.value);
                  onRotateBone((deg * Math.PI) / 180);
                }}
                style={{ width: '90px' }}
                title="Xoay xương thử nghiệm"
              />
              <span style={{ width: '32px', textAlign: 'right' }}>
                {Math.round((currentRotation * 180) / Math.PI)}°
              </span>
            </div>
          )}

          <div className="rig-pose-bar__divider" />

          {/* Reset button */}
          <Button
            size="sm"
            variant="ghost"
            icon={RotateCcw}
            onClick={onResetPose}
            title="Trả toàn bộ xương về vị trí ban đầu (Rest Pose)"
          >
            Đặt lại Rest Pose
          </Button>
        </>
      )}
    </div>
  );
}
