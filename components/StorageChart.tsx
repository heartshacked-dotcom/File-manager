
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface StorageChartProps {
  used: number;
  total: number;
  breakdown?: { name: string; value: number; color: string }[];
}

const StorageChart: React.FC<StorageChartProps> = ({ used, total, breakdown = [] }) => {
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
  const data = breakdown;

  return (
    <div className="bg-slate-900 rounded-xl p-6 shadow-lg border border-slate-800">
      <h3 className="text-lg font-semibold text-slate-200 mb-2">Storage Analysis</h3>
      
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative w-48 h-48 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                 itemStyle={{ color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold text-slate-100">{percentage}%</span>
            <span className="text-xs text-slate-500 uppercase font-medium">Used</span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-4">
          <div className="flex justify-between items-end mb-1">
             <span className="text-slate-400 text-sm">Internal Storage</span>
             <span className="text-slate-200 font-mono text-sm">
                {(used / (1024*1024*1024)).toFixed(2)} GB / {(total / (1024*1024*1024)).toFixed(0)} GB
             </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-4">
            {data.map((item) => (
               <div key={item.name} className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                 <span className="text-slate-400 text-xs">{item.name}</span>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageChart;
