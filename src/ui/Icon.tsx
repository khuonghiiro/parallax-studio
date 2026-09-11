import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Props for the Icon wrapper component.
 */
export interface IconProps {
  /** Lucide icon component to render. */
  icon?: LucideIcon;
  /** Custom SVG path data as fallback when no Lucide icon exists. */
  svgPath?: string;
  /** Size variant. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** CSS color override. */
  color?: string;
  /** Additional CSS class names. */
  className?: string;
  /** Accessible label. */
  label?: string;
}

/**
 * Size map using CSS custom properties.
 */
const SIZE_MAP = {
  sm: 'var(--icon-sm)',
  md: 'var(--icon-md)',
  lg: 'var(--icon-lg)',
  xl: 'var(--icon-xl)',
} as const;

const STROKE_MAP = {
  sm: 'var(--icon-stroke-thin)',
  md: 'var(--icon-stroke)',
  lg: 'var(--icon-stroke)',
  xl: 'var(--icon-stroke)',
} as const;

/**
 * Icon component — wraps Lucide icons with consistent sizing,
 * or renders a custom inline SVG when no Lucide icon is available.
 *
 * Per UI_SPECIFICATION.md §11:
 * - Primary: Lucide Icons
 * - Fallback: Custom SVG matching Lucide spec (24×24, 2px stroke, round caps)
 */
export function Icon({
  icon: LucideComponent,
  svgPath,
  size = 'md',
  color,
  className = '',
  label,
}: IconProps): React.JSX.Element {
  const pixelSize = SIZE_MAP[size];
  const strokeWidth = STROKE_MAP[size];

  if (LucideComponent) {
    return (
      <LucideComponent
        size={pixelSize}
        strokeWidth={strokeWidth as unknown as number}
        color={color}
        className={`parallax-icon ${className}`}
        aria-label={label}
        aria-hidden={!label}
      />
    );
  }

  if (svgPath) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color ?? 'currentColor'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`parallax-icon ${className}`}
        aria-label={label}
        aria-hidden={!label}
        dangerouslySetInnerHTML={{ __html: svgPath }}
      />
    );
  }

  // Empty placeholder
  return (
    <span
      className={`parallax-icon ${className}`}
      style={{ width: pixelSize, height: pixelSize, display: 'inline-block' }}
    />
  );
}
