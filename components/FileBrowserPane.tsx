
import React, { useState, useRef } from 'react';
import { FileNode, ViewMode } from '../types';
import FileList from './FileList';
import Breadcrumbs from './Breadcrumbs';
import SortFilterControl from './SortFilterControl';
import ViewOptionsControl from './ViewOptionsControl';
import { 
  Search, Filter, 
  Trash2, Menu, LayoutGrid, Grid, List, AlignJustify
} from 'lucide-react';
import { useFilePane } from '../hooks/useFilePane';
import { Loader2 } from 'lucide-react';

interface FileBrowserPaneProps {
  paneState: ReturnType<typeof useFilePane>;
  onOpen: (file: FileNode) => void;
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void;
  onDropFile: (sourceId: string, targetFolderId: string) => void;
  onSearch?: () => void;
  onEmptyTrash?: () => void;
  onToggleSidebar?: () => void;
  className?: string;
}

const FileBrowserPane: React.FC<FileBrowserPaneProps> = ({
  paneState,
  onOpen,
  onContextMenu,
  onDropFile,
  onSearch,
  onEmptyTrash,
  onToggleSidebar,
  className
}) => {
  const [showFilter, setShowFilter] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(false);
  
  const {
    currentPath, files, selectedIds, setSelectedIds, lastFocusedId, setLastFocusedId,
    viewMode, setViewMode, sortField, setSortField, sortDirection, setSortDirection,
    searchQuery, setSearchQuery, filterType, setFilterType, showHidden, setShowHidden,
    navigateTo, refreshFiles
  } = paneState;

  // --- Pull to Refresh State ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState(0);
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const PULL_THRESHOLD = 80;

  const isTrashLocation = currentPath.some(p => p.id === 'trash');

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
       setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      setPullY(diff * 0.5); // Resistance
    }
  };

  const handleTouchEnd = async () => {
    if (pullY > PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullY(50); // Snap to loading position
      await refreshFiles();
      setTimeout(() => {
        setIsRefreshing(false);
        setPullY(0);
      }, 500);
    } else {
      setPullY(0);
    }
    setStartY(0);
  };

  const handleSelect = (id: string, multi: boolean, range: boolean) => {
    // Standard selection logic
    if (range && lastFocusedId) {
      const sortedFiles = files; 
      const startIdx = sortedFiles.findIndex(f => f.id === lastFocusedId);
      const endIdx = sortedFiles.findIndex(f => f.id === id);

      if (startIdx !== -1 && endIdx !== -1) {
         const min = Math.min(startIdx, endIdx);
         const max = Math.max(startIdx, endIdx);
         const rangeIds = sortedFiles.slice(min, max + 1).map(f => f.id);
         setSelectedIds(prev => {
            const next = new Set(prev);
            rangeIds.forEach(rid => next.add(rid));
            return next;
         });
      }
    } else if (multi) {
       setSelectedIds(prev => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id);
         else next.add(id);
         return next;
       });
       setLastFocusedId(id);
    } else {
       setSelectedIds(new Set([id]));
       setLastFocusedId(id);
    }
  };

  // Icon for view mode button
  const getViewIcon = () => {
    if (viewMode.startsWith('GRID')) return <Grid size={20} />;
    if (viewMode.startsWith('DETAIL')) return <AlignJustify size={20} />;
    return <List size={20} />;
  };

  return (
    <div 
      className={`flex flex-col h-full bg-white dark:bg-slate-950 transition-colors duration-200 ${className}`}
    >
      {/* Enhanced Top Bar */}
      <div className="flex flex-col flex-shrink-0 bg-white dark:bg-slate-950 z-20 sticky top-0">
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100 dark:border-slate-800/50">
           {/* Left: Navigation Controls */}
           <div className="flex items-center gap-2 min-w-0">
              {onToggleSidebar && (
                <button onClick={onToggleSidebar} className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all">
                   <Menu size={20} />
                </button>
              )}
              
              {/* Breadcrumbs Area */}
              <div className="flex-1 min-w-0 mx-1">
                 <Breadcrumbs path={currentPath} onNavigate={navigateTo} onNavigateRoot={() => navigateTo('root')} />
              </div>
           </div>

           {/* Right: Actions */}
           <div className="flex items-center gap-1 pl-2 relative">
               {isTrashLocation && files.length > 0 && (
                  <button 
                    onClick={onEmptyTrash} 
                    className="p-2 rounded-xl text-red-500 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors mr-1"
                    title="Empty Trash"
                  >
                     <Trash2 size={18} />
                  </button>
               )}
               
               <button onClick={onSearch} className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Search size={20} />
               </button>
               
               <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1"></div>

               <button 
                  onClick={() => { setShowFilter(!showFilter); setShowViewOptions(false); }} 
                  className={`p-2 rounded-xl transition-all ${showFilter ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
               >
                  <Filter size={20} />
               </button>
               
               <button 
                  onClick={() => { setShowViewOptions(!showViewOptions); setShowFilter(false); }}
                  className={`p-2 rounded-xl transition-colors ${showViewOptions ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
               >
                  {getViewIcon()}
               </button>

               {/* View Options Popover */}
               {showViewOptions && (
                 <div className="absolute top-full right-0 mt-2 z-50">
                    <ViewOptionsControl 
                       viewMode={viewMode}
                       setViewMode={setViewMode}
                       onClose={() => setShowViewOptions(false)}
                    />
                 </div>
               )}
           </div>
        </div>

        {/* Filter Overlay Area (Relative to Top Bar) */}
        {showFilter && (
          <div className="absolute top-full left-0 right-0 p-2 z-30">
             <SortFilterControl 
                sortField={sortField} setSortField={setSortField}
                sortDirection={sortDirection} setSortDirection={setSortDirection}
                filterType={filterType} setFilterType={setFilterType}
                filterDate={'ALL'} setFilterDate={() => {}} 
                filterSize={'ALL'} setFilterSize={() => {}}
                showHidden={showHidden} setShowHidden={setShowHidden}
                onClose={() => setShowFilter(false)}
             />
          </div>
        )}
      </div>

      
      {/* File List with Pull to Refresh */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50/50 dark:bg-slate-950 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
         {/* Refresh Indicator */}
         <div 
            className="absolute left-0 right-0 flex justify-center pointer-events-none transition-transform duration-200"
            style={{ top: -40, transform: `translateY(${pullY}px)` }}
         >
            <div className="bg-white dark:bg-slate-800 rounded-full p-2 shadow-lg border border-slate-200 dark:border-slate-700">
               <Loader2 size={20} className={`text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullY * 2}deg)` }} />
            </div>
         </div>

         <div style={{ transform: `translateY(${pullY > 0 ? pullY * 0.2 : 0}px)`, transition: isRefreshing ? 'transform 0.2s' : 'none', height: '100%' }}>
           <FileList 
              files={files}
              viewMode={viewMode}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
              onDropFile={onDropFile}
              sortField={sortField}
           />
         </div>
      </div>
    </div>
  );
};

export default FileBrowserPane;
