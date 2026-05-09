import { useEffect, useRef } from 'react';

export type MenuItem =
  | { label: string; shortcut?: string; icon?: string; danger?: boolean; onClick: () => void; divider?: never }
  | { divider: true; label?: never; shortcut?: never; icon?: never; danger?: never; onClick?: never };

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export const ContextMenu = ({ x, y, items, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  // Clamp position so menu doesn't go off-screen
  const menuW = 220;
  const menuH = items.length * 36;
  const clampedX = Math.min(x, window.innerWidth - menuW - 8);
  const clampedY = Math.min(y, window.innerHeight - menuH - 8);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-surface border border-border rounded-xl shadow-2xl shadow-black/40 py-1.5 overflow-hidden backdrop-blur-xl"
      style={{ left: clampedX, top: clampedY, minWidth: menuW, animation: 'contextMenuIn 0.12s ease-out' }}
    >
      <style>{`
        @keyframes contextMenuIn {
          from { opacity: 0; transform: scale(0.92) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      {items.map((item, i) => {
        if ('divider' in item && item.divider) {
          return <div key={i} className="my-1 border-t border-border/60 mx-2" />;
        }
        const menuItem = item as Extract<MenuItem, { onClick: () => void }>;
        return (
          <button
            key={i}
            className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between gap-4 transition-colors rounded-lg mx-0
              ${menuItem.danger 
                ? 'text-red-400 hover:bg-red-500/10' 
                : 'text-textMain hover:bg-surfaceHover'}`}
            onClick={() => { menuItem.onClick(); onClose(); }}
          >
            <span className="flex items-center gap-2">
              {menuItem.icon && <span className="text-base leading-none">{menuItem.icon}</span>}
              {menuItem.label}
            </span>
            {menuItem.shortcut && (
              <span className="text-[10px] text-textMuted font-mono bg-surface border border-border px-1.5 py-0.5 rounded">
                {menuItem.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
