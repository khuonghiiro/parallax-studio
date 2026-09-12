import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  Paintbrush,
  Bone,
  Film,
  Layers,
  Save,
  FolderOpen,
  Upload,
  Download,
  Sparkles,
  Camera,
  Grid3x3,
  Pentagon,
  Play,
  RotateCcw,
} from 'lucide-react';
import './CommandPalette.css';

export interface CommandItem {
  id: string;
  category: 'workspace' | 'project' | 'director' | 'viewport' | 'playback';
  title: string;
  keywords: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  shortcut?: string;
}

export const COMMANDS: CommandItem[] = [
  // Workspaces
  {
    id: 'ws:draw',
    category: 'workspace',
    title: 'Chuyển sang Vẽ nét (Draw Workspace)',
    keywords: 'draw ve cels sketch layer brush',
    icon: Paintbrush,
    shortcut: '1',
  },
  {
    id: 'ws:rig',
    category: 'workspace',
    title: 'Chuyển sang Khung xương (Rig Workspace)',
    keywords: 'rig xuong bone skeleton mesh weights',
    icon: Bone,
    shortcut: '2',
  },
  {
    id: 'ws:animate',
    category: 'workspace',
    title: 'Chuyển sang Diễn hoạt (Animate Workspace)',
    keywords: 'animate dien hoat clip dopesheet morph',
    icon: Film,
    shortcut: '3',
  },
  {
    id: 'ws:compose',
    category: 'workspace',
    title: 'Chuyển sang Dàn cảnh 2.5D (Compose Workspace)',
    keywords: 'compose dan canh stage scene parallax 3d',
    icon: Layers,
    shortcut: '4',
  },
  {
    id: 'ws:edit',
    category: 'workspace',
    title: 'Chuyển sang Dựng phim (Edit Workspace)',
    keywords: 'edit dung phim timeline render sequence cuts',
    icon: Film,
    shortcut: '5',
  },

  // Project & Media
  {
    id: 'proj:save',
    category: 'project',
    title: 'Lưu dự án (Save Project)',
    keywords: 'save luu du an project json file',
    icon: Save,
    shortcut: 'Ctrl+S',
  },
  {
    id: 'proj:open',
    category: 'project',
    title: 'Mở dự án (Open Project)',
    keywords: 'open mo du an project load json',
    icon: FolderOpen,
    shortcut: 'Ctrl+O',
  },
  {
    id: 'proj:import',
    category: 'project',
    title: 'Nhập hình ảnh mới (Import Image)',
    keywords: 'import nhap anh image photo png file',
    icon: Upload,
  },
  {
    id: 'proj:demo',
    category: 'project',
    title: 'Nạp nhân vật mẫu (Load Demo Character)',
    keywords: 'demo mau hero sample character load',
    icon: Sparkles,
  },
  {
    id: 'proj:export',
    category: 'project',
    title: 'Xuất video hoàn tất (Export Video)',
    keywords: 'export xuat video webm mp4 render',
    icon: Download,
  },

  // Director & AI
  {
    id: 'ai:drawer',
    category: 'director',
    title: 'Mở Trợ lý Đạo diễn AI (AI Filmmaker Assistant)',
    keywords: 'ai director dao dien assistant script kich ban auto stage',
    icon: Sparkles,
  },

  // Viewport & Overlays
  {
    id: 'cam:toggle',
    category: 'viewport',
    title: 'Bật/Tắt Camera Perspective 2.5D Parallax',
    keywords: 'camera goc may 2.5d 3d perspective orthographic',
    icon: Camera,
  },
  {
    id: 'view:grid',
    category: 'viewport',
    title: 'Ẩn/Hiện lưới tham chiếu (Toggle Grid)',
    keywords: 'grid luoi overlay guide',
    icon: Grid3x3,
    shortcut: 'G',
  },
  {
    id: 'view:wireframe',
    category: 'viewport',
    title: 'Ẩn/Hiện lưới tam giác (Toggle Wireframe)',
    keywords: 'wireframe luoi mesh tam giac geometry',
    icon: Pentagon,
    shortcut: 'Ctrl+M',
  },
  {
    id: 'view:skeleton',
    category: 'viewport',
    title: 'Ẩn/Hiện khung xương (Toggle Skeleton)',
    keywords: 'skeleton xuong bones overlay',
    icon: Bone,
    shortcut: 'Ctrl+B',
  },

  // Playback
  {
    id: 'play:toggle',
    category: 'playback',
    title: 'Phát / Tạm dừng dòng thời gian (Play/Pause)',
    keywords: 'play pause phat tam dung timeline space',
    icon: Play,
    shortcut: 'Space',
  },
  {
    id: 'play:rewind',
    category: 'playback',
    title: 'Về frame đầu tiên (Rewind to Frame 0)',
    keywords: 'rewind dau tien frame 0 start',
    icon: RotateCcw,
  },
];

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (commandId: string) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectCommand,
}: CommandPaletteProps): React.JSX.Element | null {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const lower = query.toLowerCase().trim();
    return COMMANDS.filter((cmd) => {
      return (
        cmd.title.toLowerCase().includes(lower) ||
        cmd.keywords.toLowerCase().includes(lower) ||
        (cmd.shortcut && cmd.shortcut.toLowerCase().includes(lower))
      );
    });
  }, [query]);

  // Adjust selected index if it exceeds list length
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev <= 0 ? Math.max(0, filteredCommands.length - 1) : prev - 1,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          onSelectCommand(selected.id);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filteredCommands, selectedIndex, onSelectCommand, onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        {/* Search Box */}
        <div className="command-palette__search-box">
          <Search size={18} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette__search-input"
            placeholder="Tìm kiếm lệnh, tính năng, hoặc phím tắt... (ví dụ: vẽ, lưu, camera)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <span className="command-palette__badge-key">ESC</span>
        </div>

        {/* Command List */}
        <div className="command-palette__list">
          {filteredCommands.length === 0 ? (
            <div className="command-palette__empty">
              Không tìm thấy lệnh phù hợp với "{query}"
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const isSelected = index === selectedIndex;
              const IconComp = cmd.icon;
              return (
                <div
                  key={cmd.id}
                  className={`command-palette__item ${
                    isSelected ? 'command-palette__item--selected' : ''
                  }`}
                  onClick={() => {
                    onSelectCommand(cmd.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="command-palette__item-left">
                    <IconComp
                      size={16}
                      color={isSelected ? '#818cf8' : 'var(--text-secondary)'}
                    />
                    <span className="command-palette__item-title">{cmd.title}</span>
                  </div>
                  {cmd.shortcut && (
                    <span className="command-palette__item-shortcut">
                      {cmd.shortcut}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="command-palette__footer">
          <div className="command-palette__hints">
            <span>↑↓ Di chuyển</span>
            <span>↵ Chọn thực thi</span>
            <span>ESC Đóng</span>
          </div>
          <span>Parallax Studio Command Palette</span>
        </div>
      </div>
    </div>
  );
}
