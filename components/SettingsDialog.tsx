
import React, { useState, useEffect } from 'react';
import { 
  X, Moon, Sun, Monitor, Grid, List, 
  ArrowDownAZ, Eye, EyeOff, Shield, 
  Trash2, HardDrive, Smartphone, Lock
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ViewMode, SortField } from '../types';
import { PermissionStatus } from '../services/filesystem';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResetPin: () => void;
  permStatus: PermissionStatus;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ 
  isOpen, onClose, onResetPin, permStatus
}) => {
  const { theme, setTheme } = useTheme();
  
  // Local state for settings that map to localStorage
  const [defaultView, setDefaultView] = useState<ViewMode>(ViewMode.GRID);
  const [defaultSort, setDefaultSort] = useState<SortField>(SortField.NAME);
  const [showHidden, setShowHidden] = useState(false);
  const [cacheSize, setCacheSize] = useState('12.5 MB'); // Mock value

  // Load settings on open
  useEffect(() => {
    if (isOpen) {
      setDefaultView((localStorage.getItem('nova_default_view') as ViewMode) || ViewMode.GRID);
      setDefaultSort((localStorage.getItem('nova_default_sort') as SortField) || SortField.NAME);
      setShowHidden(localStorage.getItem('nova_show_hidden') === 'true');
    }
  }, [isOpen]);

  const handleSaveView = (mode: ViewMode) => {
    setDefaultView(mode);
    localStorage.setItem('nova_default_view', mode);
  };

  const handleSaveSort = (sort: SortField) => {
    setDefaultSort(sort);
    localStorage.setItem('nova_default_sort', sort);
  };

  const handleToggleHidden = (val: boolean) => {
    setShowHidden(val);
    localStorage.setItem('nova_show_hidden', String(val));
    // Trigger global event for components to update immediately if they are listening
    window.dispatchEvent(new Event('nova_settings_changed'));
  };

  const handleClearCache = () => {
    // Mock clearing
    setTimeout(() => setCacheSize('0 B'), 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-8">
            
            {/* Appearance */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Appearance</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'light', icon: Sun, label: 'Light' },
                  { id: 'dark', icon: Moon, label: 'Dark' },
                  // { id: 'system', icon: Monitor, label: 'System' } // Optional
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTheme(item.id as any)}
                    className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      theme === item.id 
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <item.icon size={24} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* File Browsing */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">File Browsing</h3>
              <div className="space-y-3">
                
                {/* Default View */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                   <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-slate-500 shadow-sm">
                         {defaultView === ViewMode.GRID ? <Grid size={20} /> : <List size={20} />}
                      </div>
                      <div>
                         <div className="font-medium text-slate-900 dark:text-slate-100">Default View</div>
                         <div className="text-xs text-slate-500">Preferred layout for new folders</div>
                      </div>
                   </div>
                   <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                      <button 
                        onClick={() => handleSaveView(ViewMode.GRID)}
                        className={`p-2 rounded-md transition-all ${defaultView === ViewMode.GRID ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
                      >
                        <Grid size={18} />
                      </button>
                      <button 
                        onClick={() => handleSaveView(ViewMode.LIST)}
                        className={`p-2 rounded-md transition-all ${defaultView === ViewMode.LIST ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
                      >
                        <List size={18} />
                      </button>
                   </div>
                </div>

                {/* Show Hidden */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                   <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-slate-500 shadow-sm">
                         {showHidden ? <Eye size={20} /> : <EyeOff size={20} />}
                      </div>
                      <div>
                         <div className="font-medium text-slate-900 dark:text-slate-100">Hidden Files</div>
                         <div className="text-xs text-slate-500">Show files starting with dot (.)</div>
                      </div>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={showHidden} 
                        onChange={(e) => handleToggleHidden(e.target.checked)} 
                     />
                     <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                   </label>
                </div>

                {/* Default Sort */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                   <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-slate-500 shadow-sm">
                         <ArrowDownAZ size={20} />
                      </div>
                      <div>
                         <div className="font-medium text-slate-900 dark:text-slate-100">Default Sort</div>
                         <div className="text-xs text-slate-500">Order by {defaultSort.toLowerCase()}</div>
                      </div>
                   </div>
                   <select 
                      value={defaultSort}
                      onChange={(e) => handleSaveSort(e.target.value as SortField)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                   >
                      <option value={SortField.NAME}>Name</option>
                      <option value={SortField.DATE}>Date</option>
                      <option value={SortField.SIZE}>Size</option>
                      <option value={SortField.TYPE}>Type</option>
                   </select>
                </div>

              </div>
            </section>

            {/* Security */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Security</h3>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl overflow-hidden">
                 <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                       <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-amber-500 shadow-sm">
                          <Lock size={20} />
                       </div>
                       <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">Vault Protection</div>
                          <div className="text-xs text-slate-500">PIN & Biometric security</div>
                       </div>
                    </div>
                    <button onClick={onResetPin} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                       Reset PIN
                    </button>
                 </div>
                 <div className="p-4 bg-amber-50 dark:bg-amber-900/10 flex gap-3">
                    <Shield size={18} className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                       Your secure vault is encrypted using AES-256. Losing your PIN means losing access to your vaulted files forever unless you have a backup.
                    </p>
                 </div>
              </div>
            </section>

            {/* Storage & Data */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Storage & Data</h3>
              <div className="space-y-3">
                 <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-slate-500 shadow-sm">
                          <HardDrive size={20} />
                       </div>
                       <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">Access Permissions</div>
                          <div className="text-xs text-slate-500">
                             Status: <span className={permStatus === PermissionStatus.GRANTED ? 'text-green-500 font-bold' : 'text-amber-500 font-bold'}>{permStatus}</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-slate-500 shadow-sm">
                          <Trash2 size={20} />
                       </div>
                       <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">Clear Cache</div>
                          <div className="text-xs text-slate-500">Temporary thumbnails ({cacheSize})</div>
                       </div>
                    </div>
                    <button onClick={handleClearCache} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                       Clear
                    </button>
                 </div>
              </div>
            </section>

            {/* Footer */}
            <div className="text-center pt-8 pb-4">
               <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30 mb-3">N</div>
               <h3 className="text-sm font-bold text-slate-900 dark:text-white">Nova Explorer</h3>
               <p className="text-xs text-slate-400 mt-1">Version 2.4.0 (Build 2024)</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
