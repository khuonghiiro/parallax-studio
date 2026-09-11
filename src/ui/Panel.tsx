import React, { useState, useCallback } from 'react';
import './Panel.css';

export interface PanelProps {
  /** Panel title displayed in the header. */
  title: string;
  /** Content to render inside the panel body. */
  children: React.ReactNode;
  /** Whether the panel can be collapsed. */
  collapsible?: boolean;
  /** Initial collapsed state. */
  defaultCollapsed?: boolean;
  /** Additional CSS class for the root element. */
  className?: string;
  /** Semantic ID for automation. */
  id?: string;
  /** Right-side header actions (buttons, etc.). */
  headerActions?: React.ReactNode;
}

/**
 * Panel component — collapsible container used in
 * Hierarchy, Properties, and Tool Options areas.
 */
export function Panel({
  title,
  children,
  collapsible = true,
  defaultCollapsed = false,
  className = '',
  id,
  headerActions,
}: PanelProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = useCallback(() => {
    if (collapsible) {
      setCollapsed((prev) => !prev);
    }
  }, [collapsible]);

  return (
    <section
      id={id}
      className={`panel ${collapsed ? 'panel--collapsed' : ''} ${className}`}
    >
      <header className="panel__header" onClick={toggleCollapse}>
        {collapsible && (
          <span className="panel__chevron">
            {collapsed ? '▸' : '▾'}
          </span>
        )}
        <span className="panel__title">{title}</span>
        {headerActions && (
          <div
            className="panel__actions"
            onClick={(e) => e.stopPropagation()}
          >
            {headerActions}
          </div>
        )}
      </header>

      {!collapsed && (
        <div className="panel__body">
          {children}
        </div>
      )}
    </section>
  );
}
