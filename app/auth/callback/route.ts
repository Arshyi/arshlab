import { NextResponse, type NextRequest } from "next/server"
import { getServerAppUrl } from "@/lib/auth/app-url"
import { createClient } from "@/lib/supabase/server"

function accountRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/account", getServerAppUrl(request.headers))
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return NextResponse.redirect(url)
}

function classifyCallbackError(error: string | null, description: string | null): string {
  const text = `${error ?? ""} ${description ?? ""}`.toLowerCase()
  if (text.includes("expired") || text.includes("invalid") || text.includes("otp")) return "expired-link"
  return "callback-error"
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const error = url.searchParams.get("error")
  const errorDescription = url.searchParams.get("error_description") ?? url.searchParams.get("error_code")

  if (error || errorDescription) {
    return accountRedirect(request, {
      auth_error: classifyCallbackError(error, errorDescription),
    })
  }

  const code = url.searchParams.get("code")
  if (!code) {
    return accountRedirect(request, { auth_error: "wrong-redirect" })
  }

  const supabase = await createClient()
  if (!supabase) {
    return accountRedirect(request, { auth_error: "not-configured" })
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return accountRedirect(request, {
      auth_error: classifyCallbackError("exchange", exchangeError.message),
    })
  }

  return accountRedirect(request, { auth: "confirmed" })
}
