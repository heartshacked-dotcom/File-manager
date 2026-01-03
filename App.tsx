import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileNode, ViewMode, SortField, SortDirection, DateFilter, 
  ClipboardState, ModalState, FileType, SizeFilter
} from './types';
import { fileSystem } from './services/filesystem';
import { SecurityService } from './services/security';
import FileList from './components/FileList';
import Breadcrumbs from './components/Breadcrumbs';
import StorageChart from './components/StorageChart';
import ContextMenu from './components/ContextMenu';
import FilePreview from './components/FilePreview';
import FolderTree from './components/FolderTree';
import SortFilterControl from './components/SortFilterControl';
import AuthDialog from './components/AuthDialog';
import SettingsDialog from './components/SettingsDialog';
import { InputDialog, PropertiesDialog } from './components/Dialogs';
import { 
  Menu, Search, Grid, List, Plus, Trash2, Copy, Scissors, 
  Shield, PieChart as ChartIcon, Eye, Clipboard, ArrowLeft,
  Download, Music, Video, Image, FileText, RefreshCw, Filter, Settings,
  ChevronLeft, ChevronRight, Home, Star, Archive, Lock
} from 'lucide-react';

interface PreviewState {
  file: FileNode;
  url?: string;
  content?: string;
}

const App: React.FC = () => {
  // --- Navigation & History State ---
  const [historyStack, setHistoryStack] = useState<FileNode[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const currentPath = historyStack[historyIndex] || [];
  
  const [files, setFiles] = useState<FileNode[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());
  const [lastFocusedId, setLastFocusedId] = useState<string | null>(null);
  
  // Permission & Security State
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [vaultPinHash, setVaultPinHash] = useState<string | null>(localStorage.getItem('nova_vault_pin'));
  
  // Sorting & Filtering State
  const [sortField, setSortField] = useState<SortField>(SortField.NAME);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.ASC);
  const [filterType, setFilterType] = useState<FileType | 'all'>('all');
  const [filterDate, setFilterDate] = useState<DateFilter>('ALL');
  const [filterSize, setFilterSize] = useState<SizeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  
  // Advanced State
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [showProtected, setShowProtected] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, fileId?: string } | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set<string>());
  const [bookmarkedNodes, setBookmarkedNodes] = useState<FileNode[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // UI State
  const [showStorage, setShowStorage] = useState(false);
  const [storageStats, setStorageStats] = useState({ used: 0, total: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isTrashView, setIsTrashView] = useState(false);

  const activePathIds = useMemo(() => new Set(currentPath.map(n => n.id)), [currentPath]);

  // --- Initialization ---
  useEffect(() => {
    const checkPermissions = async () => {
      const granted = await fileSystem.init();
      setPermissionGranted(granted);
      if (granted) {
         const initialPath = await fileSystem.getPathNodes('root_internal');
         setHistoryStack([initialPath]);
         setHistoryIndex(0);
      }
    };
    checkPermissions();

    const saved = localStorage.getItem('nova_bookmarks');
    if (saved) {
      try {
        setBookmarks(new Set(JSON.parse(saved) as any as string[]));
      } catch (e) {
        console.error("Failed to load bookmarks", e);
      }
    }
  }, []);

  // Sync bookmark nodes
  useEffect(() => {
    const loadBookmarks = async () => {
      const nodes: FileNode[] = [];
      for (const id of bookmarks) {
        const node = await fileSystem.stat(id);
        if (node) nodes.push(node);
      }
      setBookmarkedNodes(nodes);
    };
    loadBookmarks();
    localStorage.setItem('nova_bookmarks', JSON.stringify(Array.from(bookmarks)));
  }, [bookmarks]);

  // --- Data Loading ---
  const refreshFiles = useCallback(async () => {
    try {
      const parentId = isTrashView ? 'trash' : (currentPath.length > 0 ? currentPath[currentPath.length - 1].id : 'root');
      let fetchedFiles = await fileSystem.readdir(parentId, showHidden);
      
      // Filter protected files if secure mode is off
      if (!showProtected) {
        fetchedFiles = fetchedFiles.filter(f => !f.isProtected);
      }

      setFiles(fetchedFiles);
      
      const stats = fileSystem.getStorageUsage();
      setStorageStats({ used: stats.used, total: stats.total });
    } catch (error) {
      console.error("Failed to load files", error);
    }
  }, [currentPath, showHidden, showProtected, isTrashView]);

  useEffect(() => {
    if (permissionGranted) {
      refreshFiles();
      setSelectedIds(new Set());
      setLastFocusedId(null);
    }
  }, [refreshFiles, permissionGranted]);

  // --- Filtering & Sorting Pipeline ---
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
         if (filterDate === 'TODAY') return diff < oneDay;
         if (filterDate === 'WEEK') return diff < oneDay * 7;
         if (filterDate === 'MONTH') return diff < oneDay * 30;
         return true;
       });
    }

    if (filterSize !== 'ALL') {
      result = result.filter(f => {
        if (f.type === 'folder') return false; 
        const mb = f.size / (1024 * 1024);
        if (filterSize === 'SMALL') return mb < 1;
        if (filterSize === 'MEDIUM') return mb >= 1 && mb < 100;
        if (filterSize === 'LARGE') return mb >= 100;
        return true;
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

  // --- Navigation Actions ---
  const navigateTo = async (id: string) => {
    if (id === 'trash') {
      setIsTrashView(true);
      setShowStorage(false);
      return;
    }
    if (id === 'root') {
       setIsTrashView(false);
       setShowStorage(false);
       const newPath: FileNode[] = []; 
       pushHistory(newPath);
       return;
    }

    setIsTrashView(false);
    setShowStorage(false);

    const currentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : 'root';
    if (currentId === id) return;

    const trail = await fileSystem.getPathNodes(id);
    pushHistory(trail);
    setSearchQuery('');
  };

  const pushHistory = (path: FileNode[]) => {
    const newStack = historyStack.slice(0, historyIndex + 1);
    newStack.push(path);
    setHistoryStack(newStack);
    setHistoryIndex(newStack.length - 1);
  };

  const handleBack = () => {
    if (showStorage) { setShowStorage(false); return; }
    if (isTrashView) { setIsTrashView(false); return; }
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const handleForward = () => {
    if (historyIndex < historyStack.length - 1) setHistoryIndex(historyIndex + 1);
  };

  const handleNavigate = (id: string) => navigateTo(id);

  const handleOpen = async (file: FileNode) => {
    if (file.type === 'folder') {
      if (file.isProtected && !isAuthenticated) {
        // Trigger Auth Flow
        setModal({ type: 'AUTH', targetId: file.id });
        return;
      }
      navigateTo(file.id);
    } else {
      try {
        if (file.isEncrypted) {
           setModal({ type: 'DECRYPT', targetId: file.id });
           return;
        }

        if (file.type === 'archive' || file.name.endsWith('.zip')) {
           if (confirm("Extract this archive?")) {
              setIsProcessing(true);
              try {
                await fileSystem.extract(file.id);
                refreshFiles();
              } finally {
                setIsProcessing(false);
              }
           }
           return;
        }

        // Media Preview
        if (['image', 'video', 'audio'].includes(file.type)) {
           const url = await fileSystem.getFileUrl(file.id);
           setPreviewState({ file, url });
           return;
        } 
        
        // Text/Code Preview
        const isCodeOrText = file.name.match(/\.(txt|md|json|js|jsx|ts|tsx|css|xml|html|log|csv|ini|conf|yml|yaml|py|java|c|cpp|h)$/i);
        const isBinaryDoc = file.name.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|apk)$/i);

        if (isCodeOrText && !isBinaryDoc) {
           if (file.size > 2 * 1024 * 1024) {
              if (confirm(`File is too large for preview (${(file.size/1024/1024).toFixed(1)} MB). Open externally?`)) {
                 await fileSystem.openFile(file);
              }
              return;
           }
           const content = await fileSystem.readTextFile(file.id);
           setPreviewState({ file, content });
           return;
        } 

        // Default: Open Externally
        await fileSystem.openFile(file);

      } catch (e: any) {
        console.error("File open error:", e);
        if (confirm(`Could not open ${file.name}. Try opening with default system app?`)) {
           try {
             await fileSystem.openFile(file);
           } catch (err) {
             alert("No compatible app found.");
           }
        }
      }
    }
  };

  // --- Security Logic ---
  const handleAuthSuccess = (pin: string) => {
    if (!vaultPinHash) {
      // First time setup
      SecurityService.hashPin(pin).then(hash => {
        localStorage.setItem('nova_vault_pin', hash);
        setVaultPinHash(hash);
        setIsAuthenticated(true);
        setModal({ type: null });
        if (modal.targetId) navigateTo(modal.targetId);
      });
    } else {
      // Verification
      SecurityService.verifyPin(pin, vaultPinHash).then(isValid => {
        if (isValid) {
          setIsAuthenticated(true);
          setModal({ type: null });
          if (modal.targetId && files.find(f => f.id === modal.targetId)?.type === 'folder') {
             navigateTo(modal.targetId);
          }
        } else {
          alert('Incorrect PIN');
        }
      });
    }
  };

  const handleEncryption = async (password: string) => {
    const id = modal.targetId || Array.from(selectedIds)[0];
    if (!id) return;
    setIsProcessing(true);
    try {
      if (modal.type === 'ENCRYPT') {
        await fileSystem.encryptFiles([id], password);
      } else {
        await fileSystem.decryptFiles([id], password);
      }
      setModal({ type: null });
    } catch (e: any) {
      alert("Operation warning: " + e.message);
    } finally {
      refreshFiles();
      setIsProcessing(false);
    }
  };

  const handleToggleLock = async () => {
    const id = contextMenu?.fileId;
    if (!id) return;
    
    // Check auth first if protecting
    if (!isAuthenticated && !files.find(f=>f.id===id)?.isProtected) {
      if (!vaultPinHash) {
         setModal({ type: 'AUTH' }); // Setup PIN first
         return;
      }
    }

    const node = files.find(f => f.id === id);
    if (!node) return;

    try {
      await fileSystem.toggleProtection([id], !node.isProtected);
      refreshFiles();
      setContextMenu(null);
    } catch (e) { console.error(e); }
  };

  // --- Selection Logic ---
  const handleSelect = (id: string, multi: boolean, range: boolean) => {
    if (range && lastFocusedId) {
      const sortedFiles = displayedFiles; 
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

  // --- Operations ---
  const handleCreateFolder = async (name: string) => {
    try {
      if (!name || name.trim() === '') return;
      const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : 'root';
      await fileSystem.createFolder(parentId, name);
      setModal({ type: null });
      refreshFiles();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleRename = async (newName: string) => {
    if (!modal.targetId) return;
    try {
      await fileSystem.rename(modal.targetId, newName);
      setModal({ type: null });
      refreshFiles();
    } catch (e: any) {
      alert("Rename failed: " + e.message);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0 && !modal.targetId) return;
    try {
      const ids = modal.targetId ? [modal.targetId] : Array.from(selectedIds);
      if (isTrashView) {
        if (confirm(`Permanently delete ${ids.length} items?`)) await fileSystem.deletePermanent(ids);
      } else {
        await fileSystem.trash(ids);
      }
      refreshFiles();
      setSelectedIds(new Set());
      setModal({ type: null });
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    }
  };

  const handleDuplicate = async () => {
    const ids = modal.targetId ? [modal.targetId] : Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await fileSystem.duplicate(ids);
      refreshFiles();
      setSelectedIds(new Set());
      setModal({ type: null });
    } catch (e: any) {
      alert("Duplicate failed: " + e.message);
    }
  };

  const handleCompress = async (name: string) => {
    const ids = (modal.targetId ? [modal.targetId] : Array.from(selectedIds)) as string[];
    if (ids.length === 0) return;
    setIsProcessing(true);
    try {
      await fileSystem.compress(ids, name);
      setModal({ type: null });
      setSelectedIds(new Set());
      refreshFiles();
    } catch (e: any) {
      alert("Compression failed: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtract = async () => {
    const id = modal.targetId || Array.from(selectedIds)[0];
    if (!id) return;
    setIsProcessing(true);
    try {
      await fileSystem.extract(id);
      setModal({ type: null });
      refreshFiles();
    } catch (e: any) {
      alert("Extraction failed: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleBookmark = () => {
    const id = contextMenu?.fileId;
    if (!id) return;
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setContextMenu(null);
  };

  const handleEmptyTrash = async () => {
    if (confirm("Empty Recycle Bin?")) {
      await fileSystem.emptyTrash();
      refreshFiles();
    }
  };

  const handleCopy = (isCut: boolean) => {
    const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
    setClipboard({
      mode: isCut ? 'cut' : 'copy',
      sourceIds: Array.from(selectedIds),
      sourceParentId: parentId
    });
    setSelectedIds(new Set());
    setContextMenu(null);
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    try {
      const targetId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : 'root';
      if (clipboard.mode === 'copy') await fileSystem.copy(clipboard.sourceIds, targetId);
      else await fileSystem.move(clipboard.sourceIds, targetId);
      setClipboard(null);
      refreshFiles();
    } catch (e: any) {
      alert("Paste failed: " + e.message);
    }
  };

  const handleDropMove = async (sourceId: string, targetFolderId: string) => {
    try {
      await fileSystem.move([sourceId], targetFolderId);
      refreshFiles();
      setSelectedIds(new Set());
    } catch (e: any) {
      alert("Move failed: " + e.message);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileNode) => {
    if (!selectedIds.has(file.id)) {
       setSelectedIds(new Set([file.id]));
       setLastFocusedId(file.id);
    }
    setContextMenu({ x: e.clientX, y: e.clientY, fileId: file.id });
  };

  const executeMenuAction = (action: string) => {
    const targetId = contextMenu?.fileId;
    if (!targetId) return;
    switch(action) {
      case 'open': const f = files.find(f => f.id === targetId); if(f) handleOpen(f); break;
      case 'copy': handleCopy(false); break;
      case 'cut': handleCopy(true); break;
      case 'duplicate': handleDuplicate(); break;
      case 'delete': handleDelete(); break;
      case 'rename': setModal({ type: 'RENAME', targetId }); break;
      case 'properties': setModal({ type: 'PROPERTIES', targetId }); break;
      case 'hide': alert("To implement: set isHidden = true"); break;
      case 'bookmark': handleToggleBookmark(); break;
      case 'compress': setModal({ type: 'COMPRESS', targetId }); break;
      case 'extract': handleExtract(); break;
      case 'lock': handleToggleLock(); break;
      case 'encrypt': setModal({ type: 'ENCRYPT', targetId }); break;
    }
    setContextMenu(null);
  };

  // --- Render ---

  if (permissionGranted === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-200 p-6 text-center">
         <Shield size={48} className="text-red-400 mb-6" />
         <h2 className="text-2xl font-bold mb-3">Storage Access Required</h2>
         <button onClick={() => fileSystem.openSettings()} className="px-6 py-3.5 bg-blue-600 rounded-xl font-medium mt-4">Open Settings</button>
      </div>
    );
  }

  if (permissionGranted === null) {
     return <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-500">Initializing...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center h-16 px-6 border-b border-slate-800 bg-slate-900/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-500/20">
             <span className="font-bold text-white text-lg">N</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Nova</span>
        </div>
        
        <div className="flex flex-col h-[calc(100%-4rem)]">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
             
             {/* Favorites Section */}
             {bookmarkedNodes.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-slate-500 uppercase px-4 mb-2 mt-4">Favorites</div>
                  {bookmarkedNodes.map(node => (
                    <button 
                      key={node.id} 
                      onClick={() => { navigateTo(node.id); setSidebarOpen(false); }}
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors group"
                    >
                      <Star size={16} className="mr-3 text-amber-400 fill-amber-400" />
                      <span className="truncate">{node.name}</span>
                    </button>
                  ))}
                </>
             )}

             <div className="text-xs font-semibold text-slate-500 uppercase px-4 mb-2 mt-4">Device</div>
             <FolderTree onNavigate={(id) => { navigateTo(id); setSidebarOpen(false); }} activePathIds={activePathIds} />

             <div className="text-xs font-semibold text-slate-500 uppercase px-4 mt-6 mb-2">Collections</div>
             <button onClick={() => setFilterType('image')} className={`flex items-center w-full px-4 py-2 text-sm rounded-lg hover:bg-slate-800 transition-all ${filterType === 'image' ? 'text-white bg-slate-800' : 'text-slate-400'}`}>
               <Image className="mr-3 text-amber-500" size={18} /> Images
             </button>
             <button onClick={() => setFilterType('video')} className={`flex items-center w-full px-4 py-2 text-sm rounded-lg hover:bg-slate-800 transition-all ${filterType === 'video' ? 'text-white bg-slate-800' : 'text-slate-400'}`}>
               <Video className="mr-3 text-red-500" size={18} /> Videos
             </button>
             <button onClick={() => setFilterType('audio')} className={`flex items-center w-full px-4 py-2 text-sm rounded-lg hover:bg-slate-800 transition-all ${filterType === 'audio' ? 'text-white bg-slate-800' : 'text-slate-400'}`}>
               <Music className="mr-3 text-purple-500" size={18} /> Audio
             </button>
             <button onClick={() => setFilterType('document')} className={`flex items-center w-full px-4 py-2 text-sm rounded-lg hover:bg-slate-800 transition-all ${filterType === 'document' ? 'text-white bg-slate-800' : 'text-slate-400'}`}>
               <FileText className="mr-3 text-blue-500" size={18} /> Documents
             </button>

             <div className="text-xs font-semibold text-slate-500 uppercase px-4 mt-6 mb-2">Tools</div>
             <button onClick={() => { setShowStorage(true); setSidebarOpen(false); }} className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-all ${showStorage ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800'}`}>
                <ChartIcon className="mr-3" size={18} /> Storage Analysis
             </button>
             <button onClick={() => { navigateTo('trash'); setSidebarOpen(false); }} className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-all ${isTrashView ? 'bg-red-500/10 text-red-400' : 'text-slate-400 hover:bg-slate-800'}`}>
                <Trash2 className="mr-3" size={18} /> Recycle Bin
             </button>
             <button onClick={() => setModal({ type: 'SETTINGS' })} className="flex items-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-all text-slate-400 hover:bg-slate-800">
                <Settings className="mr-3" size={18} /> Settings
             </button>
          </div>
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
             <div className="flex justify-between text-xs mb-2 text-slate-400">
               <span>Storage Used</span>
               <span className="text-white">{Math.round((storageStats.used / storageStats.total) * 100)}%</span>
             </div>
             <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
               <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full" style={{ width: `${(storageStats.used/storageStats.total)*100}%` }}></div>
             </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative" onContextMenu={(e) => e.preventDefault()}>
        
        {/* Header */}
        <header className="flex items-center h-16 px-4 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 gap-3">
          <div className="flex items-center md:hidden">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg">
              <Menu size={20} />
            </button>
          </div>
          <div className="hidden md:flex items-center gap-1">
             <button onClick={handleBack} disabled={historyIndex <= 0 && !isTrashView && !showStorage} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"><ChevronLeft size={20} /></button>
             <button onClick={handleForward} disabled={historyIndex >= historyStack.length - 1 || isTrashView || showStorage} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"><ChevronRight size={20} /></button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Breadcrumbs path={isTrashView ? [{id:'trash', name:'Recycle Bin', parentId:'root', type:'folder', size:0, updatedAt:0}] : currentPath} onNavigate={handleNavigate} onNavigateRoot={() => navigateTo('root')} />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowFilterPanel(!showFilterPanel)} className={`p-2 rounded-lg transition-colors ${showFilterPanel ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:bg-slate-800'}`}>
                <Filter size={20} className={filterSize !== 'ALL' || filterType !== 'all' || filterDate !== 'ALL' ? 'text-blue-400 fill-blue-400' : ''} />
            </button>
            <div className="relative hidden sm:block">
               <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-900 border border-slate-800 text-sm rounded-full pl-9 pr-4 py-1.5 focus:outline-none focus:border-blue-500 w-40 lg:w-64 transition-all" />
               <Search className="absolute left-3 top-2 text-slate-500" size={14} />
            </div>
            <div className="h-6 w-px bg-slate-800 mx-1"></div>
            <button onClick={() => setViewMode(prev => prev === ViewMode.GRID ? ViewMode.LIST : ViewMode.GRID)} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg">{viewMode === ViewMode.GRID ? <List size={20} /> : <Grid size={20} />}</button>
          </div>
        </header>

        {/* Sort/Filter Panel */}
        {showFilterPanel && (
          <SortFilterControl 
            sortField={sortField} setSortField={setSortField} 
            sortDirection={sortDirection} setSortDirection={setSortDirection} 
            filterType={filterType} setFilterType={setFilterType} 
            filterDate={filterDate} setFilterDate={setFilterDate} 
            filterSize={filterSize} setFilterSize={setFilterSize}
            onClose={() => setShowFilterPanel(false)} 
          />
        )}

        {/* Views */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-4 scroll-smooth">
           {showStorage ? (
             <div className="max-w-3xl mx-auto mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <button onClick={() => setShowStorage(false)} className="mb-4 text-blue-400 text-sm flex items-center hover:underline"><ArrowLeft size={16} className="mr-1" /> Back to Files</button>
               <StorageChart used={storageStats.used} total={storageStats.total} />
             </div>
           ) : isTrashView ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-xl font-bold text-red-400 flex items-center"><Trash2 className="mr-2" /> Recycle Bin</h2>
                  <button onClick={handleEmptyTrash} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 text-sm font-medium">Empty Bin</button>
                </div>
                <FileList files={displayedFiles} viewMode={viewMode} selectedIds={selectedIds} onSelect={handleSelect} onOpen={() => {}} sortField={sortField} onContextMenu={handleContextMenu} onDropFile={() => {}} />
              </div>
           ) : (
             <FileList files={displayedFiles} viewMode={viewMode} selectedIds={selectedIds} onSelect={handleSelect} onOpen={handleOpen} sortField={sortField} onContextMenu={handleContextMenu} onDropFile={handleDropMove} />
           )}
        </div>
        
        {/* Loading Overlay */}
        {isProcessing && (
           <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <span className="text-slate-200 font-medium">Processing...</span>
           </div>
        )}

        {/* FAB */}
        {!isTrashView && !showStorage && (
          <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-30">
             {clipboard && (
               <button onClick={handlePaste} className="flex items-center gap-2 px-5 py-3 bg-slate-800 border border-slate-700 text-slate-200 rounded-full shadow-xl hover:bg-slate-700 transition-all animate-in slide-in-from-right-10"><Clipboard size={18} /><span>Paste {clipboard.sourceIds.length} items</span></button>
             )}
             {selectedIds.size === 0 && (
               <button onClick={() => setModal({ type: 'CREATE_FOLDER' })} className="w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"><Plus size={28} /></button>
             )}
          </div>
        )}

        {/* Bottom Action Bar */}
        {selectedIds.size > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-2 z-40 animate-in slide-in-from-bottom-20 duration-300 flex items-center gap-1">
             <div className="px-4 text-sm font-bold text-white whitespace-nowrap">{selectedIds.size} Selected</div>
             <div className="h-6 w-px bg-slate-700 mx-2"></div>
             {!isTrashView && (
               <>
                 <button onClick={() => handleCopy(false)} className="p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-colors" title="Copy"><Copy size={20} /></button>
                 <button onClick={() => handleCopy(true)} className="p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-colors" title="Cut"><Scissors size={20} /></button>
                 <button onClick={handleDuplicate} className="p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-colors" title="Duplicate"><RefreshCw size={20} /></button>
                 <button onClick={() => setModal({ type: 'COMPRESS', targetId: undefined })} className="p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-colors" title="Compress"><Archive size={20} /></button>
                 {selectedIds.size === 1 && (
                    <button onClick={() => setModal({ type: 'RENAME', targetId: Array.from(selectedIds)[0] })} className="p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-colors" title="Rename"><RefreshCw size={20} /></button>
                 )}
               </>
             )}
             <button onClick={handleDelete} className="p-3 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors" title="Delete"><Trash2 size={20} /></button>
             <button onClick={() => setSelectedIds(new Set())} className="p-3 text-slate-400 hover:bg-slate-800 rounded-xl"><span className="text-xs font-bold uppercase">Cancel</span></button>
          </div>
        )}

      </main>

      {/* Dialogs and Context Menu */}
      {previewState && (
        <FilePreview 
          file={previewState.file} 
          url={previewState.url} 
          content={previewState.content} 
          onClose={() => setPreviewState(null)} 
          onOpenExternal={() => { 
             fileSystem.openFile(previewState.file).catch(() => alert("Could not open external app")); 
          }} 
        />
      )}
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          onClose={() => setContextMenu(null)} 
          onAction={executeMenuAction} 
          singleFile={selectedIds.size <= 1} 
          isFolder={files.find(f => f.id === contextMenu.fileId)?.type === 'folder'} 
          fileType={files.find(f => f.id === contextMenu.fileId)?.type}
          isBookmarked={contextMenu.fileId ? bookmarks.has(contextMenu.fileId) : false}
          isProtected={files.find(f => f.id === contextMenu.fileId)?.isProtected}
          isEncrypted={files.find(f => f.id === contextMenu.fileId)?.isEncrypted}
        />
      )}
      <AuthDialog 
         isOpen={modal.type === 'AUTH'} 
         mode={vaultPinHash ? 'ENTER' : 'CREATE'} 
         onSuccess={handleAuthSuccess} 
         onClose={() => setModal({ type: null })} 
      />
      <SettingsDialog 
        isOpen={modal.type === 'SETTINGS'} 
        onClose={() => setModal({ type: null })}
        showHidden={showHidden}
        onToggleHidden={setShowHidden}
        showProtected={showProtected}
        onToggleProtected={setShowProtected}
        onResetPin={() => { setVaultPinHash(null); localStorage.removeItem('nova_vault_pin'); setModal({ type: 'AUTH' }); }}
      />
      <InputDialog isOpen={modal.type === 'CREATE_FOLDER'} title="New Folder" placeholder="Folder Name" actionLabel="Create" onClose={() => setModal({ type: null })} onSubmit={handleCreateFolder} />
      <InputDialog isOpen={modal.type === 'RENAME'} title="Rename Item" defaultValue={files.find(f => f.id === modal.targetId)?.name} actionLabel="Rename" onClose={() => setModal({ type: null })} onSubmit={handleRename} />
      <InputDialog isOpen={modal.type === 'COMPRESS'} title="Archive Name" placeholder="archive.zip" actionLabel="Compress" onClose={() => setModal({ type: null })} onSubmit={handleCompress} />
      
      {/* Encryption Dialogs reused InputDialog for simplicity or create custom */}
      <InputDialog 
        isOpen={modal.type === 'ENCRYPT' || modal.type === 'DECRYPT'} 
        title={modal.type === 'ENCRYPT' ? "Encrypt File (AES)" : "Decrypt File"}
        placeholder="Enter Password" 
        actionLabel={modal.type === 'ENCRYPT' ? "Encrypt" : "Decrypt"}
        onClose={() => setModal({ type: null })} 
        onSubmit={handleEncryption} 
      />

      <PropertiesDialog isOpen={modal.type === 'PROPERTIES'} onClose={() => setModal({ type: null })} file={files.find(f => f.id === modal.targetId)} />
    </div>
  );
};

export default App;