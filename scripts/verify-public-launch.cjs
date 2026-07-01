const assert = require("node:assert/strict")
const { existsSync, readFileSync } = require("node:fs")
const path = require("node:path")

const mode = process.argv[2] ?? "auth-routes"
const root = path.resolve(__dirname, "..")

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8")
}

function exists(relativePath) {
  return existsSync(path.join(root, relativePath))
}

function assertNoDonationNag(relativePath) {
  const source = read(relativePath)
  const forbidden = [
    "NEXT_PUBLIC_SUPPORT_URL",
    "Support via PayPal",
    "Donations help cover",
    "Creator support",
    "donation prompt",
    "donate now",
  ]
  for (const phrase of forbidden) {
    assert.ok(!source.toLowerCase().includes(phrase.toLowerCase()), `${relativePath} should not include donation prompt copy: ${phrase}`)
  }
}

function testAuthRoutes() {
  assert.ok(exists("app/auth/sign-in/page.tsx"), "/auth/sign-in page should exist")
  assert.ok(exists("app/auth/sign-up/page.tsx"), "/auth/sign-up page should exist")
  assert.ok(exists("app/auth/callback/route.ts"), "/auth/callback route should exist")
  assert.ok(exists("app/account/page.tsx"), "/account page should exist")

  const accountClient = read("app/account/account-auth-client.tsx")
  const callback = read("app/auth/callback/route.ts")
  const appUrl = read("lib/auth/app-url.ts")
  const authStatus = read("app/account/auth-status.ts")
  const navbar = read("components/navbar.tsx")
  const docs = read("docs/public-launch-auth-support.md")

  assert.ok(accountClient.includes("getClientAuthCallbackUrl"), "sign-up should use the ARSHLAB auth callback URL")
  assert.ok(accountClient.includes("emailRedirectTo"), "sign-up should pass emailRedirectTo")
  assert.ok(accountClient.includes("ARSHLAB account"), "auth UI should say ARSHLAB account")
  assert.ok(accountClient.includes("not Supabase dashboard access"), "auth UI should avoid Supabase project-access confusion")

  assert.ok(callback.includes("exchangeCodeForSession"), "callback route should exchange Supabase auth codes")
  assert.ok(callback.includes('auth_error: "wrong-redirect"'), "callback route should handle missing auth code")
  assert.ok(callback.includes("expired-link"), "callback route should classify expired links")
  assert.ok(callback.includes("not-configured"), "callback route should handle missing Supabase config")
  assert.ok(callback.includes("getServerAppUrl"), "callback route should use environment-based app URL helper")

  assert.ok(appUrl.includes("ARSHLAB_SITE_URL"), "server app URL helper should support ARSHLAB_SITE_URL")
  assert.ok(appUrl.includes("NEXT_PUBLIC_ARSHLAB_SITE_URL"), "client app URL helper should support public app URL")
  assert.ok(appUrl.includes("VERCEL_URL"), "server app URL helper should support Vercel fallback")

  for (const key of ["confirmed", "pending", "expired-link", "wrong-redirect", "callback-error"]) {
    assert.ok(authStatus.includes(key), `auth status message should include ${key}`)
  }

  assert.ok(navbar.includes("/auth/sign-in"), "logged-out navbar should link to sign-in route")
  assert.ok(docs.includes("Site URL"), "docs should mention Supabase Site URL")
  assert.ok(docs.includes("/auth/callback"), "docs should mention callback redirect URLs")
  assert.ok(docs.includes("email templates"), "docs should mention Supabase email templates")
}

function testSupportPage() {
  assert.ok(exists("app/support/page.tsx"), "/support page should exist")
  const support = read("app/support/page.tsx")
  const footer = read("components/site-footer.tsx")
  const privacy = read("app/privacy/page.tsx")
  const terms = read("app/terms/page.tsx")
  const docs = read("docs/public-launch-auth-support.md")

  assert.ok(
    support.includes("Support is optional. Donations help cover hosting, development time, and maintenance."),
    "support page should include required optional-support language",
  )
  assert.ok(support.includes("Donations do not unlock extra features, priority support, private services, or account benefits."), "support page should reject paid advantages")
  assert.ok(support.includes("NEXT_PUBLIC_SUPPORT_URL"), "support URL should come from the requested environment variable")
  assert.ok(support.includes("Support via PayPal"), "support page should render PayPal button copy when env var exists")
  assert.ok(support.includes("Support link is not configured yet."), "support page should render calm missing-env fallback")
  assert.ok(support.includes("does not process or store"), "support page should state no in-app payment processing/storage")
  assert.ok(footer.includes("/support"), "footer should include subtle support link")
  assert.ok(privacy.includes("optional third-party payment provider"), "privacy should mention third-party payment provider")
  assert.ok(privacy.includes("ARSHLAB does not process or store"), "privacy should mention no payment details stored")
  assert.ok(privacy.includes("Donations are voluntary"), "privacy should mention voluntary donations")
  assert.ok(terms.includes("Donations are voluntary"), "terms should mention voluntary donations")
  assert.ok(terms.includes("do not provide extra services"), "terms should mention no extra services")
  assert.ok(docs.includes("No popups"), "docs should state support is non-intrusive")
  assert.ok(docs.includes("No in-app stored payment data"), "docs should mention no stored payment data")
  assert.ok(docs.includes("NEXT_PUBLIC_SUPPORT_URL"), "docs should mention support URL environment variable")

  for (const file of [
    "app/structure-scanner/page.tsx",
    "app/learning-dashboard/learning-dashboard-client.tsx",
    "app/learning-paths/learning-path-client.tsx",
    "app/interactive-learning/page.tsx",
    "app/interactive-learning/explorer/page.tsx",
    "app/interactive-learning/conjugation/page.tsx",
    "app/interactive-learning/mechanisms/page.tsx",
  ]) {
    if (exists(file)) assertNoDonationNag(file)
  }
}

const tests = {
  "auth-routes": testAuthRoutes,
  "support-page": testSupportPage,
}

if (!tests[mode]) throw new Error(`Unknown public launch verification mode: ${mode}`)
tests[mode]()
console.log(`public launch verification passed: ${mode}`)
