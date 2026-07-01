import type { Metadata } from "next"
import { AccountAuthClient, type AccountUser } from "@/app/account/account-auth-client"
import { authStatusMessage } from "@/app/account/auth-status"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Sign Up | ARSHLAB",
  description: "Create an ARSHLAB account.",
}

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

interface SignUpPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const initialMessage = authStatusMessage(params)

  if (!supabase) {
    return (
      <AccountAuthClient
        initialUser={null}
        isConfigured={false}
        initialPanel="signup"
        initialMessage={initialMessage}
        title="Create an ARSHLAB account"
        subtitle="ARSHLAB account"
        description="Create a free ARSHLAB account for saved history and progress. This does not create Supabase dashboard or project access."
      />
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <AccountAuthClient
      initialUser={toAccountUser(user)}
      isConfigured
      initialPanel="signup"
      initialMessage={initialMessage}
      title="Create an ARSHLAB account"
      subtitle="ARSHLAB account"
      description="Create a free ARSHLAB account for saved history and progress. This does not create Supabase dashboard or project access."
    />
  )
}
