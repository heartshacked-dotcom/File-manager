
import React, { useState, useEffect } from 'react';
import { X, Lock, Unlock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

interface EncryptionDialogProps {
  isOpen: boolean;
  mode: 'ENCRYPT' | 'DECRYPT';
  fileName?: string;
  onClose: () => void;
  onSubmit: (password: string) => void;
}

const EncryptionDialog: React.FC<EncryptionDialogProps> = ({ isOpen, mode, fileName, onClose, onSubmit }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      setShowPassword(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (mode === 'ENCRYPT' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    onSubmit(password);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            {mode === 'ENCRYPT' ? <Lock size={18} className="text-blue-500"/> : <Unlock size={18} className="text-green-500"/>}
            {mode === 'ENCRYPT' ? 'Encrypt File' : 'Decrypt File'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-3">
             <ShieldCheck className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
             <div className="text-sm">
                <p className="text-blue-100 font-medium mb-0.5">AES-256 Encryption</p>
                <p className="text-blue-200/70 text-xs">
                   {mode === 'ENCRYPT' 
                      ? `Encrypting "${fileName}". Do not lose this password; data cannot be recovered without it.` 
                      : `Enter the password to decrypt "${fileName}".`}
                </p>
             </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Password</label>
              <input
                autoFocus
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-12"
                placeholder="Enter password"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {mode === 'ENCRYPT' && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Confirm Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Re-enter password"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-lg animate-in slide-in-from-top-1">
               <AlertCircle size={16} />
               {error}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-400 font-medium hover:bg-slate-800 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-[0.98] ${
               mode === 'ENCRYPT' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-green-600 hover:bg-green-500 shadow-green-600/20'
            }`}>
              {mode === 'ENCRYPT' ? 'Encrypt' : 'Decrypt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EncryptionDialog;
