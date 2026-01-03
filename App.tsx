
import React, { useState, useEffect, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { 
  FileNode, ClipboardState, ModalState, PaneId
} from './types';
import { fileSystem, PermissionStatus } from './services/filesystem';
import { SecurityService } from './services/security';
import { useFilePane } from './hooks/useFilePane';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

import FileBrowserPane from './components/FileBrowserPane';
import StorageChart from './components/StorageChart';
import FileActionMenu from './components/FileActionMenu'; 
import FilePreview from './components/FilePreview';
import FolderTree from './components/FolderTree';
import SearchScreen from './components/SearchScreen';
import AuthDialog from './components/AuthDialog';
import SettingsDialog from './components/SettingsDialog';
import PermissionScreen from './components/PermissionScreen';
import CompressionModal from './components/CompressionModal';
import EncryptionDialog from './components/EncryptionDialog';
import { InputDialog, PropertiesDialog } from './components/Dialogs';
import { 
  Menu, Settings, Trash2, Copy, Scissors, 
  Shield, PieChart as ChartIcon, Clipboard, 
  Plus, RefreshCw, Archive, Layout, Moon, Sun, Columns, 
  Smartphone, HardDrive, ArrowLeft, Clock, Star, RotateCcw,
  MoreVertical, Lock
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
  
  // --- Panes ---
  // Only initialize panes if permissions are granted/scoped
  const isReady = permStatus === PermissionStatus.GRANTED || permStatus === PermissionStatus.SCOPED;
  
  const leftPane = useFilePane('root', isReady); // Default to Root screen
  const rightPane = useFilePane('root_sd', isReady);
  const [activePaneId, setActivePaneId] = useState<PaneId>('left');
  const [dualPaneEnabled, setDualPaneEnabled] = useState(false);
  
  const activePane = activePaneId === 'left' ? leftPane : rightPane;

  // --- UI State ---
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, fileId?: string, paneId: PaneId } | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [compressionState, setCompressionState] = useState<CompressionState>({ isOpen: false, mode: 'COMPRESS', files: [] });
  const [encryptionModal, setEncryptionModal] = useState<{ isOpen: boolean, mode: 'ENCRYPT' | 'DECRYPT', files: FileNode[] }>({ isOpen: false, mode: 'ENCRYPT', files: [] });
  
  const [showStorage, setShowStorage] = useState(false);
  const [storageStats, setStorageStats] = useState({ used: 0, total: 0 });

  // --- Initialization & Permissions ---
  const checkPermissions = useCallback(async () => {
    const status = await fileSystem.init();
    setPermStatus(status);
  }, []);

  useEffect(() => {
    checkPermissions();
    if (window.innerWidth > 1024) setDualPaneEnabled(true);
    
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
         // Optionally navigate away from vault if open, but simple locking state is enough for next render check
      }
    });

    return () => { listener.then(l => l.remove()); }
  }, [checkPermissions, permStatus]);

  // Navigate Logic with Vault Protection
  const handleNavigate = (pane: ReturnType<typeof useFilePane>, id: string) => {
    if (id === VAULT_FOLDER && !vaultUnlocked) {
       // Trigger Auth
       setActivePaneId(pane === leftPane ? 'left' : 'right');
       setModal({ type: 'AUTH', targetId: id });
       return;
    }
    pane.navigateTo(id);
  };

  const handleGrantFull = async () => {
     const launched = await fileSystem.requestFullAccess();
     return launched;
  };

  const handleGrantScoped = async () => {
     const success = await fileSystem.requestScopedAccess();
     if (success) {
       setPermStatus(PermissionStatus.SCOPED);
     }
     return success;
  };

  const handleOpen = async (file: FileNode, pane: ReturnType<typeof useFilePane>) => {
    // Handle Shortcuts
    if (file.id === 'downloads_shortcut') {
       handleNavigate(pane, 'Download');
       return;
    }

    if (file.type === 'folder') {
      handleNavigate(pane, file.id);
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
      handleNavigate(activePane, file.parentId);
      activePane.setSelectedIds(new Set([file.id]));
    }
  };

  const handleCopy = (isCut: boolean) => {
    const ids = Array.from(activePane.selectedIds);
    if (ids.length === 0) return;
    const parentId = activePane.currentPath.length > 0 ? activePane.currentPath[activePane.currentPath.length - 1].id : 'root';
    setClipboard({ mode: isCut ? 'cut' : 'copy', sourceIds: ids, sourceParentId: parentId });
    activePane.setSelectedIds(new Set());
    setContextMenu(null);
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    try {
      const targetId = activePane.currentPath.length > 0 ? activePane.currentPath[activePane.currentPath.length - 1].id : 'root';
      if (clipboard.mode === 'copy') await fileSystem.copy(clipboard.sourceIds, targetId);
      else await fileSystem.move(clipboard.sourceIds, targetId);
      setClipboard(null);
      leftPane.refreshFiles();
      rightPane.refreshFiles();
    } catch (e: any) { alert("Paste failed: " + e.message); }
  };

  const handleDelete = async () => {
    const ids = modal.targetId ? [modal.targetId] : Array.from(activePane.selectedIds);
    if (ids.length === 0) return;
    
    // Check if we are in Trash
    const isTrash = activePane.currentPath.some(p => p.id === 'trash');

    if (confirm(isTrash ? `Permanently delete ${ids.length} items?` : `Move ${ids.length} items to Recycle Bin?`)) {
       if (isTrash) await fileSystem.deletePermanent(ids);
       else await fileSystem.trash(ids);
       
       activePane.refreshFiles();
       activePane.setSelectedIds(new Set());
       setModal({ type: null });
    }
  };

  const handleEmptyTrash = async () => {
    if (confirm("Are you sure you want to permanently delete all items in the Recycle Bin? This action cannot be undone.")) {
      await fileSystem.emptyTrash();
      leftPane.refreshFiles();
      rightPane.refreshFiles();
    }
  };

  const handleRestore = async () => {
    const ids = modal.targetId ? [modal.targetId] : Array.from(activePane.selectedIds);
    if (ids.length === 0) return;
    await fileSystem.restore(ids);
    activePane.refreshFiles();
    activePane.setSelectedIds(new Set());
    setModal({ type: null });
  };

  const triggerCompress = () => {
    const ids = modal.targetId ? [modal.targetId] : Array.from(activePane.selectedIds);
    if (ids.length === 0) return;
    const filesToCompress = activePane.files.filter(f => ids.includes(f.id));
    setCompressionState({ isOpen: true, mode: 'COMPRESS', files: filesToCompress });
    setModal({ type: null }); 
  };

  const triggerEncrypt = () => {
    const ids = modal.targetId ? [modal.targetId] : Array.from(activePane.selectedIds);
    if (ids.length === 0) return;
    const files = activePane.files.filter(f => ids.includes(f.id));
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
        activePane.refreshFiles();
        activePane.setSelectedIds(new Set());
        setEncryptionModal(prev => ({ ...prev, isOpen: false }));
     } catch (e: any) {
        alert("Operation failed: " + e.message);
     }
  };

  const handleShare = async () => {
     const ids = modal.targetId ? [modal.targetId] : Array.from(activePane.selectedIds);
     if (ids.length === 0) return;
     if (navigator.share) {
        try {
           const file = activePane.files.find(f => f.id === ids[0]);
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
    const parentId = activePane.currentPath.length > 0 ? activePane.currentPath[activePane.currentPath.length - 1].id : 'root';
    await fileSystem.createFolder(parentId, name);
    activePane.refreshFiles();
    setModal({ type: null });
  };

  const handleDropMove = async (sourceId: string, targetFolderId: string) => {
    await fileSystem.move([sourceId], targetFolderId);
    leftPane.refreshFiles();
    rightPane.refreshFiles();
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileNode, paneId: PaneId) => {
    setActivePaneId(paneId);
    const pane = paneId === 'left' ? leftPane : rightPane;
    if (!pane.selectedIds.has(file.id)) {
      pane.setSelectedIds(new Set([file.id]));
    }
    setContextMenu({ x: e.clientX, y: e.clientY, fileId: file.id, paneId });
  };

  const openSelectionMenu = () => {
     if (activePane.selectedIds.size === 0) return;
     setContextMenu({ x: 0, y: 0, fileId: undefined, paneId: activePaneId });
  };

  const executeMenuAction = async (action: string) => {
    const specificFileId = contextMenu?.fileId;
    const targetIds = specificFileId ? [specificFileId] : Array.from(activePane.selectedIds);
    const pane = contextMenu?.paneId === 'left' ? leftPane : rightPane;
    
    if (specificFileId && !pane.selectedIds.has(specificFileId)) {
       pane.setSelectedIds(new Set([specificFileId]));
    }

    const targetId = specificFileId || targetIds[0];

    switch(action) {
      case 'open': const f = pane.files.find(f => f.id === targetId); if(f) handleOpen(f, pane); break;
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
         if (pane.currentPath.some(p => p.id === 'favorites')) pane.refreshFiles();
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
       if (modal.targetId) activePane.navigateTo(modal.targetId);
       return;
    }

    if (!vaultPinHash) {
       SecurityService.hashPin(pin).then(h => {
         localStorage.setItem('nova_vault_pin', h);
         setVaultPinHash(h);
         setVaultUnlocked(true);
         setModal({ type: null });
         if(modal.targetId) activePane.navigateTo(modal.targetId);
       });
    } else {
       SecurityService.verifyPin(pin, vaultPinHash).then(ok => {
         if(ok) {
           setVaultUnlocked(true);
           setModal({ type: null });
           if(modal.targetId) activePane.navigateTo(modal.targetId);
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

  const contextFile = contextMenu?.fileId ? activePane.files.find(f => f.id === contextMenu.fileId) : undefined;
  // If active path is inside vault and locked (shouldn't happen with guards, but for UI safety)
  const isVaultProtected = activePane.currentPath.some(p => p.id === VAULT_FOLDER) && !vaultUnlocked;

  return (
    <div className="flex h-screen w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
           <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold mr-3 shadow-lg shadow-blue-500/20">N</div>
           <span className="text-xl font-bold tracking-tight">Nova</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
           <div className="px-4 pt-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Drives</div>
           <button onClick={() => { setActivePaneId('left'); handleNavigate(leftPane, 'root_internal'); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Smartphone size={18} className="mr-3" /> Internal Storage
           </button>
           <button onClick={() => { setActivePaneId('left'); handleNavigate(leftPane, 'root_sd'); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <HardDrive size={18} className="mr-3" /> SD Card
           </button>
           
           <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Access</div>
           <button onClick={() => { activePane.navigateTo('recent'); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Clock size={18} className="mr-3" /> Recent Files
           </button>
           <button onClick={() => { activePane.navigateTo('favorites'); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Star size={18} className="mr-3" /> Favorites
           </button>
           
           <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Locations</div>
           <FolderTree onNavigate={(id) => { handleNavigate(activePane, id); setSidebarOpen(false); }} activePathIds={new Set(activePane.currentPath.map(n => n.id))} />
           
           <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tools</div>
           <button onClick={() => { handleNavigate(activePane, VAULT_FOLDER); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
              <Shield size={18} className="mr-3" /> Secure Vault
           </button>
           <button onClick={() => setShowStorage(true)} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ChartIcon size={18} className="mr-3" /> Storage Analysis
           </button>
           <button onClick={() => { activePane.navigateTo('trash'); setSidebarOpen(false); }} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 dark:hover:text-red-400 transition-colors">
              <Trash2 size={18} className="mr-3" /> Recycle Bin
           </button>
           <button onClick={() => setModal({ type: 'SETTINGS' })} className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Settings size={18} className="mr-3" /> Settings
           </button>
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <span className="text-xs text-slate-400">v2.1 Pro</span>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
         <header className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:hidden z-20">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-400">
               <Menu size={24} />
            </button>
            <span className="font-semibold">Nova Explorer</span>
            <button onClick={() => setDualPaneEnabled(!dualPaneEnabled)} className={`p-2 rounded-lg ${dualPaneEnabled ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400'}`}>
               <Columns size={20} />
            </button>
         </header>

         <div className="hidden md:flex absolute top-4 right-6 z-30 gap-2">
            <button 
              onClick={() => setDualPaneEnabled(!dualPaneEnabled)} 
              className={`p-2 rounded-lg border transition-all shadow-sm ${
                dualPaneEnabled 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
              title="Toggle Dual Pane"
            >
               <Columns size={18} />
            </button>
         </div>

         {/* Pane Container */}
         {isVaultProtected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
               <Lock size={64} className="mb-4 text-slate-300 dark:text-slate-700" />
               <p className="font-bold text-lg mb-2">Vault Locked</p>
               <button onClick={() => setModal({ type: 'AUTH', targetId: VAULT_FOLDER })} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
                  Unlock Vault
               </button>
            </div>
         ) : (
           <div className="flex-1 flex overflow-hidden p-2 gap-2 relative">
              <div className={`flex-1 min-w-0 h-full transition-all duration-300 ${dualPaneEnabled ? 'w-1/2' : (activePaneId === 'left' ? 'w-full' : 'hidden md:block md:w-full')}`}>
                 <FileBrowserPane 
                    id="left"
                    isActive={activePaneId === 'left'}
                    onFocus={() => setActivePaneId('left')}
                    paneState={leftPane}
                    onOpen={(f) => handleOpen(f, leftPane)}
                    onContextMenu={(e, f) => handleContextMenu(e, f, 'left')}
                    onDropFile={handleDropMove}
                    onSearch={() => setShowSearch(true)}
                    onEmptyTrash={handleEmptyTrash}
                 />
              </div>
              {(dualPaneEnabled || activePaneId === 'right') && (
                <div className={`flex-1 min-w-0 h-full transition-all duration-300 ${dualPaneEnabled ? 'w-1/2' : (activePaneId === 'right' ? 'w-full' : 'hidden')}`}>
                   <FileBrowserPane 
                      id="right"
                      isActive={activePaneId === 'right'}
                      onFocus={() => setActivePaneId('right')}
                      paneState={rightPane}
                      onOpen={(f) => handleOpen(f, rightPane)}
                      onContextMenu={(e, f) => handleContextMenu(e, f, 'right')}
                      onDropFile={handleDropMove}
                      onSearch={() => setShowSearch(true)}
                      onEmptyTrash={handleEmptyTrash}
                   />
                </div>
              )}
           </div>
         )}

         {!dualPaneEnabled && (
           <div className="md:hidden h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex">
              <button onClick={() => setActivePaneId('left')} className={`flex-1 flex flex-col items-center justify-center ${activePaneId === 'left' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                 <Layout size={20} /><span className="text-[10px] font-medium">Pane 1</span>
              </button>
              <button onClick={() => setActivePaneId('right')} className={`flex-1 flex flex-col items-center justify-center ${activePaneId === 'right' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                 <Layout size={20} /><span className="text-[10px] font-medium">Pane 2</span>
              </button>
           </div>
         )}
         
         <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
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
         {activePane.selectedIds.size > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 flex items-center gap-1 animate-in slide-in-from-bottom-10">
               <span className="px-3 font-bold text-sm whitespace-nowrap">{activePane.selectedIds.size} selected</span>
               <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
               {activePane.currentPath.some(p => p.id === 'trash') ? (
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
               <button onClick={() => activePane.setSelectedIds(new Set())} className="px-3 text-xs font-bold uppercase text-slate-400">Cancel</button>
            </div>
         )}
      </div>

      {/* Overlays */}
      <SearchScreen 
        isOpen={showSearch} 
        onClose={() => setShowSearch(false)} 
        onNavigate={(f) => { setShowSearch(false); handleNavigate(activePane, f.id); }}
        onReveal={handleReveal}
      />

      <CompressionModal 
        isOpen={compressionState.isOpen}
        mode={compressionState.mode}
        files={compressionState.files}
        onClose={() => setCompressionState(prev => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
           activePane.refreshFiles();
           activePane.setSelectedIds(new Set());
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
         <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 animate-in slide-in-from-bottom-full duration-300">
            <div className="p-4">
               <button onClick={() => setShowStorage(false)} className="mb-4 flex items-center text-blue-500"><ArrowLeft className="mr-2"/> Back</button>
               <StorageChart used={storageStats.used} total={storageStats.total} />
            </div>
         </div>
      )}
      
      <AuthDialog isOpen={modal.type === 'AUTH'} mode={vaultPinHash ? 'ENTER' : 'CREATE'} onSuccess={handleAuthSuccess} onClose={() => setModal({ type: null })} />
      <SettingsDialog isOpen={modal.type === 'SETTINGS'} onClose={() => setModal({ type: null })} showHidden={activePane.showHidden} onToggleHidden={(v) => { leftPane.setShowHidden(v); rightPane.setShowHidden(v); }} showProtected={activePane.showHidden} onToggleProtected={() => {}} onResetPin={() => { setVaultPinHash(null); localStorage.removeItem('nova_vault_pin'); setModal({ type: 'AUTH' }); }} />
      <InputDialog isOpen={modal.type === 'CREATE_FOLDER'} title="New Folder" placeholder="Name" onClose={() => setModal({ type: null })} onSubmit={handleCreateFolder} actionLabel="Create" />
      <InputDialog isOpen={modal.type === 'RENAME'} title="Rename" defaultValue={activePane.files.find(f => f.id === modal.targetId)?.name} onClose={() => setModal({ type: null })} onSubmit={async (name) => { if(modal.targetId) await fileSystem.rename(modal.targetId, name); activePane.refreshFiles(); setModal({ type: null }); }} actionLabel="Rename" />
      
      {previewState && <FilePreview file={previewState.file} url={previewState.url} content={previewState.content} onClose={() => setPreviewState(null)} onOpenExternal={() => fileSystem.openFile(previewState.file)} />}
      
      <FileActionMenu 
        isOpen={!!contextMenu}
        onClose={() => setContextMenu(null)}
        file={contextFile}
        selectedCount={activePane.selectedIds.size}
        onAction={executeMenuAction}
        isTrash={activePane.currentPath.some(p => p.id === 'trash')}
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
