import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lock, KeyRound, X, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SecretUnlockModal: React.FC = () => {
  const { isUnlockModalOpen, setIsUnlockModalOpen, unlockWithPasscode, isUnlocked } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isUnlockModalOpen) {
      setPasscode('');
      setError(false);
      setSuccess(false);
    }
  }, [isUnlockModalOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isUnlockModalOpen) {
        setIsUnlockModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUnlockModalOpen, setIsUnlockModalOpen]);

  if (!isUnlockModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    const ok = await unlockWithPasscode(passcode);
    if (ok) {
      setSuccess(true);
      setError(false);
      setTimeout(() => {
        setIsUnlockModalOpen(false);
      }, 700);
    } else {
      setError(true);
      setSuccess(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={() => setIsUnlockModalOpen(false)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#0e1117] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-950/50 z-10 animate-in zoom-in-95 duration-150">
        <button
          onClick={() => setIsUnlockModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            {isUnlocked ? <ShieldCheck size={24} /> : <KeyRound size={24} />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Commissioner Access Protocol
            </h3>
            <p className="text-xs text-muted">
              Enter the private master passphrase to unlock Player Evaluation.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              autoFocus
              placeholder="Enter commissioner passphrase..."
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(false);
              }}
              className={`w-full bg-white/[0.04] border ${
                error
                  ? 'border-rose-500 focus:border-rose-500 text-rose-200'
                  : success
                  ? 'border-emerald-500 text-emerald-300'
                  : 'border-white/10 focus:border-cyan-500/60 text-white'
              } rounded-xl px-4 py-3 text-sm placeholder-white/30 focus:outline-none transition-colors`}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 animate-in fade-in duration-150">
              <AlertTriangle size={14} className="shrink-0" />
              <span>Access Denied: Invalid passphrase. Nice try!</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 animate-in fade-in duration-150">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>Access Granted. Welcome back, Commissioner.</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsUnlockModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0b0e14] font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Lock size={14} />
              <span>Authenticate</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
