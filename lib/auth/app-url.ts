const LOCAL_APP_URL = "http://localhost:3000"

function normalizeUrl(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    return url.origin
  } catch {
    return null
  }
}

export function getServerAppUrl(headers?: Headers): string {
  const configured =
    normalizeUrl(process.env.ARSHLAB_SITE_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_ARSHLAB_SITE_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeUrl(process.env.VERCEL_URL)

  if (configured) return configured

  const host = headers?.get("x-forwarded-host") ?? headers?.get("host")
  if (host) {
    const protocol = headers?.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https")
    const fromHeaders = normalizeUrl(`${protocol}://${host}`)
    if (fromHeaders) return fromHeaders
  }

  return LOCAL_APP_URL
}

export function getClientAppUrl(): string {
  const configured =
    normalizeUrl(process.env.NEXT_PUBLIC_ARSHLAB_SITE_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL)

  if (configured) return configured
  if (typeof window !== "undefined") return window.location.origin
  return LOCAL_APP_URL
}

export function authCallbackUrl(appUrl: string): string {
  return new URL("/auth/callback", appUrl).toString()
}

export function getClientAuthCallbackUrl(): string {
  return authCallbackUrl(getClientAppUrl())
}
