import React, { useCallback } from 'react';
import './Slider.css';

export interface SliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit = '',
  disabled = false,
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange],
  );

  return (
    <div className={`slider-container ${disabled ? 'slider-container--disabled' : ''}`}>
      {label && <span className="slider-container__label">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="slider-input"
      />
      <span className="slider-container__value">
        {value}
        {unit}
      </span>
    </div>
  );
};
