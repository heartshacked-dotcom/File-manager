
import React, { useEffect, useState } from 'react';
import { 
  X, Copy, Scissors, Trash2, Edit2, FileText, 
  Share2, FolderOpen, Archive, Lock, Unlock, 
  Shield, Star, Info, MoreHorizontal, FileInput, 
  RotateCcw, ExternalLink
} from 'lucide-react';
import { FileNode } from '../types';

interface FileActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  file?: FileNode;
  selectedCount: number;
  onAction: (action: string) => void;
  isTrash?: boolean;
  isBookmarked?: boolean;
}

const ActionItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void; 
  danger?: boolean; 
  disabled?: boolean 
}> = ({ icon, label, onClick, danger, disabled }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl active:scale-95 transition-all ${
      disabled ? 'opacity-30 grayscale pointer-events-none' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
    } ${danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-slate-600 dark:text-slate-300'}`}
  >
    <div className={`p-3 rounded-2xl ${
      danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-slate-100 dark:bg-slate-800'
    } mb-1 shadow-sm`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 24, strokeWidth: 1.5 })}
    </div>
    <span className="text-xs font-medium text-center leading-tight">{label}</span>
  </button>
);

const ListItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}> = ({ icon, label, onClick, danger, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-4 p-4 text-left active:bg-slate-100 dark:active:bg-slate-800 transition-colors rounded-xl ${
       disabled ? 'opacity-40 pointer-events-none' : ''
    } ${danger ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}
  >
    <div className={danger ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 22 })}
    </div>
    <span className="text-sm font-medium flex-1">{label}</span>
  </button>
);

const FileActionMenu: React.FC<FileActionMenuProps> = ({ 
  isOpen, onClose, file, selectedCount, onAction, isTrash, isBookmarked 
}) => {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      if (navigator.vibrate) navigator.vibrate(50);
    } else {
      setTimeout(() => setVisible(false), 300);
    }
  }, [isOpen]);

  if (!isOpen && !visible) return null;

  const isSingle = !!file && selectedCount <= 1;
  const isFolder = file?.type === 'folder';
  const title = isSingle ? file?.name : `${selectedCount} items selected`;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        className={`fixed inset-x-0 bottom-0 z-[61] bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl transform transition-transform duration-300 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col max-h-[85vh] ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
           <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{title}</h3>
              <p className="text-xs text-slate-500">
                {isSingle && !isFolder && file ? `${(file.size / 1024).toFixed(1)} KB • ${file.type}` : 
                 isSingle && isFolder ? 'Folder' : 'Multiple Actions'}
              </p>
           </div>
           {isSingle && (
              <button onClick={() => onAction('properties')} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full text-blue-600 dark:text-blue-400">
                 <Info size={20} />
              </button>
           )}
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-2 p-4 border-b border-slate-100 dark:border-slate-900">
           {isTrash ? (
             <>
               <ActionItem icon={<RotateCcw />} label="Restore" onClick={() => onAction('restore')} />
               <ActionItem icon={<Trash2 />} label="Delete" onClick={() => onAction('delete')} danger />
             </>
           ) : (
             <>
               <ActionItem icon={<Copy />} label="Copy" onClick={() => onAction('copy')} />
               <ActionItem icon={<Scissors />} label="Move" onClick={() => onAction('cut')} />
               <ActionItem icon={<Share2 />} label="Share" onClick={() => onAction('share')} disabled={selectedCount > 1 && isFolder} />
               <ActionItem icon={<Trash2 />} label="Delete" onClick={() => onAction('delete')} danger />
             </>
           )}
        </div>

        {/* Detailed Actions List */}
        <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
           {!isTrash && (
             <>
               {isSingle && (
                 <>
                   {isFolder && (
                     <ListItem icon={<FolderOpen />} label="Open" onClick={() => onAction('open')} />
                   )}
                   <ListItem icon={<Edit2 />} label="Rename" onClick={() => onAction('rename')} />
                   
                   <ListItem 
                     icon={<Star className={isBookmarked ? "fill-amber-400 text-amber-400" : ""} />} 
                     label={isBookmarked ? "Remove from Favorites" : "Add to Favorites"} 
                     onClick={() => onAction('bookmark')} 
                   />

                   {isFolder ? (
                     <ListItem 
                       icon={file?.isProtected ? <Unlock className="text-green-500"/> : <Lock className="text-amber-500"/>} 
                       label={file?.isProtected ? "Unlock Folder" : "Lock Folder (Protect)"} 
                       onClick={() => onAction('lock')} 
                     />
                   ) : (
                     <ListItem 
                        icon={file?.isEncrypted ? <Unlock className="text-green-500"/> : <Shield className="text-blue-500"/>}
                        label={file?.isEncrypted ? "Decrypt File" : "Encrypt File"}
                        onClick={() => onAction('encrypt')}
                     />
                   )}
                 </>
               )}
               
               <ListItem icon={<Archive />} label="Compress to Zip" onClick={() => onAction('compress')} />
               
               {isSingle && (file?.type === 'archive' || file?.name.endsWith('.zip')) && (
                 <ListItem icon={<ExternalLink />} label="Extract Here" onClick={() => onAction('extract')} />
               )}
             </>
           )}
           <div className="h-4"></div>
        </div>
      </div>
    </>
  );
};

export default FileActionMenu;