
import React, { useState } from 'react';
import { Shield, FolderOpen, AlertCircle, CheckCircle2, ChevronRight, Settings } from 'lucide-react';

interface PermissionScreenProps {
  onGrantFull: () => Promise<boolean>;
  onGrantScoped: () => Promise<boolean>;
  isChecking: boolean;
}

const PermissionScreen: React.FC<PermissionScreenProps> = ({ onGrantFull, onGrantScoped, isChecking }) => {
  const [error, setError] = useState<string | null>(null);

  const handleFullAccess = async () => {
    setError(null);
    try {
      const success = await onGrantFull();
      if (!success) setError("Permission was not granted in Settings. Please try again.");
    } catch (e) {
      setError("Failed to open settings.");
    }
  };

  const handleScopedAccess = async () => {
    setError(null);
    try {
      const success = await onGrantScoped();
      if (!success) setError("No folder selected.");
    } catch (e) {
      setError("Failed to launch folder picker.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      
      <div className="w-full max-w-md space-y-8">
        
        {/* Header Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse"></div>
          <div className="relative bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-full w-24 h-24 flex items-center justify-center shadow-2xl">
            {isChecking ? (
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Shield size={40} className="text-blue-600 dark:text-blue-500" />
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-2 rounded-full border-4 border-slate-50 dark:border-slate-950">
             <AlertCircle size={20} />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Storage Access Required</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            To function as a file manager, Nova requires access to your files. 
            Android 11+ restricts access by default. Please choose an access method below.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 justify-center animate-in slide-in-from-top-2">
             <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4 pt-4">
          
          {/* Option 1: Full Access */}
          <button 
            onClick={handleFullAccess}
            disabled={isChecking}
            className="group w-full relative overflow-hidden bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all rounded-xl p-4 text-left shadow-lg shadow-blue-500/20"
          >
            <div className="relative z-10 flex items-center gap-4">
              <div className="bg-white/20 p-2.5 rounded-lg">
                <Settings size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-white text-base">Grant All Files Access</div>
                <div className="text-blue-100 text-xs mt-0.5">Recommended for full functionality</div>
              </div>
              <ChevronRight className="text-white/70 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <div className="relative py-2">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
             <div className="relative flex justify-center"><span className="bg-slate-50 dark:bg-slate-950 px-2 text-xs text-slate-400 uppercase font-medium">Or</span></div>
          </div>

          {/* Option 2: Scoped Access (SAF) */}
          <button 
            onClick={handleScopedAccess}
            disabled={isChecking}
            className="group w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98] transition-all rounded-xl p-4 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-slate-600 dark:text-slate-400 group-hover:text-blue-500 transition-colors">
                <FolderOpen size={24} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900 dark:text-slate-200 text-base">Choose Specific Folder</div>
                <div className="text-slate-500 text-xs mt-0.5">Limit access to a single directory</div>
              </div>
              <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>
        
        <p className="text-xs text-slate-400 dark:text-slate-500 pt-8">
           Nova Explorer respects your privacy. No data leaves your device.
        </p>

      </div>
    </div>
  );
};

export default PermissionScreen;
