
import React, { useRef, useEffect, useState } from 'react';
import { FileNode, ViewMode, SortField } from '../types';
import { getIconForType } from '../constants';
import { fileSystem } from '../services/filesystem';
import { 
  MoreVertical, CheckCircle2, Smartphone, HardDrive, 
  Download, Trash2, Lock, ChevronRight, Shield, FileLock,
  Image, Video, Music, FileText, Archive, Play, Clock
} from 'lucide-react';

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
  onSelect: (id: string, multi: boolean, range: boolean) => void;
  onOpen: (file: FileNode) => void;
  sortField: SortField;
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void;
  onDropFile: (sourceId: string, targetFolderId: string) => void;
}

// --- Dashboard Components ---

const StorageCard: React.FC<{
  name: string;
  type: 'internal' | 'sd';
  used: number;
  total: number;
  onClick: () => void;
}> = ({ name, type, used, total, onClick }) => {
  // If total is 0 or negative, we treat it as unknown/unbounded or just invalid for percent calc
  const hasTotal = total > 0;
  const percent = hasTotal ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const free = hasTotal ? Math.max(0, total - used) : 0;
  
  const displayTotal = hasTotal ? formatSize(total) : 'Unknown';
  const displayFree = hasTotal ? formatSize(free) : 'Unknown';
  const displayPercent = hasTotal ? `${percent}%` : '--';
  
  return (
    <button 
      onClick={onClick}
      className={`relative overflow-hidden rounded-3xl p-5 text-left transition-transform active:scale-95 shadow-xl ${
        type === 'internal' 
          ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/30' 
          : 'bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-violet-500/30'
      }`}
    >
      <div className="relative z-10 text-white">
        <div className="flex items-start justify-between mb-6">
           <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
             {type === 'internal' ? <Smartphone size={24} /> : <HardDrive size={24} />}
           </div>
           <div className="text-right">
             <div className="text-2xl font-bold">{displayPercent}</div>
             <div className="text-xs text-white/70 font-medium">Used</div>
           </div>
        </div>
        
        <h3 className="font-bold text-lg mb-1">{name}</h3>
        <p className="text-sm text-white/80 mb-4">
           {hasTotal ? `${displayFree} free of ${displayTotal}` : `${formatSize(used)} used`}
        </p>
        
        <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
           {hasTotal && (
             <div 
               className="h-full bg-white/90 rounded-full transition-all duration-1000 ease-out" 
               style={{ width: `${percent}%` }} 
             />
           )}
        </div>
      </div>

      {/* Decorative Circles */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
    </button>
  );
};

const CategoryButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  count?: string;
  colorClass: string;
  bgClass: string;
  onClick: () => void;
}> = ({ icon, label, colorClass, bgClass, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 group"
  >
    <div className={`w-14 h-14 ${bgClass} ${colorClass} rounded-2xl flex items-center justify-center transition-transform group-active:scale-90 shadow-sm`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 24, strokeWidth: 2 })}
    </div>
    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
  </button>
);

const QuickAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  onClick: () => void;
  accentColor: string;
}> = ({ icon, label, subLabel, onClick, accentColor }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
  >
     <div className={`p-3 rounded-xl ${accentColor} bg-opacity-10 dark:bg-opacity-20`}>
        {React.cloneElement(icon as React.ReactElement<any>, { className: accentColor.replace('bg-', 'text-'), size: 22 })}
     </div>
     <div className="flex-1 text-left">
        <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{label}</div>
        {subLabel && <div className="text-xs text-slate-500 mt-0.5">{subLabel}</div>}
     </div>
     <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
  </button>
);

const RecentFileItem: React.FC<{ file: FileNode, onClick: () => void }> = ({ file, onClick }) => {
  const Icon = getIconForType(file.type);
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-3 w-full bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left group">
       <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
          <Icon size={20} strokeWidth={1.5} />
       </div>
       <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</div>
          <div className="text-xs text-slate-500">{formatDate(file.updatedAt)} • {formatSize(file.size)}</div>
       </div>
    </button>
  );
};

