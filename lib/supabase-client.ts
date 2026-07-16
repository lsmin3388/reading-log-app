import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase connection.
 *
 * Values come from `NEXT_PUBLIC_*` env vars when present (recommended — set them
 * in `.env.local` or the Vercel dashboard). We also ship the project's
 * **publishable** key as a baked default so the deployed build works out of the
 * box without any env configuration. A publishable/anon key is designed to be
 * exposed in the client bundle — Row Level Security on the `books` table is what
 * actually protects the data — so committing it is safe.
 */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://kresglhdqefvprebmhsw.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_EsDfmPqbbrpEqu4UsvxeHA_kvCYSLZz'

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

let cached: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabaseConfig) return null
  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })
  }
  return cached
}
