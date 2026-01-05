
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, Filter, ArrowLeft, 
  Image, Video, Music, FileText, Archive, File
} from 'lucide-react';
import { FileNode } from '../types';
import { fileSystem, SearchOptions } from '../services/filesystem';
import { getFileIcon } from '../constants';

interface SearchScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (file: FileNode) => void;
  onReveal: (file: FileNode) => void;
}

const FilterChip: React.FC<{ 
  label: string; 
  icon?: React.ReactNode; 
  active: boolean; 
  onClick: () => void; 
}> = ({ label, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
      active 
        ? 'bg-blue-600 border-blue-600 text-white' 
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
    }`}
  >
    {icon} {label}
  </button>
);

const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? 
        <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-slate-900 dark:text-white rounded-sm px-0.5">{part}</span> : 
        part
      )}
    </span>
  );
};

const getResultStyle = (type: string) => {
  switch (type) {
    case 'image': return 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
    case 'video': return 'bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400';
    case 'audio': return 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
    case 'document': return 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400';
    case 'archive': return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
    case 'folder': return 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500';
    default: return 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  }
};

const SearchScreen: React.FC<SearchScreenProps> = ({ isOpen, onClose, onNavigate, onReveal }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FileNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<SearchOptions>({ query: '', type: 'all' });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fileSystem.search({ ...filters, query });
        setResults(res);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => {
      clearTimeout(timer);
      fileSystem.cancelSearch();
    };
  }, [query, filters]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-50 dark:bg-slate-950 flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200">
      
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
            placeholder="Search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
               <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar flex gap-2">
         <FilterChip active={filters.type === 'all'} label="All" onClick={() => setFilters(p => ({...p, type: 'all'}))} />
         <FilterChip active={filters.type === 'image'} label="Images" icon={<Image size={12}/>} onClick={() => setFilters(p => ({...p, type: 'image'}))} />
         <FilterChip active={filters.type === 'video'} label="Videos" icon={<Video size={12}/>} onClick={() => setFilters(p => ({...p, type: 'video'}))} />
         <FilterChip active={filters.type === 'audio'} label="Audio" icon={<Music size={12}/>} onClick={() => setFilters(p => ({...p, type: 'audio'}))} />
         <FilterChip active={filters.type === 'document'} label="Docs" icon={<FileText size={12}/>} onClick={() => setFilters(p => ({...p, type: 'document'}))} />
         <FilterChip active={filters.type === 'archive'} label="Archives" icon={<Archive size={12}/>} onClick={() => setFilters(p => ({...p, type: 'archive'}))} />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
         {query.trim() === '' ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <Search size={48} className="mb-4 opacity-20" />
               <p className="text-sm">Type to search for files</p>
            </div>
         ) : results.length === 0 && !isSearching ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <p className="text-sm">No matching files found</p>
            </div>
         ) : (
            <div className="flex flex-col gap-1">
               {results.map((file) => {
                 const Icon = getFileIcon(file.name, file.type);
                 const styleClass = getResultStyle(file.type);
                 
                 return (
                   <button 
                     key={file.id} 
                     onClick={() => onNavigate(file)}
                     className="flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all text-left group"
                   >
                      <div className={`p-2.5 rounded-lg ${styleClass}`}>
                         <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            <HighlightedText text={file.name} highlight={query} />
                         </h4>
                         <p className="text-xs text-slate-500 truncate mt-0.5">{file.id}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onReveal(file); }}
                        className="p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Reveal in folder"
                      >
                         <ArrowLeft size={16} className="rotate-180" />
                      </button>
                   </button>
                 );
               })}
            </div>
         )}
      </div>
      
      {/* Footer / Status */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex justify-between items-center bg-white dark:bg-slate-900">
         <span>{results.length} results</span>
         {isSearching && <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div> Searching...</span>}
      </div>
    </div>
  );
};

export default SearchScreen;
