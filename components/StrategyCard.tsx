import React from 'react';
import { Strategy } from '../types';

interface StrategyCardProps {
  strategy: Strategy;
  isSelected: boolean;
  onSelect: (strategy: Strategy) => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, isSelected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(strategy)}
      className={`group relative p-8 rounded-2xl text-left transition-all duration-300 border w-full h-full flex flex-col min-h-[240px] ${
        isSelected
          ? 'bg-slate-800/80 border-purple-500/50 shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)] translate-y-[-4px]'
          : 'bg-slate-900/40 border-white/5 hover:bg-slate-800/60 hover:border-white/10 hover:translate-y-[-4px] hover:shadow-xl'
      }`}
    >
      {/* Icon Section */}
      <div className="flex items-start justify-between mb-6">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl transition-all duration-300 ${
           isSelected ? 'bg-purple-500/20' : 'bg-slate-800 group-hover:bg-slate-700'
        }`}>
          <span className="filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
            {strategy.icon}
          </span>
        </div>
        
        {isSelected && (
          <div className="w-3 h-3 bg-purple-400 rounded-full shadow-[0_0_10px_rgba(192,132,252,0.8)] animate-pulse mt-1"></div>
        )}
      </div>
      
      {/* Content Section */}
      <div className="mt-auto">
        <h3 className={`text-lg font-bold mb-2 transition-colors tracking-tight ${
          isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
        }`}>
          {strategy.name}
        </h3>
        
        <p className={`text-sm leading-relaxed transition-colors ${
          isSelected ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-400'
        }`}>
          {strategy.description}
        </p>
      </div>
      
      {/* Selection Highlight overlay */}
      {isSelected && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none"></div>
      )}
    </button>
  );
};