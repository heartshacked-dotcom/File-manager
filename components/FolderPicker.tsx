
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Folder, Smartphone, HardDrive, ArrowLeft, Check } from 'lucide-react';
import { FileNode } from '../types';
import { fileSystem } from '../services/filesystem';

interface FolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pathId: string, pathName: string) => void;
  title?: string;
}

const FolderPicker: React.FC<FolderPickerProps> = ({ isOpen, onClose, onSelect, title = "Select Folder" }) => {
  const [currentPath, setCurrentPath] = useState<FileNode[]>([]);
  const [folders, setFolders] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize
  useEffect(() => {
    if (isOpen) {
       loadFolder('root');
       setCurrentPath([]);
    }
  }, [isOpen]);

  const loadFolder = async (id: string) => {
    setLoading(true);
    try {
      const allFiles = await fileSystem.readdir(id);
      // Filter only folders
      setFolders(allFiles.filter(f => f.type === 'folder' && !f.isTrash));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = async (node: FileNode) => {
    await loadFolder(node.id);
    setCurrentPath(prev => [...prev, node]);
  };

  const navigateUp = async () => {
    if (currentPath.length === 0) return;
    const newPath = currentPath.slice(0, -1);
    const parent = newPath.length > 0 ? newPath[newPath.length - 1] : undefined;
    await loadFolder(parent ? parent.id : 'root');
    setCurrentPath(newPath);
  };

  const handleSelect = () => {
     const current = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
     if (current) onSelect(current.id, current.name);
     else onSelect('root', 'Root');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
           <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
           <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500">
             <X size={20} />
           </button>
        </div>

        {/* Current Path & Back */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
           <button 
             onClick={navigateUp} 
             disabled={currentPath.length === 0}
             className="p-1.5 rounded-lg text-slate-500 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-800"
           >
              <ArrowLeft size={18} />
           </button>
           <div className="flex-1 overflow-x-auto no-scrollbar whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-medium">
              {currentPath.length === 0 ? 'Device Storage' : currentPath.map(n => n.name).join(' / ')}
           </div>
        </div>

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
           {loading ? (
             <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
           ) : (
             <div className="space-y-1">
                {folders.length === 0 && (
                   <div className="text-center py-10 text-slate-400 text-sm">No subfolders</div>
                )}
                {folders.map(folder => {
                   let Icon = Folder;
                   let color = 'text-blue-500';
                   if (folder.id === 'root_internal') { Icon = Smartphone; color = 'text-slate-500'; }
                   if (folder.id === 'root_sd') { Icon = HardDrive; color = 'text-purple-500'; }

                   return (
                     <button
                       key={folder.id}
                       onClick={() => navigateTo(folder)}
                       className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                     >
                        <Icon size={24} className={color} strokeWidth={1.5} />
                        <span className="flex-1 font-medium text-slate-700 dark:text-slate-300 truncate">{folder.name}</span>
                        <ChevronRight size={16} className="text-slate-300" />
                     </button>
                   );
                })}
             </div>
           )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
           <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-500 font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">Cancel</button>
           <button onClick={handleSelect} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 flex items-center gap-2">
              <Check size={18} />
              Select Here
           </button>
        </div>

      </div>
    </div>
  );
};

export default FolderPicker;
