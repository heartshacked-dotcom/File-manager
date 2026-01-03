import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { FileNode } from '../types';

interface BreadcrumbsProps {
  path: FileNode[];
  onNavigate: (id: string) => void;
  onNavigateRoot: () => void;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ path, onNavigate, onNavigateRoot }) => {
  return (
    <nav className="flex items-center text-sm text-slate-500 dark:text-slate-400 overflow-x-auto whitespace-nowrap no-scrollbar py-1 px-1">
      <button 
        onClick={onNavigateRoot}
        className="p-1 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors flex items-center"
      >
        <Home size={16} />
      </button>
      
      {path.map((node, index) => (
        <React.Fragment key={node.id}>
          <ChevronRight size={14} className="mx-1 text-slate-400 dark:text-slate-600 flex-shrink-0" />
          <button
            onClick={() => onNavigate(node.id)}
            className={`px-2 py-0.5 rounded transition-colors truncate max-w-[150px] ${
              index === path.length - 1 
                ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20' 
                : 'hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {node.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
