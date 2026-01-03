import React, { useEffect, useRef } from 'react';
import { 
  Copy, Scissors, Trash2, Edit2, Info, Share2, 
  ExternalLink, EyeOff, FolderOpen, CopyPlus 
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: string) => void;
  singleFile?: boolean;
  isFolder?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onAction, singleFile, isFolder }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust position to not overflow screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 340);

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 animate-in zoom-in-95 duration-100 origin-top-left"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {singleFile && isFolder && (
        <button onClick={() => onAction('open')} className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3">
          <FolderOpen size={16} /> Open
        </button>
      )}
      <button onClick={() => onAction('copy')} className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3">
        <Copy size={16} /> Copy
      </button>
      <button onClick={() => onAction('cut')} className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3">
        <Scissors size={16} /> Cut
      </button>
      <button onClick={() => onAction('duplicate')} className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3">
        <CopyPlus size={16} /> Duplicate
      </button>
      
      <div className="h-px bg-slate-700 my-1"></div>
      
      {singleFile && (
        <button onClick={() => onAction('rename')} className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3">
          <Edit2 size={16} /> Rename
        </button>
      )}
      <button onClick={() => onAction('share')} className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3">
        <Share2 size={16} /> Share
      </button>
      <button onClick={() => onAction('hide')} className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3">
        <EyeOff size={16} /> Hide
      </button>
      
      <div className="h-px bg-slate-700 my-1"></div>
      
      <button onClick={() => onAction('delete')} className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-3">
        <Trash2 size={16} /> Delete
      </button>
      <button onClick={() => onAction('properties')} className="w-full px-4 py-2.5 text-left text-sm text-slate-400 hover:bg-slate-700 flex items-center gap-3">
        <Info size={16} /> Properties
      </button>
    </div>
  );
};

export default ContextMenu;