
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  ArrowLeft, ChevronRight, Folder, AlertCircle, File, 
  Smartphone, HardDrive, Image, Video, Music, FileText, Archive 
} from 'lucide-react';
import { fileSystem, StorageAnalysis } from '../services/filesystem';
import { FileNode } from '../types';
import Breadcrumbs from './Breadcrumbs';

interface StorageAnalyzerProps {
  onClose: () => void;
}

const COLORS = {
  image: '#f59e0b', // amber-500
  video: '#ef4444', // red-500
  audio: '#8b5cf6', // violet-500
  document: '#3b82f6', // blue-500
  archive: '#10b981', // emerald-500
  unknown: '#94a3b8', // slate-400
  folder: '#64748b'   // slate-500
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const StorageAnalyzer: React.FC<StorageAnalyzerProps> = ({ onClose }) => {
  const [currentPathId, setCurrentPathId] = useState('root_internal');
  const [pathNodes, setPathNodes] = useState<FileNode[]>([]);
  const [data, setData] = useState<StorageAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  // Load Analysis
  useEffect(() => {
    const analyze = async () => {
      setLoading(true);
      try {
        // Fetch breadcrumbs
        const path = await fileSystem.getPathNodes(currentPathId);
        setPathNodes(path);

        // Fetch analysis
        const result = await fileSystem.analyzeStorage(currentPathId);
        setData(result);
      } catch (e) {
        console.error("Analysis failed", e);
      } finally {
        setLoading(false);
      }
    };
    analyze();
  }, [currentPathId]);

  // Chart Data Preparation
  const chartData = data ? [
    { name: 'Images', value: data.typeBreakdown.image || 0, color: COLORS.image },
    { name: 'Videos', value: data.typeBreakdown.video || 0, color: COLORS.video },
    { name: 'Audio', value: data.typeBreakdown.audio || 0, color: COLORS.audio },
    { name: 'Docs', value: data.typeBreakdown.document || 0, color: COLORS.document },
    { name: 'Archives', value: data.typeBreakdown.archive || 0, color: COLORS.archive },
    { name: 'Other', value: data.typeBreakdown.unknown || 0, color: COLORS.unknown },
  ].filter(i => i.value > 0) : [];

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-bottom-full duration-300">
      
      {/* Header */}
      <div className="flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 p-3">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-lg text-slate-800 dark:text-white">Storage Analyzer</span>
        </div>
        <div className="px-2 pb-2">
           <Breadcrumbs path={pathNodes} onNavigate={setCurrentPathId} onNavigateRoot={() => setCurrentPathId('root_internal')} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        
        {loading ? (
           <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm">Analyzing storage structure...</p>
           </div>
        ) : !data ? (
           <div className="text-center text-slate-500 p-10">Analysis unavailable</div>
        ) : (
          <>
            {/* Overview Card */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8">
               <div className="relative w-48 h-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                         formatter={(value: number) => formatSize(value)}
                         contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatSize(data.totalSize)}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-medium">Total</span>
                  </div>
               </div>

               <div className="flex-1 w-full grid grid-cols-2 gap-3">
                  {chartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                       </div>
                       <span className="text-xs font-mono text-slate-500">{formatSize(item.value)}</span>
                    </div>
                  ))}
               </div>
            </div>

            {/* Folder Breakdown */}
            <div>
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Folder Usage</h3>
               <div className="space-y-2">
                  {data.folderBreakdown.length === 0 && (
                     <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 dark:bg-slate-900 rounded-xl border-dashed border border-slate-200 dark:border-slate-800">
                        No subfolders found
                     </div>
                  )}
                  {data.folderBreakdown.map((folder) => {
                     const percent = data.totalSize > 0 ? (folder.size / data.totalSize) * 100 : 0;
                     return (
                        <button 
                          key={folder.id}
                          onClick={() => setCurrentPathId(folder.id)}
                          className="w-full group bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 hover:shadow-md transition-all relative overflow-hidden text-left"
                        >
                           {/* Progress Bar Background */}
                           <div className="absolute left-0 top-0 bottom-0 bg-blue-50 dark:bg-blue-900/10 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                           
                           <div className="relative flex items-center justify-between z-10">
                              <div className="flex items-center gap-3">
                                 <Folder size={20} className="text-blue-500 fill-blue-500/20" />
                                 <span className="font-medium text-slate-700 dark:text-slate-200">{folder.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                 <span className="text-xs font-medium text-slate-500">{formatSize(folder.size)}</span>
                                 <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                              </div>
                           </div>
                        </button>
                     );
                  })}
               </div>
            </div>

            {/* Large Files */}
            <div>
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                  <AlertCircle size={14} /> Largest Files (Top 10)
               </h3>
               <div className="space-y-1">
                  {data.largeFiles.map((file) => (
                     <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                           {file.type === 'video' ? <Video size={18}/> : file.type === 'image' ? <Image size={18}/> : <File size={18}/>}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</div>
                           <div className="text-xs text-slate-400 truncate">{file.parentId}</div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                           {formatSize(file.size)}
                        </span>
                     </div>
                  ))}
                  {data.largeFiles.length === 0 && (
                     <div className="text-center py-4 text-slate-400 text-sm italic">No large files detected</div>
                  )}
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StorageAnalyzer;
