import React from 'react';
import { Trophy, Flame, Swords, Table } from 'lucide-react';
import type { RecordBookTab } from '../../types/recordBook';

interface RecordBookNavProps {
  activeTab: RecordBookTab;
  onTabChange: (tab: RecordBookTab) => void;
}

const TABS: { id: RecordBookTab; label: string; icon: React.FC<{ size: number; className?: string }> }[] = [
  { id: 'rankings', label: 'Rankings & Titles', icon: Trophy },
  { id: 'scoring', label: 'Scoring Records', icon: Flame },
  { id: 'rivalries', label: 'Head-to-Head', icon: Swords },
  { id: 'ledger', label: 'All-Time Standings', icon: Table },
];

export const RecordBookNav: React.FC<RecordBookNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="w-full mb-8">
      <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 shrink-0 select-none min-h-[44px] cursor-pointer ${
                isActive
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                  : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-blue-400' : 'text-gray-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
