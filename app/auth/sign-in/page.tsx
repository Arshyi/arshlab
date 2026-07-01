import type { Metadata } from "next"
import { AccountAuthClient, type AccountUser } from "@/app/account/account-auth-client"
import { authStatusMessage } from "@/app/account/auth-status"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Sign In | ARSHLAB",
  description: "Sign in to your ARSHLAB account.",
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

interface SignInPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const initialMessage = authStatusMessage(params)

  if (!supabase) {
    return (
      <AccountAuthClient
        initialUser={null}
        isConfigured={false}
        initialPanel="login"
        initialMessage={initialMessage}
        title="Sign in to ARSHLAB"
        subtitle="ARSHLAB account"
        description="Sign in with your ARSHLAB email and password. This is for ARSHLAB saved history and progress, not Supabase project access."
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
      initialPanel="login"
      initialMessage={initialMessage}
      title="Sign in to ARSHLAB"
      subtitle="ARSHLAB account"
      description="Sign in with your ARSHLAB email and password. This is for ARSHLAB saved history and progress, not Supabase project access."
    />
  )
}
