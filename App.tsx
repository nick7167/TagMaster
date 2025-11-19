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
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Auth & Profile State
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Loading States
  const [isBooting, setIsBooting] = useState(true); // Initial page load
  const [isProfileLoading, setIsProfileLoading] = useState(false); // Re-fetching profile
  
  // UI State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  
  const resultsRef = useRef<HTMLDivElement>(null);

  // --- Robust Profile Fetching ---

  const getProfile = useCallback(async (userId: string, email?: string, isBackground = false) => {
    try {
      if (!isBackground) setIsProfileLoading(true);
      
      // 1. Try to get the profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
        return;
      }

      // 2. If Error is "Row not found" (PGRST116), Create it immediately
      if (error && error.code === 'PGRST116') {
        console.warn("Profile missing. Attempting self-heal creation...");
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: userId, 
            email: email || 'user@tagmaster.ai', 
            credits: 1 // Set starting credits to 1 for new users
          }])
          .select()
          .single();

        if (newProfile) {
          setProfile(newProfile);
        } else {
          console.error("Self-heal failed:", createError);
        }
      }
    } catch (err) {
      console.error("Unexpected error in getProfile:", err);
    } finally {
      if (!isBackground) setIsProfileLoading(false);
    }
  }, []);

  // --- Initial Boot Logic ---

  useEffect(() => {
    const bootApp = async () => {
      setIsBooting(true);
      try {
        // 1. CRITICAL FIX: Use getUser() instead of getSession()
        const { data: { user: validUser }, error: userError } = await supabase.auth.getUser();

        if (validUser) {
          setUser(validUser);
          await getProfile(validUser.id, validUser.email);
        } else {
          if (userError) console.warn("Session invalid, logging out:", userError.message);
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Boot failed:", err);
      } finally {
        setIsBooting(false);
      }
    };

    bootApp();

    // 2. Set up Realtime Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        getProfile(session.user.id, session.user.email);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setResult(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [getProfile]);

  // --- Handle Payment Success Return ---
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('payment_success')) {
      setShowPaymentSuccess(true);
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Force refresh profile to see new credits
      if (user) {
        getProfile(user.id, user.email, true);
      }
      
      // Hide toast after 5 seconds
      setTimeout(() => setShowPaymentSuccess(false), 5000);
    }
  }, [user, getProfile]);

  // --- Smart Revalidation on Window Focus ---
  useEffect(() => {
    const handleFocus = async () => {
      if (user) {
        const { data: { user: validUser } } = await supabase.auth.getUser();
        if (validUser) {
            getProfile(validUser.id, validUser.email, true);
        } else {
            handleSignOut(); 
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, getProfile]);

  // --- Realtime Database Subscription (Credits) ---
  useEffect(() => {
    if (!user) return;

    const channelKey = `user-credits-${user.id}-${Date.now()}`;

    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new as UserProfile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // --- Actions ---

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Supabase signout error:", err);
    } finally {
      localStorage.clear(); 
      sessionStorage.clear();
      window.location.href = '/'; // Force reload
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) return;

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (isProfileLoading) return;

    if (!profile || profile.credits < 1) {
      setIsPricingModalOpen(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const data = await generateHashtags(theme, selectedStrategy);
      
      if (profile) {
        setProfile(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);
      }
      
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ credits: (profile.credits - 1) })
        .eq('id', user.id);
          
      if (dbError) {
        console.error("DB deduction failed:", dbError);
        getProfile(user.id, user.email);
      } else {
        getProfile(user.id, user.email, true);
      }

      setResult(data);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      getProfile(user.id, user.email);
    } finally {
      setIsGenerating(false);
    }
  }, [theme, selectedStrategy, user, profile, isProfileLoading, getProfile]);

  if (isBooting) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden text-slate-100 selection:bg-purple-500/30">
      
      {/* Success Toast */}
      {showPaymentSuccess && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] animate-fade-in-up">
          <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-100 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <div className="bg-emerald-500 rounded-full p-1">
              <svg className="w-4 h-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-medium">Payment Successful! Credits Added.</span>
          </div>
        </div>
      )}

      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-lg font-bold text-white">#</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
              TagMaster AI
            </span>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {!user ? (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
            ) : (
              <>
                <div 
                  onClick={() => setIsPricingModalOpen(true)}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-purple-500/30 cursor-pointer transition-all"
                >
                   <span className="text-xs font-medium text-slate-400 group-hover:text-purple-300">Credits:</span>
                   <span className={`text-sm font-bold ${
                     profile?.credits && profile.credits > 0 ? 'text-emerald-400' : 'text-red-400'
                   }`}>
                     {profile?.credits ?? '-'}
                   </span>
                   <div className="w-5 h-5 rounded-full bg-purple-500/10 flex items-center justify-center ml-1 group-hover:bg-purple-500 group-hover:text-white transition-all">
                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                   </div>
                </div>
                
                <button 
                  onClick={handleSignOut}
                  className="text-sm text-slate-500 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Go Viral with <br className="hidden md:block"/>
            <span className="insta-gradient-text">Strategic Hashtags</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Stop guessing. Use AI strategies like the "Pillar Method" to find high-performing tags validated by Google Search.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 mb-12">
          {/* Strategy Selection */}
          <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STRATEGIES.map((strategy, idx) => (
              <div key={strategy.id} style={{ animationDelay: `${idx * 100}ms` }} className="animate-fade-in-up">
                <StrategyCard
                  strategy={strategy}
                  isSelected={selectedStrategy.id === strategy.id}
                  onSelect={setSelectedStrategy}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Input Section */}
        <div className="max-w-3xl mx-auto mb-16 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
            <div className="relative flex items-center bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl">
              <div className="pl-4 text-slate-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Describe your photo or topic (e.g., 'Sunset yoga in Bali')"
                className="w-full bg-transparent border-none text-lg text-white placeholder-slate-500 focus:ring-0 px-4 py-4"
                disabled={isGenerating}
              />
              <button
                type="submit"
                disabled={isGenerating || !theme.trim()}
                className={`mr-1 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 flex items-center gap-2 ${
                  isGenerating 
                    ? 'bg-slate-800 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-purple-500/25 hover:scale-105'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <span>Generate</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
          
          {!user && (
            <p className="text-center mt-4 text-sm text-slate-500">
              Please <button onClick={() => setIsAuthModalOpen(true)} className="text-purple-400 hover:underline">sign in</button> to start generating.
            </p>
          )}
          
          {user && profile && profile.credits < 1 && (
             <p className="text-center mt-4 text-sm text-red-400 bg-red-500/10 py-2 rounded-lg border border-red-500/20 animate-pulse cursor-pointer" onClick={() => setIsPricingModalOpen(true)}>
              You have 0 credits. Click here to top up.
            </p>
          )}
        </div>

        {/* Results Section */}
        <div ref={resultsRef}>
           {error && (
            <div className="max-w-3xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-center animate-fade-in-up">
              {error}
            </div>
          )}

          {result && (
            <ResultsView result={result} />
          )}
        </div>
      </main>

      <footer className="border-t border-white/5 bg-slate-950 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} TagMaster AI. Powered by Google Gemini & Search.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          // Wait a tick for session to propagate
          setTimeout(async () => {
             const { data: { user: u } } = await supabase.auth.getUser();
             if (u) {
               setUser(u);
               getProfile(u.id, u.email);
             }
          }, 500);
        }}
      />
      
      <PricingModal 
        isOpen={isPricingModalOpen} 
        onClose={() => setIsPricingModalOpen(false)}
        user={user}
        onSuccess={() => setIsPricingModalOpen(false)}
      />

    </div>
  );
}