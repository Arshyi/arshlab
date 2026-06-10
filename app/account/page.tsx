import { AccountAuthClient, type AccountUser } from "./account-auth-client"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function toAccountUser(user: {
  id: string
  email?: string
  created_at?: string
} | null): AccountUser | null {
  if (!user) return null

  return {
    id: user.id,
    email: user.email ?? "No email available",
    createdAt: user.created_at ?? null,
  }
}

export default async function AccountPage() {
  const supabase = await createClient()

  if (!supabase) {
    return <AccountAuthClient initialUser={null} isConfigured={false} />
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <AccountAuthClient initialUser={toAccountUser(user)} isConfigured />
}
