import React, { useRef } from 'react';
import { FileNode, ViewMode, SortField } from '../types';
import { getIconForType } from '../constants';
import { MoreVertical, CheckCircle2 } from 'lucide-react';

const formatDate = (ts: number) => {
  const date = new Date(ts);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface FileListProps {
  files: FileNode[]; // Files are assumed to be pre-sorted and filtered
  viewMode: ViewMode;
  selectedIds: Set<string>;
  onSelect: (id: string, multi: boolean, range: boolean) => void;
  onOpen: (file: FileNode) => void;
  sortField: SortField;
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void;
  onDropFile: (sourceId: string, targetFolderId: string) => void;
}

const FileItem: React.FC<{
  file: FileNode;
  viewMode: ViewMode;
  isSelected: boolean;
  onSelect: (id: string, multi: boolean, range: boolean) => void;
  onOpen: (file: FileNode) => void;
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void;
  onDropFile: (sourceId: string, targetFolderId: string) => void;
  isSelectionMode: boolean;
}> = ({ file, viewMode, isSelected, onSelect, onOpen, onContextMenu, onDropFile, isSelectionMode }) => {
  const Icon = getIconForType(file.type);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: file.id, name: file.name }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (file.type === 'folder') {
       e.preventDefault(); 
       e.dataTransfer.dropEffect = 'move';
       e.currentTarget.classList.add('bg-blue-500/20', 'border-blue-500');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-blue-500/20', 'border-blue-500');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-500/20', 'border-blue-500');
    const data = e.dataTransfer.getData('application/json');
    if (data && file.type === 'folder') {
      const source = JSON.parse(data);
      if (source.id !== file.id) {
        onDropFile(source.id, file.id);
      }
    }
  };

  // --- Interaction Logic (Touch & Mouse) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only Left Click
    // Mouse click logic handled in onClick, here we just ensure basic pointer behavior
  };

  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      // Long press triggers selection mode + vibration
      if (navigator.vibrate) navigator.vibrate(50);
      onSelect(file.id, true, false); 
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const isMulti = e.ctrlKey || e.metaKey || isSelectionMode;
    const isRange = e.shiftKey;

    if (isMulti || isRange) {
       onSelect(file.id, isMulti, isRange);
    } else {
       onOpen(file);
    }
  };

  if (viewMode === ViewMode.GRID) {
    return (
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, file); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`group relative flex flex-col items-center p-3 rounded-xl transition-all duration-200 cursor-pointer border ${
          isSelected 
            ? 'bg-blue-600/20 border-blue-500 shadow-lg' 
            : 'bg-slate-800/40 border-transparent hover:bg-slate-800 hover:border-slate-700'
        }`}
      >
        {isSelected && (
          <div className="absolute top-2 right-2 text-blue-400 z-10 animate-in zoom-in duration-200">
            <CheckCircle2 size={18} fill="currentColor" className="text-blue-500 text-white" />
          </div>
        )}
        
        <div className={`mb-2 p-3 rounded-full transition-transform group-hover:scale-110 ${
          file.type === 'folder' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-700/50 text-slate-300'
        }`}>
          <Icon size={32} strokeWidth={1.5} />
        </div>
        
        <span className="text-xs font-medium text-center truncate w-full text-slate-200 px-1 select-none">
          {file.name}
        </span>
        <span className="text-[10px] text-slate-500 mt-0.5 select-none">
          {file.type === 'folder' ? formatDate(file.updatedAt) : formatSize(file.size)}
        </span>
      </div>
    );
  }

  // LIST MODE
  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, file); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`flex items-center gap-4 p-3 border-b border-slate-800/50 transition-colors cursor-pointer select-none ${
         isSelected 
          ? 'bg-blue-900/20' 
          : 'hover:bg-slate-800/30'
      }`}
    >
       <div className={`p-2 rounded-lg ${
          file.type === 'folder' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-400'
       }`}>
          <Icon size={24} strokeWidth={1.5} />
       </div>

       <div className="flex-1 min-w-0">
         <h4 className={`text-sm font-medium truncate ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
           {file.name}
         </h4>
         <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
           <span>{formatDate(file.updatedAt)}</span>
           <span>•</span>
           <span>{file.type === 'folder' ? 'Folder' : formatSize(file.size)}</span>
         </div>
       </div>

       {isSelected ? (
          <CheckCircle2 size={20} className="text-blue-500 animate-in zoom-in duration-200" />
       ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); onContextMenu(e, file); }}
            className="p-2 text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
          >
             <MoreVertical size={16} />
          </button>
       )}
    </div>
  );
};

const FileList: React.FC<FileListProps> = ({ 
  files, 
  viewMode, 
  selectedIds, 
  onSelect, 
  onOpen,
  onContextMenu,
  onDropFile
}) => {
  const isSelectionMode = selectedIds.size > 0;

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
           <span className="text-2xl">📂</span>
        </div>
        <p>No items found</p>
      </div>
    );
  }

  return (
    <div className={viewMode === ViewMode.GRID ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 p-2 pb-24" : "flex flex-col pb-24"}>
      {files.map(file => (
        <FileItem 
          key={file.id}
          file={file}
          viewMode={viewMode}
          isSelected={selectedIds.has(file.id)}
          onSelect={onSelect}
          onOpen={onOpen}
          onContextMenu={onContextMenu}
          onDropFile={onDropFile}
          isSelectionMode={isSelectionMode}
        />
      ))}
    </div>
  );
};

export default FileList;