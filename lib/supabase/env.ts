export function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabasePublishableKey) return null

  return {
    supabaseUrl,
    supabasePublishableKey,
  }
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseEnv())
}
