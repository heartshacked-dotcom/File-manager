
import React, { useState, useRef, useEffect } from 'react';
import { FileNode, PaneId, ViewMode } from '../types';
import FileList from './FileList';
import Breadcrumbs from './Breadcrumbs';
import SortFilterControl from './SortFilterControl';
import { 
  ChevronLeft, ChevronRight, Grid, List, Search, Filter, 
  ArrowUp, RotateCw, MoreVertical, Loader2
} from 'lucide-react';
import { useFilePane } from '../hooks/useFilePane';

interface FileBrowserPaneProps {
  id: PaneId;
  isActive: boolean;
  onFocus: () => void;
  paneState: ReturnType<typeof useFilePane>;
  onOpen: (file: FileNode) => void;
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void;
  onDropFile: (sourceId: string, targetFolderId: string) => void;
  className?: string;
}

const FileBrowserPane: React.FC<FileBrowserPaneProps> = ({
  id,
  isActive,
  onFocus,
  paneState,
  onOpen,
  onContextMenu,
  onDropFile,
  className
}) => {
  const [showFilter, setShowFilter] = useState(false);
  const {
    currentPath, files, selectedIds, setSelectedIds, lastFocusedId, setLastFocusedId,
    viewMode, setViewMode, sortField, setSortField, sortDirection, setSortDirection,
    searchQuery, setSearchQuery, filterType, setFilterType,
    canGoBack, canGoForward, goBack, goForward, navigateTo, navigateUp, refreshFiles
  } = paneState;

  // --- Pull to Refresh State ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState(0);
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const PULL_THRESHOLD = 80;

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

  return (
    <div 
      onClick={onFocus}
      className={`flex flex-col h-full bg-white dark:bg-slate-950 border-2 rounded-xl overflow-hidden transition-colors duration-200 ${
        isActive ? 'border-blue-500 shadow-md' : 'border-slate-200 dark:border-slate-800'
      } ${className}`}
    >
      {/* Pane Toolbar */}
      <div className={`flex items-center p-2 border-b gap-1 flex-shrink-0 ${
        isActive ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
         <button onClick={goBack} disabled={!canGoBack} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30">
            <ChevronLeft size={18} />
         </button>
         <button onClick={goForward} disabled={!canGoForward} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30">
            <ChevronRight size={18} />
         </button>
         <button onClick={navigateUp} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">
            <ArrowUp size={18} />
         </button>

         <div className="flex-1 min-w-0 mx-2">
            <Breadcrumbs path={currentPath} onNavigate={navigateTo} onNavigateRoot={() => navigateTo('root')} />
         </div>

         <div className="flex items-center gap-1">
             <button onClick={() => setShowFilter(!showFilter)} className={`p-1.5 rounded-lg transition-colors ${showFilter ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                <Filter size={18} />
             </button>
             <button onClick={() => setViewMode(viewMode === ViewMode.GRID ? ViewMode.LIST : ViewMode.GRID)} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">
                {viewMode === ViewMode.GRID ? <List size={18} /> : <Grid size={18} />}
             </button>
         </div>
      </div>

      {/* Filter Overlay */}
      {showFilter && (
        <div className="absolute top-14 left-2 right-2 z-20">
           <SortFilterControl 
              sortField={sortField} setSortField={setSortField}
              sortDirection={sortDirection} setSortDirection={setSortDirection}
              filterType={filterType} setFilterType={setFilterType}
              filterDate={'ALL'} setFilterDate={() => {}} // Simplified for pane
              filterSize={'ALL'} setFilterSize={() => {}}
              onClose={() => setShowFilter(false)}
           />
        </div>
      )}
      
      {/* Search Bar (Optional, integrated into Filter or separate) */}
      {showFilter && (
        <div className="px-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
           <div className="relative">
              <input 
                type="text" 
                placeholder="Search this folder..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:text-slate-200"
              />
              <Search className="absolute left-3 top-2 text-slate-400" size={14} />
           </div>
        </div>
      )}

      {/* File List with Pull to Refresh */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 custom-scrollbar bg-slate-50/50 dark:bg-slate-950 relative"
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

         <div style={{ transform: `translateY(${pullY > 0 ? pullY * 0.2 : 0}px)`, transition: isRefreshing ? 'transform 0.2s' : 'none' }}>
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

      {/* Footer Status */}
      <div className="px-3 py-1 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
          <span>{files.length} items</span>
          <span>{selectedIds.size > 0 ? `${selectedIds.size} selected` : ''}</span>
      </div>
    </div>
  );
};

export default FileBrowserPane;
