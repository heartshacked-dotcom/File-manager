import React, { useState, useEffect } from 'react';
import { X, Lock, ShieldCheck, KeyRound } from 'lucide-react';
import { SecurityService } from '../services/security';

interface AuthDialogProps {
  isOpen: boolean;
  mode: 'CREATE' | 'ENTER';
  onSuccess: (pin: string) => void;
  onClose: () => void;
  title?: string;
}

const AuthDialog: React.FC<AuthDialogProps> = ({ isOpen, mode, onSuccess, onClose, title }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    } else if (mode === 'CREATE' && confirmPin.length < 4) {
      setConfirmPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (mode === 'CREATE' && confirmPin.length > 0) {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleSubmit = async () => {
    if (mode === 'CREATE') {
       if (pin.length !== 4) { setError('PIN must be 4 digits'); return; }
       if (pin !== confirmPin) { setError('PINs do not match'); setConfirmPin(''); setPin(''); return; }
       onSuccess(pin);
    } else {
       if (pin.length !== 4) return;
       onSuccess(pin);
    }
  };

  const displayDots = (val: string) => {
    return (
      <div className="flex gap-4 justify-center my-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${i < val.length ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}></div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden p-6 flex flex-col items-center">
         <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-4">
            {mode === 'CREATE' ? <ShieldCheck size={32} /> : <Lock size={32} />}
         </div>
         
         <h3 className="text-xl font-bold text-white mb-1">{title || (mode === 'CREATE' ? 'Set Vault PIN' : 'Enter PIN')}</h3>
         <p className="text-slate-400 text-sm mb-2 text-center">
            {mode === 'CREATE' && pin.length === 4 ? "Confirm your PIN" : "Secure access to your files"}
         </p>
         
         {displayDots(mode === 'CREATE' && pin.length === 4 ? confirmPin : pin)}
         
         {error && <div className="text-red-400 text-sm font-medium mb-4 animate-in fade-in slide-in-from-top-1">{error}</div>}

         <div className="grid grid-cols-3 gap-3 w-full mb-6">
           {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
             <button 
               key={num} 
               onClick={() => handleDigit(num.toString())}
               className="h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 text-2xl font-medium text-white transition-colors"
             >
               {num}
             </button>
           ))}
           <div />
           <button 
             onClick={() => handleDigit('0')}
             className="h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 text-2xl font-medium text-white transition-colors"
           >
             0
           </button>
           <button 
             onClick={handleBackspace}
             className="h-16 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
           >
             <X size={24} />
           </button>
         </div>

         <div className="flex w-full gap-3">
            <button onClick={onClose} className="flex-1 py-3 text-slate-400 font-medium hover:text-white">Cancel</button>
            <button onClick={handleSubmit} className="flex-1 py-3 bg-blue-600 rounded-xl font-bold text-white hover:bg-blue-500 transition-colors">
               {mode === 'CREATE' ? 'Set PIN' : 'Unlock'}
            </button>
         </div>
      </div>
    </div>
  );
};

export default AuthDialog;
