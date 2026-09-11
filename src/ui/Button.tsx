import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon.js';
import './Button.css';

/**
 * Button variant determines visual style.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Button size determines padding and font size.
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Button text label. */
  children?: React.ReactNode;
  /** Visual variant. */
  variant?: ButtonVariant;
  /** Size. */
  size?: ButtonSize;
  /** Lucide icon to show before label. */
  icon?: LucideIcon;
  /** Icon-only mode (no text, square button). */
  iconOnly?: boolean;
  /** Whether the button represents an active/toggled state. */
  active?: boolean;
  /** Disabled state. */
  disabled?: boolean;
  /** Click handler. */
  onClick?: () => void;
  /** Semantic element ID for MCP/automation. */
  id?: string;
  /** Tooltip text. */
  title?: string;
  /** HTML type attribute. */
  type?: 'button' | 'submit';
  /** Additional CSS class. */
  className?: string;
}

/**
 * Button component for toolbars, panels, and actions.
 * Supports icon+text, icon-only, and active toggle states.
 */
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconOnly = false,
  active = false,
  disabled = false,
  onClick,
  id,
  title,
  type = 'button',
  className = '',
}: ButtonProps): React.JSX.Element {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    iconOnly ? 'btn--icon-only' : '',
    active ? 'btn--active' : '',
    className,
  ].filter(Boolean).join(' ');

  const iconSize = size === 'sm' ? 'sm' : 'md';

  return (
    <button
      id={id}
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {icon && <Icon icon={icon} size={iconSize} />}
      {!iconOnly && children && (
        <span className="btn__label">{children}</span>
      )}
    </button>
  );
}
