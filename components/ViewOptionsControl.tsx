
import React from 'react';
import { ViewMode } from '../types';
import { 
  Grid, List, AlignJustify, 
  Monitor, Smartphone, Maximize, 
  Check
} from 'lucide-react';

interface ViewOptionsControlProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onClose: () => void;
}

const ViewOptionsControl: React.FC<ViewOptionsControlProps> = ({
  viewMode, setViewMode, onClose
}) => {
  
  const groups = [
    {
      label: 'Grid View',
      icon: Grid,
      options: [
        { id: ViewMode.GRID_LARGE, label: 'Large' },
        { id: ViewMode.GRID_MEDIUM, label: 'Medium' },
        { id: ViewMode.GRID_SMALL, label: 'Small' },
      ]
    },
    {
      label: 'List View',
      icon: List,
      options: [
        { id: ViewMode.LIST_LARGE, label: 'Large' },
        { id: ViewMode.LIST_MEDIUM, label: 'Medium' },
        { id: ViewMode.LIST_SMALL, label: 'Small' },
      ]
    },
    {
      label: 'Details View',
      icon: AlignJustify,
      options: [
        { id: ViewMode.DETAIL_LARGE, label: 'Large' },
        { id: ViewMode.DETAIL_MEDIUM, label: 'Medium' },
        { id: ViewMode.DETAIL_SMALL, label: 'Small' },
      ]
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-40 animate-in zoom-in-95 origin-top-right overflow-hidden w-64">
      <div className="p-3 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
             <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                <group.icon size={12} /> {group.label}
             </div>
             <div className="space-y-1">
                {group.options.map(opt => (
                   <button
                     key={opt.id}
                     onClick={() => { setViewMode(opt.id); onClose(); }}
                     className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                       viewMode === opt.id 
                         ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                         : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                     }`}
                   >
                     <span>{opt.label}</span>
                     {viewMode === opt.id && <Check size={16} />}
                   </button>
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewOptionsControl;
