import { createClient } from '@supabase/supabase-js';

/**
 * Single Supabase browser client for the whole app.
 *
 * Reads from Vite env vars (see `.env.local` / `.env.example`):
 *   VITE_SUPABASE_URL       — project API URL
 *   VITE_SUPABASE_ANON_KEY  — publishable / anon key (safe for the browser; RLS enforces access)
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loud in dev so a missing .env.local is obvious rather than a silent 401 later.
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
