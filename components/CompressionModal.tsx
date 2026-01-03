
import React, { useState, useEffect } from 'react';
import { X, Folder, Archive, CheckCircle2, AlertCircle, FileArchive, ArrowRight } from 'lucide-react';
import { FileNode } from '../types';
import { fileSystem } from '../services/filesystem';
import FolderPicker from './FolderPicker';

interface CompressionModalProps {
  isOpen: boolean;
  mode: 'COMPRESS' | 'EXTRACT';
  files: FileNode[]; // For compress: selected files. For extract: the archive file (single item array).
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'CONFIG' | 'PROGRESS' | 'DONE' | 'ERROR';

const CompressionModal: React.FC<CompressionModalProps> = ({ isOpen, mode, files, onClose, onSuccess }) => {
  // State
  const [step, setStep] = useState<Step>('CONFIG');
  const [progress, setProgress] = useState(0);
  const [filename, setFilename] = useState('');
  const [destination, setDestination] = useState<{ id: string, name: string }>({ id: '', name: 'Current Folder' });
  const [showPicker, setShowPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initialization
  useEffect(() => {
    if (isOpen) {
      setStep('CONFIG');
      setProgress(0);
      setErrorMsg('');
      
      // Default Destination
      const parentId = files[0]?.parentId;
      setDestination({ id: parentId || 'root', name: 'Current Folder' });

      // Default Filename
      if (mode === 'COMPRESS') {
         if (files.length === 1) {
            const name = files[0].name.substring(0, files[0].name.lastIndexOf('.')) || files[0].name;
            setFilename(`${name}.zip`);
         } else {
            setFilename(`archive_${new Date().toISOString().slice(0,10)}.zip`);
         }
      } else {
         // Extract mode
         const name = files[0]?.name || 'archive.zip';
         setFilename(name);
      }
    }
  }, [isOpen, files, mode]);

  const handleStart = async () => {
    if (mode === 'COMPRESS' && !filename) return;
    
    setStep('PROGRESS');
    setProgress(0);

    try {
      if (mode === 'COMPRESS') {
         const ids = files.map(f => f.id);
         await fileSystem.compress(ids, destination.id, filename, (p) => setProgress(p));
      } else {
         const archiveId = files[0].id;
         await fileSystem.extract(archiveId, destination.id, (p) => setProgress(p));
      }
      setStep('DONE');
      setTimeout(() => {
         onSuccess();
         onClose();
      }, 1000); // Wait a bit to show 100%
    } catch (e: any) {
      setStep('ERROR');
      setErrorMsg(e.message || "Operation failed");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
               <Archive className="text-blue-500" size={20} />
               {mode === 'COMPRESS' ? 'Compress Files' : 'Extract Archive'}
            </h3>
            {step !== 'PROGRESS' && (
              <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X size={20} />
              </button>
            )}
          </div>

          <div className="p-6">
            
            {/* CONFIG STEP */}
            {step === 'CONFIG' && (
              <div className="space-y-6">
                 {/* Source Info */}
                 <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-300">
                       <FileArchive size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="text-xs text-slate-500 uppercase font-semibold">Source</div>
                       <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {mode === 'COMPRESS' ? `${files.length} items selected` : files[0]?.name}
                       </div>
                    </div>
                 </div>

                 {/* Name Input (Compress Only) */}
                 {mode === 'COMPRESS' && (
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Archive Name</label>
                      <input 
                        type="text" 
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                   </div>
                 )}

                 {/* Destination Selection */}
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Destination</label>
                    <button 
                      onClick={() => setShowPicker(true)}
                      className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                       <div className="flex items-center gap-2 overflow-hidden">
                          <Folder size={18} className="text-blue-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{destination.name}</span>
                       </div>
                       <span className="text-xs font-bold text-blue-500">Change</span>
                    </button>
                 </div>

                 {/* Action Button */}
                 <button 
                    onClick={handleStart}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                 >
                    {mode === 'COMPRESS' ? 'Create Archive' : 'Extract Here'} <ArrowRight size={18} />
                 </button>
              </div>
            )}

            {/* PROGRESS STEP */}
            {step === 'PROGRESS' && (
               <div className="py-8 text-center space-y-6">
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                     <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="8" />
                        <circle 
                          cx="50" cy="50" r="45" fill="none" stroke="currentColor" 
                          className="text-blue-500 transition-all duration-300 ease-out" 
                          strokeWidth="8" 
                          strokeDasharray="283" 
                          strokeDashoffset={283 - (283 * progress) / 100} 
                          strokeLinecap="round"
                        />
                     </svg>
                     <span className="text-xl font-bold text-slate-800 dark:text-slate-200">{Math.round(progress)}%</span>
                  </div>
                  <div>
                     <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        {mode === 'COMPRESS' ? 'Compressing...' : 'Extracting...'}
                     </h4>
                     <p className="text-sm text-slate-500">Please wait while we process your files</p>
                  </div>
               </div>
            )}

            {/* DONE STEP */}
            {step === 'DONE' && (
               <div className="py-8 text-center space-y-4">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-500 animate-in zoom-in">
                     <CheckCircle2 size={40} />
                  </div>
                  <div>
                     <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Success!</h4>
                     <p className="text-sm text-slate-500">Operation completed successfully</p>
                  </div>
               </div>
            )}

            {/* ERROR STEP */}
            {step === 'ERROR' && (
               <div className="py-6 text-center space-y-4">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-500">
                     <AlertCircle size={40} />
                  </div>
                  <div>
                     <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Error</h4>
                     <p className="text-sm text-slate-500 px-4">{errorMsg}</p>
                  </div>
                  <button onClick={() => setStep('CONFIG')} className="text-blue-500 font-bold text-sm">Try Again</button>
               </div>
            )}
          </div>
        </div>
      </div>

      <FolderPicker 
        isOpen={showPicker} 
        onClose={() => setShowPicker(false)}
        onSelect={(id, name) => {
           setDestination({ id, name: name === 'Root' ? 'Device Storage' : name });
           setShowPicker(false);
        }}
        title={mode === 'COMPRESS' ? "Save to..." : "Extract to..."}
      />
    </>
  );
};

export default CompressionModal;
