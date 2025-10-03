import React, { useState, useCallback } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  actions: Array<{
    label: string;
    onClick: () => void;
    icon?: string;
    className?: string;
  }>;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, actions }) => {
  return (
    <div
      className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-2 z-50"
      style={{ left: x, top: y }}
      onMouseLeave={onClose}
    >
      {actions.map((action, index) => (
        <button
          key={index}
          className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 ${action.className || ''}`}
          onClick={() => {
            action.onClick();
            onClose();
          }}
        >
          {action.icon && <span>{action.icon}</span>}
          {action.label}
        </button>
      ))}
    </div>
  );
};

interface UseContextMenuReturn {
  contextMenu: {
    x: number;
    y: number;
    actions: Array<{
      label: string;
      onClick: () => void;
      icon?: string;
      className?: string;
    }>;
  } | null;
  showContextMenu: (
    event: React.MouseEvent,
    actions: Array<{
      label: string;
      onClick: () => void;
      icon?: string;
      className?: string;
    }>
  ) => void;
  hideContextMenu: () => void;
}

export const useContextMenu = (): UseContextMenuReturn => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    actions: Array<{
      label: string;
      onClick: () => void;
      icon?: string;
      className?: string;
    }>;
  } | null>(null);

  const showContextMenu = useCallback((
    event: React.MouseEvent,
    actions: Array<{
      label: string;
      onClick: () => void;
      icon?: string;
      className?: string;
    }>
  ) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      actions
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return { contextMenu, showContextMenu, hideContextMenu };
};