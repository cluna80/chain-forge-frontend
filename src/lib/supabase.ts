import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Guard: if env vars are missing, export a null client so pages that don't
// need Supabase (Explorer, Machines, Jobs, etc.) still load fine.
export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.startsWith('"'))
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
