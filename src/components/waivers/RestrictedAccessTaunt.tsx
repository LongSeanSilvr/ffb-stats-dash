import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, ArrowLeft, EyeOff, Sparkles, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RestrictedAccessTaunt: React.FC = () => {
  const navigate = useNavigate();
  const { setIsUnlockModalOpen, handleLogoTap, tapCount } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-2xl bg-[#0e1117]/90 border border-rose-500/20 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-rose-950/30 overflow-hidden backdrop-blur-xl text-center">
        {/* Subtle glowing background aura */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Security Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider mb-6">
          <ShieldAlert size={14} className="animate-pulse" />
          <span>Restricted Clearance Level 5</span>
        </div>

        {/* Big Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-b from-rose-500/20 to-rose-500/5 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6 shadow-lg shadow-rose-500/10 group cursor-pointer"
             onClick={handleLogoTap}
             title="Click to authenticate"
        >
          <Lock size={36} className="transition-transform group-hover:scale-110" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
        </div>

        {/* Main Taunt Headline */}
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
          Not For You.
        </h1>
        <p className="text-base font-semibold text-rose-300/90 mb-4">
          Proprietary Intelligence & Predictive Waiver Edge Models
        </p>

        {/* Taunt Narrative */}
        <p className="text-xs sm:text-sm text-muted max-w-lg mx-auto leading-relaxed mb-8">
          Nice try! You didn't really think the custom league scoring arbitrage, WOPR breakout radar, 
          and high-value touch projections would just be handed out for free to the competition, did you?
        </p>

        {/* Redacted Data Teasers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-muted mb-1">
              <span>Waiver Breakouts</span>
              <EyeOff size={12} className="text-rose-400" />
            </div>
            <div className="text-sm font-mono font-bold text-white/20 select-none blur-[4px]">
              Parker Washington (98.4%)
            </div>
            <div className="text-[10px] text-rose-400/80 font-mono mt-1 font-semibold">[CLASSIFIED]</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-muted mb-1">
              <span>Scoring Arbitrage</span>
              <EyeOff size={12} className="text-rose-400" />
            </div>
            <div className="text-sm font-mono font-bold text-white/20 select-none blur-[4px]">
              +74.5 Standard Delta
            </div>
            <div className="text-[10px] text-rose-400/80 font-mono mt-1 font-semibold">[TOP SECRET]</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-muted mb-1">
              <span>Trade Steal Targets</span>
              <EyeOff size={12} className="text-rose-400" />
            </div>
            <div className="text-sm font-mono font-bold text-white/20 select-none blur-[4px]">
              Tier 1 Alpha Assets
            </div>
            <div className="text-[10px] text-rose-400/80 font-mono mt-1 font-semibold">[RESTRICTED]</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Return to Public Stats</span>
          </button>

          <button
            onClick={() => setIsUnlockModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 border border-rose-500/30 text-xs font-bold text-rose-200 transition-all cursor-pointer"
          >
            <KeyRound size={14} className="text-rose-400" />
            <span>Commissioner Passcode</span>
          </button>
        </div>

        {/* Secret easter egg hint */}
        {tapCount > 0 && tapCount < 7 && (
          <div className="mt-4 text-[10px] font-mono text-cyan-400 animate-pulse">
            Security sensor: {tapCount}/7 taps detected...
          </div>
        )}
      </div>
    </div>
  );
};