// --- File Item Component ---
const FileItem: React.FC<{
  file: FileNode;
  viewMode: ViewMode;
  isSelected: boolean;
  onSelect: (id: string, multi: boolean, range: boolean) => void;
  onOpen: (file: FileNode) => void;
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void;
  onDropFile: (sourceId: string, targetFolderId: string) => void;
  isSelectionMode: boolean;
}> = React.memo(({ file, viewMode, isSelected, onSelect, onOpen, onContextMenu, onDropFile, isSelectionMode }) => {
  const Icon = getIconForType(file.type);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: file.id, name: file.name }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (file.type === 'folder') {
       e.preventDefault(); 
       e.dataTransfer.dropEffect = 'move';
       e.currentTarget.classList.add('bg-blue-500/20', 'ring-2', 'ring-blue-500', 'rounded-xl');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-blue-500/20', 'ring-2', 'ring-blue-500', 'rounded-xl');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-500/20', 'ring-2', 'ring-blue-500', 'rounded-xl');
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

  // --- Interaction Logic ---
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

  // --- Grid View Render ---
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
        className={`group relative flex flex-col items-center p-3 rounded-2xl transition-all duration-200 cursor-pointer border select-none ${
          isSelected 
            ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 shadow-md dark:shadow-blue-900/20' 
            : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        {isSelected && (
          <div className="absolute top-1.5 right-1.5 z-10 animate-in zoom-in duration-200">
            <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400 fill-white dark:fill-slate-900" />
          </div>
        )}
        
        <div className="relative mb-2">
          <div className={`p-3.5 rounded-2xl transition-transform group-hover:scale-105 shadow-sm ${
            file.type === 'folder' 
               ? (file.isProtected ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500' : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500') 
               : (file.isTrash ? 'bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400')
          }`}>
            <Icon size={36} strokeWidth={1.5} />
          </div>
          
          {/* Status Indicators */}
          {(file.isEncrypted || file.isProtected) && (
             <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                {file.isEncrypted && (
                  <div className="bg-slate-700 text-white p-1 rounded-full ring-2 ring-white dark:ring-slate-950 shadow-sm" title="Encrypted">
                    <FileLock size={10} strokeWidth={2.5} />
                  </div>
                )}
                {file.isProtected && !file.isEncrypted && (
                  <div className="bg-amber-500 text-white p-1 rounded-full ring-2 ring-white dark:ring-slate-950 shadow-sm" title="Protected">
                    <Shield size={10} strokeWidth={2.5} />
                  </div>
                )}
             </div>
          )}
        </div>
        
        <span className="text-xs font-medium text-center truncate w-full text-slate-700 dark:text-slate-300 px-0.5">
          {file.name}
        </span>
        <span className={`text-[10px] mt-0.5 font-medium ${file.isTrash ? 'text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
          {file.isTrash ? `Deleted ${formatDate(file.updatedAt)}` : (file.type === 'folder' ? formatDate(file.updatedAt) : formatSize(file.size))}
        </span>
      </div>
    );
  }

  // --- List View Render ---
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
      className={`group flex items-center gap-3 p-2 rounded-xl border border-transparent transition-all cursor-pointer select-none ${
         isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
          : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800'
      }`}
    >
       <div className={`relative p-2.5 rounded-xl flex-shrink-0 ${
          file.type === 'folder' 
            ? (file.isProtected ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500' : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500')
            : (file.isTrash ? 'bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400')
       }`}>
          <Icon size={24} strokeWidth={1.5} />
          
          {(file.isEncrypted || file.isProtected) && (
            <div className="absolute -bottom-1 -right-1 bg-slate-800 dark:bg-black text-white p-0.5 rounded-full ring-2 ring-white dark:ring-slate-950">
               {file.isEncrypted ? <Lock size={8} /> : <Shield size={8} />}
            </div>
          )}
       </div>

       <div className="flex-1 min-w-0 flex flex-col justify-center">
         <div className="flex items-center gap-2">
           <h4 className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
             {file.name}
           </h4>
           {file.isHidden && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-medium">Hidden</span>}
         </div>
         <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500 mt-0.5">
           {file.isTrash ? (
             <span className="truncate text-red-400 font-medium">Deleted {formatDate(file.updatedAt)}</span>
           ) : (
             <span className="truncate">{formatDate(file.updatedAt)}</span>
           )}
           <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
           <span className="flex-shrink-0">{file.type === 'folder' ? 'Folder' : formatSize(file.size)}</span>
         </div>
       </div>

       <div className="flex items-center gap-1">
         {isSelected ? (
            <div className="p-2 animate-in zoom-in duration-200">
               <CheckCircle2 size={20} className="text-blue-600 dark:text-blue-500" />
            </div>
         ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); onContextMenu(e, file); }}
              className="p-2 text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all active:opacity-100"
            >
               <MoreVertical size={18} />
            </button>
         )}
       </div>
    </div>
  );
});

