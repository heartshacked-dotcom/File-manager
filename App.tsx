
import React, { useState, useEffect, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { 
  FileNode, ClipboardState, ModalState
} from './types';
import { fileSystem, PermissionStatus } from './services/filesystem';
import { SecurityService } from './services/security';
import { useFilePane } from './hooks/useFilePane';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

import FileBrowserPane from './components/FileBrowserPane';
import StorageAnalyzer from './components/StorageAnalyzer';
import FileActionMenu from './components/FileActionMenu'; 
import FilePreview from './components/FilePreview';
import FolderTree from './components/FolderTree';
import SearchScreen from './components/SearchScreen';
import AuthDialog from './components/AuthDialog';
import SettingsDialog from './components/SettingsDialog';
import PermissionScreen from './components/PermissionScreen';
import CompressionModal from './components/CompressionModal';
import EncryptionDialog from './components/EncryptionDialog';
import BottomNavigator from './components/BottomNavigator';
import { InputDialog } from './components/Dialogs';
import { 
  Menu, Settings, Trash2, Copy, Scissors, 
  Shield, PieChart as ChartIcon, Clipboard, 
  Plus, Smartphone, HardDrive, Clock, Star, RotateCcw,
  MoreVertical, Lock, Sun, Moon, Home
} from 'lucide-react';

const VAULT_FOLDER = 'Secure Vault';

interface PreviewState {
  file: FileNode;
  url?: string;
  content?: string;
}

interface CompressionState {
  isOpen: boolean;
  mode: 'COMPRESS' | 'EXTRACT';
  files: FileNode[];
}

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  // --- Global State ---
  const [permStatus, setPermStatus] = useState<PermissionStatus>(PermissionStatus.UNKNOWN);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPinHash, setVaultPinHash] = useState<string | null>(localStorage.getItem('nova_vault_pin'));
  
  // --- Pane ---
  // Only initialize pane if permissions are granted/scoped
  const isReady = permStatus === PermissionStatus.GRANTED || permStatus === PermissionStatus.SCOPED;
  const filePane = useFilePane('root', isReady);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, fileId?: string } | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [compressionState, setCompressionState] = useState<CompressionState>({ isOpen: false, mode: 'COMPRESS', files: [] });
  const [encryptionModal, setEncryptionModal] = useState<{ isOpen: boolean, mode: 'ENCRYPT' | 'DECRYPT', files: FileNode[] }>({ isOpen: false, mode: 'ENCRYPT', files: [] });
  
  const [showStorage, setShowStorage] = useState(false);

  // --- Initialization & Permissions ---
  const checkPermissions = useCallback(async () => {
    const status = await fileSystem.init();
    setPermStatus(status);
  }, []);

  useEffect(() => {
    checkPermissions();
    
    // Auto-Lock Vault on Background
    const listener = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
         if (permStatus !== PermissionStatus.GRANTED) {
             const verified = await fileSystem.confirmFullAccess();
             if (verified) setPermStatus(PermissionStatus.GRANTED);
         }
      } else {
         // App going to background -> Lock Vault
         setVaultUnlocked(false);
      }
    });

    return () => { listener.then(l => l.remove()); }
  }, [checkPermissions, permStatus]);

  // --- Back Button Handling ---
  useEffect(() => {
    const handleBackButton = async () => {
      // 1. Overlays / Modals / Fullscreen Views
      if (previewState) {
        setPreviewState(null);
        return;
      }
      if (showSearch) {
        setShowSearch(false);
        return;
      }
      if (showStorage) {
        setShowStorage(false);
        setActiveTab('home'); // Reset tab if closing storage via back
        return;
      }
      if (compressionState.isOpen) {
        setCompressionState(prev => ({ ...prev, isOpen: false }));
        return;
      }
      if (encryptionModal.isOpen) {
        setEncryptionModal(prev => ({ ...prev, isOpen: false }));
        return;
      }
      if (modal.type) {
        setModal({ type: null });
        if (activeTab === 'settings') setActiveTab('home');
        return;
      }
      if (contextMenu) {
        setContextMenu(null);
        return;
      }

      // 2. Sidebar
      if (sidebarOpen) {
        setSidebarOpen(false);
        return;
      }

      // 3. Selection
      if (filePane.selectedIds.size > 0) {
        filePane.setSelectedIds(new Set());
        return;
      }

      // 4. Navigation
      if (filePane.canGoBack) {
        filePane.goBack();
      } else {
        // Exit if we can't go back any further
        CapacitorApp.exitApp();
      }
    };

    const listener = CapacitorApp.addListener('backButton', handleBackButton);
    return () => { listener.then(l => l.remove()); };
  }, [
    previewState, showSearch, showStorage, compressionState.isOpen, encryptionModal.isOpen, 
    modal.type, contextMenu, sidebarOpen, filePane, activeTab
  ]);

  // --- Tab Navigation Logic ---
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    if (tabId === 'home') {
      filePane.navigateTo('root');
    } else if (tabId === 'files') {
      filePane.navigateTo('root_internal');
    } else if (tabId === 'recent') {
      filePane.navigateTo('recent');
    } else if (tabId === 'analyze') {
      setShowStorage(true);
      // We don't change 'activeTab' here visually for the main pane, but we show overlay
      // Actually, let's keep it activeTab for visual feedback, overlay handles display
    } else if (tabId === 'settings') {
      setModal({ type: 'SETTINGS' });
    }
  };

  // Sync tab state with current path
  useEffect(() => {
    if (showStorage) return; // Keep analyze tab active if storage is open
    if (modal.type === 'SETTINGS') return;

    const pathId = filePane.currentPath.length > 0 ? filePane.currentPath[filePane.currentPath.length - 1].id : 'root';
    
    if (pathId === 'root') setActiveTab('home');
    else if (pathId === 'recent') setActiveTab('recent');
    else if (pathId === 'root_internal' || pathId === 'root_sd' || pathId.includes('/')) setActiveTab('files');
    
  }, [filePane.currentPath, showStorage, modal.type]);


  // Navigate Logic with Vault Protection
  const handleNavigate = (id: string) => {
    if (id === VAULT_FOLDER && !vaultUnlocked) {
       setModal({ type: 'AUTH', targetId: id });
       return;
    }
    filePane.navigateTo(id);
  };

  const handleGrantFull = async () => {
     const success = await fileSystem.requestFullAccess();
     if (success) {
        setPermStatus(PermissionStatus.GRANTED);
     }
     return success;
  };

  const handleGrantScoped = async () => {
     const success = await fileSystem.requestScopedAccess();
     if (success) {
       setPermStatus(PermissionStatus.SCOPED);
     }
     return success;
  };

  const handleOpen = async (file: FileNode) => {
    // Handle Shortcuts
    if (file.id === 'downloads_shortcut') {
       handleNavigate('Download');
       return;
    }

    if (file.type === 'folder') {
      handleNavigate(file.id);
    } else {
      try {
        if (file.isEncrypted) {
           // Open Encryption Dialog for Decrypt
           setEncryptionModal({
             isOpen: true,
             mode: 'DECRYPT',
             files: [file]
           });
           return;
        }
        if (file.type === 'archive' || file.name.endsWith('.zip')) {
           setCompressionState({
             isOpen: true,
             mode: 'EXTRACT',
             files: [file]
           });
           return;
        }

        // Preview Logic
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const isText = file.name.match(/\.(txt|md|json|js|ts|css|html|log|xml|c|cpp|py|java|ini|conf)$/i);
        const isMedia = ['image', 'video', 'audio'].includes(file.type);

        if (isMedia || isText || isPdf) {
           try {
             let url, content;
             if (isMedia || isPdf) {
                url = await fileSystem.getFileUrl(file.id);
             } else if (isText) {
                content = await fileSystem.readTextFile(file.id);
             }
             setPreviewState({ file, url, content });
             return;
           } catch (e) { console.error("Preview failed", e); }
        } 

        // Fallback to default opener
        await fileSystem.openFile(file);
      } catch (e: any) {
        alert("Cannot open file: " + e.message);
      }
    }
  };

  const handleReveal = async (file: FileNode) => {
    setShowSearch(false);
    if (file.parentId) {
      handleNavigate(file.parentId);
      filePane.setSelectedIds(new Set([file.id]));
    }
  };

  const handleCopy = (isCut: boolean) => {
    const ids = Array.from(filePane.selectedIds);
    if (ids.length === 0) return;
    const parentId = filePane.currentPath.length > 0 ? filePane.currentPath[filePane.currentPath.length - 1].id : 'root';
    setClipboard({ mode: isCut ? 'cut' : 'copy', sourceIds: ids, sourceParentId: parentId });
    filePane.setSelectedIds(new Set());
    setContextMenu(null);
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    try {
      const targetId = filePane.currentPath.length > 0 ? filePane.currentPath[filePane.currentPath.length - 1].id : 'root';
      if (clipboard.mode === 'copy') await fileSystem.copy(clipboard.sourceIds, targetId);
      else await fileSystem.move(clipboard.sourceIds, targetId);
      setClipboard(null);
      filePane.refreshFiles();
    } catch (e: any) { alert("Paste failed: " + e.message); }
  };

  const handleDelete = async () => {
    const ids = modal.targetId ? [modal.targetId] : Array.from(filePane.selectedIds);
    if (ids.length === 0) return;
    
    // Check if we are in Trash
    const isTrash = filePane.currentPath.some(p => p.id === 'trash');

    if (confirm(isTrash ? `Permanently delete ${ids.length} items?` : `Move ${ids.length} items to Recycle Bin?`)) {
       if (isTrash) await fileSystem.deletePermanent(ids);
       else await fileSystem.trash(ids);
       
       filePane.refreshFiles();
       filePane.setSelectedIds(new Set());
       setModal({ type: null });
    }
  };

  const handleEmptyTrash = async () => {
    if (confirm("Are you sure you want to permanently delete all items in the Recycle Bin? This action cannot be undone.")) {
      await fileSystem.emptyTrash();
      filePane.refreshFiles();
    }
  };

  const handleRestore = async () => {
    const ids = modal.targetId ? [modal.targetId] : Array.from(filePane.selectedIds);
    if (ids.length === 0) return;
    await fileSystem.restore(ids);
    filePane.refreshFiles();
    filePane.setSelectedIds(new Set());
    setModal({ type: null });
  };

  const triggerCompress = () => {
    const ids = modal.targetId ? [modal.targetId] : Array.from(filePane.selectedIds);
    if (ids.length === 0) return;
    const filesToCompress = filePane.files.filter(f => ids.includes(f.id));
    setCompressionState({ isOpen: true, mode: 'COMPRESS', files: filesToCompress });
    setModal({ type: null }); 
  };

  const triggerEncrypt = () => {
    const ids = modal.targetId ? [modal.targetId] : Array.from(filePane.selectedIds);
    if (ids.length === 0) return;
    const files = filePane.files.filter(f => ids.includes(f.id));
    // Determine mode based on first file selection (simplified)
    const mode = files[0].isEncrypted ? 'DECRYPT' : 'ENCRYPT';
    setEncryptionModal({ isOpen: true, mode, files });
    setModal({ type: null });
  };

  const handleEncryptionSubmit = async (password: string) => {
     const { mode, files } = encryptionModal;
     const ids = files.map(f => f.id);
     try {
        if (mode === 'ENCRYPT') {
           await fileSystem.encryptFiles(ids, password);
        } else {
           await fileSystem.decryptFiles(ids, password);
        }
        filePane.refreshFiles();
        filePane.setSelectedIds(new Set());
        setEncryptionModal(prev => ({ ...prev, isOpen: false }));
     } catch (e: any) {
        alert("Operation failed: " + e.message);
     }
  };

  const handleShare = async () => {
     const ids = modal.targetId ? [modal.targetId] : Array.from(filePane.selectedIds);
     if (ids.length === 0) return;
     if (navigator.share) {
        try {
           const file = filePane.files.find(f => f.id === ids[0]);
           await navigator.share({
             title: file?.name || 'Shared Files',
             text: `Sharing ${ids.length} files from Nova Explorer`,
             url: window.location.href 
           });
        } catch(e) {}
     } else {
        alert("Sharing not supported on this platform");
     }
     setModal({ type: null });
     setContextMenu(null);
  };

  const handleCreateFolder = async (name: string) => {
    if (!name) return;
    const parentId = filePane.currentPath.length > 0 ? filePane.currentPath[filePane.currentPath.length - 1].id : 'root';
    await fileSystem.createFolder(parentId, name);
    filePane.refreshFiles();
    setModal({ type: null });
  };

  const handleDropMove = async (sourceId: string, targetFolderId: string) => {
    await fileSystem.move([sourceId], targetFolderId);
    filePane.refreshFiles();
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileNode) => {
    if (!filePane.selectedIds.has(file.id)) {
      filePane.setSelectedIds(new Set([file.id]));
    }
    setContextMenu({ x: e.clientX, y: e.clientY, fileId: file.id });
  };

  const openSelectionMenu = () => {
     if (filePane.selectedIds.size === 0) return;
     setContextMenu({ x: 0, y: 0, fileId: undefined });
  };

  const executeMenuAction = async (action: string) => {
    const specificFileId = contextMenu?.fileId;
    const targetIds = specificFileId ? [specificFileId] : Array.from(filePane.selectedIds);
    
    if (specificFileId && !filePane.selectedIds.has(specificFileId)) {
       filePane.setSelectedIds(new Set([specificFileId]));
    }

    const targetId = specificFileId || targetIds[0];

    switch(action) {
      case 'open': const f = filePane.files.find(f => f.id === targetId); if(f) handleOpen(f); break;
      case 'copy': handleCopy(false); break;
      case 'cut': handleCopy(true); break;
      case 'delete': handleDelete(); break;
      case 'restore': handleRestore(); break;
      case 'rename': setModal({ type: 'RENAME', targetId }); break;
      case 'properties': setModal({ type: 'PROPERTIES', targetId }); break;
      case 'encrypt': triggerEncrypt(); break;
      case 'compress': triggerCompress(); break;
      case 'share': handleShare(); break;
      case 'bookmark': 
         await fileSystem.toggleBookmark(targetId);
         if (filePane.currentPath.some(p => p.id === 'favorites')) filePane.refreshFiles();
         break;
    }
    setContextMenu(null);
  };

  // Vault / PIN Logic
  const handleAuthSuccess = (pin: string) => {
    if (pin === 'BIOMETRIC_BYPASS') {
       // Biometric success flow
       setVaultUnlocked(true);
       setModal({ type: null });
       if (modal.targetId) filePane.navigateTo(modal.targetId);
       return;
    }

    if (!vaultPinHash) {
       SecurityService.hashPin(pin).then(h => {
         localStorage.setItem('nova_vault_pin', h);
         setVaultPinHash(h);
         setVaultUnlocked(true);
         setModal({ type: null });
         if(modal.targetId) filePane.navigateTo(modal.targetId);
       });
    } else {
       SecurityService.verifyPin(pin, vaultPinHash).then(ok => {
         if(ok) {
           setVaultUnlocked(true);
           setModal({ type: null });
           if(modal.targetId) filePane.navigateTo(modal.targetId);
         } else alert("Wrong PIN");
       });
    }
  };

  // --- Rendering ---

  if (!isReady) {
    return (
      <PermissionScreen 
        isChecking={permStatus === PermissionStatus.UNKNOWN}
        onGrantFull={handleGrantFull}
        onGrantScoped={handleGrantScoped}
      />
    );
  }

  const contextFile = contextMenu?.fileId ? filePane.files.find(f => f.id === contextMenu.fileId) : undefined;
  // If active path is inside vault and locked (shouldn't happen with guards, but for UI safety)
  const isVaultProtected = filePane.currentPath.some(p => p.id === VAULT_FOLDER) && !vaultUnlocked;

  return (
    <div className="flex h-[100dvh] w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300">
      
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
           <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold mr-3 shadow-lg shadow-blue-500/20">N</div>
           <span className="text-xl font-bold tracking-tight">Nova</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
           <button onClick={() => { handleNavigate('root'); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Home size={18} className="mr-3" /> Dashboard
           </button>
           
           <div className="px-4 pt-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Drives</div>
           <button onClick={() => { handleNavigate('root_internal'); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Smartphone size={18} className="mr-3" /> Internal Storage
           </button>
           <button onClick={() => { handleNavigate('root_sd'); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <HardDrive size={18} className="mr-3" /> SD Card
           </button>
           
           <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Access</div>
           <button onClick={() => { filePane.navigateTo('recent'); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Clock size={18} className="mr-3" /> Recent Files
           </button>
           <button onClick={() => { filePane.navigateTo('favorites'); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Star size={18} className="mr-3" /> Favorites
           </button>
           
           <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Locations</div>
           <FolderTree onNavigate={(id) => { handleNavigate(id); setSidebarOpen(false); }} activePathIds={new Set(filePane.currentPath.map(n => n.id))} />
           
           <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tools</div>
           <button onClick={() => { handleNavigate(VAULT_FOLDER); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
              <Shield size={18} className="mr-3" /> Secure Vault
           </button>
           <button onClick={() => setShowStorage(true)} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ChartIcon size={18} className="mr-3" /> Storage Analysis
           </button>
           <button onClick={() => { filePane.navigateTo('trash'); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 dark:hover:text-red-400 transition-colors">
              <Trash2 size={18} className="mr-3" /> Recycle Bin
           </button>
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <span className="text-xs text-slate-400">v2.1 Pro</span>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
         
         {/* Pane Container */}
         {isVaultProtected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 pb-20">
               <Lock size={64} className="mb-4 text-slate-300 dark:text-slate-700" />
               <p className="font-bold text-lg mb-2">Vault Locked</p>
               <button onClick={() => setModal({ type: 'AUTH', targetId: VAULT_FOLDER })} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
                  Unlock Vault
               </button>
            </div>
         ) : (
           <div className="flex-1 flex overflow-hidden pt-[calc(env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))] gap-2 relative">
              <div className="flex-1 min-w-0 h-full w-full">
                 <FileBrowserPane 
                    paneState={filePane}
                    onOpen={handleOpen}
                    onContextMenu={handleContextMenu}
                    onDropFile={handleDropMove}
                    onSearch={() => setShowSearch(true)}
                    onEmptyTrash={handleEmptyTrash}
                    onToggleSidebar={() => setSidebarOpen(true)}
                 />
              </div>
           </div>
         )}
         
         {/* FAB and Toolbar Overlay */}
         <div className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] right-6 z-30 flex flex-col items-end gap-3 pointer-events-none">
            {clipboard && (
               <button onClick={handlePaste} className="pointer-events-auto flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white rounded-full shadow-xl hover:scale-105 transition-transform">
                  <Clipboard size={18} /> <span>Paste {clipboard.mode}</span>
               </button>
            )}
            <button onClick={() => setModal({ type: 'CREATE_FOLDER' })} className="pointer-events-auto w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
               <Plus size={28} />
            </button>
         </div>

         {/* Selection Toolbar */}
         {filePane.selectedIds.size > 0 && (
            <div className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 flex items-center gap-1 animate-in slide-in-from-bottom-10">
               <span className="px-3 font-bold text-sm whitespace-nowrap">{filePane.selectedIds.size} selected</span>
               <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
               {filePane.currentPath.some(p => p.id === 'trash') ? (
                 <>
                   <button onClick={handleRestore} className="p-3 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl" title="Restore"><RotateCcw size={18}/></button>
                   <button onClick={handleDelete} className="p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-xl" title="Delete Forever"><Trash2 size={18}/></button>
                 </>
               ) : (
                 <>
                   <button onClick={() => handleCopy(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl" title="Copy"><Copy size={18}/></button>
                   <button onClick={() => handleCopy(true)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl" title="Cut"><Scissors size={18}/></button>
                   <button onClick={handleDelete} className="p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-xl" title="Delete"><Trash2 size={18}/></button>
                   <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                   <button onClick={openSelectionMenu} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl" title="More"><MoreVertical size={18}/></button>
                 </>
               )}
               <button onClick={() => filePane.setSelectedIds(new Set())} className="px-3 text-xs font-bold uppercase text-slate-400">Cancel</button>
            </div>
         )}
         
         <BottomNavigator activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Overlays */}
      <SearchScreen 
        isOpen={showSearch} 
        onClose={() => setShowSearch(false)} 
        onNavigate={(f) => { setShowSearch(false); handleNavigate(f.id); }}
        onReveal={handleReveal}
      />

      <CompressionModal 
        isOpen={compressionState.isOpen}
        mode={compressionState.mode}
        files={compressionState.files}
        onClose={() => setCompressionState(prev => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
           filePane.refreshFiles();
           filePane.setSelectedIds(new Set());
        }}
      />
      
      <EncryptionDialog 
        isOpen={encryptionModal.isOpen}
        mode={encryptionModal.mode}
        fileName={encryptionModal.files[0]?.name}
        onClose={() => setEncryptionModal(prev => ({...prev, isOpen: false}))}
        onSubmit={handleEncryptionSubmit}
      />

      {showStorage && (
         <StorageAnalyzer onClose={() => { setShowStorage(false); setActiveTab('home'); }} />
      )}
      
      <AuthDialog isOpen={modal.type === 'AUTH'} mode={vaultPinHash ? 'ENTER' : 'CREATE'} onSuccess={handleAuthSuccess} onClose={() => setModal({ type: null })} />
      <SettingsDialog 
        isOpen={modal.type === 'SETTINGS'} 
        onClose={() => { setModal({ type: null }); setActiveTab('home'); }} 
        onResetPin={() => { 
           setVaultPinHash(null); 
           localStorage.removeItem('nova_vault_pin'); 
           setModal({ type: 'AUTH' }); 
        }} 
        permStatus={permStatus}
      />
      <InputDialog isOpen={modal.type === 'CREATE_FOLDER'} title="New Folder" placeholder="Name" onClose={() => setModal({ type: null })} onSubmit={handleCreateFolder} actionLabel="Create" />
      <InputDialog isOpen={modal.type === 'RENAME'} title="Rename" defaultValue={filePane.files.find(f => f.id === modal.targetId)?.name} onClose={() => setModal({ type: null })} onSubmit={async (name) => { if(modal.targetId) await fileSystem.rename(modal.targetId, name); filePane.refreshFiles(); setModal({ type: null }); }} actionLabel="Rename" />
      
      {previewState && <FilePreview file={previewState.file} url={previewState.url} content={previewState.content} onClose={() => setPreviewState(null)} onOpenExternal={() => fileSystem.openFile(previewState.file)} />}
      
      <FileActionMenu 
        isOpen={!!contextMenu}
        onClose={() => setContextMenu(null)}
        file={contextFile}
        selectedCount={filePane.selectedIds.size}
        onAction={executeMenuAction}
        isTrash={filePane.currentPath.some(p => p.id === 'trash')}
        isBookmarked={contextFile ? fileSystem.isBookmarked(contextFile.id) : false}
      />
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
);

export default App;
