import React from 'react';
import { X, Eye, Shield, Lock } from 'lucide-react';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  showHidden: boolean;
  onToggleHidden: (val: boolean) => void;
  showProtected: boolean;
  onToggleProtected: (val: boolean) => void;
  onResetPin: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ 
  isOpen, onClose, 
  showHidden, onToggleHidden,
  showProtected, onToggleProtected,
  onResetPin
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100">Settings</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 text-slate-400">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><Eye size={20} /></div>
                <div>
                   <div className="text-sm font-medium text-slate-200">Show Hidden Files</div>
                   <div className="text-xs text-slate-500">Display files starting with .</div>
                </div>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
               <input type="checkbox" className="sr-only peer" checked={showHidden} onChange={(e) => onToggleHidden(e.target.checked)} />
               <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
             </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg text-amber-500"><Shield size={20} /></div>
                <div>
                   <div className="text-sm font-medium text-slate-200">Protected Folders</div>
                   <div className="text-xs text-slate-500">Show encrypted vaults</div>
                </div>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
               <input type="checkbox" className="sr-only peer" checked={showProtected} onChange={(e) => onToggleProtected(e.target.checked)} />
               <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
             </label>
          </div>

          <button onClick={onResetPin} className="w-full p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl flex items-center gap-3 transition-colors text-left">
             <div className="p-2 bg-slate-800 rounded-lg text-blue-400"><Lock size={20} /></div>
             <div>
                <div className="text-sm font-medium text-slate-200">Change Vault PIN</div>
                <div className="text-xs text-slate-500">Update security code</div>
             </div>
          </button>

        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
           <p className="text-xs text-center text-slate-500">Nova Explorer v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
