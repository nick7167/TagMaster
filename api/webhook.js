import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// Vercel specific: Disable default body parser to read raw stream for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase with Service Role Key to bypass RLS (Row Level Security)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    
    // Robustly get credits from metadata, fallback to logic if missing
    let creditsToAdd = 10;
    if (session.metadata && session.metadata.credits) {
      creditsToAdd = parseInt(session.metadata.credits);
    } else {
      // Fallback logic based on amount if metadata fails
      const amount = session.amount_total;
      if (amount >= 3900) creditsToAdd = 200;
      else if (amount >= 1400) creditsToAdd = 50;
      else creditsToAdd = 10;
    }

    if (userId) {
      // 1. Get current profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        return res.status(500).json({ error: 'User profile not found' });
      }

      // 2. Add credits
      const newBalance = (profile?.credits || 0) + creditsToAdd;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newBalance })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        return res.status(500).json({ error: 'Failed to update credits in DB' });
      }
      
      console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`);
    }
  }

  res.status(200).json({ received: true });
}