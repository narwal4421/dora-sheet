import React, { useState, useRef, useEffect } from 'react';

export interface MenuItem {
  label: string;
  onClick: () => void;
  shortcut?: string;
  divider?: boolean;
}

interface DropdownMenuProps {
  label: string;
  items: MenuItem[];
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ label, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button 
        className={`px-2 py-1 rounded transition-colors text-xs font-medium ${isOpen ? 'bg-surfaceHover text-textMain' : 'hover:text-textMain text-textMuted'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {label}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-background border border-border rounded shadow-xl z-50 py-1 flex flex-col">
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={index} className="my-1 border-t border-border" />;
            }
            return (
              <button
                key={index}
                className="flex items-center justify-between px-3 py-1.5 text-xs text-textMain hover:bg-surfaceHover hover:text-accent transition-colors w-full text-left"
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
              >
                <span>{item.label}</span>
                {item.shortcut && <span className="text-textMuted text-[10px] tracking-widest font-mono">{item.shortcut}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
