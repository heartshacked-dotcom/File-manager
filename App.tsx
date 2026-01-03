import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileNode, ViewMode, SortField, ClipboardState, ModalState, ModalType
} from './types';
import { fileSystem } from './services/filesystem';
import FileList from './components/FileList';
import Breadcrumbs from './components/Breadcrumbs';
import StorageChart from './components/StorageChart';
import ContextMenu from './components/ContextMenu';
import FilePreview from './components/FilePreview';
import { InputDialog, PropertiesDialog } from './components/Dialogs';
import { 
  Menu, Search, Grid, List, Plus, Trash2, Copy, Scissors, 
  CornerUpLeft, Settings, Shield, PieChart as ChartIcon, Eye, Clipboard, ArrowLeft,
  Home, Download, Music, Video, Image, FileText, HardDrive, RefreshCw
} from 'lucide-react';

interface PreviewState {
  file: FileNode;
  url?: string;
  content?: string;
}

const App: React.FC = () => {
  // --- State ---
  const [currentPath, setCurrentPath] = useState<FileNode[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>(SortField.NAME);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced State
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, fileId?: string } | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  
  // UI State
  const [showStorage, setShowStorage] = useState(false);
  const [storageStats, setStorageStats] = useState({ used: 0, total: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isTrashView, setIsTrashView] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    // Initialize FileSystem (Permissions, etc)
    fileSystem.init().catch(console.error);
  }, []);

  // --- Data Loading ---

  const refreshFiles = useCallback(async () => {
    try {
      const parentId = isTrashView ? 'trash' : (currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null);
      let fetchedFiles = await fileSystem.readdir(parentId, showHidden);
      if (searchQuery) {
        // Simple client side filter if search not fully supported
        fetchedFiles = fetchedFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      setFiles(fetchedFiles);
      
      const stats = fileSystem.getStorageUsage();
      setStorageStats({ used: stats.used, total: stats.total });
    } catch (error) {
      console.error("Failed to load files", error);
    }
  }, [currentPath, searchQuery, showHidden, isTrashView]);

  useEffect(() => {
    refreshFiles();
    setSelectedIds(new Set());
  }, [refreshFiles]);

  // --- Actions ---

  const handleNavigate = async (id: string) => {
    if (id === 'root' || id === 'root_internal') {
      setCurrentPath([]);
      setIsTrashView(false);
      setShowStorage(false);
      return;
    }
    if (id === 'trash') {
       setCurrentPath([]); // Visual reset
       setIsTrashView(true);
       setShowStorage(false);
       return;
    }
    setIsTrashView(false);
    setShowStorage(false);
    const trail = await fileSystem.getPathNodes(id);
    setCurrentPath(trail);
    setSearchQuery('');
  };

  const handleOpen = async (file: FileNode) => {
    if (file.type === 'folder') {
      if (file.isProtected) {
        const pass = prompt("Enter Vault Password:");
        if (pass !== '1234') return;
      }
      setCurrentPath(prev => [...prev, file]);
      setSearchQuery('');
    } else {
      // Handle File Preview
      try {
        if (['image', 'video', 'audio'].includes(file.type)) {
           const url = await fileSystem.getFileUrl(file.id);
           setPreviewState({ file, url });
        } else if (file.name.match(/\.(txt|md|json|js|css|xml|html)$/i) || file.type === 'document') {
           // Basic text check
           if (file.name.match(/\.(pdf|doc|docx|xls)$/i)) {
              // Open native for heavy docs
              await fileSystem.openFile(file);
           } else {
              const content = await fileSystem.readTextFile(file.id);
              setPreviewState({ file, content });
           }
        } else {
           await fileSystem.openFile(file);
        }
      } catch (e) {
        console.error("Preview failed, falling back to openFile", e);
        await fileSystem.openFile(file);
      }
    }
  };

  const handleSelect = (id: string, multi: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(multi ? prev : []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Operations ---

  const handleCreateFolder = async (name: string) => {
    const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : 'root';
    await fileSystem.createFolder(parentId, name);
    setModal({ type: null });
    refreshFiles();
  };

  const handleRename = async (newName: string) => {
    if (modal.targetId) {
      await fileSystem.rename(modal.targetId, newName);
      setModal({ type: null });
      refreshFiles();
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0 && !modal.targetId) return;
    const ids = modal.targetId ? [modal.targetId] : Array.from(selectedIds);
    
    if (isTrashView) {
      if (confirm(`Permanently delete ${ids.length} items?`)) {
        await fileSystem.deletePermanent(ids);
      }
    } else {
      await fileSystem.trash(ids);
    }
    refreshFiles();
    setSelectedIds(new Set());
    setModal({ type: null });
  };

  const handleEmptyTrash = async () => {
    if (confirm("Empty Recycle Bin? This cannot be undone.")) {
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
    const targetId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : 'root';
    
    if (clipboard.mode === 'copy') {
      await fileSystem.copy(clipboard.sourceIds, targetId);
    } else {
      await fileSystem.move(clipboard.sourceIds, targetId);
    }
    setClipboard(null);
    refreshFiles();
  };

  const handleDropMove = async (sourceId: string, targetFolderId: string) => {
    await fileSystem.move([sourceId], targetFolderId);
    refreshFiles();
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileNode) => {
    // If clicking an item not in selection, select it solely
    if (!selectedIds.has(file.id)) {
      setSelectedIds(new Set([file.id]));
    }
    setContextMenu({ x: e.clientX, y: e.clientY, fileId: file.id });
  };

  const executeMenuAction = (action: string) => {
    const targetId = contextMenu?.fileId;
    if (!targetId) return;

    switch(action) {
      case 'open': 
        const file = files.find(f => f.id === targetId);
        if(file) handleOpen(file);
        break;
      case 'copy': handleCopy(false); break;
      case 'cut': handleCopy(true); break;
      case 'delete': handleDelete(); break;
      case 'rename': setModal({ type: 'RENAME', targetId }); break;
      case 'properties': setModal({ type: 'PROPERTIES', targetId }); break;
      case 'hide': 
        // Mock hide implementation
        alert("To implement: set isHidden = true");
        break;
    }
    setContextMenu(null);
  };

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
        
        <div className="p-4 space-y-1 overflow-y-auto h-[calc(100%-8rem)]">
           <div className="text-xs font-semibold text-slate-500 uppercase px-4 mb-2">Locations</div>
           <button onClick={() => { handleNavigate('root_internal'); setSidebarOpen(false); }} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all ${!isTrashView && !showStorage ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <HardDrive className="mr-3" size={18} /> Internal Storage
           </button>
           <button className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-800 transition-all opacity-50 cursor-not-allowed" title="Not available in demo">
              <HardDrive className="mr-3" size={18} /> SD Card
           </button>

           <div className="text-xs font-semibold text-slate-500 uppercase px-4 mt-6 mb-2">Collections</div>
           <button className="flex items-center w-full px-4 py-2 text-sm rounded-lg text-slate-400 hover:bg-slate-800">
             <Image className="mr-3 text-amber-500" size={18} /> Images
           </button>
           <button className="flex items-center w-full px-4 py-2 text-sm rounded-lg text-slate-400 hover:bg-slate-800">
             <Video className="mr-3 text-red-500" size={18} /> Videos
           </button>
           <button className="flex items-center w-full px-4 py-2 text-sm rounded-lg text-slate-400 hover:bg-slate-800">
             <Music className="mr-3 text-purple-500" size={18} /> Audio
           </button>
           <button className="flex items-center w-full px-4 py-2 text-sm rounded-lg text-slate-400 hover:bg-slate-800">
             <FileText className="mr-3 text-blue-500" size={18} /> Documents
           </button>
           <button className="flex items-center w-full px-4 py-2 text-sm rounded-lg text-slate-400 hover:bg-slate-800">
             <Download className="mr-3 text-emerald-500" size={18} /> Downloads
           </button>

           <div className="text-xs font-semibold text-slate-500 uppercase px-4 mt-6 mb-2">Tools</div>
           <button onClick={() => { setShowStorage(true); setSidebarOpen(false); }} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all ${showStorage ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <ChartIcon className="mr-3" size={18} /> Storage Analysis
           </button>
           <button className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-800 transition-all">
              <Shield className="mr-3" size={18} /> Secure Vault
           </button>
           <button onClick={() => { handleNavigate('trash'); setSidebarOpen(false); }} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all ${isTrashView ? 'bg-red-500/10 text-red-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Trash2 className="mr-3" size={18} /> Recycle Bin
           </button>
        </div>

        {/* Storage Widget */}
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900">
           <div className="flex justify-between text-xs mb-2 text-slate-400">
             <span>Storage Used</span>
             <span className="text-white">{Math.round((storageStats.used / storageStats.total) * 100)}%</span>
           </div>
           <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
             <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full" style={{ width: `${(storageStats.used/storageStats.total)*100}%` }}></div>
           </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative" onContextMenu={(e) => e.preventDefault()}>
        
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-lg">
              <Menu size={20} />
            </button>
            <div className="flex-1 overflow-hidden">
              <Breadcrumbs 
                path={currentPath} 
                onNavigate={handleNavigate}
                onNavigateRoot={() => handleNavigate('root')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <button onClick={() => setShowHidden(!showHidden)} className={`p-2 rounded-lg transition-colors hidden sm:block ${showHidden ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:bg-slate-800'}`}>
               <Eye size={20} />
            </button>
            <div className="relative hidden sm:block">
               <input 
                 type="text" 
                 placeholder="Search" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="bg-slate-900 border border-slate-800 text-sm rounded-full pl-9 pr-4 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-40 lg:w-64 transition-all"
               />
               <Search className="absolute left-3 top-2 text-slate-500" size={14} />
            </div>
            <div className="h-6 w-px bg-slate-800 mx-1"></div>
            <button onClick={() => setViewMode(prev => prev === ViewMode.GRID ? ViewMode.LIST : ViewMode.GRID)} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg">
               {viewMode === ViewMode.GRID ? <List size={20} /> : <Grid size={20} />}
            </button>
          </div>
        </header>

        {/* Views */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-4 scroll-smooth">
           {showStorage ? (
             <div className="max-w-3xl mx-auto mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <button onClick={() => setShowStorage(false)} className="mb-4 text-blue-400 text-sm flex items-center hover:underline">
                 <ArrowLeft size={16} className="mr-1" /> Back to Files
               </button>
               <StorageChart used={storageStats.used} total={storageStats.total} />
             </div>
           ) : isTrashView ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-xl font-bold text-red-400 flex items-center"><Trash2 className="mr-2" /> Recycle Bin</h2>
                  <button onClick={handleEmptyTrash} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 text-sm font-medium">Empty Bin</button>
                </div>
                <FileList 
                  files={files} viewMode={viewMode} selectedIds={selectedIds} onSelect={handleSelect}
                  onOpen={() => {}} sortField={sortField} onContextMenu={handleContextMenu} onDropFile={() => {}}
                />
              </div>
           ) : (
             <FileList 
               files={files}
               viewMode={viewMode}
               selectedIds={selectedIds}
               onSelect={handleSelect}
               onOpen={handleOpen}
               sortField={sortField}
               onContextMenu={handleContextMenu}
               onDropFile={handleDropMove}
             />
           )}
        </div>

        {/* FAB (Paste or Add) */}
        {!isTrashView && !showStorage && (
          <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-30">
             {clipboard && (
               <button 
                 onClick={handlePaste}
                 className="flex items-center gap-2 px-5 py-3 bg-slate-800 border border-slate-700 text-slate-200 rounded-full shadow-xl hover:bg-slate-700 transition-all animate-in slide-in-from-right-10"
               >
                 <Clipboard size={18} />
                 <span>Paste {clipboard.sourceIds.length} items</span>
               </button>
             )}
             
             {selectedIds.size === 0 && (
               <button 
                 onClick={() => setModal({ type: 'CREATE_FOLDER' })}
                 className="w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
               >
                 <Plus size={28} />
               </button>
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
                 <button onClick={() => handleCopy(false)} className="p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-colors" title="Copy">
                   <Copy size={20} />
                 </button>
                 <button onClick={() => handleCopy(true)} className="p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-colors" title="Cut">
                   <Scissors size={20} />
                 </button>
                 {selectedIds.size === 1 && (
                    <button onClick={() => setModal({ type: 'RENAME', targetId: Array.from(selectedIds)[0] })} className="p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-colors" title="Rename">
                      <RefreshCw size={20} />
                    </button>
                 )}
               </>
             )}
             <button onClick={handleDelete} className="p-3 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors" title="Delete">
               <Trash2 size={20} />
             </button>
             <button onClick={() => setSelectedIds(new Set())} className="p-3 text-slate-400 hover:bg-slate-800 rounded-xl">
               <span className="text-xs font-bold uppercase">Cancel</span>
             </button>
          </div>
        )}

      </main>

      {/* Modals & Menus */}
      {previewState && (
        <FilePreview 
          file={previewState.file} 
          url={previewState.url} 
          content={previewState.content}
          onClose={() => setPreviewState(null)}
          onOpenExternal={() => {
            fileSystem.openFile(previewState.file);
            setPreviewState(null);
          }}
        />
      )}

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} y={contextMenu.y} 
          onClose={() => setContextMenu(null)}
          onAction={executeMenuAction}
          singleFile={selectedIds.size <= 1}
          isFolder={files.find(f => f.id === contextMenu.fileId)?.type === 'folder'}
        />
      )}

      <InputDialog 
        isOpen={modal.type === 'CREATE_FOLDER'} 
        title="New Folder" 
        placeholder="Folder Name"
        actionLabel="Create"
        onClose={() => setModal({ type: null })}
        onSubmit={handleCreateFolder}
      />

      <InputDialog 
        isOpen={modal.type === 'RENAME'} 
        title="Rename Item" 
        defaultValue={files.find(f => f.id === modal.targetId)?.name}
        actionLabel="Rename"
        onClose={() => setModal({ type: null })}
        onSubmit={handleRename}
      />

      <PropertiesDialog 
        isOpen={modal.type === 'PROPERTIES'}
        onClose={() => setModal({ type: null })}
        file={files.find(f => f.id === modal.targetId)}
      />

    </div>
  );
};

export default App;
