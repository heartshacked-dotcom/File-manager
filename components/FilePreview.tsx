
import React, { useEffect, useState, useRef } from 'react';
import { FileNode } from '../types';
import { 
  X, ExternalLink, FileText, Music, AlertCircle, 
  FileQuestion, Maximize2, Minimize2, ZoomIn, ZoomOut, Play 
} from 'lucide-react';

interface FilePreviewProps {
  file: FileNode;
  url?: string;
  content?: string;
  onClose: () => void;
  onOpenExternal: () => void;
}

// --- Zoomable Image Component ---
const ZoomableImage: React.FC<{ src: string; alt: string; toggleOverlay: () => void }> = ({ src, alt, toggleOverlay }) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = -e.deltaY * 0.005;
    const newScale = Math.min(Math.max(1, scale + delta), 4);
    setScale(newScale);
    if (newScale === 1) setTranslate({ x: 0, y: 0 });
  };

  const handleDoubleTap = () => {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  // Drag Logic (Simplified for mouse/touch)
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const startDrag = (clientX: number, clientY: number) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({ x: clientX - translate.x, y: clientY - translate.y });
    }
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (isDragging && scale > 1) {
      const x = clientX - startPos.x;
      const y = clientY - startPos.y;
      setTranslate({ x, y });
    }
  };

  const endDrag = () => setIsDragging(false);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
      onWheel={handleWheel}
      onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
      onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={endDrag}
      onClick={toggleOverlay}
      onDoubleClick={handleDoubleTap}
    >
      <img 
        src={src} 
        alt={alt}
        className="max-w-full max-h-full transition-transform duration-100 ease-out select-none"
        style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})` }}
        draggable={false}
      />
    </div>
  );
};

// --- Code / Text Viewer ---
const CodeViewer: React.FC<{ content: string; name: string }> = ({ content, name }) => {
  const lines = content.split('\n');
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden w-full h-full flex flex-col shadow-2xl">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center gap-2 flex-shrink-0">
        <FileText size={16} className="text-blue-400" />
        <span className="text-sm font-mono text-slate-300">{name}</span>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar flex text-sm font-mono leading-6">
        <div className="bg-slate-950 text-slate-600 p-4 text-right select-none border-r border-slate-800 flex flex-col">
          {lines.map((_, i) => <span key={i}>{i + 1}</span>)}
        </div>
        <pre className="p-4 text-slate-300 whitespace-pre">
          {content}
        </pre>
      </div>
    </div>
  );
};

// --- PDF Viewer ---
const PdfViewer: React.FC<{ url: string; onError: () => void }> = ({ url, onError }) => {
  return (
    <div className="w-full h-full bg-slate-900 flex flex-col">
       <object data={url} type="application/pdf" className="w-full h-full rounded-lg" onError={onError}>
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
             <p className="mb-2">PDF preview not supported directly.</p>
             <button onClick={onError} className="text-blue-400 hover:underline">Open in external viewer</button>
          </div>
       </object>
    </div>
  );
};

// --- Main File Preview ---
const FilePreview: React.FC<FilePreviewProps> = ({ file, url, content, onClose, onOpenExternal }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showHeader, setShowHeader] = useState(true);

  // Auto-hide loading for text content or immediate errors
  useEffect(() => {
    if (content !== undefined) setLoading(false);
    else if (!url && !content) {
       // Only error if we expected url but didn't get one (unless it's a file type that loads later)
       if (['image', 'video', 'audio'].includes(file.type)) setLoading(true); // Wait for resource
    }
  }, [file, content, url]);

  const toggleHeader = () => setShowHeader(!showHeader);

  // Renderer Logic
  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
           <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <AlertCircle size={40} className="text-red-400" />
           </div>
           <h3 className="text-lg font-medium text-slate-200 mb-2">Preview Failed</h3>
           <p className="mb-6 max-w-xs mx-auto text-slate-500">Could not load <strong>{file.name}</strong>. The format might be unsupported.</p>
           <button onClick={onOpenExternal} className="px-5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-medium hover:bg-slate-700 flex items-center gap-2 transition-colors">
             <ExternalLink size={18} /> Open Externally
           </button>
        </div>
      );
    }

    if (file.type === 'image' && url) {
       return (
          <>
            <img src={url} className="hidden" onLoad={() => setLoading(false)} onError={() => setError(true)} alt="" />
            <ZoomableImage src={url} alt={file.name} toggleOverlay={toggleHeader} />
          </>
       );
    }

    if (file.type === 'video' && url) {
      return (
        <div className="w-full h-full flex items-center justify-center" onClick={(e) => { if(e.target === e.currentTarget) toggleHeader(); }}>
          <video 
            controls 
            autoPlay 
            src={url} 
            className="max-w-full max-h-full shadow-2xl bg-black"
            onLoadedData={() => setLoading(false)}
            onError={() => setError(true)}
          />
        </div>
      );
    }

    if (file.type === 'audio' && url) {
       useEffect(() => setLoading(false), []);
       return (
         <div className="w-full h-full flex items-center justify-center" onClick={toggleHeader}>
             <div className="bg-slate-800/90 backdrop-blur p-8 rounded-3xl flex flex-col items-center shadow-2xl border border-slate-700 w-full max-w-sm mx-4 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="w-40 h-40 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white mb-8 shadow-lg ring-4 ring-slate-800 relative overflow-hidden">
                   <div className="absolute inset-0 bg-black/10"></div>
                   <Music size={64} className="relative z-10" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2 text-center break-all leading-tight">{file.name}</h3>
                <p className="text-slate-400 text-sm mb-6">Audio File</p>
                <audio controls src={url} className="w-full" autoPlay />
             </div>
         </div>
       );
    }

    if (file.name.toLowerCase().endsWith('.pdf') && url) {
        return (
          <>
            <iframe src={url} className="hidden" onLoad={() => setLoading(false)} />
            <PdfViewer url={url} onError={() => setError(true)} />
          </>
        )
    }

    if (content !== undefined) {
       return (
         <div className="w-full h-full p-2 md:p-8 flex items-center justify-center" onClick={(e) => { if(e.target === e.currentTarget) toggleHeader(); }}>
            <CodeViewer content={content} name={file.name} />
         </div>
       );
    }

    // Fallback
    useEffect(() => setLoading(false), []);
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
         <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-lg border border-slate-700">
            <FileQuestion size={48} className="text-slate-500" />
         </div>
         <h3 className="text-xl font-medium text-slate-200 mb-2">No Preview Available</h3>
         <button 
           onClick={onOpenExternal} 
           className="px-6 py-3 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-500 flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 mt-4"
         >
             <ExternalLink size={18} /> 
             <span>Open in Default App</span>
         </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
      
      {/* Header Overlay */}
      <div className={`absolute top-0 left-0 right-0 z-20 transition-transform duration-300 bg-gradient-to-b from-black/80 to-transparent ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center justify-between p-4 pt-4">
           <div className="flex items-center gap-3 min-w-0">
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                 <X size={24} />
              </button>
              <div className="flex flex-col min-w-0">
                 <h2 className="text-slate-100 font-medium truncate text-sm sm:text-base">{file.name}</h2>
                 <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB • {file.type.toUpperCase()}</span>
              </div>
           </div>
           <button onClick={onOpenExternal} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md">
             <ExternalLink size={20} />
           </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative w-full h-full">
         {loading && (
           <div className="absolute inset-0 flex items-center justify-center z-50">
             <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
           </div>
         )}
         {renderContent()}
      </div>
    </div>
  );
};

export default FilePreview;
