import { AccountAuthClient, type AccountUser } from "./account-auth-client"
import { authStatusMessage } from "./auth-status"
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

interface AccountPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const initialMessage = authStatusMessage(params)

  if (!supabase) {
    return <AccountAuthClient initialUser={null} isConfigured={false} initialMessage={initialMessage} />
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <AccountAuthClient initialUser={toAccountUser(user)} isConfigured initialMessage={initialMessage} />
}
