import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { GenerationResult, Strategy } from '../types';
import { STRATEGIES } from '../constants';
import { ChartViz } from './ChartViz';

interface ResultsViewProps {
  result: GenerationResult;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ result }) => {
  const [copiedTags, setCopiedTags] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const handleCopyTags = () => {
    const allTags = result.hashtags.join(' ');
    navigator.clipboard.writeText(allTags);
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(result.caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  // Find the strategy object used to display the chart
  const currentStrategy = STRATEGIES.find(s => s.id === result.strategyUsed) || STRATEGIES[0];

  return (
    <div className="animate-fade-in-up space-y-6 pb-20 w-full max-w-full">
      
      {/* Top Stats Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 max-w-full">
        <div className="flex items-center gap-3 px-2">
          <div className="flex items-center gap-2">
             <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-sm font-bold flex-shrink-0">
               {result.hashtags.length}
             </span>
             <span className="text-sm text-slate-400 font-medium whitespace-nowrap">Hashtags</span>
          </div>
          <div className="h-4 w-px bg-slate-800 mx-2 hidden sm:block"></div>
          <span className="text-xs font-medium px-2 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50 hidden sm:inline-block">
            {currentStrategy.name}
          </span>
        </div>

        <div className="flex gap-2 ml-auto sm:ml-0">
          <button
            onClick={handleCopyTags}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg whitespace-nowrap ${
              copiedTags 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-white text-black hover:bg-slate-200'
            }`}
          >
            {copiedTags ? "Copied!" : "Copy All"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 w-full">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          
          {/* Caption Card */}
          <div className="glass-panel p-5 md:p-6 rounded-2xl border-l-4 border-purple-500 relative overflow-hidden group max-w-full">
            {/* Visible on Mobile, Hover on Desktop */}
            <div className="absolute top-0 right-0 p-3 md:p-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10">
               <button 
                 onClick={handleCopyCaption}
                 className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors shadow-sm whitespace-nowrap"
               >
                 {copiedCaption ? 'Copied!' : 'Copy Caption'}
               </button>
            </div>
            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2 pt-1">
              <span className="text-lg">✨</span> Viral Caption
            </h3>
            <p className="text-base md:text-lg text-slate-200 leading-relaxed font-medium whitespace-pre-wrap break-words">
              {result.caption}
            </p>
          </div>

          {/* Hashtags Chips View */}
          <div className="glass-panel p-5 md:p-6 rounded-2xl border-t border-white/10 relative group max-w-full overflow-hidden">
             {/* Added Copy Button for Hashtags Section */}
             <div className="absolute top-0 right-0 p-3 md:p-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10">
               <button 
                 onClick={handleCopyTags}
                 className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors shadow-sm whitespace-nowrap"
               >
                 {copiedTags ? 'Copied!' : 'Copy Tags'}
               </button>
            </div>
             <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 pt-1">
              Ready to Post
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.hashtags.map((tag, idx) => (
                <div 
                  key={idx} 
                  className="group relative px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white text-sm rounded-lg border border-slate-700 hover:border-slate-600 transition-all cursor-pointer select-all"
                  onClick={() => navigator.clipboard.writeText(tag)}
                >
                  <span className="text-purple-500/70 group-hover:text-purple-400 mr-0.5">#</span>
                  {tag.replace('#', '')}
                </div>
              ))}
            </div>
          </div>

          {/* AI Breakdown */}
          <div className="glass-panel p-5 md:p-8 rounded-2xl max-w-full overflow-hidden">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
              Strategy Breakdown
            </h3>
            <div className="prose prose-invert prose-sm max-w-none prose-p:text-slate-400 prose-headings:text-slate-200 prose-li:text-slate-400 prose-strong:text-white break-words">
              <ReactMarkdown>{result.analysis || result.rawText}</ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Sidebar: Viz & Sources */}
        <div className="space-y-6 min-w-0">
          
          {/* Strategy Visualization */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center max-w-full">
            <h3 className="text-sm font-semibold text-white mb-1">Mix Analysis</h3>
            <p className="text-xs text-slate-500 mb-4">Distribution logic for {currentStrategy.name}</p>
            <div className="w-full flex justify-center">
               <ChartViz strategy={currentStrategy} />
            </div>
          </div>

          {/* Sources */}
          {result.sources.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl max-w-full">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                Trend Validation
              </h4>
              <div className="space-y-2">
                {result.sources.map((source, i) => (
                  <a 
                    key={i}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-3 bg-slate-900/50 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-slate-700 transition-all overflow-hidden"
                  >
                    <p className="text-xs font-medium text-slate-300 group-hover:text-purple-400 truncate transition-colors">
                      {source.title || "Web Source"}
                    </p>
                    <p className="text-[10px] text-slate-600 truncate mt-0.5">
                      {source.uri}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};