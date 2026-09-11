import React, { useCallback } from 'react';
import './Input.css';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  unit?: string;
  value: string | number;
  onChange?: (value: string) => void;
  onNumberChange?: (value: number) => void;
  sizeVariant?: 'sm' | 'md';
}

export const Input: React.FC<InputProps> = ({
  label,
  unit,
  value,
  onChange,
  onNumberChange,
  sizeVariant = 'md',
  className = '',
  type = 'text',
  disabled,
  ...rest
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onChange?.(val);
      if (type === 'number' && onNumberChange) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          onNumberChange(num);
        }
      }
    },
    [onChange, onNumberChange, type],
  );

  return (
    <div className={`input-container input-container--${sizeVariant} ${disabled ? 'input-container--disabled' : ''}`}>
      {label && <span className="input-container__label">{label}</span>}
      <div className="input-container__wrapper">
        <input
          type={type}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={`input-field ${className}`}
          {...rest}
        />
        {unit && <span className="input-container__unit">{unit}</span>}
      </div>
    </div>
  );
};
