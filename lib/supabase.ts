import { createClient } from '@supabase/supabase-js';

// Provide fallback values to prevent "supabaseUrl is required" crash during initialization
// if environment variables are missing.
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn("Supabase keys are missing in environment variables. Authentication features will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);