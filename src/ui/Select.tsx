import React from 'react';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange?: (value: string) => void;
  sizeVariant?: 'sm' | 'md';
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  sizeVariant = 'md',
  className = '',
  disabled,
  ...rest
}) => {
  const containerClass = `select-container select-container--${sizeVariant}`
    + (disabled ? ' select-container--disabled' : '');

  return (
    <div className={containerClass}>
      {label && <span className="select-container__label">{label}</span>}
      <div className="select-container__wrapper">
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={`select-field ${className}`}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
