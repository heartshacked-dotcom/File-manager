import React, { useState, useEffect } from 'react';
import { FileNode } from '../types';
import { X, Folder, File as FileIcon, Shield, MapPin, Hash } from 'lucide-react';

interface DialogProps {
  onClose: () => void;
  isOpen: boolean;
  children: React.ReactNode;
  title: string;
}

const BaseDialog: React.FC<DialogProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 text-slate-400">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export const InputDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (val: string) => void;
  title: string;
  defaultValue?: string;
  placeholder?: string;
  actionLabel?: string;
}> = ({ isOpen, onClose, onSubmit, title, defaultValue = '', placeholder, actionLabel = 'Save' }) => {
  const [value, setValue] = useState(defaultValue);
  
  useEffect(() => {
    if(isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  return (
    <BaseDialog isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(value); }}>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
            {actionLabel}
          </button>
        </div>
      </form>
    </BaseDialog>
  );
};

export const PropertiesDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  file?: FileNode;
}> = ({ isOpen, onClose, file }) => {
  if (!file) return null;

  return (
    <BaseDialog isOpen={isOpen} onClose={onClose} title="Properties">
      <div className="space-y-4">
        <div className="flex items-center justify-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-500 shadow-lg">
            {file.type === 'folder' ? <Folder size={32} /> : <FileIcon size={32} />}
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-slate-800 pb-2">
             <span className="text-slate-500">Name</span>
             <span className="text-slate-200 font-medium truncate max-w-[200px]">{file.name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
             <span className="text-slate-500">Type</span>
             <span className="text-slate-200 capitalize">{file.type}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
             <span className="text-slate-500">Size</span>
             <span className="text-slate-200">
                {file.type === 'folder' ? '-' : (file.size / 1024).toFixed(2) + ' KB'}
                {file.type !== 'folder' && <span className="text-slate-500 ml-1">({file.size.toLocaleString()} bytes)</span>}
             </span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
             <span className="text-slate-500 flex items-center gap-2"><MapPin size={14}/> Location</span>
             <span className="text-slate-200 truncate max-w-[180px] font-mono text-xs">{file.parentId || 'Root'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
             <span className="text-slate-500">Modified</span>
             <span className="text-slate-200">{new Date(file.updatedAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
             <span className="text-slate-500 flex items-center gap-2"><Shield size={14}/> Permissions</span>
             <span className="text-slate-200 font-mono text-xs">rw-r--r--</span>
          </div>
           {file.type !== 'folder' && (
             <div className="flex justify-between border-b border-slate-800 pb-2">
               <span className="text-slate-500 flex items-center gap-2"><Hash size={14}/> MD5</span>
               <span className="text-slate-200 font-mono text-xs truncate max-w-[150px] opacity-50">7f8a9...b1c2</span>
             </div>
           )}
        </div>
        <div className="pt-2">
           <button onClick={onClose} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium">
             Close
           </button>
        </div>
      </div>
    </BaseDialog>
  );
};
