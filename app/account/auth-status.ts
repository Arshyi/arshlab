import type { AuthMessage } from "./account-auth-client"

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function authStatusMessage(searchParams?: Record<string, string | string[] | undefined>): AuthMessage | null {
  const auth = firstParam(searchParams?.auth)
  const error = firstParam(searchParams?.auth_error)

  if (auth === "confirmed") {
    return {
      kind: "success",
      title: "Email confirmed",
      body: "Your ARSHLAB account confirmation completed. You can now use account-backed features.",
    }
  }

  if (auth === "pending") {
    return {
      kind: "info",
      title: "Check your email to confirm your account.",
      body: "If email confirmation is enabled, use the ARSHLAB confirmation link in your inbox before signing in.",
    }
  }

  if (error === "expired-link") {
    return {
      kind: "error",
      title: "Confirmation link expired",
      body: "That auth link has expired or was already used. Sign up or sign in again from ARSHLAB to request a fresh link.",
    }
  }

  if (error === "wrong-redirect") {
    return {
      kind: "error",
      title: "Auth redirect could not be completed",
      body: "The callback did not include a valid session code. Check that your Supabase redirect URLs point back to ARSHLAB /auth/callback.",
    }
  }

  if (error === "not-configured") {
    return {
      kind: "error",
      title: "Authentication is not configured",
      body: "ARSHLAB is missing its public Supabase URL or publishable key for this environment.",
    }
  }

  if (error === "callback-error") {
    return {
      kind: "error",
      title: "Could not complete sign in",
      body: "ARSHLAB received the confirmation link, but Supabase could not create a session. Try again or request a new link.",
    }
  }

  return null
}
