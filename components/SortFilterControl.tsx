import React from 'react';
import { SortField, SortDirection, DateFilter, FileType, SizeFilter } from '../types';
import { 
  ArrowDownAZ, ArrowUpAZ, Calendar, HardDrive, FileType as FileTypeIcon,
  Clock, Weight
} from 'lucide-react';

interface SortFilterControlProps {
  sortField: SortField;
  setSortField: (field: SortField) => void;
  sortDirection: SortDirection;
  setSortDirection: (dir: SortDirection) => void;
  filterType: FileType | 'all';
  setFilterType: (type: FileType | 'all') => void;
  filterDate: DateFilter;
  setFilterDate: (date: DateFilter) => void;
  filterSize: SizeFilter;
  setFilterSize: (size: SizeFilter) => void;
  onClose: () => void;
}

const SortFilterControl: React.FC<SortFilterControlProps> = ({
  sortField, setSortField,
  sortDirection, setSortDirection,
  filterType, setFilterType,
  filterDate, setFilterDate,
  filterSize, setFilterSize,
  onClose
}) => {
  
  const toggleDirection = () => {
    setSortDirection(sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-30 animate-in slide-in-from-top-2">
      <div className="p-3 space-y-3">
        
        {/* Sort Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sort By</h3>
            <button onClick={toggleDirection} className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              {sortDirection === SortDirection.ASC ? (
                <>Asc <ArrowDownAZ size={12} /></>
              ) : (
                <>Desc <ArrowUpAZ size={12} /></>
              )}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: SortField.NAME, label: 'Name', icon: <ArrowDownAZ size={14} /> },
              { id: SortField.DATE, label: 'Date', icon: <Calendar size={14} /> },
              { id: SortField.SIZE, label: 'Size', icon: <HardDrive size={14} /> },
              { id: SortField.TYPE, label: 'Type', icon: <FileTypeIcon size={14} /> },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setSortField(opt.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  sortField === opt.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Section */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
           <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filter</h3>
           
           {/* File Type Filter */}
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
             {[
               { id: 'all', label: 'All' },
               { id: 'folder', label: 'Folders' },
               { id: 'image', label: 'Images' },
               { id: 'video', label: 'Videos' },
               { id: 'audio', label: 'Audio' },
               { id: 'document', label: 'Docs' },
               { id: 'archive', label: 'Zips' }
             ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFilterType(type.id as FileType | 'all')}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterType === type.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {type.label}
                </button>
             ))}
           </div>
        </div>

        <button onClick={onClose} className="w-full py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest mt-2">
           Close
        </button>

      </div>
    </div>
  );
};

export default SortFilterControl;
