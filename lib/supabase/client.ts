"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseEnv } from "./env"

export function createClient() {
  const env = getSupabaseEnv()

  if (!env) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    )
  }

  return createBrowserClient(env.supabaseUrl, env.supabasePublishableKey)
}
