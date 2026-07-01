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
    support.includes("ARSHLAB is free to use. Creator support is optional and does not unlock extra features"),
    "support page should include required optional-support language",
  )
  assert.ok(support.includes("priority access, grades, tutoring, or advantages"), "support page should reject paid advantages")
  assert.ok(support.includes("ARSHLAB_SUPPORT_URL"), "support URL should come from an environment variable")
  assert.ok(support.includes("NEXT_PUBLIC_ARSHLAB_SUPPORT_URL"), "support page should allow public support URL fallback")
  assert.ok(support.includes("does not store payment details"), "support page should state no in-app payment storage")
  assert.ok(footer.includes("/support"), "footer should include subtle support link")
  assert.ok(privacy.includes("optional third-party payment provider"), "privacy should mention third-party payment provider")
  assert.ok(privacy.includes("does not store payment card"), "privacy should mention no payment details stored")
  assert.ok(terms.includes("Creator support is optional"), "terms should mention optional creator support")
  assert.ok(terms.includes("does not unlock extra features"), "terms should mention no extra features")
  assert.ok(docs.includes("No popups"), "docs should state support is non-intrusive")
  assert.ok(docs.includes("No in-app stored payment data"), "docs should mention no stored payment data")
}

const tests = {
  "auth-routes": testAuthRoutes,
  "support-page": testSupportPage,
}

if (!tests[mode]) throw new Error(`Unknown public launch verification mode: ${mode}`)
tests[mode]()
console.log(`public launch verification passed: ${mode}`)
