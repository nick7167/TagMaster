import React, { useState, useCallback, useRef } from 'react';
import { STRATEGIES } from './constants';
import { Strategy, GenerationResult } from './types';
import { generateHashtags } from './services/geminiService';
import { StrategyCard } from './components/StrategyCard';
import { Spinner } from './components/Spinner';
import { ResultsView } from './components/ResultsView';

export default function App() {
  const [theme, setTheme] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(STRATEGIES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to scroll to results
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await generateHashtags(theme, selectedStrategy);
      setResult(data);
      // Small delay to ensure DOM is ready before scrolling
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [theme, selectedStrategy]);

  return (
    <div className="min-h-screen text-slate-100 selection:bg-purple-500/30">
      
      {/* Minimal Header */}
      <header className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-slate-950/50 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-500/20">#</div>
          <span className="font-bold text-xl tracking-tight text-white/90">TagMaster</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-32 md:pt-40 pb-20">
        
        {/* Hero & Input Section */}
        <div className={`transition-all duration-700 ease-out ${result ? 'mb-16' : 'min-h-[70vh] flex flex-col justify-center mb-0'}`}>
          
          {/* Central Search Area */}
          <div className="w-full max-w-3xl mx-auto text-center space-y-8 mb-16">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                Hashtags that <br />
                <span className="insta-gradient-text">actually work.</span>
              </h1>
              <p className="text-xl text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
                AI-powered strategy for Instagram growth. <br className="hidden md:block"/>Validated by Google Search.
              </p>
            </div>

            {/* Search Box */}
            <form onSubmit={handleSubmit} className="relative group z-20">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative flex items-center bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 transition-all ring-1 ring-white/5 focus-within:ring-purple-500/50 shadow-2xl">
                <div className="pl-5 text-slate-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Describe your post (e.g., 'Minimalist home office setup')"
                  className="w-full bg-transparent border-none px-5 py-5 text-lg md:text-xl text-white placeholder-slate-500 focus:outline-none focus:ring-0"
                />
                <button
                  type="submit"
                  disabled={isLoading || !theme}
                  className={`mr-1 px-8 py-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 ${
                    isLoading || !theme 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-white text-black hover:bg-slate-200 hover:scale-105 shadow-lg shadow-white/5'
                  }`}
                >
                  {isLoading ? <Spinner /> : 'GENERATE'}
                </button>
              </div>
            </form>
          </div>

          {/* Strategy Grid - Expanded Width */}
          <div className="w-full space-y-6">
            <div className="flex items-center justify-between px-1 border-b border-white/5 pb-4 max-w-7xl mx-auto">
                <span className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Select Strategy
                </span>
                <span className="text-sm text-purple-400 font-medium bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                  {selectedStrategy.name}
                </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {STRATEGIES.map((strategy) => (
                <div key={strategy.id} className="h-full">
                  <StrategyCard
                    strategy={strategy}
                    isSelected={selectedStrategy.id === strategy.id}
                    onSelect={setSelectedStrategy}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Results Section */}
        <div ref={resultsRef}>
          {error && (
            <div className="max-w-3xl mx-auto mb-12 animate-fade-in-up bg-red-500/10 border border-red-500/20 text-red-200 p-6 rounded-2xl flex items-center gap-4 shadow-xl">
               <div className="p-3 bg-red-500/20 rounded-full">
                 <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                 </svg>
               </div>
               <div className="flex-1">
                 <h3 className="font-bold text-red-100 mb-1">Generation Error</h3>
                 <p className="text-sm text-red-300/80">{error}</p>
               </div>
            </div>
          )}

          {result && <ResultsView result={result} />}
        </div>

      </main>
    </div>
  );
}