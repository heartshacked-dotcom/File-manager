import React, { useEffect, useState } from 'react';
import { FileNode } from '../types';
import { X, ExternalLink, FileText, Music, AlertCircle, FileQuestion } from 'lucide-react';

interface FilePreviewProps {
  file: FileNode;
  url?: string;
  content?: string;
  onClose: () => void;
  onOpenExternal: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, url, content, onClose, onOpenExternal }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [file]);

  const handleLoad = () => setLoading(false);
  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
           <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <AlertCircle size={40} className="text-red-400" />
           </div>
           <h3 className="text-lg font-medium text-slate-200 mb-2">Preview Failed</h3>
           <p className="mb-6 max-w-xs mx-auto text-slate-500">We couldn't load this file. It might be corrupted or in an unsupported format.</p>
           <button onClick={onOpenExternal} className="px-5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-medium hover:bg-slate-700 flex items-center gap-2 transition-colors">
             <ExternalLink size={18} /> Open Externally
           </button>
        </div>
      );
    }

    if (file.type === 'image' && url) {
       return (
         <img 
           src={url} 
           alt={file.name} 
           className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
           onLoad={handleLoad}
           onError={handleError}
         />
       );
    }

    if (file.type === 'video' && url) {
      return (
        <video 
          controls 
          autoPlay 
          src={url} 
          className="max-w-full max-h-[80vh] rounded-lg shadow-2xl bg-black"
          onLoadedData={handleLoad}
          onError={handleError}
        />
      );
    }

    if (file.type === 'audio' && url) {
       // Audio loads quickly, manually set loading false after mount effectively
       useEffect(() => setLoading(false), []);
       return (
         <div className="bg-slate-800 p-8 rounded-2xl flex flex-col items-center shadow-2xl border border-slate-700 w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="w-32 h-32 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/20 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]">
               <Music size={56} />
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-6 text-center break-all">{file.name}</h3>
            <audio controls src={url} className="w-full" autoPlay />
         </div>
       );
    }

    if ((file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.css') || file.name.endsWith('.xml') || file.type === 'document') && content !== undefined) {
       useEffect(() => setLoading(false), []);
       return (
         <div className="bg-slate-900 border border-slate-700 rounded-lg p-0 overflow-hidden w-full h-full max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
           <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center gap-2">
              <FileText size={16} className="text-blue-400" />
              <span className="text-sm font-mono text-slate-300">{file.name}</span>
           </div>
           <pre className="p-4 overflow-auto text-sm text-slate-300 font-mono h-full custom-scrollbar whitespace-pre-wrap leading-relaxed">
             {content}
           </pre>
         </div>
       );
    }

    // Fallback if type matched but no data, or unhandled type
    useEffect(() => setLoading(false), []);
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
         <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-lg border border-slate-700">
            <FileQuestion size={48} className="text-slate-500" />
         </div>
         <h3 className="text-xl font-medium text-slate-200 mb-2">No Preview Available</h3>
         <p className="mb-8 max-w-xs mx-auto text-slate-500">
           We can't show a preview for <strong>{file.name}</strong> inside Nova.
         </p>
         <button 
           onClick={onOpenExternal} 
           className="px-6 py-3 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-500 flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
         >
             <ExternalLink size={18} /> 
             <span>Open in Default App</span>
         </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 px-6 z-10 bg-gradient-to-b from-black/50 to-transparent">
         <div className="flex flex-col">
            <h2 className="text-slate-200 font-medium truncate max-w-[200px] sm:max-w-md">{file.name}</h2>
            <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
         </div>
         <div className="flex items-center gap-3">
           <button onClick={onOpenExternal} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Open in External App">
             <ExternalLink size={20} />
           </button>
           <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
             <X size={24} />
           </button>
         </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
         {loading && (
           <div className="absolute inset-0 flex items-center justify-center z-0">
             <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
           </div>
         )}
         <div className="relative z-10 w-full h-full flex items-center justify-center">
            {renderContent()}
         </div>
      </div>
    </div>
  );
};

export default FilePreview;