import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquarePlus, MessageCircle, ExternalLink, Copy, Check, Sparkles, Lightbulb, Heart } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Body scroll locking and Escape key dismiss
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  const handleCopyUsername = () => {
    navigator.clipboard.writeText('longseansilver');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-[#0f1115] border border-white/15 rounded-2xl shadow-2xl p-5 sm:p-6 my-auto overflow-hidden text-left max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
              <MessageSquarePlus size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Feedback & Feature Requests
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Have a new analytic idea, metric suggestion, or spotted a bug?
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ways to Connect */}
        <div className="space-y-3 mb-6 relative z-10">
          {/* 1. Sleeper / League Chat */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 transition-all group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    Sleeper DM or League Chat
                  </h4>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    Message in the main league group chat or send a direct message on Sleeper to <span className="font-mono text-cyan-300 font-semibold">longseansilver</span>.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopyUsername}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-white transition-all cursor-pointer shrink-0"
                title="Copy Sleeper username"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? 'Copied!' : 'Copy ID'}</span>
              </button>
            </div>
          </div>

          {/* 2. GitHub Issues */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                    GitHub Issues & Feature Board
                  </h4>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    File a bug ticket, propose a feature or statistical model, and track upcoming updates on the open repository.
                  </p>
                </div>
              </div>
              <a
                href="https://github.com/LongSeanSilvr/ffb-stats-dash/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-xs font-semibold text-purple-300 transition-all shrink-0"
              >
                <span>Open Issues</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>

        {/* Idea Categories / Guide */}
        <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs text-muted space-y-2 mb-5 relative z-10">
          <div className="font-semibold text-white/80 flex items-center gap-1.5">
            <Lightbulb size={14} className="text-amber-400" />
            <span>What kind of requests are welcome?</span>
          </div>
          <ul className="space-y-1.5 text-[11px] list-disc list-inside text-muted pl-0.5">
            <li><span className="text-white/90 font-medium">New Analysis Models:</span> Unique ways to measure draft success, trade timing, or roster luck.</li>
            <li><span className="text-white/90 font-medium">Custom Visualizations:</span> New charts, scatter matrices, or leaderboards.</li>
            <li><span className="text-white/90 font-medium">Bug Fixes:</span> Layout alignment, missing historical data, or calculation discrepancies.</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-muted relative z-10">
          <div className="flex items-center gap-1">
            <span>Built with</span>
            <Heart size={12} className="text-rose-400 fill-rose-400" />
            <span>for the league</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