// --- Main File List Container ---
const FileList: React.FC<FileListProps> = React.memo(({ 
  files, 
  viewMode, 
  selectedIds, 
  onSelect, 
  onOpen,
  onContextMenu,
  onDropFile
}) => {
  const isSelectionMode = selectedIds.size > 0;
  
  // Dashboard Logic
  const isRootScreen = files.length > 0 && files[0].parentId === 'root';
  const [recentFiles, setRecentFiles] = useState<FileNode[]>([]);

  useEffect(() => {
    if (isRootScreen) {
      // Load recent files for dashboard preview
      fileSystem.getRecentFiles().then(res => setRecentFiles(res.slice(0, 3)));
    }
  }, [isRootScreen, files]); // trigger on files change (refresh)

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400 dark:text-slate-600">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-inner">
           <Smartphone size={40} className="text-slate-300 dark:text-slate-700" strokeWidth={1} />
        </div>
        <p className="font-medium text-slate-500 dark:text-slate-500">Folder is empty</p>
      </div>
    );
  }

  // --- DASHBOARD LAYOUT (ROOT) ---
  if (isRootScreen) {
     const internalStorage = files.find(f => f.id === 'root_internal');
     const sdCard = files.find(f => f.id === 'root_sd');
     const downloads = files.find(f => f.id === 'downloads_shortcut');
     const trash = files.find(f => f.id === 'trash');
     const vault = files.find(f => f.name === 'Secure Vault');

     // Find category virtual nodes
     const catImg = files.find(f => f.id === 'category_image');
     const catVid = files.find(f => f.id === 'category_video');
     const catAud = files.find(f => f.id === 'category_audio');
     const catDoc = files.find(f => f.id === 'category_document');
     const catArc = files.find(f => f.id === 'category_archive');

     return (
        <div className="p-4 space-y-8 pb-20">
           {/* Storage Carousel */}
           <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x">
              {internalStorage && (
                <div className="min-w-[85%] sm:min-w-[320px] snap-center">
                   <StorageCard 
                     name="Internal Storage" 
                     type="internal" 
                     used={internalStorage.size} 
                     total={internalStorage.capacity || 0} 
                     onClick={() => onOpen(internalStorage)}
                   />
                </div>
              )}
              {sdCard && (
                <div className="min-w-[85%] sm:min-w-[320px] snap-center">
                   <StorageCard 
                     name="SD Card" 
                     type="sd" 
                     used={sdCard.size} 
                     total={sdCard.capacity || 0} 
                     onClick={() => onOpen(sdCard)}
                   />
                </div>
              )}
           </div>

           {/* Categories Grid */}
           <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">Categories</h3>
              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                 <CategoryButton icon={<Image/>} label="Images" bgClass="bg-orange-100 dark:bg-orange-900/30" colorClass="text-orange-600 dark:text-orange-400" onClick={() => catImg && onOpen(catImg)} />
                 <CategoryButton icon={<Video/>} label="Videos" bgClass="bg-red-100 dark:bg-red-900/30" colorClass="text-red-600 dark:text-red-400" onClick={() => catVid && onOpen(catVid)} />
                 <CategoryButton icon={<Music/>} label="Audio" bgClass="bg-violet-100 dark:bg-violet-900/30" colorClass="text-violet-600 dark:text-violet-400" onClick={() => catAud && onOpen(catAud)} />
                 <CategoryButton icon={<FileText/>} label="Docs" bgClass="bg-blue-100 dark:bg-blue-900/30" colorClass="text-blue-600 dark:text-blue-400" onClick={() => catDoc && onOpen(catDoc)} />
                 <CategoryButton icon={<Download/>} label="Down..." bgClass="bg-green-100 dark:bg-green-900/30" colorClass="text-green-600 dark:text-green-400" onClick={() => downloads && onOpen(downloads)} />
                 <CategoryButton icon={<Archive/>} label="Zip" bgClass="bg-yellow-100 dark:bg-yellow-900/30" colorClass="text-yellow-600 dark:text-yellow-400" onClick={() => catArc && onOpen(catArc)} />
                 <CategoryButton icon={<Trash2/>} label="Bin" bgClass="bg-slate-100 dark:bg-slate-800" colorClass="text-slate-600 dark:text-slate-400" onClick={() => trash && onOpen(trash)} />
                 <CategoryButton icon={<Shield/>} label="Vault" bgClass="bg-amber-100 dark:bg-amber-900/30" colorClass="text-amber-600 dark:text-amber-400" onClick={() => vault && onOpen(vault)} />
              </div>
           </div>

           {/* Recent Files Preview */}
           <div className="space-y-3">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recent Files</h3>
                <button onClick={() => onOpen({ id: 'recent', name: 'Recent', type: 'folder' } as FileNode)} className="text-xs text-blue-500 font-bold">View All</button>
             </div>
             <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                {recentFiles.length > 0 ? (
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                     {recentFiles.map(f => (
                       <RecentFileItem key={f.id} file={f} onClick={() => onOpen(f)} />
                     ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-sm">No recent files</div>
                )}
             </div>
           </div>
        </div>
     );
  }

  // --- STANDARD FILE LIST ---
  return (
    <div className={viewMode === ViewMode.GRID ? "grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-2" : "flex flex-col gap-1 p-2"}>
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
});

export default FileList;
