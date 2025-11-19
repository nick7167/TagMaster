import React, { useState } from 'react';
import { UserProfile } from '../types';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, user, onSuccess }) => {
  const [loading, setLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBuyCredits = async (priceId: string, planId: string) => {
    if (!user) return;
    setLoading(planId);
    
    try {
      // Call Vercel Serverless Function
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          userId: user.id,
          returnUrl: window.location.origin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate checkout');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }

    } catch (err: any) {
      console.error("Payment initiation failed:", err);
      alert("Could not start payment: " + (err.message || "Unknown error"));
      setLoading(null);
    }
  };

  // !!! IMPORTANT: REPLACE THESE 'price_...' STRINGS WITH YOUR ACTUAL IDs FROM STRIPE DASHBOARD !!!
  const plans = [
    { 
      id: 'starter', 
      stripePriceId: 'price_1SUz4nBDt2AVRrTBFELs3ghm', // TODO: Replace with "Starter" Price ID from Stripe
      credits: 10, 
      price: '$4.99', 
      name: 'Starter', 
      color: 'from-blue-400 to-cyan-300', 
      popular: false 
    },
    { 
      id: 'growth', 
      stripePriceId: 'price_1SUz5OBDt2AVRrTBcg858nNx', // TODO: Replace with "Growth" Price ID from Stripe
      credits: 50, 
      price: '$14.99', 
      name: 'Growth', 
      color: 'from-purple-400 to-pink-400', 
      popular: true 
    },
    { 
      id: 'agency', 
      stripePriceId: 'price_1SUz5jBDt2AVRrTBh5gpvo3W', // TODO: Replace with "Agency" Price ID from Stripe
      credits: 200, 
      price: '$39.99', 
      name: 'Agency', 
      color: 'from-amber-300 to-orange-400', 
      popular: false 
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] overflow-y-auto">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-full transition-colors"
        >
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Top Up Your Credits
          </h2>
          <p className="text-slate-400 text-lg">
            Invest in better reach. One credit equals one strategic generation.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`relative flex flex-col p-6 rounded-2xl border transition-all hover:-translate-y-2 duration-300 ${
                plan.popular 
                  ? 'bg-slate-800/50 border-purple-500/50 shadow-lg shadow-purple-500/10' 
                  : 'bg-slate-800/20 border-white/5 hover:bg-slate-800/40'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  MOST POPULAR
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-xl font-semibold text-slate-200">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-500">/ one time</span>
                </div>
              </div>

              <ul className="mb-8 space-y-3 flex-1">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center text-black font-bold text-[10px]`}>✓</div>
                  <strong className="text-white">{plan.credits} Credits</strong>
                </li>
                 <li className="flex items-center gap-3 text-slate-400 text-sm">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Lifetime access
                </li>
                <li className="flex items-center gap-3 text-slate-400 text-sm">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Google Search Validated
                </li>
              </ul>

              <button
                onClick={() => handleBuyCredits(plan.stripePriceId, plan.id)}
                disabled={!!loading}
                className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all ${
                  loading === plan.id
                    ? 'bg-slate-700 text-slate-400 cursor-wait'
                    : plan.popular
                      ? 'bg-white text-black hover:bg-slate-200 hover:shadow-lg hover:shadow-purple-500/20'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                }`}
              >
                {loading === plan.id ? 'Processing...' : 'Buy Now'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};