import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lock, FlaskConical, X, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const JERRY_INSULTS = [
  "Don't touch that, Jerry. It's beyond your tiny little monkey brain.",
  "Your boos mean nothing to me, Jerry. I've seen what makes you cheer.",
  "Nice try, Jerry. Go back to your Bee Joke app.",
  "I'd explain why that password is wrong, Jerry, but I don't have the crayons or the patience.",
  "Stop touching my stuff! Go eat apples or whatever it is you do.",
  "Error 403: Stop touching things you don't understand, Jerry."
];

export const SecretUnlockModal: React.FC = () => {
  const { isUnlockModalOpen, setIsUnlockModalOpen, unlockWithPasscode, isUnlocked } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isUnlockModalOpen) {
      setPasscode('');
      setError(false);
      setErrorMessage('');
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
      }, 800);
    } else {
      setError(true);
      setSuccess(false);
      const nextInsult = JERRY_INSULTS[Math.floor(Math.random() * JERRY_INSULTS.length)];
      setErrorMessage(nextInsult);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={() => setIsUnlockModalOpen(false)}
      />

      {/* Modal Card with Toxic Portal Green Aesthetics */}
      <div className="relative w-full max-w-md bg-[#0b0e14] border border-emerald-500/35 rounded-2xl p-6 shadow-2xl shadow-emerald-950/70 z-10 animate-in zoom-in-95 duration-150">
        <button
          onClick={() => setIsUnlockModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shadow-sm shadow-emerald-500/20">
            {isUnlocked ? <ShieldCheck size={24} /> : <FlaskConical size={24} className="animate-pulse" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Get out of my garage, Jerry.
            </h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              autoFocus
              placeholder="Enter passphrase"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(false);
              }}
              className={`w-full bg-white/[0.04] border ${
                error
                  ? 'border-rose-500/80 focus:border-rose-500 text-rose-200 bg-rose-950/10'
                  : success
                  ? 'border-emerald-500 text-emerald-300 bg-emerald-950/10'
                  : 'border-white/10 focus:border-emerald-500/60 text-white'
              } rounded-xl px-4 py-3 text-sm placeholder-white/30 focus:outline-none transition-colors shadow-inner`}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 animate-in fade-in duration-150 leading-relaxed">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 animate-in fade-in duration-150">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
              <span className="font-medium">Fine. You're in. Just don't touch my portal gun.</span>
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
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
