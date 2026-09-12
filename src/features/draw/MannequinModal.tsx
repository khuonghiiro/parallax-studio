import React, { useState } from 'react';
import { X, User, CheckCircle2 } from 'lucide-react';
import {
  MANNEQUIN_PRESETS,
  type MannequinPresetId,
  type MannequinPose,
} from './mannequin-presets.js';
import './MannequinModal.css';

export interface MannequinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (
    presetId: MannequinPresetId,
    pose: MannequinPose,
    targetLayer: 'sketch' | 'active',
    showJoints: boolean,
  ) => void;
}

export function MannequinModal({
  isOpen,
  onClose,
  onApplyPreset,
}: MannequinModalProps): React.JSX.Element | null {
  const [selectedId, setSelectedId] = useState<MannequinPresetId>('hero-male');
  const [pose, setPose] = useState<MannequinPose>('a-pose');
  const [targetLayer, setTargetLayer] = useState<'sketch' | 'active'>('sketch');
  const [showJoints, setShowJoints] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyPreset(selectedId, pose, targetLayer, showJoints);
    onClose();
  };

  const selectedPreset = MANNEQUIN_PRESETS.find((p) => p.id === selectedId);
  const isHumanoid = selectedPreset?.category === 'humanoid';

  return (
    <div className="mannequin-modal__overlay" onClick={onClose}>
      <div className="mannequin-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mannequin-modal__header">
          <div className="mannequin-modal__title-group">
            <div className="mannequin-modal__icon">
              <User size={18} />
            </div>
            <h3 className="mannequin-modal__title">Bộ Phôi Mẫu Cơ Thể 2D (Mannequin Presets)</h3>
          </div>
          <button className="mannequin-modal__close" onClick={onClose} title="Đóng">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="mannequin-modal__body">
          <p className="mannequin-modal__intro">
            Chọn khung phôi tỷ lệ chuẩn giải phẫu làm điểm tựa phác thảo, phân rã bộ phận
            cho AI hoặc gắn xương chuyển động (Rigging).
          </p>

          {/* Presets Grid */}
          <div className="mannequin-modal__grid">
            {MANNEQUIN_PRESETS.map((preset) => {
              const isSelected = preset.id === selectedId;
              return (
                <div
                  key={preset.id}
                  className={`mannequin-card ${isSelected ? 'mannequin-card--selected' : ''}`}
                  onClick={() => setSelectedId(preset.id)}
                >
                  <div className="mannequin-card__top">
                    <span className="mannequin-card__name">{preset.name}</span>
                    <span className="mannequin-card__badge">{preset.headRatio}</span>
                  </div>
                  <p className="mannequin-card__desc">{preset.description}</p>
                </div>
              );
            })}
          </div>

          {/* Options & Layer Target */}
          <div className="mannequin-modal__options">
            {/* Pose selector for humanoids */}
            {isHumanoid && (
              <div className="mannequin-modal__option-row">
                <span className="mannequin-modal__label">Dáng phôi giải phẫu:</span>
                <div className="mannequin-modal__pose-toggle">
                  <button
                    className={[
                      'mannequin-modal__pose-btn',
                      pose === 'a-pose' ? 'mannequin-modal__pose-btn--active' : '',
                    ].join(' ')}
                    onClick={() => setPose('a-pose')}
                  >
                    A-Pose (Khuyên dùng)
                  </button>
                  <button
                    className={[
                      'mannequin-modal__pose-btn',
                      pose === 't-pose' ? 'mannequin-modal__pose-btn--active' : '',
                    ].join(' ')}
                    onClick={() => setPose('t-pose')}
                  >
                    T-Pose (Tay ngang)
                  </button>
                </div>
              </div>
            )}

            {/* Target layer selection */}
            <div className="mannequin-modal__option-row">
              <span className="mannequin-modal__label">Lớp vẽ đích:</span>
              <label className="mannequin-modal__checkbox-label">
                <input
                  type="radio"
                  name="targetLayer"
                  checked={targetLayer === 'sketch'}
                  onChange={() => setTargetLayer('sketch')}
                />
                <span>Lớp Phác thảo (Sketch) — Tự động bật Bàn sáng</span>
              </label>
            </div>

            {/* Show joint circles */}
            <div className="mannequin-modal__option-row">
              <span className="mannequin-modal__label">Đánh dấu ổ khớp:</span>
              <label className="mannequin-modal__checkbox-label">
                <input
                  type="checkbox"
                  checked={showJoints}
                  onChange={(e) => setShowJoints(e.target.checked)}
                />
                <span>Vòng tròn khớp xoay (Hỗ trợ phân rã chi tiết)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mannequin-modal__footer">
          <button className="mannequin-modal__btn mannequin-modal__btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <button
            className="mannequin-modal__btn mannequin-modal__btn--primary"
            onClick={handleApply}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <CheckCircle2 size={14} />
            <span>Áp Dụng Phôi Mẫu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
