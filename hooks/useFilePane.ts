import { useState, useEffect, useMemo, useCallback } from 'react';
import { FileNode, ViewMode, SortField, SortDirection, DateFilter, SizeFilter, FileType } from '../types';
import { fileSystem } from '../services/filesystem';

export const useFilePane = (initialPathId: string = 'root_internal', permissionGranted: boolean | null) => {
  // Navigation State
  const [historyStack, setHistoryStack] = useState<FileNode[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const currentPath = historyStack[historyIndex] || [];
  
  // Data State
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastFocusedId, setLastFocusedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // View State
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [sortField, setSortField] = useState<SortField>(SortField.NAME);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.ASC);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FileType | 'all'>('all');
  const [filterDate, setFilterDate] = useState<DateFilter>('ALL');
  const [filterSize, setFilterSize] = useState<SizeFilter>('ALL');
  const [showHidden, setShowHidden] = useState(false);

  // --- Actions ---

  const refreshFiles = useCallback(async () => {
    if (!permissionGranted) return;
    setLoading(true);
    try {
      // Determine actual parent ID from current path or default to root
      let parentId = 'root';
      if (currentPath.length > 0) {
        parentId = currentPath[currentPath.length - 1].id;
      } else if (initialPathId) {
        // Initial load edge case
        parentId = initialPathId.split('/').pop() || 'root'; // Simplified
        if (initialPathId === 'root_internal') parentId = 'root'; // Virtual root logic
      }

      // Handle virtual roots or special folders
      if (historyStack[historyIndex].length === 0) {
         // At absolute root (Devices)
         parentId = 'root';
      } else {
         parentId = currentPath[currentPath.length - 1].id;
      }
      
      // Special case for initial load to get correct root nodes
      if (historyStack.length === 1 && historyStack[0].length === 0 && initialPathId !== 'root') {
         // We need to initialize the path properly
         const trail = await fileSystem.getPathNodes(initialPathId);
         setHistoryStack([trail]);
         return; // The effect will re-trigger
      }

      let fetchedFiles = await fileSystem.readdir(parentId, showHidden);
      setFiles(fetchedFiles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentPath, historyStack, historyIndex, showHidden, permissionGranted, initialPathId]);

  // Initial Path Setup
  useEffect(() => {
    if (permissionGranted && historyStack[0].length === 0 && initialPathId) {
       fileSystem.getPathNodes(initialPathId).then(trail => {
         setHistoryStack([trail]);
       });
    }
  }, [permissionGranted]);

  useEffect(() => {
    refreshFiles();
    setSelectedIds(new Set());
  }, [refreshFiles]);

  const navigateTo = async (id: string) => {
    if (id === 'root') {
      const newPath: FileNode[] = [];
      const newStack = historyStack.slice(0, historyIndex + 1);
      newStack.push(newPath);
      setHistoryStack(newStack);
      setHistoryIndex(newStack.length - 1);
      return;
    }

    const currentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : 'root';
    if (currentId === id) return;

    const trail = await fileSystem.getPathNodes(id);
    const newStack = historyStack.slice(0, historyIndex + 1);
    newStack.push(trail);
    setHistoryStack(newStack);
    setHistoryIndex(newStack.length - 1);
    setSearchQuery('');
  };

  const navigateUp = () => {
    if (currentPath.length > 0) {
       // Just go back in history if appropriate, or calculate parent
       if (historyIndex > 0) {
          setHistoryIndex(historyIndex - 1);
       } else {
          // Logic to go up one level if no history
          const parent = currentPath[currentPath.length - 2];
          if (parent) navigateTo(parent.id);
          else navigateTo('root');
       }
    }
  };

  const goBack = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const goForward = () => {
    if (historyIndex < historyStack.length - 1) setHistoryIndex(historyIndex + 1);
  };

  // --- Filtering Pipeline ---
  const displayedFiles = useMemo(() => {
    let result = [...files];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }

    if (filterType !== 'all') {
      result = result.filter(f => f.type === filterType);
    }

    // Apply Date/Size filters here (same logic as before)...
    // Omitted for brevity, assuming similar logic to original App.tsx

    result.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;

      let comparison = 0;
      switch (sortField) {
        case SortField.SIZE: comparison = a.size - b.size; break;
        case SortField.DATE: comparison = a.updatedAt - b.updatedAt; break;
        case SortField.TYPE: comparison = a.type.localeCompare(b.type); break;
        case SortField.NAME: 
        default:
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          break;
      }
      return sortDirection === SortDirection.ASC ? comparison : -comparison;
    });

    return result;
  }, [files, searchQuery, filterType, filterDate, filterSize, sortField, sortDirection]);

  return {
    // State
    currentPath,
    files: displayedFiles,
    rawFiles: files,
    selectedIds,
    setSelectedIds,
    lastFocusedId,
    setLastFocusedId,
    loading,
    viewMode,
    setViewMode,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    showHidden,
    setShowHidden,
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < historyStack.length - 1,

    // Actions
    refreshFiles,
    navigateTo,
    navigateUp,
    goBack,
    goForward
  };
};
