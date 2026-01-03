import React, { useMemo } from 'react';
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
  files: FileNode[];
  viewMode: ViewMode;
  selectedIds: Set<string>;
  onSelect: (id: string, multi: boolean) => void;
  onOpen: (file: FileNode) => void;
  sortField: SortField;
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void;
  onDropFile: (sourceId: string, targetFolderId: string) => void;
}

const FileList: React.FC<FileListProps> = ({ 
  files, 
  viewMode, 
  selectedIds, 
  onSelect, 
  onOpen,
  sortField,
  onContextMenu,
  onDropFile
}) => {

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      // Folders always first
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;

      switch (sortField) {
        case SortField.SIZE: return b.size - a.size;
        case SortField.DATE: return b.updatedAt - a.updatedAt;
        case SortField.TYPE: return a.type.localeCompare(b.type);
        case SortField.NAME: 
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [files, sortField]);

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, file: FileNode) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: file.id, name: file.name }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, file: FileNode) => {
    if (file.type === 'folder') {
       e.preventDefault(); // Allow drop
       e.dataTransfer.dropEffect = 'move';
       e.currentTarget.classList.add('bg-blue-500/20');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-blue-500/20');
  };

  const handleDrop = (e: React.DragEvent, targetFile: FileNode) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-500/20');
    const data = e.dataTransfer.getData('application/json');
    if (data && targetFile.type === 'folder') {
      const source = JSON.parse(data);
      if (source.id !== targetFile.id) {
        onDropFile(source.id, targetFile.id);
      }
    }
  };

  const handleInteraction = (e: React.MouseEvent, file: FileNode) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey || selectedIds.size > 0) {
       onSelect(file.id, true);
    } else {
       if (file.type === 'folder') {
         onOpen(file);
       } else {
         onOpen(file); // Or preview
       }
    }
  };

  if (sortedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
           <span className="text-2xl">📂</span>
        </div>
        <p>This folder is empty</p>
      </div>
    );
  }

  if (viewMode === ViewMode.GRID) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 p-2 pb-24">
        {sortedFiles.map(file => {
          const Icon = getIconForType(file.type);
          const isSelected = selectedIds.has(file.id);
          return (
            <div 
              key={file.id}
              draggable
              onDragStart={(e) => handleDragStart(e, file)}
              onDragOver={(e) => handleDragOver(e, file)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, file)}
              onClick={(e) => handleInteraction(e, file)}
              onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, file); }}
              className={`group relative flex flex-col items-center p-3 rounded-xl transition-all duration-200 cursor-pointer border ${
                isSelected 
                  ? 'bg-blue-600/20 border-blue-500 shadow-lg' 
                  : 'bg-slate-800/40 border-transparent hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 text-blue-400 z-10">
                  <CheckCircle2 size={18} fill="currentColor" className="text-blue-500 text-white" />
                </div>
              )}
              
              <div className={`mb-2 p-3 rounded-full transition-transform group-hover:scale-110 ${
                file.type === 'folder' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-700/50 text-slate-300'
              }`}>
                <Icon size={32} strokeWidth={1.5} />
              </div>
              
              <span className="text-xs font-medium text-center truncate w-full text-slate-200 px-1">
                {file.name}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {file.type === 'folder' ? formatDate(file.updatedAt) : formatSize(file.size)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24">
      {sortedFiles.map(file => {
        const Icon = getIconForType(file.type);
        const isSelected = selectedIds.has(file.id);

        return (
          <div 
            key={file.id}
            draggable
            onDragStart={(e) => handleDragStart(e, file)}
            onDragOver={(e) => handleDragOver(e, file)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, file)}
            onClick={(e) => handleInteraction(e, file)}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, file); }}
            className={`flex items-center gap-4 p-3 border-b border-slate-800/50 transition-colors cursor-pointer ${
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
                <CheckCircle2 size={20} className="text-blue-500" />
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
      })}
    </div>
  );
};

export default FileList;
