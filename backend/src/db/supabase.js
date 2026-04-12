import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.SUPABASE_URL;
// Service-role key is required for storage admin operations (bypasses RLS).
// Anon key is used as a fallback – works only if bucket policies allow it.
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('[Supabase] SUPABASE_URL or key missing – storage features will be unavailable.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        // Prevent the client from trying to persist sessions on the server side
        persistSession: false,
        autoRefreshToken: false,
    },
});

export default supabase;
