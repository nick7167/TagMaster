import React, { useState, useCallback, useRef, useEffect } from 'react';
import { STRATEGIES } from './constants';
import { Strategy, GenerationResult, UserProfile } from './types';
import { generateHashtags } from './services/geminiService';
import { StrategyCard } from './components/StrategyCard';
import { Spinner } from './components/Spinner';
import { ResultsView } from './components/ResultsView';
import { supabase } from './lib/supabase';
import { AuthModal } from './components/AuthModal';
import { PricingModal } from './components/PricingModal';

export default function App() {
  const [theme, setTheme] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(STRATEGIES[0]);
  
  // Application State
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Auth & Profile State
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  
  // UI State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);
  
  const resultsRef = useRef<HTMLDivElement>(null);

  // --- Robust Data Fetching ---

  const fetchProfile = useCallback(async (userId: string) => {
    setIsProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
      } else if (error && error.code === 'PGRST116') {
        // "Row not found" - Self Healing: Create profile if missing
        console.warn("Profile missing for user, creating default...");
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ id: userId, email: user?.email || 'user@tagmaster.ai', credits: 3 }])
          .select()
          .single();
        
        if (newProfile) setProfile(newProfile);
      }
    } catch (err) {
      console.error("Profile fetch failed", err);
    } finally {
      setIsProfileLoading(false);
    }
  }, [user?.email]);

  // --- Auth Lifecycle & Realtime Updates ---

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      // 1. Get Session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (mounted) {
        setUser(session?.user || null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
        setInitialAuthCheckDone(true);
      }
    };

    initializeAuth();

    // 2. Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        // Only fetch if we don't have it or ID changed
        if (!profile || profile.id !== currentUser.id) {
           await fetchProfile(currentUser.id);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // --- Realtime Database Subscription ---
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // --- Focus Refetching ---
  // If user tabs away and comes back, ensure data is fresh
  useEffect(() => {
    const onFocus = () => {
      if (user) fetchProfile(user.id);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, fetchProfile]);


  // --- Actions ---

  const handleSignOut = async () => {
    setProfile(null);
    setUser(null);
    setResult(null); 
    await supabase.auth.signOut();
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) return;

    // AUTH GATE
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    // FAIL-CLOSED CREDIT GATE
    // If profile is still loading, or if it failed to load, or if credits < 1 -> BLOCK
    if (isProfileLoading) return; // Just wait
    
    if (!profile || profile.credits < 1) {
      setIsPricingModalOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await generateHashtags(theme, selectedStrategy);
      
      // Optimistic UI update
      if (profile) {
        setProfile({ ...profile, credits: profile.credits - 1 });
      }
      
      // Deduct Credit in DB
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', user.id);
          
      if (creditError) {
        // Revert if DB fail
        console.error("Credit deduction failed", creditError);
        fetchProfile(user.id);
      }

      setResult(data);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      // Re-fetch profile just in case state got desynced on error
      if (user) fetchProfile(user.id);
    } finally {
      setIsLoading(false);
    }
  }, [theme, selectedStrategy, user, profile, isProfileLoading, fetchProfile]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden text-slate-100 selection:bg-purple-500/30">
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => user && fetchProfile(user.id)}
      />

      <PricingModal 
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        user={user}
        onSuccess={() => user && fetchProfile(user.id)}
      />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 px-4 md:px-6 py-4 flex justify-between items-center bg-slate-950/80 backdrop-blur-md border-b border-white/5 transition-all">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-500/20">#</div>
          <span className="font-bold text-xl tracking-tight text-white/90">TagMaster</span>
        </div>

        {/* Auth Status */}
        <div className="flex items-center min-h-[32px]">
          {!initialAuthCheckDone ? (
            // Loading state for auth
            <div className="h-8 w-24 bg-slate-800/50 animate-pulse rounded-lg"></div>
          ) : user ? (
            <div className="flex items-center gap-3 md:gap-6 animate-fade-in-up">
              {/* Credit Counter */}
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-slate-400">Credits</span>
                <div className="flex items-center gap-1.5 h-5">
                  {isProfileLoading && !profile ? (
                     <div className="h-4 w-8 bg-slate-800 animate-pulse rounded"></div>
                  ) : (
                    <>
                      <span className={`text-sm font-bold ${profile && profile.credits > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {profile ? profile.credits : 0}
                      </span>
                      <button 
                        onClick={() => setIsPricingModalOpen(true)}
                        className="text-[10px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 rounded transition-colors"
                      >
                        + BUY
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Mobile Credit Display */}
              <button 
                 onClick={() => setIsPricingModalOpen(true)}
                 className="md:hidden flex items-center gap-1 bg-slate-800/50 px-2 py-1 rounded-lg border border-white/10"
              >
                 <span className={`text-xs font-bold ${profile && profile.credits > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {profile ? profile.credits : 0}
                 </span>
                 <span className="text-[10px] text-slate-400">cr</span>
              </button>

              <div className="h-8 w-px bg-white/10 mx-1 hidden md:block"></div>

              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-slate-400">Account</span>
                <span className="text-xs font-medium text-white max-w-[100px] truncate">{user.email}</span>
              </div>
              
              <button 
                onClick={handleSignOut}
                className="p-2 md:px-3 md:py-1.5 rounded-lg text-xs font-medium text-slate-300 border border-white/10 hover:bg-slate-800 transition-colors"
                title="Sign Out"
              >
                <span className="hidden md:inline">Sign Out</span>
                <svg className="w-5 h-5 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 rounded-lg text-xs md:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all border border-white/5 animate-fade-in-up"
            >
              Login / Sign Up
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-28 md:pt-40 pb-20 w-full">
        
        {/* Hero & Input Section */}
        <div className={`transition-all duration-700 ease-out w-full ${result ? 'mb-16' : 'min-h-[70vh] flex flex-col justify-center mb-0'}`}>
          
          {/* Central Search Area */}
          <div className="w-full max-w-3xl mx-auto text-center space-y-8 mb-12 md:mb-16">
            <div className="space-y-4 md:space-y-6">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight break-words">
                Hashtags that <br />
                <span className="insta-gradient-text">actually work.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto font-light leading-relaxed px-4">
                AI-powered strategy for Instagram growth. <br className="hidden md:block"/>Validated by Google Search.
              </p>
            </div>

            {/* Search Box */}
            <form onSubmit={handleSubmit} className="relative group z-20 mx-2 md:mx-0 max-w-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative flex items-center bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 md:p-2 transition-all ring-1 ring-white/5 focus-within:ring-purple-500/50 shadow-2xl">
                <div className="pl-3 md:pl-5 text-slate-500 hidden sm:block">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Describe your post..."
                  className="w-full bg-transparent border-none px-3 md:px-5 py-3 md:py-5 text-base md:text-xl text-white placeholder-slate-500 focus:outline-none focus:ring-0 min-w-0"
                />
                <button
                  type="submit"
                  disabled={isLoading || !theme || (user && isProfileLoading)}
                  className={`mr-0 md:mr-1 px-5 py-3 md:px-8 md:py-4 rounded-xl font-bold text-xs md:text-sm tracking-wide transition-all duration-300 flex-shrink-0 ${
                    isLoading || !theme || (user && isProfileLoading)
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-white text-black hover:bg-slate-200 hover:scale-105 shadow-lg shadow-white/5'
                  }`}
                >
                   {isLoading 
                      ? <Spinner /> 
                      : !user 
                        ? 'LOGIN TO GENERATE' 
                        : isProfileLoading 
                          ? 'CHECKING...' 
                          : 'GENERATE (1 CR)'
                   }
                </button>
              </div>
            </form>
          </div>

          {/* Strategy Grid */}
          <div className="w-full space-y-6">
            <div className="flex items-center justify-between px-1 border-b border-white/5 pb-4 max-w-7xl mx-auto">
                <span className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Select Strategy
                </span>
                <span className="text-xs md:text-sm text-purple-400 font-medium bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                  {selectedStrategy.name}
                </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {STRATEGIES.map((strategy) => (
                <div key={strategy.id} className="h-full min-w-0">
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
        <div ref={resultsRef} className="w-full">
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