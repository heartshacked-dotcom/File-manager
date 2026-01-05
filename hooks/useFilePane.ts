
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

  // View State - Initialize from LocalStorage with Migration Logic
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('nova_default_view');
    // Migration for old values
    if (saved === 'GRID') return ViewMode.GRID_MEDIUM;
    if (saved === 'LIST') return ViewMode.LIST_MEDIUM;
    // Check if saved value is valid enum, otherwise default
    return (saved as ViewMode) || ViewMode.GRID_MEDIUM;
  });

  const [sortField, setSortField] = useState<SortField>(() => 
    (localStorage.getItem('nova_default_sort') as SortField) || SortField.NAME
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.ASC);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FileType | 'all'>('all');
  const [filterDate, setFilterDate] = useState<DateFilter>('ALL');
  const [filterSize, setFilterSize] = useState<SizeFilter>('ALL');
  const [showHidden, setShowHidden] = useState(() => 
    localStorage.getItem('nova_show_hidden') === 'true'
  );

  // Listen for global settings changes
  useEffect(() => {
    const handleSettingsChange = () => {
      setShowHidden(localStorage.getItem('nova_show_hidden') === 'true');
    };
    window.addEventListener('nova_settings_changed', handleSettingsChange);
    return () => window.removeEventListener('nova_settings_changed', handleSettingsChange);
  }, []);

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

    if (filterDate !== 'ALL') {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      result = result.filter(f => {
        const diff = now - f.updatedAt;
        switch (filterDate) {
          case 'TODAY': return diff < oneDay;
          case 'WEEK': return diff < 7 * oneDay;
          case 'MONTH': return diff < 30 * oneDay;
          default: return true;
        }
      });
    }

    if (filterSize !== 'ALL') {
      result = result.filter(f => {
        if (f.type === 'folder') return true;
        switch (filterSize) {
          case 'SMALL': return f.size < 1024 * 1024; // < 1MB
          case 'MEDIUM': return f.size >= 1024 * 1024 && f.size < 100 * 1024 * 1024; // 1MB - 100MB
          case 'LARGE': return f.size >= 100 * 1024 * 1024; // > 100MB
          default: return true;
        }
      });
    }

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
