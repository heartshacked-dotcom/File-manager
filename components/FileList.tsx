
import React, { useRef } from 'react';
import { FileNode, ViewMode, SortField } from '../types';
import { getIconForType } from '../constants';
import { MoreVertical, CheckCircle2, Smartphone, HardDrive, Download, Trash2, Lock, ChevronRight } from 'lucide-react';

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

// Special component for Storage Root items
const StorageItem: React.FC<{
  file: FileNode;
  onOpen: (file: FileNode) => void;
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void;
}> = ({ file, onOpen, onContextMenu }) => {
  let Icon = HardDrive;
  let colorClass = "text-slate-500";
  let bgClass = "bg-slate-100 dark:bg-slate-800";
  
  if (file.id === 'root_internal') { Icon = Smartphone; colorClass = "text-blue-500"; bgClass = "bg-blue-500/10"; }
  else if (file.id === 'root_sd') { Icon = HardDrive; colorClass = "text-purple-500"; bgClass = "bg-purple-500/10"; }
  else if (file.name === 'Downloads') { Icon = Download; colorClass = "text-green-500"; bgClass = "bg-green-500/10"; }
  else if (file.isTrash) { Icon = Trash2; colorClass = "text-red-500"; bgClass = "bg-red-500/10"; }
  else if (file.isProtected) { Icon = Lock; colorClass = "text-amber-500"; bgClass = "bg-amber-500/10"; }

  const percentage = file.capacity ? Math.round((file.size / file.capacity) * 100) : 0;
  const hasUsage = !!file.capacity;

  return (
    <div 
      onClick={() => onOpen(file)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, file); }}
      className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-transform cursor-pointer mb-2"
    >
      <div className={`p-3.5 rounded-xl ${bgClass} ${colorClass}`}>
        <Icon size={28} strokeWidth={2} />
      </div>
      
      <div className="flex-1">
        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">{file.name}</h4>
        
        {hasUsage ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500 font-medium">
               <span>{formatSize(file.size)} used</span>
               <span>{formatSize(file.capacity!)} total</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
               <div 
                 className={`h-full rounded-full transition-all duration-1000 ${
                    percentage > 90 ? 'bg-red-500' : (percentage > 70 ? 'bg-amber-500' : 'bg-blue-500')
                 }`} 
                 style={{ width: `${percentage}%` }}
               />
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">{file.type === 'folder' ? 'Folder' : formatSize(file.size)}</p>
        )}
      </div>
      
      <ChevronRight size={20} className="text-slate-300 dark:text-slate-600" />
    </div>
  );
};

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
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if root drive item
  if (file.parentId === 'root') {
      return <StorageItem file={file} onOpen={onOpen} onContextMenu={onContextMenu} />
  }

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
      try {
        const source = JSON.parse(data);
        if (source.id !== file.id) {
          onDropFile(source.id, file.id);
        }
      } catch (e) { /* ignore */ }
    }
  };

  // --- Interaction Logic (Touch & Mouse) ---
  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      onSelect(file.id, true, false); 
    }, 500); 
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
            ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 shadow-md dark:shadow-blue-900/20' 
            : 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
        }`}
      >
        {isSelected && (
          <div className="absolute top-2 right-2 z-10 animate-in zoom-in duration-200">
            <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-500 fill-white dark:fill-slate-900" />
          </div>
        )}
        
        <div className={`mb-2 p-3 rounded-full transition-transform group-hover:scale-110 ${
          file.type === 'folder' 
             ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500' 
             : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300'
        }`}>
          <Icon size={32} strokeWidth={1.5} />
        </div>
        
        <span className="text-xs font-medium text-center truncate w-full text-slate-700 dark:text-slate-200 px-1 select-none">
          {file.name}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5 select-none">
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
      className={`flex items-center gap-4 p-2.5 rounded-lg border border-transparent transition-colors cursor-pointer select-none ${
         isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
          : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
      }`}
    >
       <div className={`p-2 rounded-lg ${
          file.type === 'folder' 
            ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500' 
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
       }`}>
          <Icon size={24} strokeWidth={1.5} />
       </div>

       <div className="flex-1 min-w-0">
         <h4 className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
           {file.name}
         </h4>
         <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500 mt-0.5">
           <span>{formatDate(file.updatedAt)}</span>
           <span>•</span>
           <span>{file.type === 'folder' ? 'Folder' : formatSize(file.size)}</span>
         </div>
       </div>

       {isSelected ? (
          <CheckCircle2 size={20} className="text-blue-600 dark:text-blue-500 animate-in zoom-in duration-200" />
       ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); onContextMenu(e, file); }}
            className="p-2 text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
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
  
  // Check if we are displaying the Root storage screen based on content (parentId='root')
  // We can infer this if the first file has parentId === 'root'
  const isRootScreen = files.length > 0 && files[0].parentId === 'root';

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
           <span className="text-2xl grayscale opacity-50">📂</span>
        </div>
        <p>No items found</p>
      </div>
    );
  }

  // If root screen, enforce a List-like column layout regardless of viewMode, or use a custom Grid for drives
  if (isRootScreen) {
     return (
        <div className="flex flex-col gap-2 p-2">
           {files.map(file => (
              <FileItem
                 key={file.id}
                 file={file}
                 viewMode={ViewMode.LIST} // Root always looks better as List/Cards
                 isSelected={false}
                 onSelect={onSelect}
                 onOpen={onOpen}
                 onContextMenu={onContextMenu}
                 onDropFile={onDropFile}
                 isSelectionMode={false}
              />
           ))}
        </div>
     )
  }

  return (
    <div className={viewMode === ViewMode.GRID ? "grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2" : "flex flex-col gap-1"}>
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
