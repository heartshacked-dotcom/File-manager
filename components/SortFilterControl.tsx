import React from 'react';
import { SortField, SortDirection, DateFilter, FileType, SizeFilter } from '../types';
import { 
  ArrowDownAZ, ArrowUpAZ, Calendar, HardDrive, FileType as FileTypeIcon,
  Clock, CalendarDays, Filter, Weight
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
    <div className="bg-slate-900 border-b border-slate-800 animate-in slide-in-from-top-2 duration-200 shadow-xl z-20 sticky top-16">
      <div className="p-4 space-y-4">
        
        {/* Sort Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sort By</h3>
            <button onClick={toggleDirection} className="flex items-center gap-1 text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded hover:bg-blue-500/20 transition-colors">
              {sortDirection === SortDirection.ASC ? (
                <>Ascending <ArrowDownAZ size={14} /></>
              ) : (
                <>Descending <ArrowUpAZ size={14} /></>
              )}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: SortField.NAME, label: 'Name', icon: <ArrowDownAZ size={16} /> },
              { id: SortField.DATE, label: 'Date', icon: <Calendar size={16} /> },
              { id: SortField.SIZE, label: 'Size', icon: <HardDrive size={16} /> },
              { id: SortField.TYPE, label: 'Type', icon: <FileTypeIcon size={16} /> },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setSortField(opt.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  sortField === opt.id 
                    ? 'bg-slate-800 border-blue-500 text-blue-400' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Section */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
           <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter</h3>
           
           {/* File Type Filter */}
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
             {[
               { id: 'all', label: 'All' },
               { id: 'folder', label: 'Folders' },
               { id: 'image', label: 'Images' },
               { id: 'video', label: 'Videos' },
               { id: 'audio', label: 'Audio' },
               { id: 'document', label: 'Docs' },
               { id: 'archive', label: 'Archives' }
             ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFilterType(type.id as FileType | 'all')}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterType === type.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {type.label}
                </button>
             ))}
           </div>

           <div className="flex gap-4 mt-3">
               {/* Date Filter */}
               <div className="flex-1">
                   <div className="text-[10px] text-slate-600 font-bold uppercase mb-2 flex items-center gap-1"><Clock size={10}/> Date</div>
                   <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'ALL', label: 'Any' },
                        { id: 'TODAY', label: 'Today' },
                        { id: 'WEEK', label: 'Week' },
                        { id: 'MONTH', label: 'Month' }
                      ].map(d => (
                        <button
                          key={d.id}
                          onClick={() => setFilterDate(d.id as DateFilter)}
                          className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium border transition-colors ${
                            filterDate === d.id
                              ? 'bg-slate-800 border-slate-600 text-slate-200'
                              : 'border-transparent text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                   </div>
               </div>

               {/* Size Filter */}
               <div className="flex-1 border-l border-slate-800 pl-4">
                   <div className="text-[10px] text-slate-600 font-bold uppercase mb-2 flex items-center gap-1"><Weight size={10}/> Size</div>
                   <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'ALL', label: 'Any' },
                        { id: 'SMALL', label: '< 1MB' },
                        { id: 'MEDIUM', label: '1-100MB' },
                        { id: 'LARGE', label: '> 100MB' }
                      ].map(s => (
                        <button
                          key={s.id}
                          onClick={() => setFilterSize(s.id as SizeFilter)}
                          className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium border transition-colors ${
                            filterSize === s.id
                              ? 'bg-slate-800 border-slate-600 text-slate-200'
                              : 'border-transparent text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                   </div>
               </div>
           </div>
        </div>

        <button onClick={onClose} className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest mt-2 border-t border-slate-800">
           Close Panel
        </button>

      </div>
    </div>
  );
};

export default SortFilterControl;